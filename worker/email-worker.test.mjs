/**
 * Checks email-worker.js refuses everything it should, with Turnstile's
 * siteverify stubbed out. No Cloudflare account and no network needed:
 *
 *   node worker/email-worker.test.mjs
 *
 * The case that matters most is "no Origin header" — that is what curl and
 * every scraper sends, and it must never come back with the address.
 */
import worker from './email-worker.js';

const ENV = {
  ALLOWED_ORIGINS: 'https://schulzedaniel.github.io,http://localhost:8000',
  TURNSTILE_SECRET: 'secret',
  EMAIL: 'real@address.test'
};
const SITE = 'https://schulzedaniel.github.io';
let verdict = { success: true };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('siteverify')) {
    const got = init.body.get('secret');
    if (got !== ENV.TURNSTILE_SECRET) throw new Error('worker sent wrong secret');
    return new Response(JSON.stringify(verdict), { headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, init);
};

const req = (opts = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  // 'omit' means send no Origin at all — what curl and scrapers do
  if (opts.origin !== 'omit') headers.Origin = opts.origin || SITE;
  return new Request('https://w.test/', {
    method: opts.method || 'POST',
    headers,
    body: opts.method === 'GET' || opts.method === 'OPTIONS' ? undefined
      : JSON.stringify(opts.body === undefined ? { token: 'tok' } : opts.body)
  });
};

let pass = 0, fail = 0;
async function check(name, opts, want) {
  const res = await worker.fetch(req(opts), ENV);
  const text = await res.text();
  const leaked = text.includes(ENV.EMAIL);
  const acao = res.headers.get('Access-Control-Allow-Origin');
  const ok = res.status === want.status && leaked === !!want.email
    && (want.acao === undefined || acao === want.acao);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${res.status} acao=${acao} email=${leaked ? 'SENT' : 'no'}`);
  if (!ok) { fail++; console.log('        wanted', JSON.stringify(want), 'body:', text.slice(0, 90)); } else pass++;
}

await check('preflight from allowed origin', { method: 'OPTIONS' }, { status: 204, acao: SITE });
await check('GET is rejected', { method: 'GET' }, { status: 405 });
await check('other origin gets nothing', { origin: 'https://evil.test' }, { status: 403, acao: 'null' });
await check('no Origin header at all (curl, scrapers)', { origin: 'omit' }, { status: 403, acao: 'null' });
await check('missing token', { body: {} }, { status: 400 });
await check('non-string token', { body: { token: { a: 1 } } }, { status: 400 });
verdict = { success: false, 'error-codes': ['invalid-input-response'] };
await check('turnstile says no', {}, { status: 403 });
verdict = { success: true };
await check('valid token from allowed origin', {}, { status: 200, email: true, acao: SITE });
await check('localhost origin allowed', { origin: 'http://localhost:8000' }, { status: 200, email: true });

const bare = await worker.fetch(req(), { ...ENV, EMAIL: '' });
console.log(`${bare.status === 500 ? 'PASS' : 'FAIL'}  unconfigured worker refuses  → ${bare.status}`);
bare.status === 500 ? pass++ : fail++;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
