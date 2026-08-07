-- KAY GUITAR · Pack Vox AC30 Presets
-- Ejecuta este archivo UNA sola vez en Supabase: SQL Editor > New query > Run.
-- No borra ni modifica pedidos existentes.

insert into public.store_products (id, name, price_mxn, active)
values ('vox-ac30-presets', 'Vox AC30 Presets', 120, true)
on conflict (id) do update set
  name = excluded.name,
  price_mxn = excluded.price_mxn,
  active = true,
  updated_at = now();

notify pgrst, 'reload schema';
