// Creates a Stripe Checkout Session for the whole cart.
// 1) Re-prices the cart from the database  2) places a 31-minute hold on the
// pieces so two people can't buy the same one  3) sends the shopper to Stripe.
import { priceCart } from '../../lib/cart.js';
import { stripe } from '../../lib/stripe.js';
import { json, bad, readJson, uid, siteOrigin } from '../../lib/util.js';

const HOLD_MINUTES = 31; // Stripe's minimum checkout expiry is 30 minutes

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return bad('Invalid request');
  const method = body.method === 'pickup' ? 'pickup' : 'ship';
  const zip = String(body.zip || '').trim();
  if (method === 'ship' && !/^\d{5}$/.test(zip)) return bad('Please enter your 5-digit ZIP code to calculate shipping.');

  const cart = await priceCart(env.DB, body.items, { zip, method });
  if (cart.error) return bad(cart.error);
  if (cart.problems.length) return json({ error: 'Your cart changed. Please review it and try again.', cart }, 409);
  if (!cart.lines.length) return bad('Your cart is empty.');

  // Place holds, then double-check nobody else grabbed the same piece at the same moment.
  const db = env.DB;
  const tempKey = `pending_${uid(16)}`;
  const expiresAt = Date.now() + HOLD_MINUTES * 60_000;
  await db.batch(
    cart.lines.map((l) =>
      db.prepare('INSERT INTO reservations (session_id, item_id, qty, title, price_cents, expires_at) VALUES (?,?,?,?,?,?)')
        .bind(tempKey, l.id, l.qty, l.title, l.price_cents, expiresAt)
    )
  );
  const rawCheck = await db
    .prepare(`SELECT i.id, i.stock - COALESCE((SELECT SUM(r.qty) FROM reservations r WHERE r.item_id=i.id AND r.expires_at > ?),0) AS left_after
              FROM items i WHERE i.id IN (${cart.lines.map(() => '?').join(',')})`)
    .bind(Date.now(), ...cart.lines.map((l) => l.id))
    .all();
  if (rawCheck.results.some((r) => r.left_after < 0)) {
    await db.prepare('DELETE FROM reservations WHERE session_id = ?').bind(tempKey).run();
    return json({ error: 'Someone just checked out with one of these pieces. Please refresh your cart.' }, 409);
  }

  const origin = siteOrigin(request, env);
  const absolute = (u) => (u && origin.startsWith('https://') ? (u.startsWith('http') ? u : origin + u) : null);
  const compactCart = cart.lines.map((l) => `${l.id}:${l.qty}`).join(',');

  const params = {
    mode: 'payment',
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart?canceled=1`,
    expires_at: Math.floor(expiresAt / 1000) - 30,
    payment_method_types: ['card'],
    phone_number_collection: { enabled: true },
    line_items: cart.lines.map((l) => {
      const img = absolute(l.image);
      return {
        quantity: l.qty,
        price_data: {
          currency: 'usd',
          unit_amount: l.price_cents,
          product_data: { name: l.title, ...(img ? { images: [img] } : {}) },
        },
      };
    }),
    metadata: {
      order_type: 'shop',
      fulfillment: method,
      est_zip: method === 'ship' ? zip : '',
      cart: compactCart.length <= 500 ? compactCart : '',
    },
  };

  if (method === 'ship') {
    params.shipping_address_collection = { allowed_countries: ['US'] };
    params.shipping_options = [{
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: cart.shipping_label || 'Shipping',
        fixed_amount: { amount: cart.shipping_cents, currency: 'usd' },
      },
    }];
  } else {
    params.custom_text = {
      submit: { message: `Local pickup in ${cart.pickup_city || 'Olathe, KS'}. The pickup address is shown after payment.` },
    };
  }

  if (env.STRIPE_AUTOMATIC_TAX === 'true') {
    params.automatic_tax = { enabled: true };
    params.billing_address_collection = 'required';
  }

  try {
    const session = await stripe(env, 'checkout/sessions', params);
    await db.prepare('UPDATE reservations SET session_id = ? WHERE session_id = ?').bind(session.id, tempKey).run();
    return json({ url: session.url });
  } catch (err) {
    await db.prepare('DELETE FROM reservations WHERE session_id = ?').bind(tempKey).run();
    console.error('Stripe checkout error', err);
    return json({ error: 'Checkout could not be started. Please try again in a moment.', detail: String(err.message) }, 502);
  }
}
