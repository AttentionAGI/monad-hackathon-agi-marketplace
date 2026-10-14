import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPreviewServer } from '../scripts/server.mjs';

test('preview serves the application and 3D assets without exposing repository files', async t => {
  const server = createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const index = await fetch(origin);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /AttentionAGI/);
  for (const [path, type] of [['app.js', 'text/javascript'], ['style.css', 'text/css'], ['assets/attentionagi-device.glb', 'model/gltf-binary'], ['assets/logos/codex.svg', 'image/svg+xml']]) {
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
