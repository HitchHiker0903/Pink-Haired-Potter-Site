// Admin page for The Pink Haired Potter.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (c) => (Number(c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const when = (ms) => new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  async function api(path, { method = 'GET', body, form } = {}) {
    const opts = { method, headers: { 'X-Admin-Request': '1' }, credentials: 'same-origin' };
    if (form) opts.body = form;
    else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    let data = {};
    try { data = await res.json(); } catch {}
    if (res.status === 401) {
      $('#who').innerHTML = `<span style="color:#c00">${esc(data.error || 'Not signed in')}</span> – <a href="">reload</a>`;
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function toast(msg, ms = 2600) {
    const t = $('.toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), ms);
  }

  // Shrinks phone photos (often 4–12 MB) to max 1600px JPEG before upload.
  async function shrink(file, max = 1600) {
    let bmp;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      throw new Error(`Can't read "${file.name}". Try a JPG or PNG photo.`);
    }
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  async function upload(file, folder) {
    const small = await shrink(file);
    const fd = new FormData();
    fd.append('file', small);
    fd.append('folder', folder);
    const { url } = await api('/api/admin/upload', { method: 'POST', form: fd });
    return url;
  }

  // ---------------- Tabs ----------------
  const loaders = {};
  const loaded = new Set();
  function showTab(name) {
    $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
    if (!loaded.has(name)) {
      loaded.add(name);
      loaders[name]?.();
    }
    history.replaceState(null, '', `#${name}`);
  }
  $('#tabs').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]')?.dataset.tab;
    if (t) showTab(t);
  });

  // ---------------- Shop items ----------------
  let items = [];
  let itemFilter = 'all';
  let editing = null; // item being edited (null = new)
  let photos = [];

  function itemState(i) {
    if (i.status === 'hidden') return 'hidden';
    if (i.stock <= 0) return 'sold';
    return 'available';
  }

  async function loadItems() {
    try {
      ({ items } = await api('/api/admin/items'));
    } catch (e) {
      $('#item-list').innerHTML = `<div class="notice error">${esc(e.message)}</div>`;
      return;
    }
    $('#category-list').innerHTML = [...new Set(items.map((i) => i.category).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join('');
    renderItems();
  }
  loaders.items = loadItems;

  function renderItems() {
    const list = items.filter((i) => itemFilter === 'all' || itemState(i) === itemFilter);
    if (!list.length) {
      $('#item-list').innerHTML = `<div class="empty">${items.length ? 'Nothing here.' : 'No items yet – tap <strong>+ New item</strong> to add your first piece.'}</div>`;
      return;
    }
    $('#item-list').innerHTML = list.map((i) => {
      const st = itemState(i);
      const onHold = st === 'available' && i.available < i.stock;
      return `<div class="row-card" data-id="${esc(i.id)}">
        ${i.images[0] ? `<img src="${esc(i.images[0])}" alt="">` : '<div class="noimg"></div>'}
        <div>
          <div class="t">${esc(i.title)}</div>
          <div class="meta">
            ${st === 'sold' ? '<span class="pill sold">Sold</span>' : st === 'hidden' ? '<span class="pill hidden-p">Hidden</span>' : '<span class="pill">For sale</span>'}
            ${onHold ? '<span class="pill hold">In a checkout</span>' : ''}
            ${i.featured ? '<span class="pill feat">Featured</span>' : ''}
            ${money(i.price_cents)} · qty ${i.stock}${i.category ? ` · ${esc(i.category)}` : ''}
          </div>
        </div>
        <div class="row-actions">
          ${itemFilter === 'all' ? `<button class="icon-btn" data-move="-1" title="Move up">↑</button><button class="icon-btn" data-move="1" title="Move down">↓</button>` : ''}
          <button class="btn small" data-edit>Edit</button>
        </div>
      </div>`;
    }).join('');
  }

  $('#item-filter').addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]')?.dataset.f;
    if (!f) return;
    itemFilter = f;
    $$('#item-filter .chip').forEach((c) => c.classList.toggle('active', c.dataset.f === f));
    renderItems();
  });

  $('#item-list').addEventListener('click', async (e) => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest('[data-edit]')) return openItem(items.find((i) => i.id === id));
    const mv = e.target.closest('[data-move]');
    if (mv) {
      const idx = items.findIndex((i) => i.id === id);
      const to = idx + Number(mv.dataset.move);
      if (to < 0 || to >= items.length) return;
      [items[idx], items[to]] = [items[to], items[idx]];
      renderItems();
      try { await api('/api/admin/reorder', { method: 'POST', body: { table: 'items', ids: items.map((i) => i.id) } }); }
      catch (err) { toast(err.message); }
    }
  });

  function renderPhotos() {
    $('#item-photos').innerHTML = photos.map((u, n) => `
      <div class="ph"><img src="${esc(u)}" alt="">
        <div class="ph-actions">
          <button type="button" data-ph-left="${n}" title="Move left">◀</button>
          <button type="button" data-ph-del="${n}" title="Remove">✕</button>
          <button type="button" data-ph-right="${n}" title="Move right">▶</button>
        </div></div>`).join('') || '<span class="hint">No photos yet.</span>';
  }
  $('#item-photos').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const n = Number(b.dataset.phLeft ?? b.dataset.phDel ?? b.dataset.phRight);
    if (b.dataset.phDel !== undefined) photos.splice(n, 1);
    else {
      const to = b.dataset.phLeft !== undefined ? n - 1 : n + 1;
      if (to < 0 || to >= photos.length) return;
      [photos[n], photos[to]] = [photos[to], photos[n]];
    }
    renderPhotos();
  });

  $('#item-files').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    for (const [n, f] of files.entries()) {
      $('#item-upload-status').textContent = `Uploading ${n + 1} of ${files.length}…`;
      try { photos.push(await upload(f, 'items')); renderPhotos(); }
      catch (err) { toast(err.message, 4000); }
    }
    $('#item-upload-status').textContent = '';
  });

  function openItem(item) {
    editing = item || null;
    photos = item ? [...item.images] : [];
    $('#item-modal-title').textContent = item ? 'Edit item' : 'New item';
    $('#f-title').value = item?.title || '';
    $('#f-price').value = item ? (item.price_cents / 100).toFixed(2) : '';
    $('#f-weight').value = item?.weight_lbs ?? 2;
    $('#f-stock').value = item?.stock ?? 1;
    $('#f-category').value = item?.category || '';
    $('#f-desc').value = item?.description || '';
    $('#f-featured').checked = !!item?.featured;
    $('#f-hidden').checked = item?.status === 'hidden';
    $('#item-msg').innerHTML = '';
    $('#delete-item').classList.toggle('hidden', !item);
    $('#to-gallery').classList.toggle('hidden', !item);
    $('#mark-sold').classList.toggle('hidden', !item || item.stock <= 0);
    renderPhotos();
    $('#item-modal').classList.add('open');
  }
  const closeItem = () => $('#item-modal').classList.remove('open');
  $('#new-item').addEventListener('click', () => openItem(null));
  $('#item-modal').addEventListener('click', (e) => {
    if (e.target.id === 'item-modal' || e.target.closest('[data-close]')) closeItem();
  });

  function formBody() {
    return {
      title: $('#f-title').value,
      price: $('#f-price').value,
      weight_lbs: $('#f-weight').value,
      stock: $('#f-stock').value,
      category: $('#f-category').value,
      description: $('#f-desc').value,
      featured: $('#f-featured').checked,
      status: $('#f-hidden').checked ? 'hidden' : 'active',
      images: photos,
    };
  }

  async function saveItem(overrides = {}) {
    const body = { ...formBody(), ...overrides };
    try {
      if (editing) await api(`/api/admin/items/${editing.id}`, { method: 'PUT', body });
      else await api('/api/admin/items', { method: 'POST', body });
      closeItem();
      toast('Saved!');
      loadItems();
    } catch (err) {
      $('#item-msg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
    }
  }
  $('#item-form').addEventListener('submit', (e) => { e.preventDefault(); saveItem(); });
  $('#mark-sold').addEventListener('click', () => {
    if (confirm('Mark this piece as sold (for example, sold at a craft fair)? It will disappear from the shop.')) saveItem({ stock: 0 });
  });
  $('#delete-item').addEventListener('click', async () => {
    if (!confirm('Delete this item permanently? (To keep a record, use "Mark sold" or "Hide" instead.)')) return;
    try { await api(`/api/admin/items/${editing.id}`, { method: 'DELETE' }); closeItem(); toast('Deleted'); loadItems(); }
    catch (err) { toast(err.message); }
  });
  $('#to-gallery').addEventListener('click', async () => {
    if (!photos.length) return toast('Add a photo first.');
    const all = photos.length > 1 && confirm('Copy ALL photos to the gallery? (Cancel = just the main photo)');
    try {
      const r = await api('/api/admin/item-to-gallery', { method: 'POST', body: { id: editing.id, all } });
      toast(`Added ${r.added} photo${r.added > 1 ? 's' : ''} to the gallery`);
      loaded.delete('gallery');
    } catch (err) { toast(err.message); }
  });

  // ---------------- Gallery ----------------
  let gallery = [];
  async function loadGallery() {
    try { ({ photos: gallery } = await api('/api/admin/gallery')); }
    catch (e) { $('#gallery-list').innerHTML = `<div class="notice error">${esc(e.message)}</div>`; return; }
    $('#collections-list').innerHTML = [...new Set(gallery.map((g) => g.collection).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join('');
    renderGallery();
  }
  loaders.gallery = loadGallery;

  function renderGallery() {
    $('#gallery-list').innerHTML = gallery.length ? gallery.map((g) => `
      <div class="g-card" data-gid="${esc(g.id)}">
        <img src="${esc(g.url)}" alt="" loading="lazy">
        <div class="g-body">
          <input type="text" data-cap value="${esc(g.caption)}" placeholder="Caption">
          <input type="text" data-col value="${esc(g.collection)}" placeholder="Collection" list="collections-list">
          <div class="row-actions">
            <span><button class="icon-btn" data-gmove="-1" title="Move earlier">←</button> <button class="icon-btn" data-gmove="1" title="Move later">→</button></span>
            <span><button class="btn small" data-gsave>Save</button> <button class="icon-btn" data-gdel title="Delete">🗑</button></span>
          </div>
        </div>
      </div>`).join('') : '<div class="empty">No photos yet.</div>';
  }

  $('#gallery-list').addEventListener('click', async (e) => {
    const card = e.target.closest('[data-gid]');
    if (!card) return;
    const id = card.dataset.gid;
    try {
      if (e.target.closest('[data-gsave]')) {
        await api(`/api/admin/gallery/${id}`, { method: 'PUT', body: { caption: $('[data-cap]', card).value, collection: $('[data-col]', card).value } });
        const g = gallery.find((x) => x.id === id);
        g.caption = $('[data-cap]', card).value;
        g.collection = $('[data-col]', card).value;
        toast('Saved');
      } else if (e.target.closest('[data-gdel]')) {
        if (!confirm('Remove this photo from the gallery?')) return;
        await api(`/api/admin/gallery/${id}`, { method: 'DELETE' });
        gallery = gallery.filter((x) => x.id !== id);
        renderGallery();
      } else if (e.target.closest('[data-gmove]')) {
        const idx = gallery.findIndex((x) => x.id === id);
        const to = idx + Number(e.target.closest('[data-gmove]').dataset.gmove);
        if (to < 0 || to >= gallery.length) return;
        [gallery[idx], gallery[to]] = [gallery[to], gallery[idx]];
        renderGallery();
        await api('/api/admin/reorder', { method: 'POST', body: { table: 'gallery', ids: gallery.map((x) => x.id) } });
      }
    } catch (err) { toast(err.message); }
  });

  $('#g-upload').addEventListener('click', async () => {
    const files = [...$('#g-files').files];
    if (!files.length) return toast('Choose photos first.');
    const caption = $('#g-caption').value;
    const collection = $('#g-collection').value;
    const added = [];
    for (const [n, f] of files.entries()) {
      $('#g-progress').textContent = `Uploading ${n + 1} of ${files.length}…`;
      try { added.push({ url: await upload(f, 'gallery'), caption, collection }); }
      catch (err) { toast(err.message, 4000); }
    }
    if (added.length) {
      try {
        await api('/api/admin/gallery', { method: 'POST', body: { photos: added } });
        toast(`Added ${added.length} photo${added.length > 1 ? 's' : ''}`);
      } catch (err) { toast(err.message); }
    }
    $('#g-progress').textContent = '';
    $('#g-files').value = '';
    $('#g-caption').value = '';
    loadGallery();
  });

  // ---------------- Orders ----------------
  const ORDER_STATUSES = ['new', 'packed', 'shipped', 'picked up', 'canceled'];
  async function loadOrders() {
    let orders;
    try { ({ orders } = await api('/api/admin/orders')); }
    catch (e) { $('#order-list').innerHTML = `<div class="notice error">${esc(e.message)}</div>`; return; }
    if (!orders.length) { $('#order-list').innerHTML = '<div class="empty">No orders yet. They’ll appear here automatically after checkout.</div>'; return; }
    $('#order-list').innerHTML = orders.map((o) => {
      const items = JSON.parse(o.items || '[]');
      let addr = '';
      try {
        const a = JSON.parse(o.shipping_address || 'null');
        if (a) addr = [a.name, a.line1, a.line2, `${a.city || ''}, ${a.state || ''} ${a.postal_code || ''}`].filter(Boolean).map(esc).join('<br>');
      } catch {}
      return `<details class="detail" data-oid="${esc(o.id)}">
        <summary>
          <span><strong>${esc(o.name || o.email || 'Customer')}</strong> · ${when(o.created_at)}<br>
            <span class="pill ${o.status === 'new' ? 'hold' : ''}">${esc(o.status)}</span>
            <span class="pill ${o.fulfillment === 'pickup' ? 'feat' : ''}">${o.fulfillment === 'pickup' ? 'Pickup' : 'Ship'}</span>
            ${o.zip_mismatch ? '<span class="pill warn">ZIP differs from estimate</span>' : ''}</span>
          <strong>${money(o.total_cents)}</strong>
        </summary>
        <div class="kv">
          <div>Items</div><div>${items.map((i) => `${esc(i.title || i.id)}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join('<br>')}</div>
          <div>Email</div><div><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>
          ${o.phone ? `<div>Phone</div><div>${esc(o.phone)}</div>` : ''}
          ${addr ? `<div>Ship to</div><div>${addr}</div>` : ''}
          <div>Subtotal</div><div>${money(o.subtotal_cents)}</div>
          <div>Shipping</div><div>${money(o.shipping_cents)}</div>
          ${o.tax_cents ? `<div>Tax</div><div>${money(o.tax_cents)}</div>` : ''}
          ${o.zip_mismatch ? `<div>Note</div><div>Shipping was estimated for ZIP ${esc(o.est_zip)} but the address ZIP is different. Check the postage cost before buying a label.</div>` : ''}
        </div>
        <div class="form-grid">
          <div class="field"><label>Status</label><select data-ostatus>${ORDER_STATUSES.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Notes <span class="hint">(tracking #, etc.)</span></label><input type="text" data-onotes value="${esc(o.notes)}"></div>
        </div>
        <button class="btn small" data-osave>Save</button>
      </details>`;
    }).join('');
  }
  loaders.orders = loadOrders;
  $('#order-list').addEventListener('click', async (e) => {
    if (!e.target.closest('[data-osave]')) return;
    const d = e.target.closest('[data-oid]');
    try {
      await api(`/api/admin/orders/${d.dataset.oid}`, { method: 'PUT', body: { status: $('[data-ostatus]', d).value, notes: $('[data-onotes]', d).value } });
      toast('Saved');
    } catch (err) { toast(err.message); }
  });

  // ---------------- Custom requests ----------------
  const REQ_STATUSES = ['new', 'quoted', 'deposit paid', 'in progress', 'complete', 'declined'];
  async function loadRequests() {
    let requests;
    try { ({ requests } = await api('/api/admin/requests')); }
    catch (e) { $('#request-list').innerHTML = `<div class="notice error">${esc(e.message)}</div>`; return; }
    if (!requests.length) { $('#request-list').innerHTML = '<div class="empty">No custom requests yet.</div>'; return; }
    $('#request-list').innerHTML = requests.map((r) => {
      const rows = [['Email', `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`], ['Phone', esc(r.phone)], ['Piece', esc(r.piece_type)], ['How many', esc(r.quantity)], ['Size', esc(r.size)], ['Colors', esc(r.colors)], ['Needed by', esc(r.deadline)], ['Budget', esc(r.budget)], ['Details', esc(r.details).replace(/\n/g, '<br>')]]
        .filter(([, v]) => v).map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('');
      return `<details class="detail" data-rid="${esc(r.id)}" data-email="${esc(r.email)}" data-name="${esc(r.name)}">
        <summary>
          <span><strong>${esc(r.name)}</strong> · ${esc(r.piece_type || 'Custom piece')} · ${when(r.created_at)}<br>
          <span class="pill ${r.status === 'new' ? 'hold' : ''}">${esc(r.status)}</span>${r.deposit_paid ? '<span class="pill">Deposit paid</span>' : ''}</span>
        </summary>
        <div class="kv">${rows}</div>
        ${r.photo_key ? `<a href="/api/admin/img/${esc(r.photo_key)}" target="_blank"><img class="ref-photo" src="/api/admin/img/${esc(r.photo_key)}" alt="Reference photo"></a>` : ''}
        <div class="form-grid">
          <div class="field"><label>Status</label><select data-rstatus>${REQ_STATUSES.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Private notes</label><input type="text" data-rnotes value="${esc(r.notes)}"></div>
        </div>
        <div class="btn-row"><button class="btn small" data-rsave>Save</button><button class="btn small alt danger" data-rdel>Delete</button></div>
        <hr style="border:0;border-top:2px dashed var(--line);margin:18px 0">
        <h3>Payment link</h3>
        ${r.deposit_url ? `<p class="hint">${money(r.deposit_amount_cents)} link${r.deposit_paid ? ' – <strong>paid</strong>' : ''}:</p><div class="copy-box"><input type="text" readonly value="${esc(r.deposit_url)}"><button class="btn small alt" data-copy>Copy</button></div>` : ''}
        <div class="form-grid">
          <div class="field"><label>Amount $</label><input type="number" step="0.01" min="0.5" data-damount></div>
          <div class="field"><label>Label</label><input type="text" data-dlabel placeholder="Custom mug set – 50% deposit"></div>
        </div>
        <button class="btn small" data-deposit>Create payment link</button>
        <p class="hint">Creates a one-time Stripe link (it stops working after one payment). Copy it into an email to your customer.</p>
      </details>`;
    }).join('');
  }
  loaders.requests = loadRequests;
  $('#request-list').addEventListener('click', async (e) => {
    const d = e.target.closest('[data-rid]');
    if (!d) return;
    const id = d.dataset.rid;
    try {
      if (e.target.closest('[data-rsave]')) {
        await api(`/api/admin/requests/${id}`, { method: 'PUT', body: { status: $('[data-rstatus]', d).value, notes: $('[data-rnotes]', d).value } });
        toast('Saved');
      } else if (e.target.closest('[data-rdel]')) {
        if (!confirm('Delete this request and its photo?')) return;
        await api(`/api/admin/requests/${id}`, { method: 'DELETE' });
        d.remove();
      } else if (e.target.closest('[data-copy]')) {
        const inp = $('.copy-box input', d);
        await navigator.clipboard.writeText(inp.value).catch(() => { inp.select(); document.execCommand('copy'); });
        toast('Link copied');
      } else if (e.target.closest('[data-deposit]')) {
        const amount = $('[data-damount]', d).value;
        if (!amount) return toast('Enter an amount first.');
        if (!confirm(`Create a one-time payment link for $${Number(amount).toFixed(2)}?`)) return;
        const { url } = await api('/api/admin/deposit-link', { method: 'POST', body: { id, amount, label: $('[data-dlabel]', d).value } });
        await navigator.clipboard.writeText(url).catch(() => {});
        toast('Payment link created and copied!');
        loadRequests();
      }
    } catch (err) { toast(err.message, 4000); }
  });

  // ---------------- Page text ----------------
  const TEXT_FIELDS = [
    ['Banner', [['announcement', 'Announcement bar (top of every page – leave blank to hide)', 1]]],
    ['Home page', [['hero_title', 'Big headline', 1], ['hero_text', 'Text under the headline', 3], ['home_about_teaser', '“Meet the maker” section', 5]]],
    ['About page', [['artist_name', 'Your name (About page heading)', 1], ['about_text', 'Artist statement', 16]]],
    ['Custom orders page', [['custom_intro', 'Intro text', 6]]],
    ['Shipping, care & policies page', [['pickup_text', 'Local pickup (public)', 3], ['care_text', 'Care instructions', 5], ['policies_text', 'Shop policies', 6]]],
    ['Private pickup info (only shown after a pickup order is paid)', [['private_pickup_address', 'Pickup address', 1], ['private_pickup_instructions', 'Pickup instructions', 2]]],
    ['Contact & social', [['business_name', 'Business name', 1], ['contact_email', 'Contact email', 1], ['instagram_url', 'Instagram link (full https:// address)', 1], ['facebook_url', 'Facebook link', 1]]],
  ];
  let content = {};
  async function loadText() {
    try { content = await api('/api/admin/content'); } catch (e) { $('#text-fields').innerHTML = `<div class="notice error">${esc(e.message)}</div>`; return; }
    $('#text-fields').innerHTML = TEXT_FIELDS.map(([group, fields]) => `
      <div class="panel" style="margin-bottom:18px"><h3>${esc(group)}</h3>
        ${fields.map(([k, label, rows]) => `<div class="field"><label for="c-${k}">${esc(label)}</label>${rows > 1
          ? `<textarea id="c-${k}" data-key="${k}" rows="${rows}" style="min-height:${rows * 26}px">${esc(content[k] || '')}</textarea>`
          : `<input type="text" id="c-${k}" data-key="${k}" value="${esc(content[k] || '')}">`}</div>`).join('')}
      </div>`).join('');
  }
  loaders.text = loadText;
  async function saveText() {
    const values = {};
    $$('#text-fields [data-key]').forEach((el) => (values[el.dataset.key] = el.value));
    try { await api('/api/admin/content', { method: 'PUT', body: { values } }); toast('Text saved!'); }
    catch (err) { toast(err.message); }
  }
  $('#save-text').addEventListener('click', saveText);
  $('#save-text-2').addEventListener('click', saveText);

  // ---------------- Shipping ----------------
  let ship = {};
  async function loadShipping() {
    const c = await api('/api/admin/content');
    try { ship = JSON.parse(c.shipping || '{}'); } catch { ship = {}; }
    ship.tiers ||= [];
    $('#s-perlb').value = ship.overMaxPerLb ?? 0;
    $('#s-free').value = ship.freeShippingOver ?? 0;
    $('#s-far').value = ship.farSurcharge ?? 0;
    $('#s-farzip').value = ship.farZipPrefixes ?? '';
    $('#s-pickup').checked = !!ship.pickupEnabled;
    $('#s-city').value = ship.pickupCity || '';
    renderTiers();
    testShip();
  }
  loaders.shipping = loadShipping;
  function renderTiers() {
    $('#tier-table').innerHTML = `<tr><th>Up to (lbs)</th><th>Price $</th><th></th></tr>` + ship.tiers.map((t, n) => `
      <tr><td><input type="number" step="0.1" min="0.1" value="${t.upToLbs}" data-tier="${n}" data-f="upToLbs"></td>
      <td><input type="number" step="0.01" min="0" value="${t.price}" data-tier="${n}" data-f="price"></td>
      <td><button class="icon-btn" data-deltier="${n}" title="Remove">✕</button></td></tr>`).join('');
  }
  function readShip() {
    $$('#tier-table [data-tier]').forEach((el) => (ship.tiers[el.dataset.tier][el.dataset.f] = Number(el.value)));
    ship.tiers.sort((a, b) => a.upToLbs - b.upToLbs);
    ship.overMaxPerLb = Number($('#s-perlb').value) || 0;
    ship.freeShippingOver = Number($('#s-free').value) || 0;
    ship.farSurcharge = Number($('#s-far').value) || 0;
    ship.farZipPrefixes = $('#s-farzip').value;
    ship.pickupEnabled = $('#s-pickup').checked;
    ship.pickupCity = $('#s-city').value;
    return ship;
  }
  function testShip() {
    const s = readShip();
    const lbs = Number($('#t-lbs').value) || 0;
    const zip = $('#t-zip').value;
    const tier = s.tiers.find((t) => lbs <= t.upToLbs);
    let d = tier ? tier.price : s.tiers.length ? s.tiers.at(-1).price + Math.ceil(lbs - s.tiers.at(-1).upToLbs) * s.overMaxPerLb : 0;
    if (s.farSurcharge > 0 && String(s.farZipPrefixes).split(',').map((x) => x.trim()).filter(Boolean).some((p) => zip.startsWith(p))) d += s.farSurcharge;
    $('#t-result').textContent = `Shipping charged: ${money(d * 100)}${s.freeShippingOver > 0 ? ` (free if the order is ${money(s.freeShippingOver * 100)}+)` : ''}`;
  }
  $('[data-panel=shipping]').addEventListener('input', testShip);
  $('#tier-table').addEventListener('click', (e) => {
    const n = e.target.closest('[data-deltier]')?.dataset.deltier;
    if (n === undefined) return;
    readShip();
    ship.tiers.splice(Number(n), 1);
    renderTiers();
    testShip();
  });
  $('#add-tier').addEventListener('click', () => {
    readShip();
    const last = ship.tiers.at(-1) || { upToLbs: 0, price: 0 };
    ship.tiers.push({ upToLbs: last.upToLbs + 5, price: last.price + 8 });
    renderTiers();
    testShip();
  });
  $('#save-ship').addEventListener('click', async () => {
    const s = readShip();
    if (!s.tiers.length) return toast('Add at least one weight tier.');
    try { await api('/api/admin/content', { method: 'PUT', body: { values: { shipping: JSON.stringify(s) } } }); toast('Shipping saved!'); renderTiers(); }
    catch (err) { toast(err.message); }
  });

  // ---------------- Start ----------------
  (async () => {
    try {
      const me = await api('/api/admin/me');
      $('#who').textContent = `Signed in as ${me.email}`;
      const warn = [];
      if (!me.storage) warn.push('Photo storage (R2 binding <strong>BUCKET</strong>) is not connected – photo uploads won’t work.');
      if (!me.stripe) warn.push('Stripe secret key (<strong>STRIPE_SECRET_KEY</strong>) is not set – checkout won’t work.');
      if (!me.webhook) warn.push('Stripe webhook secret (<strong>STRIPE_WEBHOOK_SECRET</strong>) is not set – sold items won’t update automatically.');
      $('#setup-warnings').innerHTML = warn.map((w) => `<div class="notice error">${w} See SETUP-GUIDE.md.</div>`).join('');
    } catch {
      return;
    }
    const start = location.hash.slice(1);
    showTab(['items', 'gallery', 'orders', 'requests', 'text', 'shipping'].includes(start) ? start : 'items');
  })();
})();
