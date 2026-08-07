/* KAY GUITAR · Checkout manual seguro
   Supabase calcula los importes, crea cada pedido y guarda la prueba privada.
   PayPal se usa mediante QR manual; nunca se exponen claves privadas. */
(() => {
  const store = window.KayGuitarStore;
  if (!store) return;

  const $ = (selector) => document.querySelector(selector);
  const modal = $('#checkout-modal');
  const overlay = $('.overlay');
  const checkoutContent = $('#checkout-content');
  const bankContent = $('#bank-content');
  const qrContent = $('#qr-content');
  const giftContent = $('#gift-content');
  const finishContent = $('#checkout-finish');
  const checkoutButton = $('#checkout-button');
  const payButton = $('#checkout-pay-button');
  const paymentMethods = $('#payment-methods');
  const giftCheckoutNote = $('#gift-checkout-note');
  const message = $('#checkout-message');
  const checkoutConfig = window.KAY_GUITAR_CHECKOUT || {};
  const bank = checkoutConfig.bank || {};
  const paypalQr = checkoutConfig.paypalQr || {};

  let order = null;
  let checkoutToken = null;

  const mxn = (value) => `$${Number(value || 0).toLocaleString('es-MX')} MXN`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const isGiftProduct = (product) => Boolean(product?.claimRequired || product?.id === 'preset-regalo');

  function makeToken() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function cartLines() {
    const compacted = new Map();
    store.getCart().forEach((product) => {
      if (!product?.id) return;
      const line = compacted.get(product.id) || { product_id: product.id, product, quantity: 0 };
      line.quantity += 1;
      compacted.set(product.id, line);
    });
    return [...compacted.values()];
  }

  function orderPayload() {
    return cartLines().map(({ product_id, quantity }) => ({ product_id, quantity }));
  }

  function giftOnlyCart() {
    const lines = cartLines();
    return Boolean(lines.length) && lines.every((line) => isGiftProduct(line.product));
  }

  function hasMixedCart() {
    const lines = cartLines();
    return lines.some((line) => isGiftProduct(line.product)) && lines.some((line) => !isGiftProduct(line.product));
  }

  function setMessage(text = '', type = '') {
    message.textContent = text;
    message.className = `checkout-message ${type}`;
  }

  function setPayBusy(busy, label = 'Continuar') {
    payButton.disabled = busy;
    payButton.innerHTML = busy ? 'Procesando…' : `${label} <i>→</i>`;
  }

  function selectedMethod() {
    return document.querySelector('input[name="payment-method"]:checked')?.value || 'bank_transfer';
  }

  function paymentMethodLabel(method) {
    return ({
      bank_transfer: 'Continuar',
      paypal_qr: 'Mostrar código QR',
      gift_claim: 'Solicitar preset gratis',
    })[method] || 'Continuar';
  }

  function renderSummary() {
    const lines = cartLines();
    const localTotal = lines.reduce((sum, line) => sum + Number(line.product.price || 0) * line.quantity, 0);
    $('#checkout-items').innerHTML = lines.map(({ product, quantity }) => `
      <div class="checkout-line">
        <div><b>${escapeHtml(product.name)}</b><small>${mxn(product.price)} c/u</small></div>
        <span>×${quantity}</span><strong>${mxn(product.price * quantity)}</strong>
      </div>`).join('');
    $('#checkout-total').textContent = mxn(localTotal);
    $('#checkout-customer-name').textContent = store.getDisplayName();
    $('#checkout-customer-email').textContent = store.getUser()?.email || '—';
  }

  function clearProofForms() {
    ['#receipt-upload', '#qr-receipt-upload', '#gift-proof-upload'].forEach((selector) => $(selector).classList.add('checkout-hidden'));
    ['#receipt-file', '#qr-receipt-file', '#gift-proof-file'].forEach((selector) => { $(selector).value = ''; });
  }

  function resetScreen() {
    clearProofForms();
    checkoutContent.classList.remove('checkout-hidden');
    bankContent.classList.add('checkout-hidden');
    qrContent.classList.add('checkout-hidden');
    giftContent.classList.add('checkout-hidden');
    finishContent.classList.add('checkout-hidden');
  }

  function updateCheckoutMode() {
    const isGift = giftOnlyCart();
    paymentMethods.classList.toggle('checkout-hidden', isGift);
    giftCheckoutNote.classList.toggle('checkout-hidden', !isGift);
    setPayBusy(false, paymentMethodLabel(isGift ? 'gift_claim' : selectedMethod()));
  }

  function open() {
    if (!cartLines().length) {
      store.closeCart();
      window.alert('Tu carrito está vacío. Añade al menos un preset para continuar.');
      return;
    }
    if (hasMixedCart()) {
      store.closeCart();
      window.alert('El preset de regalo debe solicitarse por separado de los productos con pago. Quita uno de los tipos del carrito antes de continuar.');
      return;
    }
    if (!store.getUser()) {
      store.closeCart();
      store.requireCheckoutAuthentication();
      return;
    }
    order = null;
    checkoutToken = makeToken();
    resetScreen();
    setMessage();
    renderSummary();
    updateCheckoutMode();
    store.closeCart();
    modal.classList.add('open');
    overlay.classList.add('open');
  }

  function close() {
    modal.classList.remove('open');
    overlay.classList.remove('open');
  }

  async function createOrder(paymentMethod) {
    if (order) return order;
    const client = store.getClient();
    if (!client) throw new Error('La conexión de pagos todavía no está configurada.');
    const { data, error } = await client.rpc('create_store_order', {
      p_items: orderPayload(),
      p_payment_method: paymentMethod,
      p_checkout_token: checkoutToken,
    });
    if (error) throw error;
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.id) throw new Error('No fue posible preparar el pedido. Intenta de nuevo.');
    order = created;
    return order;
  }

  function savedOrderItems(existingOrder) {
    const savedItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
    if (savedItems.length) {
      return savedItems.map((item) => ({
        name: item.name || 'Preset',
        quantity: Number(item.quantity || 1),
        total: Number(item.line_total_mxn ?? (Number(item.unit_price_mxn || 0) * Number(item.quantity || 1))),
      }));
    }
    return cartLines().map((line) => ({
      name: line.product.name,
      quantity: line.quantity,
      total: Number(line.product.price || 0) * line.quantity,
    }));
  }

  function renderOrderItems(existingOrder, summarySelector, itemsSelector) {
    const summary = $(summarySelector);
    const container = $(itemsSelector);
    const items = savedOrderItems(existingOrder);
    if (!items.length) {
      summary.classList.add('checkout-hidden');
      container.innerHTML = '';
      return;
    }
    summary.classList.remove('checkout-hidden');
    container.innerHTML = items.map((item) => `
      <div class="bank-order-line">
        <b>${escapeHtml(item.name)}</b>
        <span>×${item.quantity}</span>
        <strong>${mxn(item.total)}</strong>
      </div>`).join('');
  }

  function showBankDetails(createdOrder) {
    $('#bank-order-code').textContent = createdOrder.order_code;
    $('#bank-total').textContent = mxn(createdOrder.total_mxn);
    renderOrderItems(createdOrder, '#bank-order-summary', '#bank-order-items');
    $('#bank-name').textContent = bank.bank || 'Pendiente de configurar';
    $('#bank-holder').textContent = bank.accountHolder || 'Pendiente de configurar';
    $('#bank-clabe').textContent = bank.clabe || 'Pendiente de configurar';
    const cardRow = $('.bank-card-row');
    $('#bank-card').textContent = bank.cardNumber || '—';
    cardRow.style.display = bank.cardNumber ? '' : 'none';
    checkoutContent.classList.add('checkout-hidden');
    qrContent.classList.add('checkout-hidden');
    giftContent.classList.add('checkout-hidden');
    bankContent.classList.remove('checkout-hidden');
  }

  function showQrDetails(createdOrder) {
    $('#paypal-qr-image').src = paypalQr.image || 'assets/paypal-qr.jpg';
    $('#paypal-qr-recipient').textContent = `Paga a ${paypalQr.recipient || 'Carlos Salatiel Martinez Jimenes'}`;
    $('#qr-order-code').textContent = createdOrder.order_code;
    $('#qr-total').textContent = mxn(createdOrder.total_mxn);
    renderOrderItems(createdOrder, '#qr-order-summary', '#qr-order-items');
    checkoutContent.classList.add('checkout-hidden');
    bankContent.classList.add('checkout-hidden');
    giftContent.classList.add('checkout-hidden');
    qrContent.classList.remove('checkout-hidden');
  }

  function showGiftDetails(createdOrder) {
    $('#gift-order-code').textContent = createdOrder.order_code;
    renderOrderItems(createdOrder, '#gift-order-summary', '#gift-order-items');
    checkoutContent.classList.add('checkout-hidden');
    bankContent.classList.add('checkout-hidden');
    qrContent.classList.add('checkout-hidden');
    giftContent.classList.remove('checkout-hidden');
  }

  function configureBankDetails() {
    return bank.bank && bank.accountHolder && bank.clabe
      && !String(bank.bank).toLowerCase().includes('pendiente')
      && !String(bank.accountHolder).toLowerCase().includes('pendiente')
      && !String(bank.clabe).toLowerCase().includes('pendiente');
  }

  function getErrorMessage(error, fallback) {
    const value = String(error?.message || error || '').toLowerCase();
    if (value.includes('session') || value.includes('jwt') || value.includes('iniciar sesión')) return 'Tu sesión terminó. Inicia sesión de nuevo para continuar.';
    if (value.includes('disponible')) return 'Uno de los productos ya no está disponible. Revisa tu carrito.';
    if (value.includes('uuid') || value.includes('input syntax')) return 'No se pudo preparar el código seguro del pedido. Recarga la página e inténtalo de nuevo.';
    if (value.includes('create_store_order') || value.includes('submit_order_proof') || value.includes('método de pago') || value.includes('schema cache') || value.includes('function')) return 'La configuración de QR y regalos necesita activarse en Supabase. Ejecuta supabase-qr-y-regalos.sql y vuelve a intentar.';
    if (value.includes('ambiguous')) return 'La configuración de pedidos necesita actualizarse en Supabase. Ejecuta supabase-qr-y-regalos.sql.';
    const code = String(error?.code || 'sin-código').slice(0, 32);
    return `${fallback} Código de revisión: ${code}.`;
  }

  async function startBankTransfer() {
    if (!configureBankDetails()) {
      setMessage('Faltan los datos de transferencia de la tienda. Contacta a KAY GUITAR antes de pagar.', 'error');
      return;
    }
    setPayBusy(true, 'Continuar');
    try {
      showBankDetails(await createOrder('bank_transfer'));
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible crear tu pedido. Intenta de nuevo.'), 'error');
    } finally {
      setPayBusy(false, 'Continuar');
    }
  }

  async function startPaypalQr() {
    setPayBusy(true, 'Mostrar código QR');
    try {
      showQrDetails(await createOrder('paypal_qr'));
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible preparar el pago con QR. Intenta de nuevo.'), 'error');
    } finally {
      setPayBusy(false, 'Mostrar código QR');
    }
  }

  async function startGiftClaim() {
    setPayBusy(true, 'Solicitar preset gratis');
    try {
      showGiftDetails(await createOrder('gift_claim'));
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible preparar la solicitud. Intenta de nuevo.'), 'error');
    } finally {
      setPayBusy(false, 'Solicitar preset gratis');
    }
  }

  async function notifyOrder(event, orderId) {
    try {
      await store.getClient().functions.invoke('order-email', { body: { event, order_id: orderId } });
    } catch (_) { /* El pedido ya quedó guardado aunque el correo se reintente después. */ }
  }

  function cleanFileName(name) {
    return String(name || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  }

  function proofConfig(kind) {
    return {
      bank: {
        input: '#receipt-file', button: '#submit-receipt-button', submissionKind: 'payment_receipt', event: 'payment_proof', label: 'comprobante', allowPdf: true,
        successTitle: 'Pedido recibido.', successCopy: 'Hemos recibido tu comprobante. En unos minutos verificaremos el pago y, una vez aprobado, recibirás un segundo correo con tus enlaces de descarga.',
      },
      qr: {
        input: '#qr-receipt-file', button: '#submit-qr-receipt-button', submissionKind: 'payment_receipt', event: 'payment_proof', label: 'comprobante de pago', allowPdf: true,
        successTitle: 'Comprobante recibido.', successCopy: 'Hemos recibido tu comprobante de pago con QR de PayPal. Verificaremos el importe antes de enviarte tus enlaces de descarga.',
      },
      gift: {
        input: '#gift-proof-file', button: '#submit-gift-proof-button', submissionKind: 'social_follow_proof', event: 'gift_requirement', label: 'captura del requisito', allowPdf: false,
        successTitle: 'Solicitud recibida.', successCopy: 'Hemos recibido tu captura. Verificaremos que sigues a @kayguitar14 antes de enviarte el preset de regalo.',
      },
    }[kind];
  }

  async function submitProof(kind) {
    const config = proofConfig(kind);
    const file = $(config.input).files?.[0];
    const permitted = config.allowPdf ? ['application/pdf', 'image/png', 'image/jpeg'] : ['image/png', 'image/jpeg'];
    const extension = config.allowPdf ? /\.(pdf|png|jpe?g)$/i : /\.(png|jpe?g)$/i;
    if (!file) { window.alert(`Selecciona tu ${config.label} antes de enviarlo.`); return; }
    if (!permitted.includes(file.type) || !extension.test(file.name)) {
      window.alert(config.allowPdf ? 'El archivo debe ser PDF, PNG, JPG o JPEG.' : 'La captura debe ser PNG, JPG o JPEG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { window.alert('El archivo supera el límite de 10 MB.'); return; }
    if (!order?.id || !store.getUser()) { window.alert('No encontramos tu pedido. Vuelve a iniciar el checkout.'); return; }

    const button = $(config.button);
    button.disabled = true;
    button.textContent = `Enviando ${config.label}…`;
    try {
      const path = `${store.getUser().id}/${order.id}/${Date.now()}-${cleanFileName(file.name)}`;
      const client = store.getClient();
      const { error: uploadError } = await client.storage.from('payment-receipts').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: proofError } = await client.rpc('submit_order_proof', {
        p_order_id: order.id,
        p_receipt_path: path,
        p_submission_kind: config.submissionKind,
      });
      if (proofError) throw proofError;
      await notifyOrder(config.event, order.id);
      showFinish(order.order_code, config.successTitle, config.successCopy);
    } catch (error) {
      window.alert(getErrorMessage(error, `No fue posible subir tu ${config.label}. Intenta de nuevo.`));
    } finally {
      button.disabled = false;
      button.innerHTML = kind === 'gift' ? 'Enviar solicitud <i>→</i>' : 'Enviar comprobante <i>→</i>';
    }
  }

  function finishCopyFor(existingOrder) {
    if (existingOrder.payment_method === 'gift_claim') return 'Tu captura ya fue enviada y la solicitud está pendiente de validación. Te avisaremos por correo cuando esté lista.';
    if (existingOrder.payment_method === 'paypal_qr') return 'Tu comprobante de pago con QR ya fue enviado y está pendiente de validación. Te avisaremos por correo cuando sea aprobado.';
    return 'Tu comprobante ya fue enviado y el pago está pendiente de validación. Te avisaremos por correo cuando sea aprobado.';
  }

  function resumeManualOrder(existingOrder) {
    if (!store.getUser()) {
      store.requireCheckoutAuthentication();
      return;
    }
    if (!existingOrder?.id || !['bank_transfer', 'paypal_qr', 'gift_claim'].includes(existingOrder.payment_method)) {
      window.alert('Este pedido no corresponde a un pago o solicitud manual.');
      return;
    }
    order = existingOrder;
    checkoutToken = null;
    resetScreen();
    if (existingOrder.status === 'pending_validation') {
      showFinish(existingOrder.order_code, existingOrder.payment_method === 'gift_claim' ? 'Captura recibida.' : 'Comprobante recibido.', finishCopyFor(existingOrder));
    } else if (existingOrder.status === 'pending_payment') {
      if (existingOrder.payment_method === 'bank_transfer') showBankDetails(existingOrder);
      if (existingOrder.payment_method === 'paypal_qr') showQrDetails(existingOrder);
      if (existingOrder.payment_method === 'gift_claim') showGiftDetails(existingOrder);
    } else {
      window.alert('Este pedido ya no requiere una acción de tu parte.');
      return;
    }
    modal.classList.add('open');
    overlay.classList.add('open');
  }

  function showFinish(orderCode, title, copy) {
    bankContent.classList.add('checkout-hidden');
    qrContent.classList.add('checkout-hidden');
    giftContent.classList.add('checkout-hidden');
    checkoutContent.classList.add('checkout-hidden');
    finishContent.classList.remove('checkout-hidden');
    $('#finish-title').textContent = title;
    $('#finish-copy').textContent = copy;
    $('#finish-order-code').textContent = orderCode;
    store.clearCart();
  }

  checkoutButton.addEventListener('click', open);
  $('.close-checkout').addEventListener('click', close);
  $('#back-to-catalog').addEventListener('click', close);
  payButton.addEventListener('click', () => {
    setMessage();
    if (giftOnlyCart()) { startGiftClaim(); return; }
    if (selectedMethod() === 'paypal_qr') startPaypalQr(); else startBankTransfer();
  });
  document.querySelectorAll('input[name="payment-method"]').forEach((input) => input.addEventListener('change', () => {
    setMessage();
    order = null;
    checkoutToken = makeToken();
    updateCheckoutMode();
  }));
  $('#show-receipt-button').addEventListener('click', () => { $('#receipt-upload').classList.remove('checkout-hidden'); $('#receipt-file').focus(); });
  $('#show-qr-receipt-button').addEventListener('click', () => { $('#qr-receipt-upload').classList.remove('checkout-hidden'); $('#qr-receipt-file').focus(); });
  $('#show-gift-proof-button').addEventListener('click', () => { $('#gift-proof-upload').classList.remove('checkout-hidden'); $('#gift-proof-file').focus(); });
  $('#submit-receipt-button').addEventListener('click', () => submitProof('bank'));
  $('#submit-qr-receipt-button').addEventListener('click', () => submitProof('qr'));
  $('#submit-gift-proof-button').addEventListener('click', () => submitProof('gift'));
  overlay.addEventListener('click', () => { if (modal.classList.contains('open')) close(); });

  window.KayGuitarCheckout = { open, close, resumeManualOrder, resumeBankTransfer: resumeManualOrder };
})();
