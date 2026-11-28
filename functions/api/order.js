// Order confirmation details for the success page (looked up by Stripe session id).
import { getContent } from '../../lib/db.js';
import { stripe } from '../../lib/stripe.js';
import { json, bad } from '../../lib/util.js';

export async function onRequestGet({ request, env }) {
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return bad('Missing order reference');

  let fulfillment, name, items, total;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE session_id = ?').bind(sessionId).first();
  if (order) {
    fulfillment = order.fulfillment;
    name = order.name;
    items = JSON.parse(order.items || '[]');
    total = order.total_cents;
  } else {
    // Webhook may not have arrived yet – ask Stripe directly.
    try {
      const s = await stripe(env, `checkout/sessions/${sessionId}`, {}, 'GET');
      if (s.payment_status !== 'paid') return bad('Payment not completed', 402);
      fulfillment = s.metadata?.fulfillment === 'pickup' ? 'pickup' : 'ship';
      name = s.customer_details?.name || '';
      const r = await env.DB.prepare('SELECT title, qty, price_cents FROM reservations WHERE session_id = ?').bind(sessionId).all();
      items = r.results;
      total = s.amount_total;
    } catch {
      return bad('Order not found', 404);
    }
  }

  const out = { fulfillment, first_name: String(name || '').split(' ')[0], items, total_cents: total };
  if (fulfillment === 'pickup') {
    const c = await getContent(env.DB, { includePrivate: true });
    out.pickup_address = c.private_pickup_address || '';
    out.pickup_instructions = c.private_pickup_instructions || '';
  }
  return json(out);
}
