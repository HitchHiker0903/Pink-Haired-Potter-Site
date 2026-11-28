import { getItem } from '../../../lib/db.js';
import { json, bad } from '../../../lib/util.js';

export async function onRequestGet({ env, params }) {
  const item = await getItem(env.DB, String(params.id));
  if (!item || item.status !== 'active') return bad('Not found', 404);
  const { weight_lbs, status, sort, updated_at, ...pub } = item;
  pub.sold = item.stock <= 0;
  return json({ item: pub });
}
