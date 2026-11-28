import { shapeItem } from '../../../../lib/db.js';
import { json, bad, readJson, uid } from '../../../../lib/util.js';
import { cleanItem } from '../../../../lib/admin-items.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare(`SELECT i.*, i.stock - COALESCE((SELECT SUM(r.qty) FROM reservations r WHERE r.item_id=i.id AND r.expires_at > ?),0) AS available
              FROM items i ORDER BY i.sort ASC, i.created_at DESC`)
    .bind(Date.now())
    .all();
  return json({ items: results.map(shapeItem) });
}

export async function onRequestPost({ request, env }) {
  const c = cleanItem(await readJson(request));
  if (c.error) return bad(c.error);
  const id = uid();
  const now = Date.now();
  const min = await env.DB.prepare('SELECT MIN(sort) AS m FROM items').first();
  await env.DB
    .prepare(`INSERT INTO items (id, title, description, price_cents, weight_lbs, stock, category, images, featured, status, sort, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, c.title, c.description, c.price_cents, c.weight_lbs, c.stock, c.category, JSON.stringify(c.images), c.featured, c.status, (min?.m ?? 1) - 1, now, now)
    .run();
  return json({ id });
}
