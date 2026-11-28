// Stripe calls this after a checkout finishes or expires.
// Events to enable in Stripe: checkout.session.completed, checkout.session.expired
import { verifyStripeSignature } from '../../lib/stripe.js';
import { json, bad, uid } from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return bad('Invalid signature', 400);

  const event = JSON.parse(payload);
  const s = event.data?.object || {};
  const db = env.DB;

  if (event.type === 'checkout.session.expired') {
    await db.prepare('DELETE FROM reservations WHERE session_id = ?').bind(s.id).run();
    return json({ received: true });
  }

  if (event.type !== 'checkout.session.completed') return json({ received: true, ignored: event.type });
  if (s.payment_status && s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
    return json({ received: true, note: 'not paid yet' });
  }

  // Custom-order deposit paid through a payment link created in Admin.
  if (s.payment_link) {
    await db
      .prepare(`UPDATE custom_requests SET deposit_paid = 1, status = 'deposit paid' WHERE deposit_link_id = ?`)
      .bind(s.payment_link)
      .run();
    return json({ received: true });
  }

  if (s.metadata?.order_type !== 'shop') return json({ received: true, ignored: 'not a shop order' });

  // Already recorded? (Stripe can send the same event more than once.)
  const existing = await db.prepare('SELECT id FROM orders WHERE session_id = ?').bind(s.id).first();
  if (existing) return json({ received: true, duplicate: true });

  // Which pieces were bought: from the checkout hold, or the backup copy in metadata.
  let lines = (await db.prepare('SELECT item_id, qty, title, price_cents FROM reservations WHERE session_id = ?').bind(s.id).all()).results;
  if (!lines.length && s.metadata?.cart) {
    lines = s.metadata.cart.split(',').map((p) => {
      const [item_id, qty] = p.split(':');
      return { item_id, qty: parseInt(qty, 10) || 1, title: '', price_cents: null };
    });
  }

  const ship = s.shipping_details || s.collected_information?.shipping_details || null;
  const estZip = s.metadata?.est_zip || '';
  const shipZip = (ship?.address?.postal_code || '').slice(0, 5);
  const zipMismatch = s.metadata?.fulfillment === 'ship' && estZip && shipZip && estZip !== shipZip ? 1 : 0;
  const cd = s.customer_details || {};

  const stmts = lines.map((l) =>
    db.prepare(`UPDATE items SET stock = MAX(stock - ?, 0), updated_at = ? WHERE id = ?`).bind(l.qty, Date.now(), l.item_id)
  );
  stmts.push(db.prepare('DELETE FROM reservations WHERE session_id = ?').bind(s.id));
  stmts.push(
    db.prepare(`INSERT OR IGNORE INTO orders (id, session_id, created_at, email, name, phone, fulfillment, shipping_address,
                  items, subtotal_cents, shipping_cents, tax_cents, total_cents, est_zip, zip_mismatch)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        uid(), s.id, Date.now(), cd.email || '', ship?.name || cd.name || '', cd.phone || '',
        s.metadata?.fulfillment === 'pickup' ? 'pickup' : 'ship',
        ship ? JSON.stringify({ name: ship.name, ...ship.address }) : '',
        JSON.stringify(lines.map((l) => ({ id: l.item_id, title: l.title, qty: l.qty, price_cents: l.price_cents }))),
        s.amount_subtotal ?? null, s.total_details?.amount_shipping ?? null, s.total_details?.amount_tax ?? null,
        s.amount_total ?? null, estZip, zipMismatch
      )
  );
  await db.batch(stmts);
  return json({ received: true });
}
