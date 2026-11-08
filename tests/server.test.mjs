import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPreviewServer } from '../scripts/server.mjs';

test('preview serves the web app, the landing page at /about/, legal pages and assets without exposing repository files', async t => {
  const server = createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const index = await fetch(origin);
  assert.equal(index.status, 200);
  const app = await index.text();
  assert.match(app, /Content-Security-Policy/);
  assert.match(app, /src="\/web\/main\.js"/);
  const about = await fetch(`${origin}/about/`);
  assert.equal(about.status, 200);
  const landing = await about.text();
  assert.match(landing, /Attention/);
  assert.match(landing, /href="\/privacy\/"/);
  for (const page of ['privacy/', 'terms/', 'support/', 'oauth/callback/', 'auth/apple/', 'app/']) {
    assert.equal((await fetch(`${origin}/${page}`)).status, 200, page);
  }
  assert.match(await (await fetch(`${origin}/oauth/callback/`)).text(), /attention:\/\/oauth\/callback/);
  assert.match(await (await fetch(`${origin}/app/`)).text(), /url=\//);
  for (const [path, type] of [['web/main.js', 'text/javascript'], ['web/chat.js', 'text/javascript'], ['web/app.css', 'text/css'], ['style.css', 'text/css'], ['assets/logo.png', 'image/png'], ['assets/attentionagi-device.glb', 'model/gltf-binary'], ['assets/logos/codex.svg', 'image/svg+xml']]) {
    const response = await fetch(`${origin}/${path}`, { method: 'HEAD' });
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('content-type').startsWith(type), path);
    assert.equal(await response.text(), '');
  }
  assert.equal((await fetch(`${origin}/.git/config`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal((await fetch(`${origin}/missing-file`)).status, 404);
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
});
