/**
 * Hands out the contact address, but only to a caller that has passed a
 * Cloudflare Turnstile check.
 *
 * The address itself is never in this file, in the site, or in the repo — it
 * lives as a Worker secret (EMAIL) and is only ever sent in a response to a
 * request carrying a Turnstile token that Cloudflare confirms is good.
 *
 * Deploy: see the "Contact address" section of the README.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function cors(origin, allowed) {
  const ok = allowed.includes(origin);
  return {
    ok,
    headers: {
      // only ever name an origin we actually allow; never reflect blindly
      'Access-Control-Allow-Origin': ok ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    }
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const { ok, headers } = cors(request.headers.get('Origin') || '', allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, headers);
    if (!ok) return json({ error: 'origin' }, 403, headers);
    if (!env.TURNSTILE_SECRET || !env.EMAIL) return json({ error: 'unconfigured' }, 500, headers);

    let token = '';
    try {
      token = ((await request.json()) || {}).token || '';
    } catch {
      return json({ error: 'body' }, 400, headers);
    }
    if (typeof token !== 'string' || !token) return json({ error: 'token' }, 400, headers);

    // Canonical siteverify: form-urlencoded secret + token, plus the real
    // client IP. Anything other than an explicit success fails closed.
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token
    });
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.append('remoteip', ip);

    let verdict;
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!res.ok) throw new Error('siteverify ' + res.status);
      verdict = await res.json();
    } catch {
      // network error, non-2xx, or a non-JSON body — never hand the address over
      return json({ error: 'verify' }, 502, headers);
    }
    if (!verdict || verdict.success !== true) return json({ error: 'failed' }, 403, headers);

    return json({ email: env.EMAIL }, 200, headers);
  }
};
