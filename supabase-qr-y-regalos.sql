-- KAY GUITAR · Pago con código QR de PayPal y presets de regalo
-- Ejecuta este archivo COMPLETO UNA SOLA VEZ en Supabase:
-- SQL Editor > New query > pega el contenido > Run.
--
-- Esta migración no borra usuarios, pedidos ni comprobantes existentes.
-- Amplía la instalación creada con supabase-orders-setup.sql.

begin;

-- El catálogo es la fuente de verdad del servidor. Un producto con este campo
-- se considera un regalo y debe solicitarse por separado, sin pago.
alter table public.store_products
  add column if not exists claim_requirement text;

insert into public.store_products (
  id,
  name,
  price_mxn,
  active,
  claim_requirement
) values (
  'preset-regalo',
  'Preset de regalo',
  0,
  true,
  'Sigue a @kayguitar14 en Instagram y sube una captura donde se vea que ya sigues la cuenta.'
)
on conflict (id) do update set
  name = excluded.name,
  price_mxn = excluded.price_mxn,
  active = true,
  claim_requirement = excluded.claim_requirement,
  updated_at = now();

-- Conserva el tipo de prueba que recibió cada pedido: comprobante de pago o
-- captura del requisito para un preset regalado.
alter table public.orders
  add column if not exists submission_kind text;

-- Reemplaza sólo las restricciones CHECK relacionadas con payment_method.
-- Se hace de forma dinámica para aceptar instalaciones anteriores que quizá
-- usaron un nombre de restricción distinto.
do $$
declare
  existing_constraint record;
begin
  for existing_constraint in
    select constraint_name
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'payment_method'
  loop
    execute format(
      'alter table public.orders drop constraint if exists %I',
      existing_constraint.constraint_name
    );
  end loop;

  -- Algunas versiones de PostgreSQL no exponen CHECKs simples en
  -- constraint_column_usage; cubrimos también ese caso.
  for existing_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_method%'
  loop
    execute format(
      'alter table public.orders drop constraint if exists %I',
      existing_constraint.conname
    );
  end loop;
end;
$$;

alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in (
    'bank_transfer',
    'paypal',
    'paypal_qr',
    'gift_claim'
  )) not valid;

alter table public.orders
  drop constraint if exists orders_submission_kind_check;

alter table public.orders
  add constraint orders_submission_kind_check
  check (
    submission_kind is null
    or submission_kind in ('payment_receipt', 'social_follow_proof')
  ) not valid;

-- Los nuevos eventos permiten que el correo explique correctamente si recibió
-- un comprobante de pago o una captura del requisito del regalo.
do $$
declare
  existing_constraint record;
begin
  for existing_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.order_notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%event%'
  loop
    execute format(
      'alter table public.order_notifications drop constraint if exists %I',
      existing_constraint.conname
    );
  end loop;
end;
$$;

alter table public.order_notifications
  drop constraint if exists order_notifications_event_check;

alter table public.order_notifications
  add constraint order_notifications_event_check
  check (event in (
    'bank_receipt',
    'paypal_approved',
    'payment_proof',
    'gift_requirement'
  )) not valid;

-- Crea el pedido de forma segura. El navegador sólo manda IDs y cantidades:
-- los productos, precios, si es regalo y el total se calculan de nuevo aquí.
create or replace function public.create_store_order(
  p_items jsonb,
  p_payment_method text,
  p_checkout_token uuid default null
)
returns table (
  id uuid,
  order_code text,
  total_mxn integer,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_input_count integer;
  v_match_count integer;
  v_total_quantity integer;
  v_gift_item_count integer;
  v_items jsonb;
  v_total integer;
  v_email text;
  v_name text;
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.' using errcode = '42501';
  end if;

  if p_payment_method is null
    or p_payment_method not in ('bank_transfer', 'paypal', 'paypal_qr', 'gift_claim') then
    raise exception 'Método de pago no permitido.' using errcode = '22023';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    where input.product_id is null
      or input.quantity is null
      or input.quantity < 1
      or input.quantity > 10
  ) then
    raise exception 'La cantidad de un producto no es válida.' using errcode = '22023';
  end if;

  if exists (
    with requested as (
      select product_id, sum(quantity)::integer as quantity
      from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
      group by product_id
    )
    select 1 from requested where quantity > 10
  ) then
    raise exception 'No puedes comprar más de 10 unidades del mismo producto.' using errcode = '22023';
  end if;

  -- Devuelve el mismo pedido en reintentos del mismo clic, sin duplicarlo.
  if p_checkout_token is not null then
    select * into v_order
    from public.orders as existing_order
    where existing_order.user_id = v_user_id
      and existing_order.checkout_token = p_checkout_token;

    if found then
      return query
      select v_order.id, v_order.order_code, v_order.total_mxn, v_order.status;
      return;
    end if;
  end if;

  with requested as (
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by product_id
  )
  select count(*)::integer into v_input_count
  from requested;

  with requested as (
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by product_id
  )
  select count(*)::integer into v_match_count
  from requested as requested_item
  join public.store_products as product
    on product.id = requested_item.product_id
    and product.active = true;

  if v_input_count <> v_match_count then
    raise exception 'Uno o más productos ya no están disponibles.' using errcode = '22023';
  end if;

  with requested as (
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as input(product_id text, quantity integer)
    group by product_id
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'product_id', product.id,
        'name', product.name,
        'unit_price_mxn', product.price_mxn,
        'quantity', requested_item.quantity,
        'line_total_mxn', product.price_mxn * requested_item.quantity,
        'claim_requirement', product.claim_requirement
      ) order by product.name
    ),
    coalesce(sum(product.price_mxn * requested_item.quantity), 0)::integer,
    count(*) filter (where product.claim_requirement is not null)::integer,
    coalesce(sum(requested_item.quantity), 0)::integer
  into v_items, v_total, v_gift_item_count, v_total_quantity
  from requested as requested_item
  join public.store_products as product
    on product.id = requested_item.product_id
    and product.active = true;

  -- Un regalo no puede mezclarse con productos de pago ni solicitarse varias
  -- veces en el mismo pedido. Para los demás métodos sólo se aceptan artículos
  -- pagados, lo que impide saltarse el pago modificando JavaScript.
  if p_payment_method = 'gift_claim' then
    if v_input_count <> 1
      or v_total_quantity <> 1
      or v_gift_item_count <> 1
      or v_total <> 0 then
      raise exception 'El preset de regalo debe solicitarse por separado y sólo una vez.'
        using errcode = '22023';
    end if;
  elsif v_gift_item_count > 0 then
    raise exception 'El preset de regalo debe solicitarse por separado.' using errcode = '22023';
  elsif v_total <= 0 then
    raise exception 'El pedido debe tener un importe válido.' using errcode = '22023';
  end if;

  select user_record.email
  into v_email
  from auth.users as user_record
  where user_record.id = v_user_id;

  select profile_record.username
  into v_name
  from public.profiles as profile_record
  where profile_record.id = v_user_id;

  v_name := coalesce(v_name, split_part(coalesce(v_email, 'cliente'), '@', 1));

  begin
    insert into public.orders (
      user_id,
      customer_email,
      customer_name,
      items,
      total_mxn,
      payment_method,
      status,
      checkout_token
    ) values (
      v_user_id,
      coalesce(v_email, ''),
      v_name,
      v_items,
      v_total,
      p_payment_method,
      'pending_payment',
      p_checkout_token
    )
    returning * into v_order;
  exception
    when unique_violation then
      -- Una llamada simultánea con el mismo token puede llegar aquí. Recupera
      -- el pedido existente; si la violación fue otra, vuelve a lanzar el error.
      if p_checkout_token is not null then
        select * into v_order
        from public.orders as existing_order
        where existing_order.user_id = v_user_id
          and existing_order.checkout_token = p_checkout_token;

        if found then
          return query
          select v_order.id, v_order.order_code, v_order.total_mxn, v_order.status;
          return;
        end if;
      end if;
      raise;
  end;

  return query
  select v_order.id, v_order.order_code, v_order.total_mxn, v_order.status;
end;
$$;

revoke all on function public.create_store_order(jsonb, text, uuid) from public;
grant execute on function public.create_store_order(jsonb, text, uuid) to authenticated;

-- Guarda de forma segura una prueba asociada al pedido. Sólo el dueño puede
-- enviarla y sólo desde pending_payment. La combinación método/tipo de prueba
-- se valida aquí, no en el navegador.
create or replace function public.submit_order_proof(
  p_order_id uuid,
  p_receipt_path text,
  p_submission_kind text
)
returns table (
  id uuid,
  order_code text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected_prefix text;
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  if p_submission_kind is null
    or p_submission_kind not in ('payment_receipt', 'social_follow_proof') then
    raise exception 'El tipo de prueba no es válido.' using errcode = '22023';
  end if;

  v_expected_prefix := v_user_id::text || '/' || p_order_id::text || '/';

  if p_receipt_path is null
    or left(p_receipt_path, length(v_expected_prefix)) <> v_expected_prefix then
    raise exception 'La ruta del archivo no es válida.' using errcode = '22023';
  end if;

  update public.orders as target_order
  set receipt_path = p_receipt_path,
      submission_kind = p_submission_kind,
      status = 'pending_validation',
      updated_at = now()
  where target_order.id = p_order_id
    and target_order.user_id = v_user_id
    and target_order.status = 'pending_payment'
    and (
      (
        target_order.payment_method in ('bank_transfer', 'paypal_qr')
        and p_submission_kind = 'payment_receipt'
      )
      or (
        target_order.payment_method = 'gift_claim'
        and p_submission_kind = 'social_follow_proof'
      )
    )
  returning * into v_order;

  if not found then
    raise exception 'Este pedido no puede recibir ese archivo.' using errcode = '22023';
  end if;

  return query
  select v_order.id, v_order.order_code, v_order.status;
end;
$$;

revoke all on function public.submit_order_proof(uuid, text, text) from public;
grant execute on function public.submit_order_proof(uuid, text, text) to authenticated;

-- Hace visibles los nuevos RPC de inmediato para la API de Supabase.
notify pgrst, 'reload schema';

commit;
