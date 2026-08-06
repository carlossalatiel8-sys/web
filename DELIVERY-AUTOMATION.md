# Entregas rápidas de KAY GUITAR

El panel privado permite pegar un enlace de Google Drive y realizar tres acciones al mismo tiempo:

1. Envía el correo de entrega al cliente.
2. Incluye automáticamente su nombre, pedido y productos.
3. Marca el pedido como `delivered`.

## Activación única

1. Ejecuta `supabase-admin-access.sql` en Supabase SQL Editor.
2. Cierra sesión y vuelve a iniciar sesión en KAY GUITAR.
3. En Supabase > Edge Functions, crea `deliver-order`, pega el contenido de `supabase/functions/deliver-order/index.ts` y despliega.
4. En Supabase > Edge Functions, crea `admin-order-tools`, pega el contenido de `supabase/functions/admin-order-tools/index.ts` y despliega.
5. Publica en GitHub: `index.html`, `script.js`, `styles.css`, `admin.html` y `admin.js`.

Después entra a `https://carlossalatiel8-sys.github.io/web/admin.html` desde tu teléfono o computadora. Solo tu cuenta administradora podrá abrirlo.
