// functions/api/items.js
// Public GET for shop items; admin can use other methods (protected by Access)

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'available';
  const category = url.searchParams.get('category');

  let query = "SELECT id, title, description, price_cents, weight_oz, category, photos, status, created_at FROM items WHERE status = ?";
  const params = [status];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  query += " ORDER BY created_at DESC";

  const { results } = await env.DB.prepare(query).bind(...params).all();

  // Parse photos JSON
  const items = results.map(item => ({
    ...item,
    photos: item.photos ? JSON.parse(item.photos) : [],
    price: (item.price_cents / 100).toFixed(2)
  }));

  return Response.json(items);
}

export async function onRequestPost({ env, request }) {
  // Admin only - Cloudflare Access protects /admin and /api paths if configured
  const data = await request.json();
  const { title, description, price_cents, weight_oz, category, photos, status } = data;

  const result = await env.DB.prepare(
    "INSERT INTO items (title, description, price_cents, weight_oz, category, photos, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    title,
    description || '',
    price_cents,
    weight_oz || 16,
    category || 'mug',
    JSON.stringify(photos || []),
    status || 'available'
  ).run();

  return Response.json({ id: result.meta.last_row_id, success: true });
}

export async function onRequestPut({ env, request }) {
  const data = await request.json();
  const { id, title, description, price_cents, weight_oz, category, photos, status } = data;

  await env.DB.prepare(
    "UPDATE items SET title=?, description=?, price_cents=?, weight_oz=?, category=?, photos=?, status=?, updated_at=datetime('now') WHERE id=?"
  ).bind(
    title,
    description || '',
    price_cents,
    weight_oz || 16,
    category || 'mug',
    JSON.stringify(photos || []),
    status || 'available',
    id
  ).run();

  return Response.json({ success: true });
}

export async function onRequestDelete({ env, request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  await env.DB.prepare("DELETE FROM items WHERE id=?").bind(id).run();
  return Response.json({ success: true });
}
