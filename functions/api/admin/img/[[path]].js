// Private image access for admins (custom-order reference photos).
export async function onRequestGet({ env, params }) {
  const key = (Array.isArray(params.path) ? params.path : [params.path]).join('/');
  const obj = await env.BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'private, max-age=3600');
  return new Response(obj.body, { headers });
}
