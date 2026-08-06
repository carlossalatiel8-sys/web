// Herramientas privadas para el panel de administración de KAY GUITAR.
// Despliégala en Supabase con el nombre exacto: admin-order-tools
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function receiptMimeType(path: string) {
  if (/\.pdf$/i.test(path)) return 'application/pdf';
  if (/\.png$/i.test(path)) return 'image/png';
  return 'image/jpeg';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!url || !anonKey || !serviceKey) throw new Error('Faltan los ajustes seguros de administración.');

    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error('Debes iniciar sesión.');
    if (user.app_metadata?.role !== 'admin') throw new Error('No tienes permisos de administrador.');

    const { action, order_id: orderId, confirm_order_code: confirmation } = await request.json();
    if (!['receipt', 'delete'].includes(action)) throw new Error('Acción no permitida.');
    if (!/^[0-9a-f-]{36}$/i.test(String(orderId || ''))) throw new Error('El pedido no es válido.');

    const service = createClient(url, serviceKey);
    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id, order_code, receipt_path')
      .eq('id', orderId)
      .single();
    if (orderError || !order) throw new Error('Pedido no encontrado.');

    if (action === 'receipt') {
      if (!order.receipt_path) throw new Error('Este pedido no tiene comprobante.');
      const { data, error } = await service.storage.from('payment-receipts').createSignedUrl(order.receipt_path, 600);
      if (error || !data?.signedUrl) throw new Error('No fue posible abrir el comprobante.');
      return Response.json({ ok: true, signed_url: data.signedUrl, mime_type: receiptMimeType(order.receipt_path) }, { headers: corsHeaders });
    }

    if (confirmation !== order.order_code) throw new Error('El código de confirmación no coincide.');
    if (order.receipt_path) {
      const { error: storageError } = await service.storage.from('payment-receipts').remove([order.receipt_path]);
      if (storageError) throw new Error('No fue posible eliminar el comprobante. El pedido se conserva.');
    }
    const { error: deleteError } = await service.from('orders').delete().eq('id', order.id);
    if (deleteError) throw new Error('No fue posible eliminar el pedido.');
    return Response.json({ ok: true, order_code: order.order_code }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No fue posible completar la acción.' }, { status: 400, headers: corsHeaders });
  }
});
