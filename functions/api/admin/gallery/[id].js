import { json, bad, readJson, str, r2KeyFromUrl } from '../../../../lib/util.js';

export async function onRequestPut({ request, env, params }) {
  const b = await readJson(request);
  if (!b) return bad('Invalid request');
  const r = await env.DB.prepare('UPDATE gallery SET caption=?, collection=? WHERE id=?')
    .bind(str(b.caption, 300), str(b.collection, 60), params.id).run();
  if (!r.meta?.changes) return bad('Photo not found', 404);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const row = await env.DB.prepare('SELECT url FROM gallery WHERE id=?').bind(params.id).first();
  if (!row) return bad('Photo not found', 404);
  await env.DB.prepare('DELETE FROM gallery WHERE id=?').bind(params.id).run();
  const key = r2KeyFromUrl(row.url);
  if (key) {
    const stillUsed =
      (await env.DB.prepare('SELECT 1 FROM gallery WHERE url=?').bind(row.url).first()) ||
      (await env.DB.prepare(`SELECT 1 FROM items WHERE images LIKE ?`).bind(`%${row.url}%`).first());
    if (!stillUsed) await env.BUCKET.delete(key);
  }
  return json({ ok: true });
}
