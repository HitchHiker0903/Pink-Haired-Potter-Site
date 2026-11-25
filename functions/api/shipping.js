// functions/api/shipping.js
// POST { zip, items: [{id, weight_oz, qty}] } or just item count

export async function onRequestPost({ env, request }) {
  const { zip, itemCount, totalWeight } = await request.json();

  // Fetch shipping tiers from settings
  const tiersRow = await env.DB.prepare("SELECT value FROM settings WHERE key='shipping_tiers'").first();
  let tiers = [{ max_items: 1, price: 8 }, { max_items: 3, price: 12 }, { max_items: 6, price: 18 }, { max_items: 999, price: 25 }];
  if (tiersRow) {
    try { tiers = JSON.parse(tiersRow.value); } catch {}
  }

  const count = itemCount || 1;
  let shipping = 25;
  for (const tier of tiers) {
    if (count <= tier.max_items) {
      shipping = tier.price;
      break;
    }
  }

  // Simple ZIP check for local (Overland Park KS area - 662xx roughly)
  const isLocal = zip && (zip.startsWith('662') || zip.startsWith('660') || zip.startsWith('661'));
  const localPickup = isLocal ? 0 : null;

  return Response.json({
    shipping,
    localPickup,
    isLocal,
    estimate: `$${shipping} shipping${isLocal ? ' or free local pickup' : ''}`
  });
}
