const products = [
  { name: 'Clean Amb OD', category: 'Worship', tags: ['Worship','Ambient','Clean'], price: 50, usd: '3.00', art: "linear-gradient(135deg,#0004,#0008),url('assets/clean-amb-od-amp.png') center/cover", badges: ['GP200','GP200LT'], description: 'Este preset está diseñado con un enfoque worship, ambiente y clean. Parte de un tono limpio con profundidad y espacio para acompañar, y añade la opción de activar overdrive para lograr una saturación más intensa cuando la canción lo requiere.', demo: 'https://www.tiktok.com/@carlos_martineztf/video/7669144827019414805', image: 'assets/clean-amb-od-amp.png' },
  { name: 'Clean Chorus', category: 'Clean', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#29413f,#101516)', badges: ['GP200','GP200LT'] },
  { name: 'Clean Punch', category: 'Clean', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#243343,#101516)', badges: ['GP200','GP200LT'] },
  { name: 'Victoria — Averly Morillo', category: 'Worship', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#463724,#17130e)', badges: ['GP200','GP200R'] },
  { name: 'Preset de regalo', category: 'Especial', price: 0, usd: 'Gratis', art: 'linear-gradient(135deg,#5b472a,#17130e)', badges: ['SIGUE @KAYGUITAR14','GP200'] },
  { name: 'AC30 • Carol Ann • JC', category: 'Pack', price: 300, usd: '16.50', art: 'linear-gradient(135deg,#5a4328,#17120c)', badges: ['10 PRESETS','GP200'] },
  { name: 'Essential Tone Pack', category: 'Pack', price: 120, usd: '6.80', art: 'linear-gradient(135deg,#313428,#11120f)', badges: ['PACK','GP200'] }
];
const grid = document.querySelector('#product-grid'); let cart = [];
function renderProducts(list = products) {
  grid.innerHTML = list.length ? list.map((p, index) => `<article class="product" data-demo="${products.indexOf(p)}"><div class="product-image" style="--art:${p.art}"><span class="product-tag">${p.category}</span>${p.image ? '' : '<div class="speaker"></div>'}</div><div class="product-body"><h3>${p.name}</h3><div class="badges">${(p.tags || []).map(b => `<span>${b}</span>`).join('')}${p.badges.map(b => `<span>${b}</span>`).join('')}</div><div class="product-bottom"><div class="price"><strong>${p.price ? '$' + p.price : 'GRATIS'}</strong> <small>${p.price ? 'MXN · ≈ $' + p.usd + ' USD' : 'Requiere follow en Instagram'}</small></div><button class="add-button" data-index="${products.indexOf(p)}">+ Añadir</button></div><button class="demo-button" data-demo="${products.indexOf(p)}">Ver descripción y demo ↗</button></div></article>`).join('') : '<p>No encontramos presets con esa búsqueda.</p>';
}
function renderCart() {
  const items = document.querySelector('#cart-items'); const total = cart.reduce((s, p) => s + p.price, 0);
  document.querySelector('#cart-count').textContent = cart.length; document.querySelector('#cart-title-count').textContent = cart.length; document.querySelector('#cart-total').textContent = `$${total} MXN`;
  items.innerHTML = cart.length ? cart.map((p,i) => `<div class="cart-item"><div class="cart-item-art" style="background:${p.art}"></div><div><h4>${p.name}</h4><p>$${p.price} MXN</p><button data-remove="${i}">Quitar</button></div></div>`).join('') : '<p class="empty-cart">Tu carrito está esperando un gran tono.</p>';
}
renderProducts();
document.querySelector('#search').addEventListener('input', e => { const q=e.target.value.toLowerCase(); renderProducts(products.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q))); });
document.querySelector('.filters').addEventListener('click', e => { if(!e.target.matches('button')) return; document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); const f=e.target.dataset.filter; document.querySelector('#search').value=''; renderProducts(f==='Todos'?products:products.filter(p=>p.category===f)); });
document.addEventListener('click', e => {
  if(e.target.matches('.add-button')) {cart.push(products[e.target.dataset.index]);renderCart();document.querySelector('.cart-panel').classList.add('open');document.querySelector('.overlay').classList.add('open');return;}
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
  document.querySelector('#preset-demo-note').textContent = p.demo ? 'Abre el video demo en TikTok.' : 'Video demo próximamente.';
  presetModal.classList.add('open'); document.querySelector('.overlay').classList.add('open');
}
document.querySelector('.close-preset').onclick=()=>{presetModal.classList.remove('open');document.querySelector('.overlay').classList.remove('open');};
