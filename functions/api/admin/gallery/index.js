import { json, bad, readJson, uid, str } from '../../../../lib/util.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM gallery ORDER BY sort ASC, created_at DESC').all();
  return json({ photos: results });
}

// Body: { photos: [{url, caption, collection}] } – supports adding several at once.
export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const photos = (b?.photos || []).filter((p) => typeof p?.url === 'string' && (p.url.startsWith('/api/img/') || p.url.startsWith('/images/')));
  if (!photos.length) return bad('No photos to add.');
  const min = await env.DB.prepare('SELECT MIN(sort) AS m FROM gallery').first();
  let sort = (min?.m ?? 1) - photos.length;
  const now = Date.now();
  await env.DB.batch(
    photos.slice(0, 50).map((p) =>
      env.DB.prepare('INSERT INTO gallery (id, url, caption, collection, sort, created_at) VALUES (?,?,?,?,?,?)')
        .bind(uid(), p.url, str(p.caption, 300), str(p.collection, 60), sort++, now)
    )
  );
  return json({ ok: true });
}
