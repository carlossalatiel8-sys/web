-- KAY GUITAR - Reparación de pedidos existentes
-- Ejecuta este archivo UNA SOLA VEZ en Supabase: SQL Editor > New query > Run.
-- No borra pedidos ni usuarios. Solo agrega campos que una versión anterior
-- del checkout necesita para crear pedidos nuevos.

alter table public.store_products
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  add column if not exists order_number bigint,
  add column if not exists checkout_token uuid,
  add column if not exists receipt_path text,
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists download_links jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists paid_at timestamptz,
  add column if not exists delivered_at timestamptz;

create unique index if not exists orders_checkout_token_unique_idx
  on public.orders (checkout_token)
  where checkout_token is not null;

-- Recupera el número interno desde PED-XXXX para no alterar pedidos anteriores
-- y genera los siguientes números de pedido de forma consecutiva.
create sequence if not exists public.orders_order_number_seq start with 1001;

update public.orders
set order_number = substring(order_code from '^PED-([0-9]+)$')::bigint
where order_number is null
  and order_code ~ '^PED-[0-9]+$';

select setval(
  'public.orders_order_number_seq',
  greatest(coalesce((select max(order_number) from public.orders), 1000), 1000),
  true
);

update public.orders
set order_number = nextval('public.orders_order_number_seq')
where order_number is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'order_number'
      and is_identity = 'NO'
  ) then
    alter table public.orders
      alter column order_number set default nextval('public.orders_order_number_seq');
  end if;
end;
$$;

alter table public.orders alter column order_number set not null;

create unique index if not exists orders_order_number_unique_idx
  on public.orders (order_number);

-- Obliga a Supabase a refrescar los permisos del esquema después de la migración.
grant select on public.store_products to anon, authenticated;
grant select on public.orders to authenticated;
