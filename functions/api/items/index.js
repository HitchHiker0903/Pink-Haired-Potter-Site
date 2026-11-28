import { listShopItems } from '../../../lib/db.js';
import { json } from '../../../lib/util.js';

export async function onRequestGet({ env }) {
  const items = await listShopItems(env.DB);
  return json({ items: items.map(({ stock, weight_lbs, status, sort, updated_at, ...pub }) => pub) });
}
