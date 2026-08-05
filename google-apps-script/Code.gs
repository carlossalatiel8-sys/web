/* KAY GUITAR · Envío de correos desde Gmail
   Pega este archivo completo en script.google.com con la cuenta de Gmail que
   debe enviar los correos. El secreto se guarda en Script Properties, nunca
   dentro del código ni en la página pública. */

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData && event.postData.contents || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('KAY_GUITAR_SECRET');
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'No autorizado.' });
    }
    if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > 2) {
      return jsonResponse({ ok: false, error: 'Mensaje no válido.' });
    }

    payload.messages.forEach((message) => {
      if (!message.to || !message.subject || !message.html) throw new Error('El correo está incompleto.');
      const attachments = (message.attachments || []).map((attachment) => {
        const bytes = Utilities.base64Decode(attachment.content);
        return Utilities.newBlob(bytes, attachment.mimeType || 'application/octet-stream', attachment.filename || 'comprobante');
      });
      MailApp.sendEmail({
        to: String(message.to),
        subject: String(message.subject),
        body: String(message.text || 'Tienes una actualización de KAY GUITAR.'),
        htmlBody: String(message.html),
        name: 'KAY GUITAR',
        replyTo: 'c2440380@gmail.com',
        attachments: attachments,
      });
    });
    return jsonResponse({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message || error) });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
