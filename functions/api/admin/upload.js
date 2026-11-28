// Photo upload from the admin page. The admin page shrinks photos in the browser
// before sending, so storage stays small. Returns the public URL.
import { json, bad, uid } from '../../../lib/util.js';

const MAX = 8 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  if (!env.BUCKET) return bad('Photo storage (R2 binding "BUCKET") is not set up.', 500);
  const form = await request.formData();
  const file = form.get('file');
  const folder = form.get('folder') === 'gallery' ? 'gallery' : form.get('folder') === 'site' ? 'site' : 'items';
  if (!file || typeof file !== 'object' || !file.size) return bad('No file received.');
  if (file.size > MAX) return bad('Photo is too large (8 MB max after resizing).');
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return bad('Photos must be JPG, PNG, or WEBP.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = `${folder}/${Date.now().toString(36)}-${uid(6)}.${ext}`;
  await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ url: `/api/img/${key}` });
}
