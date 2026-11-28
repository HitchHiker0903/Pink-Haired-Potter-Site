// Admin login check using Cloudflare Access (Zero Trust, free plan).
// Cloudflare Access puts a signed token on every request after you log in.
// We verify that token's signature here, so the admin API stays locked even if
// someone finds the URL or reaches the site through the *.pages.dev address.

let certCache = { at: 0, team: '', keys: [] };

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function teamUrl(env) {
  let t = String(env.ACCESS_TEAM_DOMAIN || '').trim().replace(/\/+$/, '');
  if (!t) return '';
  if (!t.startsWith('http')) t = `https://${t}`;
  if (!t.includes('.')) t = `${t}.cloudflareaccess.com`;
  return t;
}

async function getKeys(team) {
  if (certCache.team === team && Date.now() - certCache.at < 3600_000 && certCache.keys.length) return certCache.keys;
  const res = await fetch(`${team}/cdn-cgi/access/certs`);
  const data = await res.json();
  certCache = { at: Date.now(), team, keys: data.keys || [] };
  return certCache.keys;
}

export async function verifyAdmin(request, env) {
  if (env.DEV_MODE === 'true') return { email: 'local-dev' };

  const team = teamUrl(env);
  const aud = String(env.ACCESS_AUD || '').trim();
  if (!team || !aud) return { error: 'Admin login is not configured (ACCESS_TEAM_DOMAIN / ACCESS_AUD).' };

  const token = request.headers.get('Cf-Access-Jwt-Assertion') || getCookie(request, 'CF_Authorization');
  if (!token) return { error: 'Not signed in.' };

  try {
    const [h, p, s] = token.split('.');
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    if (header.alg !== 'RS256') return { error: 'Bad token.' };

    const keys = await getKeys(team);
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return { error: 'Unknown token key.' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return { error: 'Bad token signature.' };

    const now = Math.floor(Date.now() / 1000);
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(aud)) return { error: 'Token is for a different application.' };
    if (payload.exp && payload.exp < now) return { error: 'Session expired – reload the page.' };
    if (payload.iss && payload.iss !== team) return { error: 'Token issuer mismatch.' };

    const email = String(payload.email || '').toLowerCase();
    const allowed = String(env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (allowed.length && !allowed.includes(email)) return { error: 'This email is not an admin.' };
    return { email };
  } catch (e) {
    return { error: 'Could not verify login.' };
  }
}
