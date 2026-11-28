import { priceCart } from '../../lib/cart.js';
import { json, bad, readJson } from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return bad('Invalid request');
  const method = body.method === 'pickup' ? 'pickup' : 'ship';
  const zip = String(body.zip || '').trim();
  if (method === 'ship' && zip && !/^\d{5}$/.test(zip)) return bad('Please enter a 5-digit US ZIP code.');
  const result = await priceCart(env.DB, body.items, { zip, method });
  if (result.error) return bad(result.error);
  return json(result);
}
