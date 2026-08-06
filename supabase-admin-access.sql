-- KAY GUITAR - Activa la cuenta de administrador para el panel de pedidos.
-- Ejecuta UNA VEZ en Supabase: SQL Editor > New query > Run.
-- Después cierra sesión y vuelve a entrar a la tienda para recibir el permiso.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where email = 'carlossalatiel8@gmail.com';
