// Saves a new display order. Body: { table: 'items' | 'gallery', ids: [...] }
import { json, bad, readJson } from '../../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const table = b?.table === 'gallery' ? 'gallery' : b?.table === 'items' ? 'items' : null;
  if (!table || !Array.isArray(b.ids)) return bad('Invalid request');
  await env.DB.batch(b.ids.slice(0, 1000).map((id, i) => env.DB.prepare(`UPDATE ${table} SET sort=? WHERE id=?`).bind(i, String(id))));
  return json({ ok: true });
}
