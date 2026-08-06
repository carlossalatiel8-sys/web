(() => {
  const config = window.KAY_GUITAR_SUPABASE;
  const state = { orders: [], filter: 'all', client: null };
  const $ = (selector) => document.querySelector(selector);
  const message = $('#admin-message');
  const content = $('#admin-content');
  const ordersContainer = $('#admin-orders');
  const accountStatus = $('#admin-account-status');
  const receiptModal = $('#receipt-modal');
  const receiptPreview = $('#receipt-preview');
  const receiptTitle = $('#receipt-title');
  const labels = { pending_payment: 'Pendiente de pago', pending_validation: 'Pendiente de validación', payment_approved: 'Pago aprobado', payment_rejected: 'Pago rechazado', cancelled: 'Cancelado', delivered: 'Entregado' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }
  function setMessage(text = '', type = '') { message.textContent = text; message.className = `admin-message ${type}`; }
  function productsText(items) { return Array.isArray(items) && items.length ? items.map((item) => `${item.name || 'Preset'} × ${item.quantity || 1}`).join(', ') : 'Sin detalle'; }
  function canDeliver(order) { return ['pending_validation', 'payment_approved'].includes(order.status); }

  function render() {
    const visible = state.filter === 'all' ? state.orders : state.orders.filter((order) => order.status === state.filter);
    if (!visible.length) { ordersContainer.innerHTML = '<div class="admin-empty">No hay pedidos en este filtro.</div>'; return; }
    ordersContainer.innerHTML = visible.map((order) => {
      const delivery = canDeliver(order) ? `<div class="admin-delivery"><div class="admin-links"><input class="admin-drive-input" type="url" placeholder="Pega aquí el enlace de Google Drive" aria-label="Enlace de Drive para ${escapeHtml(order.order_code)}" /><button class="admin-add-link" type="button">+ Añadir otro enlace</button></div><button class="button gold admin-deliver" type="button" data-order-id="${escapeHtml(order.id)}">Enviar y marcar entregado</button></div>` : '';
      const savedLink = Array.isArray(order.download_links) && order.download_links[0]?.url ? `<div class="admin-order-details"><div>Enlaces enviados<b>${order.download_links.map((link, index) => `<a class="admin-back admin-saved-link" target="_blank" rel="noreferrer" href="${escapeHtml(link.url)}">Abrir enlace ${index + 1} ↗</a>`).join('')}</b></div></div>` : '';
      const receiptButton = order.receipt_path ? `<button class="admin-secondary admin-view-receipt" type="button" data-order-id="${escapeHtml(order.id)}" data-order-code="${escapeHtml(order.order_code)}">Ver comprobante</button>` : '';
      return `<article class="admin-order"><div class="admin-order-top"><div><b class="admin-order-code">${escapeHtml(order.order_code || 'SIN CÓDIGO')}</b><h2 class="admin-order-name">${escapeHtml(order.customer_name)}</h2><p class="admin-order-email">${escapeHtml(order.customer_email)}</p></div><span class="admin-order-state">${escapeHtml(labels[order.status] || order.status)}</span></div><div class="admin-order-details"><div>Productos<b>${escapeHtml(productsText(order.items))}</b></div><div>Total<b>$${escapeHtml(order.total_mxn)} MXN</b></div><div>Fecha<b>${new Date(order.created_at).toLocaleString('es-MX')}</b></div></div>${delivery}<div class="admin-order-actions">${receiptButton}<button class="admin-delete admin-delete-order" type="button" data-order-id="${escapeHtml(order.id)}" data-order-code="${escapeHtml(order.order_code)}">Eliminar pedido</button></div>${savedLink}</article>`;
    }).join('');
  }

  async function loadOrders() {
    setMessage('Actualizando pedidos…');
    const { data, error } = await state.client.from('orders').select('id, order_code, customer_name, customer_email, items, total_mxn, status, created_at, download_links, receipt_path').order('created_at', { ascending: false });
    if (error) { setMessage('No fue posible cargar los pedidos. Vuelve a iniciar sesión e intenta de nuevo.', 'error'); return; }
    state.orders = data || []; setMessage(`${state.orders.length} pedido(s) encontrado(s).`, 'success'); render();
  }

  async function deliver(button) {
    const card = button.closest('.admin-order');
    const inputs = [...card.querySelectorAll('.admin-drive-input')];
    const downloadUrls = inputs.map((input) => input.value.trim()).filter(Boolean);
    if (!downloadUrls.length) { setMessage('Pega primero al menos un enlace de Google Drive.', 'error'); inputs[0].focus(); return; }
    if (!window.confirm('¿Enviar el correo de entrega y marcar este pedido como entregado?')) return;
    button.disabled = true; button.textContent = 'Enviando…'; setMessage('Enviando correo y actualizando pedido…');
    const { data, error } = await state.client.functions.invoke('deliver-order', { body: { order_id: button.dataset.orderId, download_urls: downloadUrls } });
    if (error || !data?.ok) { const detail = data?.error || error?.message || 'Intenta de nuevo.'; setMessage(`No se pudo entregar el pedido. ${detail}`, 'error'); button.disabled = false; button.textContent = 'Enviar y marcar entregado'; return; }
    setMessage(`Listo: ${data.order_code} fue enviado por correo y marcado como entregado.`, 'success'); await loadOrders();
  }

  async function getOrderTool(body) {
    const { data, error } = await state.client.functions.invoke('admin-order-tools', { body });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Intenta de nuevo.');
    return data;
  }

  async function viewReceipt(button) {
    setMessage('Abriendo comprobante…');
    try {
      const data = await getOrderTool({ action: 'receipt', order_id: button.dataset.orderId });
      receiptTitle.textContent = `Pedido ${button.dataset.orderCode}`;
      receiptPreview.innerHTML = data.mime_type?.startsWith('image/')
        ? `<img src="${escapeHtml(data.signed_url)}" alt="Comprobante ${escapeHtml(button.dataset.orderCode)}" />`
        : `<iframe src="${escapeHtml(data.signed_url)}" title="Comprobante ${escapeHtml(button.dataset.orderCode)}"></iframe>`;
      receiptModal.hidden = false;
      setMessage('');
    } catch (error) { setMessage(`No fue posible abrir el comprobante. ${error.message}`, 'error'); }
  }

  async function deleteOrder(button) {
    const orderCode = button.dataset.orderCode;
    const typedCode = window.prompt(`Esta acción elimina permanentemente el pedido y su comprobante. Para confirmar, escribe exactamente ${orderCode}`);
    if (typedCode !== orderCode) { if (typedCode !== null) setMessage('El código no coincide. El pedido no se eliminó.', 'error'); return; }
    button.disabled = true; button.textContent = 'Eliminando…'; setMessage('Eliminando pedido…');
    try {
      await getOrderTool({ action: 'delete', order_id: button.dataset.orderId, confirm_order_code: orderCode });
      setMessage(`${orderCode} fue eliminado.`, 'success');
      await loadOrders();
    } catch (error) { setMessage(`No fue posible eliminar el pedido. ${error.message}`, 'error'); button.disabled = false; button.textContent = 'Eliminar pedido'; }
  }

  async function start() {
    if (!config?.url || !config?.anonKey || !window.supabase) { accountStatus.textContent = 'Falta la configuración de la tienda.'; return; }
    state.client = window.supabase.createClient(config.url, config.anonKey);
    const { data: { user } } = await state.client.auth.getUser();
    if (!user) { accountStatus.textContent = 'Inicia sesión con tu cuenta de administrador desde la tienda para continuar.'; return; }
    if (user.app_metadata?.role !== 'admin') { accountStatus.textContent = 'Esta cuenta todavía no tiene permisos de administración.'; return; }
    accountStatus.textContent = `Sesión de administrador: ${user.email}`; content.hidden = false; await loadOrders();
  }
  document.addEventListener('click', (event) => {
    const filter = event.target.closest('.admin-filter');
    if (filter) { state.filter = filter.dataset.filter; document.querySelectorAll('.admin-filter').forEach((item) => item.classList.toggle('active', item === filter)); render(); }
    const deliverButton = event.target.closest('.admin-deliver'); if (deliverButton) deliver(deliverButton);
    const addLinkButton = event.target.closest('.admin-add-link');
    if (addLinkButton) {
      const links = addLinkButton.closest('.admin-links');
      const input = document.createElement('input');
      input.className = 'admin-drive-input'; input.type = 'url'; input.placeholder = 'Otro enlace de Google Drive'; input.setAttribute('aria-label', 'Otro enlace de Google Drive');
      links.insertBefore(input, addLinkButton); input.focus();
    }
    const receiptButton = event.target.closest('.admin-view-receipt'); if (receiptButton) viewReceipt(receiptButton);
    const deleteButton = event.target.closest('.admin-delete-order'); if (deleteButton) deleteOrder(deleteButton);
  });
  $('#admin-refresh').addEventListener('click', loadOrders);
  $('#receipt-close').addEventListener('click', () => { receiptModal.hidden = true; receiptPreview.innerHTML = ''; });
  receiptModal.addEventListener('click', (event) => { if (event.target === receiptModal) { receiptModal.hidden = true; receiptPreview.innerHTML = ''; } });
  $('#admin-logout').addEventListener('click', async () => {
    if (state.client) await state.client.auth.signOut();
    window.location.href = 'index.html';
  });
  start();
})();
