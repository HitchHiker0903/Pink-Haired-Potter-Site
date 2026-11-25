// functions/api/gallery.js

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, caption, photo_key, collection, sort_order FROM gallery ORDER BY sort_order ASC, created_at DESC"
  ).all();
  return Response.json(results);
}

export async function onRequestPost({ env, request }) {
  const data = await request.json();
  const { title, caption, photo_key, collection, sort_order } = data;

  const result = await env.DB.prepare(
    "INSERT INTO gallery (title, caption, photo_key, collection, sort_order) VALUES (?, ?, ?, ?, ?)"
  ).bind(title || '', caption || '', photo_key, collection || 'general', sort_order || 0).run();

  return Response.json({ id: result.meta.last_row_id, success: true });
}

export async function onRequestDelete({ env, request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  await env.DB.prepare("DELETE FROM gallery WHERE id=?").bind(id).run();
  return Response.json({ success: true });
}
