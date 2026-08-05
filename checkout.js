/* KAY GUITAR · Checkout
   La página sólo muestra el pedido. Supabase calcula precios, guarda el pedido
   y controla los estados; así el cliente no puede alterar los importes. */
(() => {
  const store = window.KayGuitarStore;
  if (!store) return;

  const $ = (selector) => document.querySelector(selector);
  const modal = $('#checkout-modal');
  const overlay = $('.overlay');
  const checkoutContent = $('#checkout-content');
  const bankContent = $('#bank-content');
  const finishContent = $('#checkout-finish');
  const checkoutButton = $('#checkout-button');
  const payButton = $('#checkout-pay-button');
  const paypalButtons = $('#paypal-buttons');
  const receiptUpload = $('#receipt-upload');
  const receiptFile = $('#receipt-file');
  const message = $('#checkout-message');
  const checkoutConfig = window.KAY_GUITAR_CHECKOUT || {};
  const bank = checkoutConfig.bank || {};

  let order = null;
  let checkoutToken = null;
  let paypalSdkPromise = null;

  const mxn = (value) => `$${Number(value || 0).toLocaleString('es-MX')} MXN`;
  const makeToken = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

  function setMessage(text = '', type = '') {
    message.textContent = text;
    message.className = `checkout-message ${type}`;
  }

  function setPayBusy(busy, label = 'Pagar ahora') {
    payButton.disabled = busy;
    payButton.innerHTML = busy ? 'Procesando…' : `${label} <i>→</i>`;
  }

  function selectedMethod() {
    return document.querySelector('input[name="payment-method"]:checked')?.value || 'bank_transfer';
  }

  function renderSummary() {
    const lines = cartLines();
    const localTotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    $('#checkout-items').innerHTML = lines.map(({ product, quantity }) => `
      <div class="checkout-line">
        <div><b>${product.name}</b><small>${mxn(product.price)} c/u</small></div>
        <span>×${quantity}</span><strong>${mxn(product.price * quantity)}</strong>
      </div>`).join('');
    $('#checkout-total').textContent = mxn(localTotal);
    $('#checkout-customer-name').textContent = store.getDisplayName();
    $('#checkout-customer-email').textContent = store.getUser()?.email || '—';
  }

  function open() {
    if (!cartLines().length) {
      store.closeCart();
      window.alert('Tu carrito está vacío. Añade al menos un preset para continuar.');
      return;
    }
    if (!store.getUser()) {
      store.closeCart();
      store.requireCheckoutAuthentication();
      return;
    }
    order = null;
    checkoutToken = makeToken();
    paypalButtons.innerHTML = '';
    payButton.style.display = '';
    receiptUpload.classList.add('checkout-hidden');
    checkoutContent.classList.remove('checkout-hidden');
    bankContent.classList.add('checkout-hidden');
    finishContent.classList.add('checkout-hidden');
    setMessage();
    renderSummary();
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
      p_checkout_token: checkoutToken
    });
    if (error) throw error;
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.id) throw new Error('No fue posible preparar el pedido. Intenta de nuevo.');
    order = created;
    return order;
  }

  function showBankDetails(createdOrder) {
    $('#bank-order-code').textContent = createdOrder.order_code;
    $('#bank-total').textContent = mxn(createdOrder.total_mxn);
    renderBankOrderItems(createdOrder);
    $('#bank-name').textContent = bank.bank || 'Pendiente de configurar';
    $('#bank-holder').textContent = bank.accountHolder || 'Pendiente de configurar';
    $('#bank-clabe').textContent = bank.clabe || 'Pendiente de configurar';
    const cardRow = $('.bank-card-row');
    $('#bank-card').textContent = bank.cardNumber || '—';
    cardRow.style.display = bank.cardNumber ? '' : 'none';
    checkoutContent.classList.add('checkout-hidden');
    bankContent.classList.remove('checkout-hidden');
  }

  function renderBankOrderItems(existingOrder) {
    const savedItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
    const items = savedItems.length
      ? savedItems.map(item => ({
        name: item.name || 'Preset',
        quantity: Number(item.quantity || 1),
        total: Number(item.line_total_mxn ?? item.unit_price_mxn ?? 0)
      }))
      : cartLines().map(line => ({
        name: line.product.name,
        quantity: line.quantity,
        total: line.product.price * line.quantity
      }));

    const summary = $('#bank-order-summary');
    const container = $('#bank-order-items');
    if (!items.length) {
      summary.classList.add('checkout-hidden');
      container.innerHTML = '';
      return;
    }
    summary.classList.remove('checkout-hidden');
    container.innerHTML = items.map(item => `
      <div class="bank-order-line">
        <b>${item.name}</b>
        <span>×${item.quantity}</span>
        <strong>${mxn(item.total)}</strong>
      </div>`).join('');
  }

  // Un pedido por transferencia puede retomarse desde "Mi perfil" después de
  // que el cliente salga a realizar el pago. No se crea otro pedido: se usa el
  // mismo código y solamente se habilita la carga de su comprobante.
  function resumeBankTransfer(existingOrder) {
    if (!store.getUser()) {
      store.requireCheckoutAuthentication();
      return;
    }
    if (!existingOrder?.id || existingOrder.payment_method !== 'bank_transfer') {
      window.alert('Este pedido no corresponde a una transferencia bancaria.');
      return;
    }

    order = existingOrder;
    checkoutToken = null;
    paypalButtons.innerHTML = '';
    payButton.style.display = '';
    receiptFile.value = '';
    receiptUpload.classList.add('checkout-hidden');
    finishContent.classList.add('checkout-hidden');

    if (existingOrder.status === 'pending_validation') {
      bankContent.classList.add('checkout-hidden');
      checkoutContent.classList.add('checkout-hidden');
      showFinish(
        existingOrder.order_code,
        'Comprobante recibido.',
        'Tu comprobante ya fue enviado y el pago está pendiente de validación. Te avisaremos por correo cuando sea aprobado.'
      );
    } else if (existingOrder.status === 'pending_payment') {
      showBankDetails(existingOrder);
    } else {
      window.alert('Este pedido ya no requiere un comprobante.');
      return;
    }

    modal.classList.add('open');
    overlay.classList.add('open');
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
    return fallback;
  }

  async function startBankTransfer() {
    if (!configureBankDetails()) {
      setMessage('Faltan los datos de transferencia de la tienda. Contacta a KAY GUITAR antes de pagar.', 'error');
      return;
    }
    setPayBusy(true, 'Continuar');
    try {
      const created = await createOrder('bank_transfer');
      showBankDetails(created);
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible crear tu pedido. Intenta de nuevo.'), 'error');
    } finally {
      setPayBusy(false, 'Continuar');
    }
  }

  function loadPayPalSdk() {
    if (window.paypal) return Promise.resolve(window.paypal);
    if (paypalSdkPromise) return paypalSdkPromise;
    const clientId = checkoutConfig.paypalClientId;
    if (!clientId) return Promise.reject(new Error('PayPal aún no está configurado.'));
    paypalSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(checkoutConfig.paypalCurrency || 'MXN')}&intent=capture&components=buttons`;
      script.onload = () => resolve(window.paypal);
      script.onerror = () => reject(new Error('No se pudo cargar PayPal. Revisa tu conexión e intenta de nuevo.'));
      document.head.appendChild(script);
    });
    return paypalSdkPromise;
  }

  async function startPayPal() {
    if (!checkoutConfig.paypalClientId) {
      setMessage('PayPal aún no está disponible. Elige transferencia bancaria o intenta más tarde.', 'error');
      return;
    }
    setPayBusy(true);
    try {
      const created = await createOrder('paypal');
      const client = store.getClient();
      const { data, error } = await client.functions.invoke('paypal-create-order', { body: { order_id: created.id } });
      if (error) throw error;
      if (!data?.paypal_order_id) throw new Error('PayPal no devolvió un identificador de pago.');
      const paypal = await loadPayPalSdk();
      paypalButtons.innerHTML = '';
      payButton.style.display = 'none';
      setMessage('Confirma tu pago de forma segura con PayPal.', 'success');
      paypal.Buttons({
        createOrder: () => data.paypal_order_id,
        onApprove: async () => {
          setMessage('Confirmando tu pago…');
          const captured = await client.functions.invoke('paypal-capture-order', { body: { order_id: created.id } });
          if (captured.error || !captured.data?.approved) {
            setMessage('PayPal no pudo confirmar el pago. Revisa tu cuenta antes de volver a intentarlo.', 'error');
            return;
          }
          showFinish(created.order_code, 'Pago aprobado.', 'Gracias por tu compra. Tu pago fue aprobado correctamente. En unos minutos recibirás un correo con tus enlaces de descarga.');
        },
        onCancel: () => {
          payButton.style.display = '';
          setMessage('El pago se canceló. Tu pedido quedó pendiente de pago.', 'error');
        },
        onError: () => {
          payButton.style.display = '';
          setMessage('PayPal no pudo procesar el pago. Intenta de nuevo o usa transferencia.', 'error');
        }
      }).render('#paypal-buttons');
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible iniciar PayPal. Intenta de nuevo.'), 'error');
    } finally {
      setPayBusy(false);
    }
  }

  async function notifyOrder(event, orderId) {
    // El correo es una función de servidor. Si aún no fue desplegada, el pedido
    // sigue guardado; no se muestra un error de pago por un fallo de correo.
    try {
      await store.getClient().functions.invoke('order-email', { body: { event, order_id: orderId } });
    } catch (_) { /* La función se activa al terminar la configuración de correo. */ }
  }

  function cleanFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  }

  async function submitReceipt() {
    const file = receiptFile.files?.[0];
    const permitted = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!file) { window.alert('Selecciona tu comprobante antes de enviarlo.'); return; }
    if (!permitted.includes(file.type) || !/\.(pdf|png|jpe?g)$/i.test(file.name)) {
      window.alert('El comprobante debe ser PDF, PNG, JPG o JPEG.'); return;
    }
    if (file.size > 10 * 1024 * 1024) { window.alert('El comprobante supera el límite de 10 MB.'); return; }
    if (!order?.id || !store.getUser()) { window.alert('No encontramos tu pedido. Vuelve a iniciar el checkout.'); return; }

    const button = $('#submit-receipt-button');
    button.disabled = true;
    button.textContent = 'Enviando comprobante…';
    try {
      const path = `${store.getUser().id}/${order.id}/${Date.now()}-${cleanFileName(file.name)}`;
      const client = store.getClient();
      const { error: uploadError } = await client.storage.from('payment-receipts').upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { error: receiptError } = await client.rpc('submit_bank_receipt', {
        p_order_id: order.id,
        p_receipt_path: path
      });
      if (receiptError) throw receiptError;
      await notifyOrder('bank_receipt', order.id);
      showFinish(order.order_code, 'Pedido recibido.', 'Hemos recibido tu comprobante. En unos minutos verificaremos el pago y, una vez aprobado, recibirás un segundo correo con tus enlaces de descarga.');
    } catch (error) {
      window.alert(getErrorMessage(error, 'No fue posible subir el comprobante. Intenta de nuevo.'));
    } finally {
      button.disabled = false;
      button.innerHTML = 'Enviar comprobante <i>→</i>';
    }
  }

  function showFinish(orderCode, title, copy) {
    bankContent.classList.add('checkout-hidden');
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
    if (selectedMethod() === 'paypal') startPayPal(); else startBankTransfer();
  });
  document.querySelectorAll('input[name="payment-method"]').forEach((input) => input.addEventListener('change', () => {
    setMessage();
    order = null;
    checkoutToken = makeToken();
    paypalButtons.innerHTML = '';
    payButton.style.display = '';
  }));
  $('#show-receipt-button').addEventListener('click', () => {
    receiptUpload.classList.remove('checkout-hidden');
    receiptFile.focus();
  });
  $('#submit-receipt-button').addEventListener('click', submitReceipt);
  overlay.addEventListener('click', () => { if (modal.classList.contains('open')) close(); });

  window.KayGuitarCheckout = { open, close, resumeBankTransfer };
})();
