// Copies a (usually sold) shop piece's photos into the gallery.
import { json, bad, readJson, uid, parseImages } from '../../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const item = await env.DB.prepare('SELECT * FROM items WHERE id=?').bind(String(b?.id || '')).first();
  if (!item) return bad('Item not found', 404);
  const imgs = parseImages(item.images);
  if (!imgs.length) return bad('This item has no photos.');
  const which = b.all ? imgs : imgs.slice(0, 1);
  const min = await env.DB.prepare('SELECT MIN(sort) AS m FROM gallery').first();
  let sort = (min?.m ?? 1) - which.length;
  const now = Date.now();
  await env.DB.batch(
    which.map((url) =>
      env.DB.prepare('INSERT INTO gallery (id, url, caption, collection, sort, created_at) VALUES (?,?,?,?,?,?)')
        .bind(uid(), url, item.title, item.category || '', sort++, now)
    )
  );
  return json({ ok: true, added: which.length });
}
