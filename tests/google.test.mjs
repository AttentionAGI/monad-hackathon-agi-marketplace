import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// auth.js touches window / location / localStorage at import time: the smallest stand-ins that let it load in Node.
const store = new Map();
globalThis.window ??= { addEventListener() {} };
globalThis.location ??= { origin: 'https://attentionai.dev', hostname: 'attentionai.dev' };
globalThis.BroadcastChannel = class { close() {} };          // (a real one would keep the test process alive)
globalThis.localStorage ??= { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

const api = await import('../dist/web/api.js');
const auth = await import('../dist/web/auth.js');
const { CONFIG } = await import('../dist/web/ui.js');

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('Continue with Google: the web client id, only on attentionai.dev origins', () => {
  assert.equal(CONFIG.googleClientId, '743119233004-e3lj7m18i25e74rg4omml4mqr9rs21ar.apps.googleusercontent.com');
  assert.ok(auth.googleAvailable('https://attentionai.dev'));
  assert.ok(auth.googleAvailable('https://www.attentionai.dev'));
  assert.ok(!auth.googleAvailable('http://localhost:5173'));
});

test('the CSP lets Google Identity Services load its script, style, iframe and calls - and nothing broader', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const csp = Object.fromEntries(html.match(/Content-Security-Policy" content="([^"]+)"/)[1].split(';').map(d => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.ok(csp['script-src'].includes('https://accounts.google.com/gsi/client'));
  assert.ok(csp['style-src'].includes('https://accounts.google.com/gsi/style'));
  assert.ok(csp['frame-src'].includes('https://accounts.google.com/gsi/'));
  assert.ok(csp['connect-src'].includes('https://accounts.google.com/gsi/'));
  assert.ok(!Object.values(csp).flat().includes('https://accounts.google.com'), 'GIS paths only');
  assert.ok(csp['script-src'].includes('https://appleid.cdn-apple.com'), 'Apple still allowed');
});

test('signInWithGoogle posts the ID token without a bearer token and stores the session', async t => {
  const calls = [];
  api.setTransport(async (url, init) => { calls.push({ url, init }); return json({ token: 'atk_google', user_id: 'u_g', new: true, name: 'Ada' }); });
  t.after(() => { api.session.clear(); api.setTransport((u, i) => fetch(u, i)); });
  api.session.set('atk_old');
  const r = await auth.signInWithGoogle('eyJ.google.idtoken');
  assert.equal(r.user_id, 'u_g');
  assert.equal(calls[0].url, `${api.API_BASE}/auth/google`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), { id_token: 'eyJ.google.idtoken' });
  assert.equal(api.session.token, 'atk_google');
});

test('linkIdentity: identities on success; friendly errors; a refused Google token does not sign the user out', async t => {
  let signedOut = false;
  api.onUnauthorized(() => { signedOut = true; });
  api.session.set('atk_me');
  const replies = [
    json({ ok: true, provider: 'google', email: 'ada@gmail.com', identities: [{ provider: 'apple', email: null }, { provider: 'google', email: 'ada@gmail.com' }] }),
    json({ ok: false, error: 'identity_in_use', message: 'x' }, 409),
    json({ ok: false, error: 'provider_already_linked', message: 'x' }, 409),
    json({ ok: false, error: 'invalid_token', message: 'token is for another app' }, 400),
  ];
  const sent = [];
  api.setTransport(async (url, init) => { sent.push({ url, init }); return replies.shift(); });
  t.after(() => { api.session.clear(); api.setTransport((u, i) => fetch(u, i)); api.onUnauthorized(() => {}); });
  const ids = await auth.linkIdentity('google', 'tok');
  assert.deepEqual(ids.map(i => i.provider), ['apple', 'google']);
  assert.equal(sent[0].url, `${api.API_BASE}/account/link`);
  assert.equal(sent[0].init.headers.Authorization, 'Bearer atk_me');
  assert.deepEqual(JSON.parse(sent[0].init.body), { provider: 'google', id_token: 'tok' });
  await assert.rejects(auth.linkIdentity('google', 'tok'), /already has its own Attention account/);
  await assert.rejects(auth.linkIdentity('apple', 'tok'), /different Apple account is already linked/);
  await assert.rejects(auth.linkIdentity('google', 'tok'), /couldn't be verified/);
  assert.equal(signedOut, false);
  assert.equal(api.session.token, 'atk_me');
});
