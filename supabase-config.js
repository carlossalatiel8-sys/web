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
    bank: 'Mercado Pago',
    accountHolder: 'Carlos Salatiel Martinez Jimenes',
    clabe: '722969020186576200',
    cardNumber: ''
  },
  // Este identificador es público. La clave secreta de PayPal NUNCA va aquí:
  // se configura como secreto en las funciones de Supabase.
  paypalClientId: '',
  paypalCurrency: 'MXN'
};
