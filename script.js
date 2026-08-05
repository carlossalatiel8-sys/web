const products = [
  { name: 'Ambient Cinema', category: 'Ambient', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#151c22,#6a5945)', badges: ['GP200','GP200R'] },
  { name: 'Sunday Worship', category: 'Worship', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#3c3122,#15120f)', badges: ['GP200','GP200LT'] },
  { name: 'Modern Lead', category: 'Lead', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#3b1b13,#100f0e)', badges: ['GP200','GP200JR'] },
  { name: 'British Crunch', category: 'Rock', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#4c3825,#17130e)', badges: ['GP200','GP200R'] },
  { name: 'Crystal Clean', category: 'Clean', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#18353d,#101516)', badges: ['GP200','GP200LT'] },
  { name: 'Modern Metal', category: 'Metal', price: 50, usd: '3.00', art: 'linear-gradient(135deg,#29232b,#0d0c0e)', badges: ['GP200','GP200R'] },
  { name: 'AC30 • Carol Ann • JC', category: 'Pack', price: 300, usd: '16.50', art: 'linear-gradient(135deg,#5a4328,#17120c)', badges: ['10 PRESETS','GP200'] },
  { name: 'Essential Tone Pack', category: 'Pack', price: 120, usd: '6.80', art: 'linear-gradient(135deg,#313428,#11120f)', badges: ['PACK','GP200'] }
];
const grid = document.querySelector('#product-grid'); let cart = [];
function renderProducts(list = products) {
  grid.innerHTML = list.length ? list.map((p, index) => `<article class="product"><div class="product-image" style="--art:${p.art}"><span class="product-tag">${p.category}</span><div class="speaker"></div></div><div class="product-body"><h3>${p.name}</h3><div class="badges">${p.badges.map(b => `<span>${b}</span>`).join('')}</div><div class="product-bottom"><div class="price"><strong>$${p.price}</strong> <small>MXN · ≈ $${p.usd} USD</small></div><button class="add-button" data-index="${products.indexOf(p)}">+ Añadir</button></div></div></article>`).join('') : '<p>No encontramos presets con esa búsqueda.</p>';
}
function renderCart() {
  const items = document.querySelector('#cart-items'); const total = cart.reduce((s, p) => s + p.price, 0);
  document.querySelector('#cart-count').textContent = cart.length; document.querySelector('#cart-title-count').textContent = cart.length; document.querySelector('#cart-total').textContent = `$${total} MXN`;
  items.innerHTML = cart.length ? cart.map((p,i) => `<div class="cart-item"><div class="cart-item-art" style="background:${p.art}"></div><div><h4>${p.name}</h4><p>$${p.price} MXN</p><button data-remove="${i}">Quitar</button></div></div>`).join('') : '<p class="empty-cart">Tu carrito está esperando un gran tono.</p>';
}
renderProducts();
document.querySelector('#search').addEventListener('input', e => { const q=e.target.value.toLowerCase(); renderProducts(products.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q))); });
document.querySelector('.filters').addEventListener('click', e => { if(!e.target.matches('button')) return; document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); const f=e.target.dataset.filter; document.querySelector('#search').value=''; renderProducts(f==='Todos'?products:products.filter(p=>p.category===f)); });
document.addEventListener('click', e => { if(e.target.matches('.add-button')) {cart.push(products[e.target.dataset.index]);renderCart();document.querySelector('.cart-panel').classList.add('open');document.querySelector('.overlay').classList.add('open');} if(e.target.matches('[data-remove]')) {cart.splice(e.target.dataset.remove,1);renderCart();} });
function toggleCart(){document.querySelector('.cart-panel').classList.toggle('open');document.querySelector('.overlay').classList.toggle('open');}
document.querySelector('.cart-button').onclick=toggleCart;document.querySelector('.close-cart').onclick=toggleCart;
function toggleAccount(){document.querySelector('.account-modal').classList.toggle('open');document.querySelector('.overlay').classList.toggle('open');}
document.querySelector('.account-button').onclick=toggleAccount;document.querySelector('.close-account').onclick=toggleAccount;
document.querySelector('.overlay').onclick=()=>{document.querySelector('.cart-panel').classList.remove('open');document.querySelector('.account-modal').classList.remove('open');document.querySelector('.overlay').classList.remove('open');};
document.querySelector('.menu-button').onclick=()=>document.querySelector('.nav').classList.toggle('mobile-open');
