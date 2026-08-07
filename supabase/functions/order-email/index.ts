// Función autocontenida para que puedas actualizarla directamente desde el
// editor web de Supabase: basta con pegar este único archivo y desplegarlo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OrderEmailEvent = 'bank_receipt' | 'paypal_approved' | 'payment_proof' | 'gift_requirement';
const supportedEvents: OrderEmailEvent[] = ['bank_receipt', 'paypal_approved', 'payment_proof', 'gift_requirement'];

const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character] || character));

const statusText: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  pending_validation: 'Pendiente de validación',
  payment_approved: 'Pago aprobado',
  payment_rejected: 'Pago rechazado',
  cancelled: 'Cancelado',
  delivered: 'Entregado',
};

function paymentMethodText(method: unknown) {
  return ({
    bank_transfer: 'Transferencia bancaria',
    paypal: 'PayPal',
    paypal_qr: 'PayPal con código QR',
    gift_claim: 'Preset de regalo',
  } as Record<string, string>)[String(method)] || 'Sin definir';
}

function productsHtml(items: Array<Record<string, unknown>>) {
  return `<ul>${items.map((item) => `<li>${esc(item.name)} × ${esc(item.quantity)}</li>`).join('')}</ul>`;
}

function baseEmail(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#11110f;color:#eee6da;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 24px"><p style="color:#d6ad64;font-size:12px;letter-spacing:2px;font-weight:bold">KAY GUITAR</p><h1 style="font-size:28px;margin:0 0 20px">${title}</h1><div style="color:#d0c8bc;line-height:1.7">${content}</div></div></body></html>`;
}

async function receiptAttachment(order: Record<string, unknown>, serviceClient: ReturnType<typeof createClient>) {
  if (!order.receipt_path) return [];
  const { data, error } = await serviceClient.storage.from('payment-receipts').createSignedUrl(String(order.receipt_path), 300);
  if (error || !data?.signedUrl) return [];
  const response = await fetch(data.signedUrl);
  if (!response.ok) return [];
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  const filename = String(order.receipt_path).split('/').pop() || 'archivo';
  const mimeType = /\.pdf$/i.test(filename) ? 'application/pdf' : /\.png$/i.test(filename) ? 'image/png' : 'image/jpeg';
  return [{ filename, content: btoa(binary), mimeType }];
}

async function sendWithGmail(payload: Record<string, unknown>) {
  const url = Deno.env.get('GMAIL_WEB_APP_URL');
  const secret = Deno.env.get('GMAIL_WEB_APP_SECRET');
  if (!url || !secret) throw new Error('Faltan los ajustes seguros de correo de Gmail.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.ok) throw new Error(result?.error || 'No fue posible enviar el correo desde Gmail.');
}

function copyForEvent(order: Record<string, unknown>, event: OrderEmailEvent) {
  const isGift = event === 'gift_requirement';
  const isApproved = event === 'paypal_approved';
  const isQr = String(order.payment_method) === 'paypal_qr';
  if (isGift) return {
    clientTitle: 'Solicitud recibida',
    clientSubject: `Solicitud recibida · ${order.order_code}`,
    adminTitle: 'Solicitud de preset de regalo',
    adminSubject: `Solicitud de regalo · ${order.order_code}`,
    clientHtml: `<p>Hola ${esc(order.customer_name)}.</p><p>Gracias por solicitar tu preset de regalo. Hemos recibido tu captura del requisito.</p><p>Verificaremos que sigues a <b>@kayguitar14</b> antes de enviarte el preset por correo.</p>`,
    clientText: `Hola ${order.customer_name}. Recibimos tu captura del requisito para el preset de regalo. Verificaremos que sigues a @kayguitar14 antes de enviarte el preset.`,
    attachmentLabel: 'Captura del requisito',
    attachEvidence: true,
  };
  if (isApproved) return {
    clientTitle: 'Pago aprobado',
    clientSubject: `Pago aprobado · ${order.order_code}`,
    adminTitle: 'Pago aprobado',
    adminSubject: `Pago aprobado · ${order.order_code}`,
    clientHtml: `<p>Hola ${esc(order.customer_name)}.</p><p>Gracias por tu compra. Tu pago fue aprobado correctamente.</p><p>En unos minutos recibirás un correo con tus enlaces de descarga.</p>`,
    clientText: `Hola ${order.customer_name}. Gracias por tu compra. Tu pago fue aprobado correctamente. En unos minutos recibirás tus enlaces de descarga.`,
    attachmentLabel: '',
    attachEvidence: false,
  };
  const paymentCopy = isQr
    ? 'Hemos recibido tu comprobante de pago con código QR de PayPal. Verificaremos el importe antes de enviarte tus enlaces de descarga.'
    : 'Hemos recibido tu comprobante. En unos minutos verificaremos el pago. Una vez aprobado recibirás un segundo correo con tus enlaces de descarga.';
  return {
    clientTitle: 'Comprobante recibido',
    clientSubject: `Comprobante recibido · ${order.order_code}`,
    adminTitle: 'Nuevo pedido recibido',
    adminSubject: `Nuevo pedido recibido · ${order.order_code}`,
    clientHtml: `<p>Hola ${esc(order.customer_name)}.</p><p>Gracias por tu compra. ${paymentCopy}</p>`,
    clientText: `Hola ${order.customer_name}. Gracias por tu compra. ${paymentCopy}`,
    attachmentLabel: 'Comprobante de pago',
    attachEvidence: true,
  };
}

async function sendUniqueOrderEmail(order: Record<string, unknown>, event: OrderEmailEvent) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (!supabaseUrl || !serviceKey || !adminEmail) throw new Error('Faltan los ajustes de correo del servidor.');
  const service = createClient(supabaseUrl, serviceKey);
  const { error: reserveError } = await service.from('order_notifications').insert({ order_id: order.id, event });
  if (reserveError?.code === '23505') return false;
  if (reserveError) throw reserveError;
  try {
    const items = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : [];
    const copy = copyForEvent(order, event);
    const adminHtml = `<p><b>Pedido:</b> ${esc(order.order_code)}</p><p><b>Cliente:</b> ${esc(order.customer_name)}<br /><b>Correo:</b> ${esc(order.customer_email)}</p><p><b>Productos:</b>${productsHtml(items)}</p><p><b>Total:</b> $${esc(order.total_mxn)} MXN<br /><b>Método:</b> ${esc(paymentMethodText(order.payment_method))}<br /><b>Estado:</b> ${esc(statusText[String(order.status)] || order.status)}${copy.attachmentLabel ? `<br /><b>Archivo adjunto:</b> ${copy.attachmentLabel}` : ''}</p>`;
    await sendWithGmail({
      messages: [
        { to: String(order.customer_email), subject: copy.clientSubject, html: baseEmail(copy.clientTitle, copy.clientHtml), text: copy.clientText },
        {
          to: adminEmail,
          subject: copy.adminSubject,
          html: baseEmail(copy.adminTitle, adminHtml),
          text: `${copy.adminTitle}. Pedido ${order.order_code}. Cliente: ${order.customer_name}. Total: $${order.total_mxn} MXN. Método: ${paymentMethodText(order.payment_method)}.`,
          attachments: copy.attachEvidence ? await receiptAttachment(order, service) : [],
        },
      ],
    });
    return true;
  } catch (error) {
    await service.from('order_notifications').delete().eq('order_id', order.id).eq('event', event);
    throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const client = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) throw new Error('Debes iniciar sesión.');
    const { order_id, event } = await request.json();
    if (!supportedEvents.includes(event)) throw new Error('Aviso no válido.');
    const { data: order, error } = await client.from('orders').select('*').eq('id', order_id).single();
    if (error || !order) throw new Error('Pedido no encontrado.');
    const isPaymentProof = ['bank_receipt', 'payment_proof'].includes(event)
      && ['bank_transfer', 'paypal_qr'].includes(order.payment_method)
      && order.status === 'pending_validation';
    const isGiftProof = event === 'gift_requirement'
      && order.payment_method === 'gift_claim'
      && order.status === 'pending_validation';
    const isPaypalApproved = event === 'paypal_approved' && order.status === 'payment_approved';
    if (!isPaymentProof && !isGiftProof && !isPaypalApproved) throw new Error('El pedido todavía no está listo para este aviso.');
    await sendUniqueOrderEmail(order, event);
    return Response.json({ sent: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No fue posible enviar el correo.' }, { status: 400, headers: corsHeaders });
  }
});
