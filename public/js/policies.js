document.addEventListener('DOMContentLoaded', async () => {
  const { content, esc, money } = PHP;
  const c = await content();
  let s = {};
  try { s = JSON.parse(c.shipping || '{}'); } catch {}
  const tiers = (s.tiers || []).slice().sort((a, b) => a.upToLbs - b.upToLbs);
  const rows = tiers.map((t, i) => {
    return `<tr><td>${i === 0 ? `Up to ${t.upToLbs} lbs` : `${tiers[i - 1].upToLbs}–${t.upToLbs} lbs`}</td><td style="text-align:right;font-weight:800">${money(t.price * 100)}</td></tr>`;
  }).join('');
  document.getElementById('shipping-info').innerHTML = `
    <p>Orders ship within the US. Shipping is based on the total packed weight of your order and is shown in your cart before you check out.</p>
    ${rows ? `<table class="totals" style="max-width:380px">${rows}</table>` : ''}
    ${s.farSurcharge > 0 ? `<p class="hint">Some far-away ZIP codes have a ${money(s.farSurcharge * 100)} surcharge, which is included in your cart estimate.</p>` : ''}
    ${s.freeShippingOver > 0 ? `<p><strong>Free shipping</strong> on orders of ${money(s.freeShippingOver * 100)} or more!</p>` : ''}`;
});
