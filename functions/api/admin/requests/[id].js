import { json, bad, readJson, str } from '../../../../lib/util.js';

const STATUSES = ['new', 'quoted', 'deposit paid', 'in progress', 'complete', 'declined'];

export async function onRequestPut({ request, env, params }) {
  const b = await readJson(request);
  if (!b) return bad('Invalid request');
  const status = STATUSES.includes(b.status) ? b.status : 'new';
  const r = await env.DB.prepare('UPDATE custom_requests SET status=?, notes=? WHERE id=?').bind(status, str(b.notes, 5000), params.id).run();
  if (!r.meta?.changes) return bad('Request not found', 404);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const row = await env.DB.prepare('SELECT photo_key FROM custom_requests WHERE id=?').bind(params.id).first();
  if (!row) return bad('Request not found', 404);
  await env.DB.prepare('DELETE FROM custom_requests WHERE id=?').bind(params.id).run();
  if (row.photo_key) await env.BUCKET.delete(row.photo_key);
  return json({ ok: true });
}
