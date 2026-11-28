document.addEventListener('DOMContentLoaded', async () => {
  const { api, esc } = PHP;
  const wall = document.getElementById('photos');
  const chips = document.getElementById('collections');
  const lb = document.getElementById('lightbox');
  let photos = [];
  let active = 'All';

  function render() {
    const list = active === 'All' ? photos : photos.filter((p) => p.collection === active);
    wall.innerHTML = list.length
      ? list.map((p) => `<figure data-id="${esc(p.id)}"><img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy">${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`).join('')
      : '<div class="empty">Photos coming soon!</div>';
  }

  try {
    ({ photos } = await api('/api/gallery'));
  } catch {
    wall.innerHTML = '<div class="empty">The gallery couldn’t load. Please refresh.</div>';
    return;
  }
  const cols = [...new Set(photos.map((p) => p.collection).filter(Boolean))].sort();
  if (cols.length > 1) {
    chips.innerHTML = ['All', ...cols].map((c) => `<button class="chip ${c === active ? 'active' : ''}" data-col="${esc(c)}">${esc(c)}</button>`).join('');
    chips.addEventListener('click', (e) => {
      const c = e.target.closest('[data-col]')?.dataset.col;
      if (!c) return;
      active = c;
      chips.querySelectorAll('.chip').forEach((b) => b.classList.toggle('active', b.dataset.col === c));
      render();
    });
  }
  render();

  wall.addEventListener('click', (e) => {
    const f = e.target.closest('figure');
    if (!f) return;
    const p = photos.find((x) => x.id === f.dataset.id);
    lb.querySelector('img').src = p.url;
    lb.querySelector('img').alt = p.caption || '';
    lb.querySelector('p').textContent = p.caption || '';
    lb.classList.add('open');
  });
  const close = () => lb.classList.remove('open');
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'BUTTON') close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});
