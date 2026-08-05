import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, optionsResponse } from '../_shared/cors.ts';
import { paypalRequest } from '../_shared/paypal.ts';
import { sendUniqueOrderEmail } from '../_shared/order-email.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const publicClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await publicClient.auth.getUser();
    if (userError || !user) throw new Error('Debes iniciar sesión para confirmar el pago.');

    const { order_id } = await request.json();
    const { data: order, error: orderError } = await publicClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();
    if (orderError || !order || order.payment_method !== 'paypal' || !order.paypal_order_id) throw new Error('Pedido de PayPal no encontrado.');
    if (order.status === 'payment_approved') return Response.json({ approved: true }, { headers: corsHeaders });
    if (order.status !== 'pending_payment') throw new Error('Este pedido ya no puede confirmarse.');

    const paypalCapture = await paypalRequest(`/v2/checkout/orders/${order.paypal_order_id}/capture`, { method: 'POST', body: '{}' });
    if (paypalCapture.status !== 'COMPLETED') throw new Error('PayPal no confirmó el pago.');
    const captureId = paypalCapture.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const { data: approvedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({ status: 'payment_approved', paypal_capture_id: captureId, paid_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending_payment')
      .select('*')
      .single();
    if (updateError || !approvedOrder) throw new Error('No fue posible guardar la confirmación de PayPal.');

    // El pago no depende del correo: si el proveedor de email está temporalmente
    // fuera de servicio, PayPal ya fue aprobado y el pedido sigue siendo válido.
    try { await sendUniqueOrderEmail(approvedOrder, 'paypal_approved'); } catch (emailError) { console.error('No se pudo enviar correo de PayPal:', emailError); }
    return Response.json({ approved: true, order_code: approvedOrder.order_code }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error al confirmar PayPal.' }, { status: 400, headers: corsHeaders });
  }
});
