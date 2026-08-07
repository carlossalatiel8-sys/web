# Activar el checkout de KAY GUITAR

La tienda usa pagos manuales: transferencia bancaria o código QR de PayPal.
Ninguna clave privada de PayPal se guarda en la página.

## Tienda que ya está funcionando

1. En Supabase abre **SQL Editor** → **New query**.
2. Copia todo el archivo `supabase-qr-y-regalos.sql`, pégalo y pulsa **Run**.
3. Luego publica los cambios de GitHub Desktop.

Este paso activa el QR de PayPal, los comprobantes y la solicitud segura del
preset de regalo. No borra usuarios, pedidos ni comprobantes existentes.

## Instalación desde cero

Primero ejecuta `supabase-orders-setup.sql` y, al terminar, ejecuta
`supabase-qr-y-regalos.sql` una sola vez.

## Pago con código QR de PayPal

El archivo `assets/paypal-qr.jpg` es el QR público de la cuenta de cobro. El
cliente sigue este proceso:

1. Escanea el QR desde PayPal.
2. Paga el total exacto mostrado por la tienda.
3. Sube su comprobante en formato PDF, PNG, JPG o JPEG.
4. El pedido queda **Pendiente de validación** hasta que revises que el pago
   llegó correctamente a PayPal.

No se necesitan Client ID ni Client Secret de PayPal para este flujo.

## Preset de regalo

El preset de regalo no muestra transferencia ni QR. Se debe pedir separado de
los productos pagados y exige una captura donde se vea que el cliente sigue a
`@kayguitar14` en Instagram. La solicitud queda pendiente hasta que la revises.

## Correos

Después de actualizar los archivos de esta carpeta, vuelve a desplegar la
función de Supabase llamada `order-email`. En el editor web puedes reemplazar
su `index.ts` por el archivo con el mismo nombre de esta carpeta: es
autocontenido y no requiere crear archivos extra. Esa actualización hace que
el correo distinga entre:

- comprobante de transferencia;
- comprobante de pago con QR de PayPal;
- captura del requisito de un preset de regalo.

Los secretos actuales de Gmail no cambian.

## Publicar la página

En GitHub Desktop selecciona todos los cambios, escribe un resumen como
`Pago QR y preset de regalo`, pulsa **Commit to main** y luego **Push origin**.
GitHub Pages normalmente muestra la actualización en unos minutos.

## Seguridad incluida

- Sólo una sesión iniciada puede crear un pedido.
- Supabase vuelve a calcular productos, cantidades y precios.
- Un regalo no se puede mezclar con una compra pagada.
- Un regalo requiere una captura y no se puede hacer pasar por transferencia.
- Los comprobantes y capturas son privados, con tamaño máximo de 10 MB.
- Los clientes no pueden cambiar estados, totales ni enlaces de descarga.
