# Cuentas administradoras

Solo las cuentas con el permiso `admin` pueden ver el botón **Administrar pedidos**, abrir el panel, consultar comprobantes, entregar o borrar pedidos.

## Dar permiso a una cuenta

En Supabase > SQL Editor, ejecuta este bloque y reemplaza el correo por el correo de la cuenta que quieres autorizar:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = lower('PEGA_AQUI_EL_CORREO@gmail.com');
```

La persona debe cerrar sesión y volver a entrar para recibir el permiso.

## Quitar permiso

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
where lower(email) = lower('PEGA_AQUI_EL_CORREO@gmail.com');
```

Después debe cerrar sesión y volver a entrar.
