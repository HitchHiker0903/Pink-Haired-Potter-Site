// functions/api/checkout.js
// Creates Stripe Checkout Session using fetch (no SDK dependency)

export async function onRequestPost({ env, request }) {
  const { items: cartItems, shipping, shippingMethod } = await request.json();

  if (!cartItems || cartItems.length === 0) {
    return new Response('Empty cart', { status: 400 });
  }

  const ids = cartItems.map(i => i.id);
  const placeholders = ids.map(() => '?').join(',');
  const { results: dbItems } = await env.DB.prepare(
    `SELECT id, title, price_cents, status FROM items WHERE id IN (${placeholders})`
  ).bind(...ids).all();

  const available = dbItems.filter(i => i.status === 'available');
  if (available.length !== cartItems.length) {
    return Response.json({ error: 'Some items no longer available' }, { status: 400 });
  }

  const line_items = available.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.title },
      unit_amount: item.price_cents,
    },
    quantity: 1,
  }));

  if (shipping && shipping > 0 && shippingMethod !== 'pickup') {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(shipping * 100),
      },
      quantity: 1,
    });
  }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();
  params.append('allowed_payment_method_types[0]', 'card');
  params.append('mode', 'payment');
  params.append('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/shop.html`);
  params.append('metadata[item_ids]', available.map(i => i.id).join(','));
  params.append('metadata[shipping_method]', shippingMethod || 'ship');
  params.append('automatic_tax[enabled]', 'true');

  line_items.forEach((li, idx) => {
    params.append(`line_items[${idx}][price_data][currency]`, li.price_data.currency);
    params.append(`line_items[${idx}][price_data][product_data][name]`, li.price_data.product_data.name);
    params.append(`line_items[${idx}][price_data][unit_amount]`, li.price_data.unit_amount.toString());
    params.append(`line_items[${idx}][quantity]`, li.quantity.toString());
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await stripeRes.json();
  if (!stripeRes.ok) {
    return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 500 });
  }

  return Response.json({ url: session.url });
}
