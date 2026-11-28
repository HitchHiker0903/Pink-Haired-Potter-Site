import { json, bad, readJson, str } from '../../../../lib/util.js';
export async function onRequestPut({ request, env, params }) {
  const b = await readJson(request);
  if (!b) return bad('Invalid request');
  const status = ['new', 'packed', 'shipped', 'picked up', 'canceled'].includes(b.status) ? b.status : 'new';
  const r = await env.DB.prepare('UPDATE orders SET status=?, notes=? WHERE id=?').bind(status, str(b.notes, 5000), params.id).run();
  if (!r.meta?.changes) return bad('Order not found', 404);
  return json({ ok: true });
}
