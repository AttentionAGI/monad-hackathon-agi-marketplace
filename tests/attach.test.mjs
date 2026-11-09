import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, fit, buildParts, toBase64, scaleTo, shown, sizeLabel, MAX_FILES, MAX_BYTES, ATTACH_ERRORS } from '../dist/web/attach.js';
import { setTransport, sendTask } from '../dist/web/api.js';

test('attachments: only photos, PDFs and text files are accepted', () => {
  assert.deepEqual(classify({ name: 'IMG_1.JPG', type: 'image/jpeg' }), { kind: 'image', mime: 'image/jpeg' });
  assert.deepEqual(classify({ name: 'IMG_2.heic', type: '' }), { kind: 'image', mime: 'image/heic' });
  assert.deepEqual(classify({ name: 'shot.webp', type: 'image/webp' }), { kind: 'image', mime: 'image/webp' });
  assert.deepEqual(classify({ name: 'lease.pdf', type: 'application/pdf' }), { kind: 'pdf', mime: 'application/pdf' });
  assert.deepEqual(classify({ name: 'notes.md', type: '' }), { kind: 'text', mime: 'text/markdown' });
  assert.deepEqual(classify({ name: 'data.csv', type: 'text/csv' }), { kind: 'text', mime: 'text/csv' });
  assert.deepEqual(classify({ name: 'x.json', type: 'application/json' }), { kind: 'text', mime: 'application/json' });
  assert.match(classify({ name: 'setup.exe', type: 'application/x-msdownload' }).error, /can't be attached/);
  assert.match(classify({ name: 'page.html', type: 'text/html' }).error, /PDFs and text files/);
});

test('attachments: at most 4 per message, the rest are refused with a message', () => {
  assert.equal(MAX_FILES, 4); assert.equal(MAX_BYTES, 10 * 1024 * 1024);
  assert.deepEqual(fit(0, 3), { take: 3 });
  assert.deepEqual(fit(3, 2), { take: 1, error: 'You can attach up to 4 files to one message.' });
  assert.equal(fit(4, 1).take, 0);
});

test('attachments: photos are scaled to 2000 px on the long edge, never up', () => {
  assert.deepEqual(scaleTo(4032, 3024), { w: 2000, h: 1500 });
  assert.deepEqual(scaleTo(3024, 4032), { w: 1500, h: 2000 });
  assert.deepEqual(scaleTo(800, 600), { w: 800, h: 600 });
  assert.equal(sizeLabel(2.5 * 1048576), '2.5 MB'); assert.equal(sizeLabel(300), '1 KB');
});

test('attachments are sent as A2A file parts after the text; the thread keeps only names and thumbnails', async () => {
  const atts = [{ id: 'a', name: 'r.jpg', kind: 'image', mime: 'image/jpeg', size: 3, bytes: toBase64(new Uint8Array([0xff, 0xd8, 0xff])), thumb: 'data:image/jpeg;base64,xx' },
    { id: 'b', name: 'notes.txt', kind: 'text', mime: 'text/plain', size: 2, bytes: toBase64(new TextEncoder().encode('hi')) }];
  assert.deepEqual(buildParts('what is this?', atts), [
    { kind: 'text', text: 'what is this?' },
    { kind: 'file', file: { name: 'r.jpg', mimeType: 'image/jpeg', bytes: '/9j/' } },
    { kind: 'file', file: { name: 'notes.txt', mimeType: 'text/plain', bytes: 'aGk=' } }]);
  assert.deepEqual(buildParts('', atts.slice(1)).map(p => p.kind), ['file']);           // a file alone is a message
  const kept = shown(atts);
  assert.ok(kept.every(a => !('bytes' in a)));
  assert.equal(kept[0].thumb, 'data:image/jpeg;base64,xx');

  let sent;                                                                           // through the real message/send call
  setTransport(async (url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { id: 't1', status: { state: 'working' } } }), { status: 200 }); });
  await sendTask({ role: 'user', parts: buildParts('look', atts) });
  assert.equal(sent.method, 'message/send');
  assert.deepEqual(sent.params.message.parts.map(p => p.kind), ['text', 'file', 'file']);
});

test("the server's attachment refusals reach the user as its own clear message", async () => {
  setTransport(async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32008, message: 'You can attach up to 4 files to one message.', data: { error: 'too_many_attachments' } } }), { status: 400 }));
  await assert.rejects(sendTask({ role: 'user', parts: [] }), e => {
    assert.ok(ATTACH_ERRORS.has(e.code)); assert.equal(e.message, 'You can attach up to 4 files to one message.'); return true;
  });
});
