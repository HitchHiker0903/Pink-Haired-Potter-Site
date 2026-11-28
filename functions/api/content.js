import { getContent } from '../../lib/db.js';
import { json } from '../../lib/util.js';

export async function onRequestGet({ env }) {
  const content = await getContent(env.DB);
  return json(content);
}
