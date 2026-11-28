// Shared code for every public page: header/footer, site text, cart storage.
const PHP = (() => {
  const CART_KEY = 'php_cart_v1';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (cents) =>
    (Number(cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  // Turns plain text with blank lines into <p> paragraphs (safe – no HTML allowed).
  const paras = (text) =>
    String(text || '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');

  async function api(path, opts = {}) {
    const res = await fetch(path, opts);
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  let contentPromise;
  const content = () => (contentPromise ||= api('/api/content').catch(() => ({})));

  // ----- Cart (stored in this browser) -----
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  };
  const setCart = (c) => {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    updateCartCount();
  };
  function addToCart(item, qty = 1) {
    const cart = getCart();
    const line = cart.find((l) => l.id === item.id);
    const max = item.available ?? item.max ?? 99;
    if (line) {
      if (line.qty >= max) return false;
      line.qty = Math.min(max, line.qty + qty);
    } else {
      cart.push({ id: item.id, qty: Math.min(qty, max), title: item.title, price_cents: item.price_cents, image: (item.images && item.images[0]) || item.image || '' });
    }
    setCart(cart);
    return true;
  }
  const cartQty = () => getCart().reduce((n, l) => n + (l.qty || 0), 0);
  function updateCartCount() {
    document.querySelectorAll('.cart-count').forEach((el) => {
      const n = cartQty();
      el.textContent = n;
      el.classList.toggle('hidden', n === 0);
    });
  }

  function toast(html, ms = 3200) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), ms);
  }

  const NAV = [
    ['/', 'Home'],
    ['/shop', 'Shop'],
    ['/gallery', 'Gallery'],
    ['/custom', 'Custom Orders'],
    ['/about', 'About'],
  ];

  function renderChrome(c) {
    const here = location.pathname === '/index.html' ? '/' : location.pathname;
    const header = document.getElementById('site-header');
    if (header) {
      header.innerHTML = `
        ${c.announcement ? `<div class="announce">${esc(c.announcement)}</div>` : ''}
        <div class="site-header">
          <div class="wrap header-row">
            <a class="brand" href="/" aria-label="${esc(c.business_name || 'Home')}"><img src="/images/logo-wordmark.png" alt="The Pink Haired Potter"></a>
            <button class="menu-btn" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
            <nav class="nav">
              ${NAV.map(([href, label]) => `<a href="${href}" class="${here === href ? 'active' : ''}">${label}</a>`).join('')}
              <a href="/cart" class="cart-link ${here === '/cart' ? 'active' : ''}" aria-label="Cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>
                Cart <span class="cart-count hidden">0</span>
              </a>
            </nav>
          </div>
        </div>`;
      const btn = header.querySelector('.menu-btn');
      const nav = header.querySelector('.nav');
      btn.addEventListener('click', () => {
        nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', nav.classList.contains('open'));
      });
    }
    const footer = document.getElementById('site-footer');
    if (footer) {
      const social = [
        c.instagram_url && `<li><a href="${esc(c.instagram_url)}" target="_blank" rel="noopener">Instagram</a></li>`,
        c.facebook_url && `<li><a href="${esc(c.facebook_url)}" target="_blank" rel="noopener">Facebook</a></li>`,
      ].filter(Boolean).join('');
      footer.innerHTML = `
        <div class="site-footer"><div class="wrap">
          <div class="footer-grid">
            <img src="/images/logo-badge.png" alt="The Pink Haired Potter badge logo">
            <div>
              <h3>Explore</h3>
              <ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="/policies">Shipping, Care &amp; Policies</a></li></ul>
            </div>
            <div>
              <h3>Say hello</h3>
              <ul>
                ${c.contact_email ? `<li><a href="mailto:${esc(c.contact_email)}">${esc(c.contact_email)}</a></li>` : ''}
                <li>Handmade in Olathe, Kansas</li>
                ${social}
              </ul>
            </div>
          </div>
          <div class="copyright">© ${new Date().getFullYear()} ${esc(c.business_name || 'The Pink Haired Potter')} · ${esc(c.artist_name || '')}</div>
        </div></div>`;
    }
    updateCartCount();
  }

  // Fill elements marked data-text="key" (plain text) or data-paras="key" (paragraphs).
  function fillContent(c) {
    document.querySelectorAll('[data-text]').forEach((el) => {
      const v = c[el.dataset.text];
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-paras]').forEach((el) => {
      const v = c[el.dataset.paras];
      if (v) el.innerHTML = paras(v);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    renderChrome({});
    const c = await content();
    renderChrome(c);
    fillContent(c);
  });
  window.addEventListener('storage', updateCartCount);

  return { esc, money, paras, api, content, getCart, setCart, addToCart, cartQty, updateCartCount, toast };
})();
