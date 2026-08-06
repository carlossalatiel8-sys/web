(() => {
  const config = window.KAY_GUITAR_SUPABASE;
  const state = { orders: [], filter: 'all', client: null };
  const $ = (selector) => document.querySelector(selector);
  const message = $('#admin-message');
  const content = $('#admin-content');
  const ordersContainer = $('#admin-orders');
  const accountStatus = $('#admin-account-status');
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
      const delivery = canDeliver(order) ? `<div class="admin-delivery"><input class="admin-drive-input" type="url" placeholder="Pega aquí el enlace de Google Drive" aria-label="Enlace de Drive para ${escapeHtml(order.order_code)}" /><button class="button gold admin-deliver" type="button" data-order-id="${escapeHtml(order.id)}">Enviar y marcar entregado</button></div>` : '';
      const savedLink = Array.isArray(order.download_links) && order.download_links[0]?.url ? `<div class="admin-order-details"><div>Enlace enviado<b><a class="admin-back" target="_blank" rel="noreferrer" href="${escapeHtml(order.download_links[0].url)}">Abrir Drive ↗</a></b></div></div>` : '';
      return `<article class="admin-order"><div class="admin-order-top"><div><b class="admin-order-code">${escapeHtml(order.order_code || 'SIN CÓDIGO')}</b><h2 class="admin-order-name">${escapeHtml(order.customer_name)}</h2><p class="admin-order-email">${escapeHtml(order.customer_email)}</p></div><span class="admin-order-state">${escapeHtml(labels[order.status] || order.status)}</span></div><div class="admin-order-details"><div>Productos<b>${escapeHtml(productsText(order.items))}</b></div><div>Total<b>$${escapeHtml(order.total_mxn)} MXN</b></div><div>Fecha<b>${new Date(order.created_at).toLocaleString('es-MX')}</b></div></div>${delivery}${savedLink}</article>`;
    }).join('');
  }

  async function loadOrders() {
    setMessage('Actualizando pedidos…');
    const { data, error } = await state.client.from('orders').select('id, order_code, customer_name, customer_email, items, total_mxn, status, created_at, download_links').order('created_at', { ascending: false });
    if (error) { setMessage('No fue posible cargar los pedidos. Vuelve a iniciar sesión e intenta de nuevo.', 'error'); return; }
    state.orders = data || []; setMessage(`${state.orders.length} pedido(s) encontrado(s).`, 'success'); render();
  }

  async function deliver(button) {
    const card = button.closest('.admin-order');
    const input = card.querySelector('.admin-drive-input');
    const downloadUrl = input.value.trim();
    if (!downloadUrl) { setMessage('Pega primero el enlace de Google Drive.', 'error'); input.focus(); return; }
    if (!window.confirm('¿Enviar el correo de entrega y marcar este pedido como entregado?')) return;
    button.disabled = true; button.textContent = 'Enviando…'; setMessage('Enviando correo y actualizando pedido…');
    const { data, error } = await state.client.functions.invoke('deliver-order', { body: { order_id: button.dataset.orderId, download_url: downloadUrl } });
    if (error || !data?.ok) { const detail = data?.error || error?.message || 'Intenta de nuevo.'; setMessage(`No se pudo entregar el pedido. ${detail}`, 'error'); button.disabled = false; button.textContent = 'Enviar y marcar entregado'; return; }
    setMessage(`Listo: ${data.order_code} fue enviado por correo y marcado como entregado.`, 'success'); await loadOrders();
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
  });
  $('#admin-refresh').addEventListener('click', loadOrders);
  $('#admin-logout').addEventListener('click', async () => {
    if (state.client) await state.client.auth.signOut();
    window.location.href = 'index.html';
  });
  start();
})();
