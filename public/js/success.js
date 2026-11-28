document.addEventListener('DOMContentLoaded', async () => {
  const { api, esc, money, setCart } = PHP;
  const el = document.getElementById('order');
  const id = new URLSearchParams(location.search).get('session_id');
  setCart([]);
  if (!id) { el.innerHTML = '<p>Your order was received.</p>'; return; }
  let o;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { o = await api(`/api/order?session_id=${encodeURIComponent(id)}`); break; } catch { await new Promise((r) => setTimeout(r, 1500)); }
  }
  if (!o) { el.innerHTML = '<p>Your payment went through. Order details will arrive by email.</p>'; return; }
  const items = (o.items || []).map((i) => `<li>${esc(i.title || 'Handmade piece')}${i.qty > 1 ? ` × ${i.qty}` : ''}</li>`).join('');
  el.innerHTML = `
    <p style="font-size:1.15rem">${o.first_name ? `${esc(o.first_name)}, your` : 'Your'} order is confirmed${o.total_cents ? ` – ${money(o.total_cents)}` : ''}.</p>
    ${items ? `<ul style="text-align:left;display:inline-block">${items}</ul>` : ''}
    ${o.fulfillment === 'pickup'
      ? `<div class="notice" style="text-align:left"><strong>Local pickup</strong><br>${esc(o.pickup_address)}<br>${esc(o.pickup_instructions)}</div>`
      : '<p>I’ll pack it up carefully and email you tracking info once it ships.</p>'}`;
});
