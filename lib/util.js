// Small shared helpers used by the Cloudflare Pages Functions.

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function bad(message, status = 400) {
  return json({ error: message }, status);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Short random id (10 chars, a-z0-9). Short ids keep Stripe metadata small.
export function uid(len = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export function str(v, max = 2000) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}

export function int(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function num(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function dollarsToCents(v) {
  const n = num(v, NaN);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function siteOrigin(request, env) {
  const fromEnv = (env.SITE_URL || '').trim().replace(/\/+$/, '');
  return fromEnv || new URL(request.url).origin;
}

export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
}

// Image URLs stored in the database are either static files (/images/...)
// or R2 objects served through /api/img/<key>. This returns the R2 key, if any.
export function r2KeyFromUrl(url) {
  if (typeof url !== 'string') return null;
  return url.startsWith('/api/img/') ? decodeURIComponent(url.slice('/api/img/'.length)) : null;
}

export function parseImages(v) {
  try {
    const arr = JSON.parse(v || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
