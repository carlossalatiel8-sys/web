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
  // El QR se usa para iniciar el pago de forma manual. Después, el cliente
  // debe subir un comprobante para que el pedido sea validado.
  paypalQr: {
    image: 'assets/paypal-qr.jpg',
    recipient: 'Carlos Salatiel Martinez Jimenes'
  }
};
