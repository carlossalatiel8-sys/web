// Función segura de entrega para KAY GUITAR.
// Despliégala en Supabase con el nombre: deliver-order
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char] || char));

function emailPage(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#11110f;color:#eee6da;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 24px"><p style="color:#d6ad64;font-size:12px;letter-spacing:2px;font-weight:bold">KAY GUITAR</p><h1 style="font-size:28px;margin:0 0 20px">${title}</h1><div style="color:#d0c8bc;line-height:1.7">${content}</div></div></body></html>`;
}

function validDriveUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
      host === 'docs.google.com' || host.endsWith('.docs.google.com')
    );
  } catch (_) {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const gmailUrl = Deno.env.get('GMAIL_WEB_APP_URL') || '';
    const gmailSecret = Deno.env.get('GMAIL_WEB_APP_SECRET') || '';
    if (!url || !anonKey || !serviceKey || !gmailUrl || !gmailSecret) throw new Error('Faltan los ajustes seguros de entrega.');

    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error('Debes iniciar sesión.');
    if (user.app_metadata?.role !== 'admin') throw new Error('No tienes permisos de administrador.');

    const { order_id: orderId, download_url: downloadUrl } = await request.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(orderId || ''))) throw new Error('El pedido no es válido.');
    if (!validDriveUrl(String(downloadUrl || ''))) throw new Error('Usa un enlace válido de Google Drive.');

    const service = createClient(url, serviceKey);
    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id, order_code, customer_name, customer_email, items, status')
      .eq('id', orderId)
      .single();
    if (orderError || !order) throw new Error('Pedido no encontrado.');
    if (!['pending_validation', 'payment_approved'].includes(order.status)) {
      throw new Error('Este pedido ya fue entregado, cancelado o todavía no tiene un pago validado.');
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const productList = `<ul>${items.map((item: Record<string, unknown>) => `<li>${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}</li>`).join('')}</ul>`;
    const customerHtml = `<p>Hola ${escapeHtml(order.customer_name)}.</p><p>Gracias por tu compra en KAY GUITAR. Tu pago fue verificado y tus presets ya están listos para descargar.</p><p><b>Pedido:</b> ${escapeHtml(order.order_code)}</p><p><b>Productos incluidos:</b>${productList}</p><p><a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#d6ad64;color:#11110f;padding:13px 18px;text-decoration:none;font-weight:bold">DESCARGAR MI PEDIDO</a></p><p>Si tienes algún problema con el enlace, responde a este correo o contacta a KAY GUITAR por WhatsApp.</p>`;
    const mail = await fetch(gmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: gmailSecret, messages: [{
        to: order.customer_email,
        subject: `Tu pedido está listo · ${order.order_code}`,
        html: emailPage('Tu pedido está listo', customerHtml),
        text: `Hola ${order.customer_name}. Tu pedido ${order.order_code} ya está listo. Descarga tus presets aquí: ${downloadUrl}`,
      }] }),
    });
    const mailResult = await mail.json().catch(() => ({}));
    if (!mail.ok || !mailResult?.ok) throw new Error(mailResult?.error || 'No se pudo enviar el correo.');

    const { error: updateError } = await service.from('orders').update({
      status: 'delivered',
      download_links: [{ title: `Descarga ${order.order_code}`, url: String(downloadUrl) }],
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', order.id).in('status', ['pending_validation', 'payment_approved']);
    if (updateError) throw new Error('El correo se envió, pero no fue posible actualizar el estado. Revisa el pedido en Supabase.');

    return Response.json({ ok: true, order_code: order.order_code }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No fue posible entregar el pedido.' }, { status: 400, headers: corsHeaders });
  }
});
