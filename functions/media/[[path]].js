// functions/media/[[path]].js
// Serve images from R2

export async function onRequestGet({ env, params }) {
  const key = params.path;
  if (!key) return new Response('Not found', { status: 404 });

  const object = await env.BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
}
