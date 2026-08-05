import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, optionsResponse } from '../_shared/cors.ts';
import { paypalRequest } from '../_shared/paypal.ts';

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
    if (userError || !user) throw new Error('Debes iniciar sesión para pagar.');

    const { order_id } = await request.json();
    const { data: order, error: orderError } = await publicClient
      .from('orders')
      .select('id, order_code, items, total_mxn, payment_method, status, paypal_order_id')
      .eq('id', order_id)
      .single();
    if (orderError || !order || order.payment_method !== 'paypal') throw new Error('Pedido de PayPal no encontrado.');
    if (order.status !== 'pending_payment') throw new Error('Este pedido ya no puede pagarse.');
    if (order.paypal_order_id) return Response.json({ paypal_order_id: order.paypal_order_id }, { headers: corsHeaders });

    const items = (order.items || []).map((item: Record<string, unknown>) => ({
      name: String(item.name),
      quantity: String(item.quantity),
      unit_amount: { currency_code: 'MXN', value: Number(item.unit_price_mxn).toFixed(2) },
    }));
    const paypalOrder = await paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': `kay-${order.id}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order.order_code,
          description: `KAY GUITAR · ${order.order_code}`,
          amount: {
            currency_code: 'MXN',
            value: Number(order.total_mxn).toFixed(2),
            breakdown: { item_total: { currency_code: 'MXN', value: Number(order.total_mxn).toFixed(2) } },
          },
          items,
        }],
      }),
    });

    // La llave de servicio sólo existe en el servidor. Se usa después de que
    // RLS confirmó que el pedido pertenece al usuario autenticado.
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const { error: updateError } = await serviceClient
      .from('orders')
      .update({ paypal_order_id: paypalOrder.id })
      .eq('id', order.id)
      .is('paypal_order_id', null);
    if (updateError) throw updateError;

    return Response.json({ paypal_order_id: paypalOrder.id }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Error al iniciar PayPal.' }, { status: 400, headers: corsHeaders });
  }
});
