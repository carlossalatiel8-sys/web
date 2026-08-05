// Crea una nueva Edge Function llamada: username-login
// Pega este archivo completo en el editor de Supabase y presiona Deploy.
// No debes crear ni compartir ninguna clave: usa las claves seguras propias de Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function invalidCredentials() {
  return Response.json(
    { error: 'Correo o nombre de usuario, o contraseña incorrectos.' },
    { status: 401, headers: corsHeaders },
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Método no permitido.' }, { status: 405, headers: corsHeaders });

  try {
    const { username, password } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!/^[a-z0-9_-]{3,20}$/.test(normalizedUsername) || typeof password !== 'string' || password.length < 8) return invalidCredentials();

    const url = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SB_PUBLISHABLE_KEY') || '';
    if (!url || !serviceRoleKey || !publicKey) throw new Error('Falta la configuración segura de Supabase.');

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin.from('profiles').select('id').eq('username', normalizedUsername).maybeSingle();
    if (profileError || !profile) return invalidCredentials();

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const email = userResult.user?.email;
    if (userError || !email) return invalidCredentials();

    const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!tokenResponse.ok) return invalidCredentials();
    const session = await tokenResponse.json();
    if (!session?.access_token || !session?.refresh_token) return invalidCredentials();

    return Response.json({ session: { access_token: session.access_token, refresh_token: session.refresh_token } }, { headers: corsHeaders });
  } catch (_) {
    return invalidCredentials();
  }
});
