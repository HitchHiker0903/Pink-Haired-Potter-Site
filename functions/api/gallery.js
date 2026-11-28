import { json } from '../../lib/util.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT id, url, caption, collection FROM gallery ORDER BY sort ASC, created_at DESC')
    .all();
  return json({ photos: results });
}
