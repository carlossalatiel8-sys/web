import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function productsHtml(items: Array<Record<string, unknown>>) {
  return `<ul>${items.map((item) => `<li>${esc(item.name)} × ${esc(item.quantity)}</li>`).join('')}</ul>`;
}

function baseEmail(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#11110f;color:#eee6da;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 24px"><p style="color:#d6ad64;font-size:12px;letter-spacing:2px;font-weight:bold">KAY GUITAR</p><h1 style="font-size:28px;margin:0 0 20px">${title}</h1><div style="color:#d0c8bc;line-height:1.7">${content}</div></div></body></html>`;
}

async function receiptAttachment(order: Record<string, unknown>, serviceClient: ReturnType<typeof createClient>) {
  if (!order.receipt_path) return [];
  const { data, error } = await serviceClient.storage
    .from('payment-receipts')
    .createSignedUrl(String(order.receipt_path), 300);
  if (error || !data?.signedUrl) return [];
  const response = await fetch(data.signedUrl);
  if (!response.ok) return [];
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return [{ filename: String(order.receipt_path).split('/').pop() || 'comprobante', content: btoa(binary) }];
}

async function sendEmail(payload: Record<string, unknown>) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) throw new Error('Falta RESEND_API_KEY.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('No fue posible enviar el correo.');
}

/** Envía el correo del cliente y del administrador desde un entorno seguro. */
export async function sendOrderEmail(order: Record<string, unknown>, event: 'bank_receipt' | 'paypal_approved') {
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  const from = Deno.env.get('EMAIL_FROM');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY');
  if (!adminEmail || !from || !supabaseUrl || !serviceKey) throw new Error('Faltan los ajustes de correo del servidor.');

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const items = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : [];
  const isPayPal = event === 'paypal_approved';
  const customerHtml = isPayPal
    ? `<p>Hola ${esc(order.customer_name)}.</p><p>Gracias por tu compra. Tu pago fue aprobado correctamente.</p><p>En unos minutos recibirás un correo con tus enlaces de descarga.</p>`
    : `<p>Hola ${esc(order.customer_name)}.</p><p>Gracias por tu compra. Hemos recibido tu comprobante.</p><p>En unos minutos verificaremos el pago. Una vez aprobado recibirás un segundo correo con tus enlaces de descarga.</p>`;
  const adminHtml = `<p><b>Pedido:</b> ${esc(order.order_code)}</p><p><b>Cliente:</b> ${esc(order.customer_name)}<br /><b>Correo:</b> ${esc(order.customer_email)}</p><p><b>Productos:</b>${productsHtml(items)}</p><p><b>Total:</b> $${esc(order.total_mxn)} MXN<br /><b>Método:</b> ${isPayPal ? 'PayPal' : 'Transferencia bancaria'}<br /><b>Estado:</b> ${esc(statusText[String(order.status)] || order.status)}</p>`;

  await sendEmail({
    from,
    to: [String(order.customer_email)],
    subject: isPayPal ? `Pago aprobado · ${order.order_code}` : `Comprobante recibido · ${order.order_code}`,
    html: baseEmail(isPayPal ? 'Pago aprobado' : 'Comprobante recibido', customerHtml),
  });
  await sendEmail({
    from,
    to: [adminEmail],
    subject: `Nuevo pedido recibido · ${order.order_code}`,
    html: baseEmail('Nuevo pedido recibido', adminHtml),
    attachments: await receiptAttachment(order, serviceClient),
  });
}

// Reserva el aviso antes de enviarlo. La combinación pedido + evento es única
// en la base de datos, por lo que recargar una pantalla no duplica correos.
export async function sendUniqueOrderEmail(order: Record<string, unknown>, event: 'bank_receipt' | 'paypal_approved') {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan los ajustes seguros del servidor.');
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { error: reserveError } = await serviceClient
    .from('order_notifications')
    .insert({ order_id: order.id, event });
  if (reserveError?.code === '23505') return false;
  if (reserveError) throw reserveError;
  try {
    await sendOrderEmail(order, event);
    return true;
  } catch (error) {
    await serviceClient.from('order_notifications').delete().eq('order_id', order.id).eq('event', event);
    throw error;
  }
}
