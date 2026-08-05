// Pega este archivo completo en Supabase > Edge Functions > Deploy a new function.
// Nombre de la función: order-email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char] || char));

const statusLabel: Record<string, string> = {
  pending_validation: 'Pendiente de validación',
  payment_approved: 'Pago aprobado',
};

function page(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#11110f;color:#eee6da;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 24px"><p style="color:#d6ad64;font-size:12px;letter-spacing:2px;font-weight:bold">KAY GUITAR</p><h1 style="font-size:28px;margin:0 0 20px">${title}</h1><div style="color:#d0c8bc;line-height:1.7">${content}</div></div></body></html>`;
}

function asBase64(bytes: Uint8Array) {
  let value = '';
  for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(value);
}

async function getReceipt(order: Record<string, unknown>, service: ReturnType<typeof createClient>) {
  if (!order.receipt_path) return [];
  const { data } = await service.storage.from('payment-receipts').createSignedUrl(String(order.receipt_path), 300);
  if (!data?.signedUrl) return [];
  const response = await fetch(data.signedUrl);
  if (!response.ok) return [];
  const filename = String(order.receipt_path).split('/').pop() || 'comprobante';
  const mimeType = /\.pdf$/i.test(filename) ? 'application/pdf' : /\.png$/i.test(filename) ? 'image/png' : 'image/jpeg';
  return [{ filename, mimeType, content: asBase64(new Uint8Array(await response.arrayBuffer())) }];
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const gmailUrl = Deno.env.get('GMAIL_WEB_APP_URL');
    const gmailSecret = Deno.env.get('GMAIL_WEB_APP_SECRET');
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (!url || !anon || !serviceKey || !gmailUrl || !gmailSecret || !adminEmail) throw new Error('Faltan los ajustes seguros del correo.');

    const client = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new Error('Debes iniciar sesión.');

    const { order_id, event } = await request.json();
    if (!['bank_receipt', 'paypal_approved'].includes(event)) throw new Error('Aviso no válido.');
    const { data: order, error: orderError } = await client.from('orders').select('*').eq('id', order_id).single();
    if (orderError || !order) throw new Error('Pedido no encontrado.');
    if (event === 'bank_receipt' && !(order.payment_method === 'bank_transfer' && order.status === 'pending_validation')) throw new Error('El comprobante todavía no está listo.');
    if (event === 'paypal_approved' && order.status !== 'payment_approved') throw new Error('El pago aún no fue aprobado.');

    const service = createClient(url, serviceKey);
    const { error: reserved } = await service.from('order_notifications').insert({ order_id: order.id, event });
    if (reserved?.code === '23505') return Response.json({ sent: false, duplicate: true }, { headers: corsHeaders });
    if (reserved) throw reserved;

    const isPayPal = event === 'paypal_approved';
    const items = Array.isArray(order.items) ? order.items : [];
    const productList = `<ul>${items.map((item: Record<string, unknown>) => `<li>${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}</li>`).join('')}</ul>`;
    const customerHtml = isPayPal
      ? `<p>Hola ${escapeHtml(order.customer_name)}.</p><p>Gracias por tu compra. Tu pago fue aprobado correctamente.</p><p>En unos minutos recibirás un correo con tus enlaces de descarga.</p>`
      : `<p>Hola ${escapeHtml(order.customer_name)}.</p><p>Gracias por tu compra. Hemos recibido tu comprobante.</p><p>En unos minutos verificaremos el pago. Una vez aprobado recibirás un segundo correo con tus enlaces de descarga.</p>`;
    const adminHtml = `<p><b>Pedido:</b> ${escapeHtml(order.order_code)}</p><p><b>Cliente:</b> ${escapeHtml(order.customer_name)}<br /><b>Correo:</b> ${escapeHtml(order.customer_email)}</p><p><b>Productos:</b>${productList}</p><p><b>Total:</b> $${escapeHtml(order.total_mxn)} MXN<br /><b>Método:</b> ${isPayPal ? 'PayPal' : 'Transferencia bancaria'}<br /><b>Estado:</b> ${escapeHtml(statusLabel[order.status] || order.status)}</p>`;
    try {
      const mail = await fetch(gmailUrl, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret: gmailSecret, messages: [
          { to: order.customer_email, subject: isPayPal ? `Pago aprobado · ${order.order_code}` : `Comprobante recibido · ${order.order_code}`, html: page(isPayPal ? 'Pago aprobado' : 'Comprobante recibido', customerHtml), text: `Hola ${order.customer_name}. Gracias por tu compra en KAY GUITAR.` },
          { to: adminEmail, subject: `Nuevo pedido recibido · ${order.order_code}`, html: page('Nuevo pedido recibido', adminHtml), text: `Pedido ${order.order_code}. Cliente: ${order.customer_name}. Total: $${order.total_mxn} MXN.`, attachments: await getReceipt(order, service) },
        ] }),
      });
      const result = await mail.json().catch(() => ({}));
      if (!mail.ok || !result?.ok) throw new Error(result?.error || 'Gmail no pudo enviar el correo.');
    } catch (mailError) {
      await service.from('order_notifications').delete().eq('order_id', order.id).eq('event', event);
      throw mailError;
    }
    return Response.json({ sent: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No fue posible enviar el correo.' }, { status: 400, headers: corsHeaders });
  }
});
