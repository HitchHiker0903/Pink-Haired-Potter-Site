document.addEventListener('DOMContentLoaded', async () => {
  const { api, esc, money, addToCart, toast } = PHP;
  const grid = document.getElementById('items');
  const chips = document.getElementById('cats');
  let items = [];
  let active = 'All';

  function render() {
    const list = active === 'All' ? items : items.filter((i) => i.category === active);
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <h2 class="script">New pieces are on the way!</h2>
        <p class="muted">Everything has found a home for now. Browse the gallery or request a custom piece.</p>
        <div class="btn-row" style="justify-content:center"><a class="btn" href="/custom">Request a custom piece</a><a class="btn alt" href="/gallery">View the gallery</a></div>
      </div>`;
      return;
    }
    grid.innerHTML = list.map((i) => `
      <div class="card">
        ${i.available <= 0 ? '<span class="badge hold">On hold</span>' : i.available > 1 ? `<span class="badge">${i.available} available</span>` : ''}
        <a class="thumb" href="/item?id=${encodeURIComponent(i.id)}">${i.images[0] ? `<img src="${esc(i.images[0])}" alt="${esc(i.title)}" loading="lazy">` : ''}</a>
        <div class="body">
          <a class="title" href="/item?id=${encodeURIComponent(i.id)}" style="color:inherit;text-decoration:none">${esc(i.title)}</a>
          <div class="price">${money(i.price_cents)}</div>
          <div style="margin-top:auto;padding-top:8px">
            ${i.available > 0
              ? `<button class="btn small block" data-add="${esc(i.id)}">Add to cart</button>`
              : `<button class="btn small block" disabled title="Someone is checking out with this piece. If they don’t finish, it comes back within 30 minutes.">On hold</button>`}
          </div>
        </div>
      </div>`).join('');
  }

  grid.addEventListener('click', (e) => {
    const id = e.target.closest('[data-add]')?.dataset.add;
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (addToCart(item)) toast(`Added to your cart! <a href="/cart">View cart</a>`);
    else toast('That’s all we have of this piece – it’s already in your cart.');
  });

  try {
    ({ items } = await api('/api/items'));
  } catch {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">The shop couldn’t load. Please refresh the page.</div>';
    return;
  }
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
  if (cats.length > 1) {
    chips.innerHTML = ['All', ...cats].map((c) => `<button class="chip ${c === active ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    chips.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cat]')?.dataset.cat;
      if (!c) return;
      active = c;
      chips.querySelectorAll('.chip').forEach((b) => b.classList.toggle('active', b.dataset.cat === c));
      render();
    });
  }
  render();
});
