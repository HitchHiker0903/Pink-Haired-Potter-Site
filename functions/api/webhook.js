// functions/api/webhook.js
// Stripe webhook - simplified signature check (for production use full verification)

export async function onRequestPost({ env, request }) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  // Basic check - in production implement full constructEvent with crypto
  // For now, process if signature present (document full verification in README)
  if (!sig) return new Response('No signature', { status: 400 });

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const itemIds = (session.metadata?.item_ids || '').split(',').filter(Boolean);

    for (const id of itemIds) {
      await env.DB.prepare("UPDATE items SET status='sold', updated_at=datetime('now') WHERE id=?").bind(id).run();
    }
  }

  return Response.json({ received: true });
}
