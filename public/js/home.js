document.addEventListener('DOMContentLoaded', async () => {
  const { api, esc, money } = PHP;
  const featuredEl = document.getElementById('featured');
  try {
    const { items } = await api('/api/items');
    let show = items.filter((i) => i.featured);
    if (show.length < 4) show = show.concat(items.filter((i) => !i.featured)).slice(0, 4);
    if (!show.length) {
      document.getElementById('featured-section').classList.add('hidden');
    } else {
      featuredEl.innerHTML = show.map((i) => `
        <a class="card" href="/item?id=${encodeURIComponent(i.id)}">
          ${i.available <= 0 ? '<span class="badge hold">On hold</span>' : ''}
          <div class="thumb">${i.images[0] ? `<img src="${esc(i.images[0])}" alt="${esc(i.title)}" loading="lazy">` : ''}</div>
          <div class="body"><div class="title">${esc(i.title)}</div><div class="price">${money(i.price_cents)}</div></div>
        </a>`).join('');
    }
  } catch {
    document.getElementById('featured-section').classList.add('hidden');
  }
  try {
    const { photos } = await api('/api/gallery');
    document.getElementById('gallery-peek').innerHTML = photos.slice(0, 4).map((p) => `
      <a class="card" href="/gallery"><div class="thumb"><img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy"></div></a>`).join('');
  } catch {}
});
