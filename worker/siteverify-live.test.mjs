// Proves the Worker's siteverify request shape is right by pointing it at the
// REAL challenges.cloudflare.com using Cloudflare's published dummy secrets.
// No account, no token, no real secret involved.
import worker from './email-worker.js';

const PASS = '1x0000000000000000000000000000000AA';  // dummy secret: always passes
const FAIL = '2x0000000000000000000000000000000AA';  // dummy secret: always fails
const SITE = 'https://schulzedaniel.github.io';
const EMAIL = 'real@address.test';

const call = (secret, token) => worker.fetch(new Request('https://w.test/', {
  method: 'POST',
  headers: { Origin: SITE, 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
}), { ALLOWED_ORIGINS: SITE, TURNSTILE_SECRET: secret, EMAIL });

// First: what does the live endpoint actually say to our request shape?
const raw = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ secret: PASS, response: 'dummy-token' })
});
console.log('live siteverify, dummy pass-secret →', JSON.stringify(await raw.json()));

const rawFail = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ secret: FAIL, response: 'dummy-token' })
});
console.log('live siteverify, dummy fail-secret →', JSON.stringify(await rawFail.json()));

console.log('\n--- through the Worker ---');
let ok = 0, bad = 0;
for (const [name, secret, wantStatus, wantEmail] of [
  ['dummy secret that always passes → address released', PASS, 200, true],
  ['dummy secret that always fails  → refused', FAIL, 403, false]
]) {
  const res = await call(secret, 'dummy-token');
  const text = await res.text();
  const leaked = text.includes(EMAIL);
  const good = res.status === wantStatus && leaked === wantEmail;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}  → ${res.status} email=${leaked ? 'SENT' : 'no'}`);
  if (!good) { bad++; console.log('      body:', text.slice(0, 120)); } else ok++;
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
