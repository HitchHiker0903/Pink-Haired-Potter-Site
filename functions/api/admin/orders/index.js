import { json } from '../../../../lib/util.js';
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all();
  return json({ orders: results });
}
