// Cart pricing used by BOTH the shipping estimate and checkout, so the customer
// always sees the same numbers Stripe will charge. Prices always come from the
// database – never from the browser.

import { getItemsByIds, getShippingSettings } from './db.js';

export const MAX_CART_LINES = 20;

export function quoteShipping(settings, totalLbs, zip, subtotalCents) {
  const tiers = (settings.tiers || [])
    .map((t) => ({ upToLbs: Number(t.upToLbs), price: Number(t.price) }))
    .filter((t) => t.upToLbs > 0 && t.price >= 0)
    .sort((a, b) => a.upToLbs - b.upToLbs);

  const freeOver = Number(settings.freeShippingOver) || 0;
  if (freeOver > 0 && subtotalCents >= Math.round(freeOver * 100)) {
    return { cents: 0, label: 'Free shipping' };
  }

  let dollars;
  const tier = tiers.find((t) => totalLbs <= t.upToLbs);
  if (tier) {
    dollars = tier.price;
  } else if (tiers.length) {
    const last = tiers[tiers.length - 1];
    dollars = last.price + Math.ceil(totalLbs - last.upToLbs) * (Number(settings.overMaxPerLb) || 0);
  } else {
    dollars = 0;
  }

  const prefixes = String(settings.farZipPrefixes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const surcharge = Number(settings.farSurcharge) || 0;
  if (surcharge > 0 && zip && prefixes.some((p) => zip.startsWith(p))) dollars += surcharge;

  return { cents: Math.round(dollars * 100), label: 'Standard shipping (USPS/UPS, tracked)' };
}

// Takes [{id, qty}] from the browser and returns trusted line items + totals.
export async function priceCart(db, rawItems, { zip = '', method = 'ship' } = {}) {
  const merged = new Map();
  for (const it of Array.isArray(rawItems) ? rawItems : []) {
    const id = String(it?.id || '').slice(0, 40);
    const qty = Math.max(1, Math.min(99, parseInt(it?.qty, 10) || 1));
    if (id) merged.set(id, (merged.get(id) || 0) + qty);
  }
  if (merged.size > MAX_CART_LINES) return { error: `Carts are limited to ${MAX_CART_LINES} different pieces.` };

  const items = await getItemsByIds(db, [...merged.keys()]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const lines = [];
  const problems = [];
  let subtotal = 0;
  let weight = 0;

  for (const [id, qty] of merged) {
    const item = byId.get(id);
    if (!item || item.status !== 'active' || item.stock <= 0) {
      problems.push({ id, message: 'This piece has sold and was removed from your cart.' , remove: true });
      continue;
    }
    if (item.available <= 0) {
      problems.push({ id, message: `“${item.title}” is on hold in another shopper’s checkout. Try again in about 30 minutes.`, remove: false });
      continue;
    }
    let useQty = qty;
    if (qty > item.available) {
      useQty = item.available;
      problems.push({ id, message: `Only ${item.available} of “${item.title}” available – quantity updated.`, remove: false });
    }
    lines.push({
      id,
      title: item.title,
      qty: useQty,
      price_cents: item.price_cents,
      weight_lbs: item.weight_lbs,
      image: item.images[0] || '',
      max: item.available,
    });
    subtotal += item.price_cents * useQty;
    weight += (Number(item.weight_lbs) || 0) * useQty;
  }

  const settings = await getShippingSettings(db);
  let shipping = { cents: 0, label: '' };
  if (method === 'pickup') {
    if (!settings.pickupEnabled) return { error: 'Local pickup is not available right now.' };
    shipping = { cents: 0, label: `Local pickup – ${settings.pickupCity || 'Olathe, KS'}` };
  } else if (lines.length) {
    shipping = quoteShipping(settings, weight, zip, subtotal);
  }

  return {
    lines,
    problems,
    subtotal_cents: subtotal,
    weight_lbs: Math.round(weight * 10) / 10,
    shipping_cents: shipping.cents,
    shipping_label: shipping.label,
    total_cents: subtotal + shipping.cents,
    pickup_enabled: !!settings.pickupEnabled,
    pickup_city: settings.pickupCity || '',
  };
}
