# Activar el checkout de KAY GUITAR

La interfaz ya está creada, pero estas configuraciones se hacen una sola vez
para que los pedidos, comprobantes, PayPal y correos funcionen de verdad.

## 1. Crear tablas y comprobantes privados

1. Entra a tu proyecto de Supabase.
2. Abre **SQL Editor** y crea una consulta nueva.
3. Abre el archivo `supabase-orders-setup.sql` de esta carpeta, copia todo su
   contenido, pégalo en Supabase y pulsa **Run**.

Esto crea los productos del servidor, pedidos con códigos `PED-1001`, el bucket
privado de comprobantes y sus reglas de seguridad. No hay que crear carpetas
manualmente en Storage.

## 2. Completar datos de transferencia

En `supabase-config.js`, reemplaza solamente estos cuatro textos:

```js
bank: {
  bank: 'Nombre del banco',
  accountHolder: 'Nombre completo del titular',
  clabe: 'Tu CLABE de 18 dígitos',
  cardNumber: '' // Déjalo vacío si no quieres mostrar tarjeta.
}
```

La CLABE se muestra al cliente, por lo que es correcto que esté en este archivo.
No pongas contraseñas, claves de acceso ni datos privados de la banca.

## 3. Activar PayPal de forma segura

1. Crea una app **Live** en el panel de desarrolladores de PayPal.
2. Copia el **Client ID** público y pégalo en `paypalClientId` dentro de
   `supabase-config.js`.
3. Conserva el **Client Secret** sólo para los secretos de Supabase; nunca lo
   pegues en `index.html`, `script.js` ni lo subas a GitHub.

Desde una computadora con la CLI de Supabase instalada y abierta en esta
carpeta, ejecuta:

```powershell
npx supabase login
npx supabase link --project-ref mfmjrndhkevttwxwljvh
npx supabase secrets set PAYPAL_CLIENT_ID="TU_CLIENT_ID" PAYPAL_CLIENT_SECRET="TU_CLIENT_SECRET" PAYPAL_ENVIRONMENT="live"
npx supabase functions deploy paypal-create-order
npx supabase functions deploy paypal-capture-order
```

Para hacer pruebas antes de vender, usa primero credenciales **Sandbox** y cambia
`PAYPAL_ENVIRONMENT` a `sandbox`. Cuando todo esté probado, usa Live en ambos
lugares.

## 4. Activar correos desde Gmail

La tienda puede enviar desde un Gmail sin comprar dominio. Sigue el archivo
`GOOGLE-GMAIL-SETUP.md` para crear el servicio de Google Apps Script y guardar
su URL y secreto en Supabase. El correo al administrador contiene pedido,
cliente, correo, productos, total, método, estado y el comprobante adjunto.
Los clientes reciben la confirmación correspondiente. La base evita que un
reintento mande el mismo aviso dos veces.

## 5. Publicar los cambios de la página

Sube a GitHub Pages todos los cambios de esta carpeta, incluyendo:

- `index.html`
- `styles.css`
- `script.js`
- `checkout.js`
- `supabase-config.js`

La carpeta `supabase/functions` no se publica en GitHub Pages: se despliega en
Supabase con los comandos de los pasos 3 y 4.

## Entrega por Google Drive

Cuando apruebes una transferencia o quieras completar un pedido de PayPal,
añade los enlaces de Google Drive en el correo de respuesta al cliente. La tabla
`orders` ya tiene el campo `download_links` preparado para que más adelante el
panel administrativo pueda guardar y mostrar esas descargas.

## Seguridad incluida

- No se puede comprar sin sesión.
- Los precios y el total se recalculan en Supabase, no en el navegador.
- Los clientes sólo pueden consultar sus propios pedidos.
- No pueden modificar estados, totales ni enlaces de descarga.
- Los comprobantes son privados y sólo se pueden subir con PDF, PNG, JPG o JPEG
  de hasta 10 MB.
- El código de pedido se genera automáticamente y los pedidos usan un token para
  evitar duplicados por doble clic.
