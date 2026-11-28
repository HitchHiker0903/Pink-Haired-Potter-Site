// Every /api/admin/* request must come from a signed-in admin (Cloudflare Access).
import { verifyAdmin } from '../../../lib/access.js';
import { json } from '../../../lib/util.js';

export async function onRequest(context) {
  const { request, env } = context;
  const who = await verifyAdmin(request, env);
  if (!who.email) return json({ error: who.error || 'Not authorized' }, 401);
  // Blocks other websites from submitting forms to the admin API.
  if (request.method !== 'GET' && request.headers.get('X-Admin-Request') !== '1') {
    return json({ error: 'Missing admin header' }, 403);
  }
  context.data.admin = who.email;
  return context.next();
}
