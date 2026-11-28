// Serves uploaded photos from R2. Custom-order reference photos are private
// (served only through /api/admin/img/...).
export async function onRequestGet({ env, params }) {
  const key = (Array.isArray(params.path) ? params.path : [params.path]).join('/');
  if (!/^(items|gallery|site)\//.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
