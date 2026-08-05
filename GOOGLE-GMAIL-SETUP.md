# Correos desde c2440380@gmail.com sin dominio

Este método envía los correos desde tu propio Gmail usando Google Apps Script.
No requiere dominio ni muestra contraseñas en la web. Una cuenta Gmail personal
tiene una cuota aproximada de 100 destinatarios al día; cada compra manda dos
correos: uno al cliente y uno a ti.

## 1. Crear el envío de Gmail

1. Con la cuenta `c2440380@gmail.com` abierta, entra a
   [script.google.com](https://script.google.com) y pulsa **Nuevo proyecto**.
2. Borra el código inicial y pega todo el contenido de
   `google-apps-script/Code.gs`.
3. Ve a **Configuración del proyecto** > **Propiedades de secuencia de comandos**.
4. Crea una propiedad:
   - Propiedad: `KAY_GUITAR_SECRET`
   - Valor: inventa una frase larga y única. Guárdala en un lugar seguro.
5. Pulsa **Implementar** > **Nueva implementación** > selecciona **Aplicación web**.
6. Configura:
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
7. Pulsa **Implementar**, autoriza los permisos de enviar correo y copia la URL
   que termina en `/exec`.

La URL puede ser pública porque el script sólo acepta peticiones con tu secreto.

## 2. Guardar los secretos en Supabase

No pegues la URL ni el secreto en `index.html`, GitHub o el chat. En una
terminal abierta dentro de esta carpeta, ejecuta:

```powershell
npx supabase login
npx supabase link --project-ref mfmjrndhkevttwxwljvh
npx supabase secrets set ADMIN_EMAIL="c2440380@gmail.com" GMAIL_WEB_APP_URL="PEGA_AQUI_LA_URL_QUE_TERMINA_EN_EXEC" GMAIL_WEB_APP_SECRET="PEGA_AQUI_EL_MISMO_SECRETO"
npx supabase functions deploy order-email
npx supabase functions deploy paypal-capture-order
```

Después de esto, cada comprobante de transferencia manda dos correos: uno al
cliente y uno a tu Gmail con el comprobante adjunto. Los pagos aprobados por
PayPal hacen lo mismo.

## 3. Prueba

Realiza una transferencia de prueba desde otra cuenta, sube un comprobante y
revisa `c2440380@gmail.com`, incluyendo Spam. El remitente será esa misma cuenta
de Gmail con el nombre **KAY GUITAR**.
