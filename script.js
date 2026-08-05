const products = [
  { id: 'clean-amb-od', name: 'Clean Amb OD', category: 'Worship', tags: ['Worship','Ambient','Clean'], price: 50, usd: '3.00', art: "linear-gradient(135deg,#0004,#0008),url('assets/clean-amb-od-amp.png') center/cover", badges: ['GP200','GP200LT'], description: 'Este preset está diseñado con un enfoque worship, ambiente y clean. Parte de un tono limpio con profundidad y espacio para acompañar, y añade la opción de activar overdrive para lograr una saturación más intensa cuando la canción lo requiere.', demo: 'https://www.tiktok.com/@carlos_martineztf/video/7669144827019414805', image: 'assets/clean-amb-od-amp.png' },
  { id: 'clean-chorus', name: 'Clean Chorus', category: 'Clean', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#29413f,#101516)', badges: ['GP200','GP200LT'] },
  { id: 'clean-punch', name: 'Clean Punch', category: 'Clean', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#243343,#101516)', badges: ['GP200','GP200LT'] },
  { id: 'victoria-averly-morillo', name: 'Victoria — Averly Morillo', category: 'Worship', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#463724,#17130e)', badges: ['GP200','GP200R'] },
  { id: 'preset-regalo', name: 'Preset de regalo', category: 'Especial', price: 0, usd: 'Gratis', art: 'linear-gradient(135deg,#5b472a,#17130e)', badges: ['SIGUE @KAYGUITAR14','GP200'] },
  { id: 'pack-ac30-carol-jc', name: 'AC30 • Carol Ann • JC', category: 'Pack', price: 300, usd: '16.50', art: 'linear-gradient(135deg,#5a4328,#17120c)', badges: ['10 PRESETS','GP200'] },
  { id: 'essential-tone-pack', name: 'Essential Tone Pack', category: 'Pack', price: 120, usd: '6.80', art: 'linear-gradient(135deg,#313428,#11120f)', badges: ['PACK','GP200'] }
];
const victoriaPreset = products.find(p => p.name.includes('Victoria'));
Object.assign(victoriaPreset, {
  category: 'Worship',
  tags: ['Worship', 'Ambient'],
  art: "linear-gradient(135deg,#0002,#0007),url('assets/victoria-averly-morillo.png') center/cover",
  image: 'assets/victoria-averly-morillo.png',
  demo: 'https://www.tiktok.com/@carlos_martineztf/video/7659601569691847957',
  description: 'Este preset fue pensado para tocar la canción “Victoria” de Averly Morillo, con un enfoque worship y ambient para crear espacios amplios, profundos y expresivos.'
});
const cleanChorusPreset = products.find(p => p.name === 'Clean Chorus');
Object.assign(cleanChorusPreset, {
  tags: ['Clean', 'Chorus', 'Pop'],
  art: "linear-gradient(135deg,#0002,#0007),url('assets/clean-chorus-amp.png') center/cover",
  image: 'assets/clean-chorus-amp.png',
  demo: 'https://www.tiktok.com/@carlos_martineztf/video/7630749831346048277',
  description: 'Este preset fue pensado para lograr un limpio brillante, amplio y con chorus envolvente, inspirado en las guitarras de la balada pop mexicana de finales de los años 80 y 90. Ideal para arpegios definidos, acompañamientos con movimiento y melodías con un aire clásico y elegante.'
});
const cleanPunchPreset = products.find(p => p.name === 'Clean Punch');
Object.assign(cleanPunchPreset, {
  tags: ['Funk', 'Clean', 'Crunch'],
  art: "linear-gradient(135deg,#0002,#0007),url('assets/clean-punch-amp.png') center/cover",
  image: 'assets/clean-punch-amp.png',
  description: 'Este preset está pensado para tocar funk con un ataque firme y muy definido. Su compresión mantiene cada nota pareja y con presencia, mientras que el ligero toque de crunch aporta carácter sin perder claridad. Ideal para rítmicas con groove, acordes con staccato y canciones de alabanza como “En el Nombre de Jesús”.'
});
const giftPreset = products.find(p => p.name === 'Preset de regalo');
Object.assign(giftPreset, {
  category: 'Worship',
  tags: ['Worship', 'High Gain', 'Ambient'],
  art: "linear-gradient(135deg,#0001,#0008),url('assets/preset-de-regalo.png') center/cover",
  image: 'assets/preset-de-regalo.png',
  demo: 'https://www.tiktok.com/@carlos_martineztf/video/7670328884759498005',
  description: 'Para recibir este preset gratis, debes seguir a @kayguitar14 en Instagram y enviar por WhatsApp una captura de pantalla que lo compruebe. El preset está diseñado para worship con un carácter high gain: ofrece ganancia, sustain y definición para líneas melódicas y momentos de mayor intensidad. Conserva un ambiente amplio para que el sonido se mantenga grande, expresivo y listo para destacar en la mezcla.'
});
const CART_STORAGE_KEY = 'kay-guitar-cart-v1';
function loadSavedCart() {
  try {
    const savedIds = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(savedIds)) return [];
    return savedIds.map(id => products.find(product => product.id === id)).filter(Boolean);
  } catch (_) {
    return [];
  }
}
function saveCart() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.map(product => product.id)));
  } catch (_) { /* El carrito sigue funcionando aunque el navegador bloquee el almacenamiento. */ }
}
const grid = document.querySelector('#product-grid'); let cart = loadSavedCart();
function renderProducts(list = products) {
  grid.innerHTML = list.length ? list.map((p, index) => `<article class="product" data-demo="${products.indexOf(p)}"><div class="product-image" style="--art:${p.art}"><span class="product-tag">${p.category}</span>${p.image ? '' : '<div class="speaker"></div>'}</div><div class="product-body"><h3>${p.name}</h3><div class="badges">${(p.tags || []).map(b => `<span>${b}</span>`).join('')}${p.badges.map(b => `<span>${b}</span>`).join('')}</div><div class="product-bottom"><div class="price"><strong>${p.price ? '$' + p.price : 'GRATIS'}</strong> <small>${p.price ? 'MXN · ≈ $' + p.usd + ' USD' : 'Sigue @kayguitar14 y envía captura'}</small></div><button class="add-button" data-index="${products.indexOf(p)}">+ Añadir</button></div><button class="demo-button" data-demo="${products.indexOf(p)}">Ver descripción y demo ↗</button></div></article>`).join('') : '<p>No encontramos presets con esa búsqueda.</p>';
}
function renderCart() {
  const items = document.querySelector('#cart-items'); const total = cart.reduce((s, p) => s + p.price, 0);
  document.querySelector('#cart-count').textContent = cart.length; document.querySelector('#cart-title-count').textContent = cart.length; document.querySelector('#cart-total').textContent = `$${total} MXN`;
  items.innerHTML = cart.length ? cart.map((p,i) => `<div class="cart-item"><div class="cart-item-art" style="background:${p.art}"></div><div><h4>${p.name}</h4><p>$${p.price} MXN</p><button data-remove="${i}">Quitar</button></div></div>`).join('') : '<p class="empty-cart">Tu carrito está esperando un gran tono.</p>';
  saveCart();
}
renderProducts();
renderCart();
document.querySelector('#search').addEventListener('input', e => { const q=e.target.value.toLowerCase(); renderProducts(products.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q))); });
document.querySelector('.filters').addEventListener('click', e => { if(!e.target.matches('button')) return; document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); const f=e.target.dataset.filter; document.querySelector('#search').value=''; renderProducts(f==='Todos' ? products : products.filter(p => p.category === f || (p.tags || []).includes(f))); });
document.addEventListener('click', e => {
  const addTarget = e.target.closest('.add-button');
  if(addTarget) {
    const product = products[addTarget.dataset.index];
    if (!product) return;
    cart.push(product);
    renderCart();
    document.querySelector('.preset-modal').classList.remove('open');
    document.querySelector('.cart-panel').classList.add('open');
    document.querySelector('.overlay').classList.add('open');
    return;
  }
  if(e.target.matches('[data-remove]')) {cart.splice(e.target.dataset.remove,1);renderCart();return;}
  const demoTarget = e.target.closest('[data-demo]');
  if(demoTarget) openPreset(products[demoTarget.dataset.demo]);
});
function toggleCart(){document.querySelector('.cart-panel').classList.toggle('open');document.querySelector('.overlay').classList.toggle('open');}
document.querySelector('.cart-button').onclick=toggleCart;document.querySelector('.close-cart').onclick=toggleCart;
function toggleAccount(){document.querySelector('.account-modal').classList.toggle('open');document.querySelector('.overlay').classList.toggle('open');}
document.querySelector('.account-button').onclick=toggleAccount;document.querySelector('.close-account').onclick=toggleAccount;
document.querySelector('.overlay').onclick=()=>{document.querySelector('.cart-panel').classList.remove('open');document.querySelector('.account-modal').classList.remove('open');document.querySelector('.preset-modal').classList.remove('open');document.querySelector('.overlay').classList.remove('open');};
document.querySelector('.menu-button').onclick=()=>document.querySelector('.nav').classList.toggle('mobile-open');
const instagramLink = document.querySelector('a[href="https://instagram.com/kayguitar"]');
if (instagramLink) { instagramLink.href = 'https://instagram.com/kayguitar14'; instagramLink.querySelector('b').textContent = '@kayguitar14'; }
const presetModal = document.querySelector('.preset-modal');
function openPreset(p) {
  document.querySelector('#preset-modal-title').textContent = p.name;
  document.querySelector('#preset-modal-description').textContent = p.description || 'Este preset fue creado para darte un sonido inspirador, listo para tocar en tu Valeton GP200.';
  document.querySelector('#preset-modal-price').textContent = p.price ? `$${p.price} MXN · ≈ $${p.usd} USD` : 'GRATIS';
  document.querySelector('#preset-modal-tags').innerHTML = (p.tags || [p.category]).map(tag => `<span>${tag}</span>`).join('') + p.badges.map(tag => `<span>${tag}</span>`).join('');
  const image = document.querySelector('#preset-modal-image'); image.style.backgroundImage = p.image ? `url('${p.image}')` : p.art;
  const demo = document.querySelector('#preset-demo-link'); demo.href = p.demo || '#'; demo.style.display = p.demo ? 'inline-flex' : 'none';
  const addButton = document.querySelector('#preset-add-button');
  addButton.dataset.index = products.indexOf(p);
  addButton.innerHTML = p.price ? 'Añadir al carrito <i>→</i>' : 'Añadir regalo al carrito <i>→</i>';
  document.querySelector('#preset-demo-note').textContent = p.demo ? 'Abre el video demo en TikTok.' : 'Video demo próximamente.';
  presetModal.classList.add('open'); document.querySelector('.overlay').classList.add('open');
}
document.querySelector('.close-preset').onclick=()=>{presetModal.classList.remove('open');document.querySelector('.overlay').classList.remove('open');};
const suggestionForm = document.querySelector('#suggestion-form');
suggestionForm?.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#suggestion-name').value.trim();
  const suggestion = document.querySelector('#suggestion-message').value.trim();
  const status = document.querySelector('#suggestion-status');
  if (!suggestion) { status.textContent = 'Escribe tu sugerencia antes de enviarla.'; return; }
  const intro = name ? `Soy ${name}.` : 'Prefiero enviar mi sugerencia sin nombre.';
  const message = `Hola KAY GUITAR, tengo una sugerencia para la página o el catálogo.\n\n${intro}\n\nSugerencia:\n${suggestion}`;
  status.textContent = 'Abriendo WhatsApp para enviar tu sugerencia…';
  window.open(`https://wa.me/5219616523528?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  suggestionForm.reset();
});
const usernameInput = document.querySelector('#username-input');
const usernameStatus = document.querySelector('#username-status');
const saveUsername = document.querySelector('#save-username');
const usernameModal = document.querySelector('.account-modal');
const emailInput = document.querySelector('#email-input');
const authIdentifierLabel = document.querySelector('#auth-identifier-label');
const passwordInput = document.querySelector('#password-input');
const authStatus = document.querySelector('#auth-status');
const usernameField = document.querySelector('.username-field');
const passwordLabel = passwordInput.closest('label');
passwordLabel.classList.add('password-label');
passwordInput.insertAdjacentHTML('afterend', '<button type="button" class="password-toggle" data-target="password-input" aria-label="Mostrar contraseña"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button>');
passwordLabel.insertAdjacentHTML('afterend', '<label class="confirm-password-field password-label">Confirma tu contraseña<input id="confirm-password-input" type="password" autocomplete="new-password" minlength="8" placeholder="Vuelve a escribir tu contraseña" /><button type="button" class="password-toggle" data-target="confirm-password-input" aria-label="Mostrar contraseña"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button></label>');
const confirmPasswordInput = document.querySelector('#confirm-password-input');
const confirmPasswordField = document.querySelector('.confirm-password-field');
const reservedNames = ['admin', 'administrador', 'support', 'soporte', 'kayguitar', 'kayu'];
const supabaseSettings = window.KAY_GUITAR_SUPABASE || {};
const isConfigured = supabaseSettings.url && supabaseSettings.anonKey && !supabaseSettings.url.startsWith('PEGA_') && !supabaseSettings.anonKey.startsWith('PEGA_');
const supabaseClient = isConfigured ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey) : null;
let mustSignIn = false;
let authMode = 'register';
let usernameAvailable = false;
let usernameCheckId = 0;
let currentAuthUser = null;
let currentProfileName = '';
let resumeCheckoutAfterAuth = false;

function setAuthMessage(message = '', type = '') { authStatus.textContent = message; authStatus.className = `auth-status ${type}`; }
function translateAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('rate limit') || message.includes('email rate')) return 'Se alcanzó el límite temporal de correos de confirmación. Espera un momento antes de intentarlo de nuevo o usa otro correo ya registrado.';
  if (message.includes('already registered') || message.includes('already exists')) return 'Este correo ya tiene una cuenta. Usa “Iniciar sesión”.';
  if (message.includes('password')) return 'La contraseña debe tener al menos 8 caracteres.';
  return 'No fue posible crear la cuenta. Revisa tus datos e inténtalo nuevamente.';
}
function validEmail() { return /^\S+@\S+\.\S+$/.test(emailInput.value.trim()); }
function validLoginIdentifier() { return validEmail() || /^[a-zA-Z0-9_-]{3,20}$/.test(emailInput.value.trim()); }
function validPassword() { return passwordInput.value.length >= 8; }
function updateSubmitButton() {
  const passwordsMatch = authMode === 'login' || (confirmPasswordInput.value.length > 0 && passwordInput.value === confirmPasswordInput.value);
  if (authMode === 'register' && confirmPasswordInput.value.length > 0 && !passwordsMatch) setAuthMessage('Las contraseñas no coinciden.', 'error');
  if (authMode === 'register' && passwordsMatch && authStatus.textContent === 'Las contraseñas no coinciden.') setAuthMessage();
  const ready = isConfigured && (authMode === 'login' ? validLoginIdentifier() : validEmail()) && validPassword() && passwordsMatch && (authMode === 'login' || usernameAvailable);
  saveUsername.disabled = !ready;
}
async function updateUsernameStatus() {
  const name = usernameInput.value.trim(); const normalized = name.toLowerCase();
  const valid = /^[a-zA-Z0-9_-]{3,20}$/.test(name);
  usernameAvailable = false; updateSubmitButton();
  if (!name) { usernameStatus.textContent = 'Usa de 3 a 20 caracteres: letras, números, _ o -.'; usernameStatus.className = 'username-status'; return; }
  if (!valid) { usernameStatus.textContent = 'El nombre debe tener entre 3 y 20 caracteres, sin espacios.'; usernameStatus.className = 'username-status unavailable'; return; }
  if (reservedNames.includes(normalized)) { usernameStatus.textContent = 'Este nombre de usuario no está disponible.'; usernameStatus.className = 'username-status unavailable'; return; }
  if (!supabaseClient) { usernameStatus.textContent = 'La conexión de cuentas aún no está configurada.'; usernameStatus.className = 'username-status unavailable'; return; }
  const requestId = ++usernameCheckId; usernameStatus.textContent = 'Comprobando disponibilidad…'; usernameStatus.className = 'username-status';
  const { data, error } = await supabaseClient.from('profiles').select('username').eq('username', normalized).maybeSingle();
  if (requestId !== usernameCheckId) return;
  if (error) { usernameStatus.textContent = 'No fue posible comprobar el nombre. Intenta de nuevo.'; usernameStatus.className = 'username-status unavailable'; return; }
  usernameAvailable = !data; usernameStatus.textContent = usernameAvailable ? '✓ Nombre de usuario disponible.' : 'Este nombre de usuario no está disponible.'; usernameStatus.className = `username-status ${usernameAvailable ? 'available' : 'unavailable'}`; updateSubmitButton();
}
function setAuthMode(mode) {
  authMode = mode; const registering = mode === 'register';
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
  usernameField.style.display = registering ? '' : 'none'; usernameStatus.style.display = registering ? '' : 'none';
  confirmPasswordField.style.display = registering ? '' : 'none';
  document.querySelector('#auth-title').innerHTML = registering ? 'Crea tu<br /><em>cuenta.</em>' : 'Inicia<br /><em>sesión.</em>';
  document.querySelector('#auth-intro').textContent = registering ? 'Tu contraseña es solo para KAY GUITAR; no tiene que ser la de tu correo.' : 'Usa tu correo o nombre de usuario junto con la contraseña de tu cuenta KAY GUITAR.';
  authIdentifierLabel.textContent = registering ? 'Correo electrónico' : 'Correo o nombre de usuario';
  emailInput.type = registering ? 'email' : 'text';
  emailInput.autocomplete = registering ? 'email' : 'username';
  emailInput.placeholder = registering ? 'tu@correo.com' : 'tu@correo.com o guitarrista_01';
  saveUsername.innerHTML = registering ? 'Crear cuenta <i>→</i>' : 'Entrar <i>→</i>'; passwordInput.autocomplete = registering ? 'new-password' : 'current-password'; setAuthMessage(); updateSubmitButton();
}
function openAuthModal(required) { mustSignIn = required; usernameModal.classList.add('open'); document.querySelector('.overlay').classList.add('open'); document.querySelector('.close-account').style.display = required ? 'none' : ''; if (!isConfigured) setAuthMessage('La conexión de cuentas necesita configurarse antes de usarse.', 'error'); setTimeout(() => emailInput.focus(), 100); }
function closeAuthModal() { if (mustSignIn) return; usernameModal.classList.remove('open'); document.querySelector('.overlay').classList.remove('open'); }
function orderStatusLabel(status) { return ({ pending_payment: 'Pendiente de pago', pending_validation: 'Pendiente de validación', payment_approved: 'Pago aprobado', payment_rejected: 'Pago rechazado', cancelled: 'Cancelado', delivered: 'Entregado' })[status] || status; }
async function refreshProfileOrders() {
  if (!supabaseClient || !currentAuthUser) return;
  const history = document.querySelector('#profile-history'); const pending = document.querySelector('#profile-pending');
  const { data, error } = await supabaseClient.from('orders').select('id,order_code,payment_method,status,total_mxn,items,created_at').order('created_at', { ascending: false }).limit(8);
  if (error || !data) return; // La tabla se activa al ejecutar supabase-orders-setup.sql.
  const paid = data.filter(order => ['payment_approved', 'delivered'].includes(order.status));
  const open = data.filter(order => ['pending_payment', 'pending_validation'].includes(order.status));
  const render = (orders, emptyTitle, emptyCopy, icon, pendingOrders = false) => orders.length
    ? orders.map(order => {
      const canContinue = pendingOrders && order.payment_method === 'bank_transfer' && order.status === 'pending_payment';
      const canCancel = pendingOrders && order.status === 'pending_payment';
      if (canContinue || canCancel) {
        return `<div class="profile-order is-pending"><b>${order.order_code}</b><span>${orderStatusLabel(order.status)}</span><small>$${order.total_mxn} MXN</small><div class="profile-order-actions">${canContinue ? `<button type="button" class="profile-order-action continue" data-resume-order="${order.id}">Continuar pedido →</button>` : ''}<button type="button" class="profile-order-action cancel" data-cancel-order="${order.id}">Cancelar pedido</button></div></div>`;
      }
      return `<div class="profile-order"><b>${order.order_code}</b><span>${orderStatusLabel(order.status)}</span><small>$${order.total_mxn} MXN</small></div>`;
    }).join('')
    : `<span>${icon}</span><b>${emptyTitle}</b><small>${emptyCopy}</small>`;
  history.innerHTML = render(paid, 'Aún no tienes compras registradas.', 'Tus presets aparecerán aquí cuando se confirme tu pago.', '◌');
  pending.innerHTML = render(open, 'No tienes pedidos pendientes.', 'Cuando solicites un preset, podrás seguirlo desde aquí.', '◷', true);
  pending.onclick = (event) => {
    const cancelButton = event.target.closest('[data-cancel-order]');
    if (cancelButton) {
      cancelPendingOrder(cancelButton.dataset.cancelOrder);
      return;
    }
    const button = event.target.closest('[data-resume-order]');
    if (!button) return;
    const selectedOrder = open.find(order => order.id === button.dataset.resumeOrder);
    if (!selectedOrder) return;
    closeProfileModal();
    window.KayGuitarCheckout?.resumeBankTransfer(selectedOrder);
  };
}
async function cancelPendingOrder(orderId) {
  if (!supabaseClient || !orderId) return;
  const confirmed = window.confirm('¿Deseas cancelar este pedido? Esta acción no se puede deshacer.');
  if (!confirmed) return;
  const { error } = await supabaseClient.rpc('cancel_store_order', { p_order_id: orderId });
  if (error) {
    const detail = String(error.message || '').toLowerCase();
    if (detail.includes('cancel_store_order') || detail.includes('does not exist') || detail.includes('schema cache')) {
      window.alert('La opción de cancelar aún necesita activarse en Supabase. Ejecuta el archivo supabase-cancel-orders-setup.sql en el SQL Editor y vuelve a intentarlo.');
    } else if (detail.includes('ya no puede cancelarse')) {
      window.alert('Este pedido ya no puede cancelarse desde la página. Si realizaste el pago o enviaste comprobante, contáctanos por soporte.');
    } else {
      window.alert('No fue posible cancelar el pedido. Intenta de nuevo en un momento.');
    }
    return;
  }
  await refreshProfileOrders();
  window.alert('Tu pedido fue cancelado.');
}
async function setLoggedInUser(user) {
  const { data } = await supabaseClient.from('profiles').select('username').eq('id', user.id).maybeSingle();
  currentAuthUser = user; const username = data?.username || user.user_metadata?.username || 'Cuenta';
  currentProfileName = username;
  document.querySelector('.account-button small').textContent = username;
  document.querySelector('#profile-username').textContent = username; document.querySelector('#profile-email').textContent = user.email || '';
  mustSignIn = false; usernameModal.classList.remove('open'); document.querySelector('.overlay').classList.remove('open');
  refreshProfileOrders();
  document.dispatchEvent(new CustomEvent('kayguitar:authenticated'));
  if (resumeCheckoutAfterAuth) {
    resumeCheckoutAfterAuth = false;
    setTimeout(() => window.KayGuitarCheckout?.open(), 0);
  }
}
usernameInput.addEventListener('input', updateUsernameStatus);
emailInput.addEventListener('input', updateSubmitButton); passwordInput.addEventListener('input', updateSubmitButton); confirmPasswordInput.addEventListener('input', updateSubmitButton);
document.querySelectorAll('.password-toggle').forEach(button => button.onclick = () => { const input = document.querySelector(`#${button.dataset.target}`); const revealing = input.type === 'password'; input.type = revealing ? 'text' : 'password'; button.classList.toggle('showing', revealing); button.setAttribute('aria-label', revealing ? 'Ocultar contraseña' : 'Mostrar contraseña'); });
document.querySelectorAll('[data-auth-mode]').forEach(button => button.onclick = () => setAuthMode(button.dataset.authMode));
saveUsername.onclick = async () => {
  if (saveUsername.disabled || !supabaseClient) return;
  saveUsername.disabled = true; setAuthMessage('Procesando…');
  const email = emailInput.value.trim(); const password = passwordInput.value;
  if (authMode === 'register') {
    const username = usernameInput.value.trim().toLowerCase();
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: window.location.href } });
    if (error) { setAuthMessage(translateAuthError(error), 'error'); updateSubmitButton(); return; }
    if (data.session) { await setLoggedInUser(data.user); return; }
    setAuthMode('login');
    setAuthMessage('¡Cuenta creada! Te enviamos un correo para verificarla. Revisa tu bandeja de entrada; si no aparece, busca también en Spam un correo de “Supabase Auth”. Después de verificarlo podrás iniciar sesión.', 'success');
  } else {
    const identifier = email;
    let data;
    let error;
    if (validEmail()) {
      ({ data, error } = await supabaseClient.auth.signInWithPassword({ email: identifier, password }));
    } else {
      const login = await supabaseClient.functions.invoke('username-login', {
        body: { username: identifier.toLowerCase(), password }
      });
      if (login.error || !login.data?.session?.access_token || !login.data?.session?.refresh_token) {
        error = login.error || new Error('Credenciales incorrectas.');
      } else {
        ({ data, error } = await supabaseClient.auth.setSession({
          access_token: login.data.session.access_token,
          refresh_token: login.data.session.refresh_token
        }));
      }
    }
    if (error || !data?.user) { setAuthMessage('Correo o nombre de usuario, o contraseña incorrectos.', 'error'); updateSubmitButton(); return; }
    await setLoggedInUser(data.user);
  }
};
function openProfileModal() { refreshProfileOrders(); document.querySelector('.profile-modal').classList.add('open'); document.querySelector('.overlay').classList.add('open'); }
function closeProfileModal() { document.querySelector('.profile-modal').classList.remove('open'); document.querySelector('.overlay').classList.remove('open'); }
document.querySelector('.account-button').onclick = () => currentAuthUser ? openProfileModal() : openAuthModal(false);
document.querySelector('.close-account').onclick = closeAuthModal;
document.querySelector('.close-profile').onclick = closeProfileModal;
document.querySelector('#logout-button').onclick = async () => { if (supabaseClient) await supabaseClient.auth.signOut(); currentAuthUser = null; currentProfileName = ''; document.querySelector('.account-button small').textContent = 'Cuenta'; closeProfileModal(); };
document.querySelector('.overlay').onclick = () => { document.querySelector('.cart-panel').classList.remove('open'); document.querySelector('.preset-modal').classList.remove('open'); document.querySelector('.profile-modal').classList.remove('open'); closeAuthModal(); if (!mustSignIn) document.querySelector('.overlay').classList.remove('open'); };
if (supabaseClient) { supabaseClient.auth.getSession().then(({ data: { session } }) => session ? setLoggedInUser(session.user) : openAuthModal(false)); } else { openAuthModal(false); }

// API interna compartida con checkout.js. No contiene secretos y evita duplicar
// la lógica de carrito, sesión y reanudación tras iniciar sesión.
window.KayGuitarStore = {
  getCart: () => cart,
  getClient: () => supabaseClient,
  getUser: () => currentAuthUser,
  getDisplayName: () => currentProfileName || currentAuthUser?.user_metadata?.username || 'Cliente',
  closeCart: () => {
    document.querySelector('.cart-panel').classList.remove('open');
    document.querySelector('.overlay').classList.remove('open');
  },
  clearCart: () => { cart.splice(0, cart.length); renderCart(); },
  requireCheckoutAuthentication: () => {
    resumeCheckoutAfterAuth = true;
    setAuthMessage('Inicia sesión o crea tu cuenta para continuar al pago. Tu carrito se conservará.', 'error');
    openAuthModal(true);
  }
};
