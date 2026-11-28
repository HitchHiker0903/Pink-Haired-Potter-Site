// Custom order request form. Saves to the database (see Admin > Custom Requests),
// stores the optional reference photo privately, and emails a notice if Resend is set up.
import { json, bad, uid, str, isEmail } from '../../lib/util.js';

const MAX_PHOTO = 10 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return bad('Invalid form');
  }
  if (str(form.get('website'))) return json({ ok: true }); // spam honeypot

  const r = {
    name: str(form.get('name'), 120),
    email: str(form.get('email'), 200),
    phone: str(form.get('phone'), 40),
    piece_type: str(form.get('piece_type'), 120),
    size: str(form.get('size'), 200),
    colors: str(form.get('colors'), 500),
    quantity: str(form.get('quantity'), 40),
    deadline: str(form.get('deadline'), 60),
    budget: str(form.get('budget'), 60),
    details: str(form.get('details'), 4000),
  };
  if (!r.name || !isEmail(r.email) || !r.details) return bad('Please include your name, a valid email, and some details about your idea.');

  const id = uid();
  let photoKey = null;
  const photo = form.get('photo');
  if (photo && typeof photo === 'object' && photo.size > 0) {
    if (photo.size > MAX_PHOTO) return bad('Reference photo must be under 10 MB.');
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(photo.type)) return bad('Reference photo must be an image (JPG, PNG, WEBP, or HEIC).');
    const ext = (photo.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    photoKey = `custom/${id}.${ext}`;
    await env.BUCKET.put(photoKey, photo.stream(), { httpMetadata: { contentType: photo.type } });
  }

  await env.DB
    .prepare(`INSERT INTO custom_requests (id, created_at, name, email, phone, piece_type, size, colors, quantity, deadline, budget, details, photo_key)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, Date.now(), r.name, r.email, r.phone, r.piece_type, r.size, r.colors, r.quantity, r.deadline, r.budget, r.details, photoKey)
    .run();

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const lines = Object.entries(r).filter(([, v]) => v).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`);
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.NOTIFY_FROM || 'Pink Haired Potter Website <onboarding@resend.dev>',
          to: [env.NOTIFY_EMAIL],
          reply_to: r.email,
          subject: `New custom order request from ${r.name}`,
          text: `${lines.join('\n')}\n\n${photoKey ? 'A reference photo was attached – view it in Admin > Custom Requests.' : ''}`,
        }),
      });
    } catch (e) {
      console.error('Email notice failed', e);
    }
  }
  return json({ ok: true });
}
