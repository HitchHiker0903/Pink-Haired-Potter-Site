document.addEventListener('DOMContentLoaded', () => {
  const { api, esc, money, getCart, setCart } = PHP;
  const linesEl = document.getElementById('cart-lines');
  const notices = document.getElementById('cart-notices');
  const zipEl = document.getElementById('zip');
  const btn = document.getElementById('checkout-btn');
  const ZIP_KEY = 'php_zip';
  zipEl.value = localStorage.getItem(ZIP_KEY) || '';
  let quote = null;
  let timer;

  if (new URLSearchParams(location.search).get('canceled')) {
    notices.innerHTML = '<div class="notice info">Checkout was canceled – your cart is saved below.</div>';
  }

  const method = () => document.querySelector('input[name=method]:checked').value;

  function renderLines(lines) {
    if (!lines.length) {
      linesEl.innerHTML = `<div class="center" style="padding:30px 0"><h2 class="script">Your cart is empty</h2><a class="btn" href="/shop">Go shopping</a></div>`;
      return;
    }
    linesEl.innerHTML = lines.map((l) => `
      <div class="cart-line">
        ${l.image ? `<img src="${esc(l.image)}" alt="">` : '<img alt="">'}
        <div>
          <div class="title">${esc(l.title)}</div>
          <div class="muted">${money(l.price_cents)}</div>
          ${l.max > 1 ? `<label class="hint" style="display:inline;font-weight:400">Qty <input class="qty" type="number" min="1" max="${l.max}" value="${l.qty}" data-qty="${esc(l.id)}"></label>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-weight:800">${money(l.price_cents * l.qty)}</div>
          <button class="linkbtn" data-remove="${esc(l.id)}">Remove</button>
        </div>
      </div>`).join('');
  }

  async function refresh() {
    const cart = getCart();
    const m = method();
    document.getElementById('zip-field').classList.toggle('hidden', m !== 'ship');
    const zip = zipEl.value.trim();
    if (!cart.length) {
      renderLines([]);
      setTotals(null);
      return;
    }
    try {
      quote = await api('/api/shipping-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map(({ id, qty }) => ({ id, qty })), zip: /^\d{5}$/.test(zip) ? zip : '', method: m }),
      });
    } catch (e) {
      notices.innerHTML = `<div class="notice error">${esc(e.message)}</div>`;
      return;
    }
    // Sync the saved cart with what's actually available.
    const removeIds = new Set(quote.problems.filter((p) => p.remove).map((p) => p.id));
    const byId = new Map(quote.lines.map((l) => [l.id, l]));
    const newCart = cart
      .filter((c) => !removeIds.has(c.id))
      .map((c) => (byId.has(c.id) ? { ...c, qty: byId.get(c.id).qty, title: byId.get(c.id).title, price_cents: byId.get(c.id).price_cents, image: byId.get(c.id).image } : c));
    setCart(newCart);
    notices.innerHTML = quote.problems.map((p) => `<div class="notice info">${esc(p.message)}</div>`).join('');
    if (!quote.pickup_enabled) document.getElementById('pickup-choice').classList.add('hidden');
    if (quote.pickup_city) document.getElementById('pickup-hint').textContent = `${quote.pickup_city}. Address shown after checkout.`;
    renderLines(quote.lines);
    setTotals(quote);
  }

  function setTotals(q) {
    const m = method();
    const zipOk = /^\d{5}$/.test(zipEl.value.trim());
    document.getElementById('t-sub').textContent = q ? money(q.subtotal_cents) : '–';
    document.getElementById('t-ship-label').textContent = m === 'pickup' ? 'Local pickup' : 'Shipping';
    let shipText = '–';
    if (q && q.lines.length) {
      if (m === 'pickup') shipText = 'Free';
      else if (!zipOk) shipText = 'Enter ZIP';
      else shipText = q.shipping_cents === 0 ? 'Free' : money(q.shipping_cents);
    }
    document.getElementById('t-ship').textContent = shipText;
    const ready = q && q.lines.length && (m === 'pickup' || zipOk);
    document.getElementById('t-total').textContent = ready ? money(q.total_cents) : '–';
    btn.disabled = !ready || q.problems.some((p) => !p.remove && !q.lines.find((l) => l.id === p.id));
  }

  linesEl.addEventListener('click', (e) => {
    const id = e.target.closest('[data-remove]')?.dataset.remove;
    if (!id) return;
    setCart(getCart().filter((l) => l.id !== id));
    refresh();
  });
  linesEl.addEventListener('change', (e) => {
    const id = e.target.dataset.qty;
    if (!id) return;
    const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
    setCart(getCart().map((l) => (l.id === id ? { ...l, qty } : l)));
    refresh();
  });
  document.querySelectorAll('input[name=method]').forEach((r) => r.addEventListener('change', refresh));
  zipEl.addEventListener('input', () => {
    zipEl.value = zipEl.value.replace(/\D/g, '').slice(0, 5);
    localStorage.setItem(ZIP_KEY, zipEl.value);
    clearTimeout(timer);
    if (zipEl.value.length === 5 || zipEl.value.length === 0) timer = setTimeout(refresh, 250);
    else setTotals(quote);
  });

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Opening secure checkout…';
    try {
      const { url } = await api('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: getCart().map(({ id, qty }) => ({ id, qty })), zip: zipEl.value.trim(), method: method() }),
      });
      location.href = url;
    } catch (e) {
      notices.innerHTML = `<div class="notice error">${esc(e.message)}</div>`;
      btn.textContent = 'Checkout securely';
      await refresh();
    }
  });

  refresh();
});
