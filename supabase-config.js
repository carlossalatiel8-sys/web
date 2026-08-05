// Pega aquí los datos públicos de tu proyecto Supabase.
// Los encontrarás en: Project Settings > API.
window.KAY_GUITAR_SUPABASE = {
  url: 'https://mfmjrndhkevttwxwljvh.supabase.co',
  anonKey: 'sb_publishable__IAUWJkPZRIh996g66M6Lg_EVTc0L5c'
};

// Información visible únicamente cuando el cliente elige transferencia.
// Completa estos datos antes de publicar el checkout.
window.KAY_GUITAR_CHECKOUT = {
  bank: {
    bank: 'Pendiente de configurar',
    accountHolder: 'Pendiente de configurar',
    clabe: 'Pendiente de configurar',
    cardNumber: ''
  },
  // Este identificador es público. La clave secreta de PayPal NUNCA va aquí:
  // se configura como secreto en las funciones de Supabase.
  paypalClientId: '',
  paypalCurrency: 'MXN'
};
