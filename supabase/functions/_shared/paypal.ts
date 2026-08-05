const environment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox';
const baseUrl = environment === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export async function paypalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Faltan las credenciales seguras de PayPal.');

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error('PayPal no pudo autorizar el pago.');
  return payload.access_token as string;
}

export async function paypalRequest(path: string, init: RequestInit) {
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || 'PayPal no pudo procesar el pago.');
  return payload;
}
