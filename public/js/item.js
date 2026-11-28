document.addEventListener('DOMContentLoaded', async () => {
  const { api, esc, money, paras, addToCart, toast } = PHP;
  const el = document.getElementById('item');
  const id = new URLSearchParams(location.search).get('id');
  let item;
  try {
    ({ item } = await api(`/api/items/${encodeURIComponent(id || '')}`));
  } catch {
    el.innerHTML = `<div class="empty"><h2 class="script">This piece isn’t available</h2><p class="muted">It may have found a new home.</p><a class="btn" href="/shop">Back to the shop</a></div>`;
    return;
  }
  document.title = `${item.title} | The Pink Haired Potter`;
  const imgs = item.images.length ? item.images : [''];
  el.innerHTML = `
    <p><a href="/shop">← Back to the shop</a></p>
    <div class="item-grid">
      <div>
        <div class="item-main-img">${imgs[0] ? `<img id="main-img" src="${esc(imgs[0])}" alt="${esc(item.title)}">` : ''}</div>
        ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, n) => `<button class="${n === 0 ? 'active' : ''}" data-src="${esc(u)}" aria-label="Photo ${n + 1}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div>
        ${item.category ? `<div class="eyebrow">${esc(item.category)}</div>` : ''}
        <h1 style="font-size:clamp(1.9rem,4vw,2.8rem)">${esc(item.title)}</h1>
        <div class="item-price">${money(item.price_cents)}</div>
        <div id="buy"></div>
        <div class="prose" style="margin-top:22px">${paras(item.description)}</div>
        <p class="hint"><a href="/policies">Shipping, care &amp; policies</a></p>
      </div>
    </div>`;

  const buy = document.getElementById('buy');
  if (item.sold) {
    buy.innerHTML = `<div class="notice info">This piece has sold. Love it? <a href="/custom">Request something similar.</a></div>`;
  } else if (item.available <= 0) {
    buy.innerHTML = `<button class="btn" disabled>On hold</button><p class="hint">Someone is checking out with this piece. If they don’t finish, it comes back within 30 minutes.</p>`;
  } else {
    buy.innerHTML = `<button class="btn" id="add">Add to cart</button>${item.available > 1 ? `<p class="hint">${item.available} available</p>` : '<p class="hint">One of a kind – only one available.</p>'}`;
    document.getElementById('add').addEventListener('click', () => {
      if (addToCart(item)) toast(`Added to your cart! <a href="/cart">View cart</a>`);
      else toast('That’s all we have of this piece – it’s already in your cart.');
    });
  }
  el.querySelector('.thumbs')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-src]');
    if (!b) return;
    document.getElementById('main-img').src = b.dataset.src;
    el.querySelectorAll('.thumbs button').forEach((x) => x.classList.toggle('active', x === b));
  });
});
