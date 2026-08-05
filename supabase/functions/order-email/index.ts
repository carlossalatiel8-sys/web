import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, optionsResponse } from '../_shared/cors.ts';
import { sendUniqueOrderEmail } from '../_shared/order-email.ts';

// Para transferencias, el navegador pide este aviso justo después de que el
// comprobante ya fue guardado por el RPC seguro submit_bank_receipt.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
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
    if (!['bank_receipt', 'paypal_approved'].includes(event)) throw new Error('Aviso no válido.');
    const { data: order, error } = await client.from('orders').select('*').eq('id', order_id).single();
    if (error || !order) throw new Error('Pedido no encontrado.');
    if (event === 'bank_receipt' && !(order.payment_method === 'bank_transfer' && order.status === 'pending_validation')) throw new Error('El comprobante todavía no está listo.');
    if (event === 'paypal_approved' && order.status !== 'payment_approved') throw new Error('El pago aún no fue aprobado.');
    await sendUniqueOrderEmail(order, event);
    return Response.json({ sent: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No fue posible enviar el correo.' }, { status: 400, headers: corsHeaders });
  }
});
