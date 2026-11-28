// Creates a one-time Stripe payment link for a custom-order deposit (or full payment).
import { stripe } from '../../../lib/stripe.js';
import { json, bad, readJson, str, dollarsToCents, siteOrigin } from '../../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const req = await env.DB.prepare('SELECT * FROM custom_requests WHERE id=?').bind(String(b?.id || '')).first();
  if (!req) return bad('Request not found', 404);
  const cents = dollarsToCents(b.amount);
  if (!cents || cents < 50) return bad('Amount must be at least $0.50.');
  const label = str(b.label, 120) || `Custom order deposit – ${req.name}`;

  const price = await stripe(env, 'prices', {
    currency: 'usd',
    unit_amount: cents,
    product_data: { name: label },
  });
  const link = await stripe(env, 'payment_links', {
    line_items: [{ price: price.id, quantity: 1 }],
    restrictions: { completed_sessions: { limit: 1 } },
    inactive_message: 'This payment has already been completed. Thank you!',
    after_completion: { type: 'redirect', redirect: { url: `${siteOrigin(request, env)}/custom?paid=1` } },
    phone_number_collection: { enabled: true },
    metadata: { custom_request_id: req.id },
  });
  await env.DB.prepare(`UPDATE custom_requests SET deposit_url=?, deposit_link_id=?, deposit_amount_cents=?, status=CASE WHEN status='new' THEN 'quoted' ELSE status END WHERE id=?`)
    .bind(link.url, link.id, cents, req.id).run();
  return json({ url: link.url });
}
