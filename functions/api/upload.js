// functions/api/upload.js
// Admin photo upload to R2. Expects multipart form with file.

export async function onRequestPost({ env, request }) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return new Response('No file', { status: 400 });
  }

  const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  });

  return Response.json({ key, url: `/media/${key}` });
}
