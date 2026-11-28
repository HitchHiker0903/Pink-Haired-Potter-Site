import { getContent } from '../../../lib/db.js';
import { DEFAULT_CONTENT } from '../../../lib/defaults.js';
import { json, bad, readJson } from '../../../lib/util.js';

export async function onRequestGet({ env }) {
  return json(await getContent(env.DB, { includePrivate: true }));
}

// Body: { values: { key: value, ... } } – only known keys are saved.
export async function onRequestPut({ request, env }) {
  const b = await readJson(request);
  const values = b?.values;
  if (!values || typeof values !== 'object') return bad('Invalid request');
  const stmts = [];
  for (const [k, v] of Object.entries(values)) {
    if (!(k in DEFAULT_CONTENT)) continue;
    let val = typeof v === 'string' ? v : JSON.stringify(v);
    if (k === 'shipping') {
      try { JSON.parse(val); } catch { return bad('Shipping settings are not valid.'); }
    }
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO content (key, value) VALUES (?, ?)').bind(k, val.slice(0, 20000)));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, saved: stmts.length });
}
