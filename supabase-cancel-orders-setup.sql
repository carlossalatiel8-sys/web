-- KAY GUITAR · Cancelación segura de pedidos
-- Ejecuta este archivo una sola vez en Supabase: SQL Editor > New query > Run.
-- Sólo permite que un cliente cancele su propio pedido antes de enviar pago
-- o comprobante. Los pedidos con comprobante requieren revisión manual.

create or replace function public.cancel_store_order(
  p_order_id uuid
)
returns table (
  id uuid,
  order_code text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  update public.orders as target_order
  set status = 'cancelled',
      updated_at = now()
  where target_order.id = p_order_id
    and target_order.user_id = v_user_id
    and target_order.status = 'pending_payment'
  returning * into v_order;

  if not found then
    raise exception 'Este pedido ya no puede cancelarse.' using errcode = '22023';
  end if;

  return query select v_order.id, v_order.order_code, v_order.status;
end;
$$;

grant execute on function public.cancel_store_order(uuid) to authenticated;
