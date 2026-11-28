import { json, bad, readJson, r2KeyFromUrl, parseImages } from '../../../../lib/util.js';
import { cleanItem } from '../../../../lib/admin-items.js';

export async function onRequestPut({ request, env, params }) {
  const c = cleanItem(await readJson(request));
  if (c.error) return bad(c.error);
  const r = await env.DB
    .prepare(`UPDATE items SET title=?, description=?, price_cents=?, weight_lbs=?, stock=?, category=?, images=?, featured=?, status=?, updated_at=? WHERE id=?`)
    .bind(c.title, c.description, c.price_cents, c.weight_lbs, c.stock, c.category, JSON.stringify(c.images), c.featured, c.status, Date.now(), params.id)
    .run();
  if (!r.meta?.changes) return bad('Item not found', 404);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const row = await env.DB.prepare('SELECT images FROM items WHERE id=?').bind(params.id).first();
  if (!row) return bad('Item not found', 404);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM items WHERE id=?').bind(params.id),
    env.DB.prepare('DELETE FROM reservations WHERE item_id=?').bind(params.id),
  ]);
  // Remove photos from storage unless the gallery still uses them.
  for (const url of parseImages(row.images)) {
    const key = r2KeyFromUrl(url);
    if (!key) continue;
    const used = await env.DB.prepare('SELECT 1 FROM gallery WHERE url=?').bind(url).first();
    if (!used) await env.BUCKET.delete(key);
  }
  return json({ ok: true });
}
