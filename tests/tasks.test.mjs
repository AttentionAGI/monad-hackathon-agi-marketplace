// Non-blocking chat: message/send with configuration.blocking=false, then tasks/get until the task settles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setTransport, sendTask, waitForTask, explain, napper } from '../dist/web/api.js';

const ok = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const task = (state, data = {}, extra = {}) => ({ id: 't1', contextId: 'c1', kind: 'task', status: { state, message: { parts: [{ kind: 'text', text: data.reply || '' }, { kind: 'data', data }] } }, metadata: {}, ...extra });
const fast = { sleep: () => Promise.resolve() };

function server(handler) {
  const calls = [];
  setTransport(async (url, init) => {
    const body = JSON.parse(init.body || '{}'); calls.push(body);
    return handler(body, calls.length);
  });
  return calls;
}

test('send asks for a non-blocking task', async () => {
  const calls = server(b => ok({ jsonrpc: '2.0', id: b.id, result: task('working') }));
  const t = await sendTask({ parts: [{ kind: 'text', text: 'hi' }] }, fast);
  assert.equal(t.status.state, 'working');
  assert.equal(calls[0].method, 'message/send');
  assert.deepEqual(calls[0].params.configuration, { blocking: false });
});

test('polls tasks/get until completed, with progress updates', async () => {
  const seen = [];
  const calls = server((b, n) => ok({ jsonrpc: '2.0', id: b.id, result: n < 3
    ? task('working', {}, { metadata: { progress: { small: `step ${n}` } } })
    : task('completed', { reply: 'Done!', actions: [{ type: 'open' }] }) }));
  const t = await waitForTask('t1', { ...fast, onUpdate: x => seen.push(x.metadata?.progress?.small) });
  assert.equal(t.status.state, 'completed');
  assert.equal(t.status.message.parts[1].data.actions.length, 1);
  assert.deepEqual(calls.map(c => [c.method, c.params.id]), [['tasks/get', 't1'], ['tasks/get', 't1'], ['tasks/get', 't1']]);
  assert.deepEqual(seen.slice(0, 2), ['step 1', 'step 2']);
});

test('input-required settles the poll', async () => {
  server(b => ok({ jsonrpc: '2.0', id: b.id, result: task('input-required', { ask: true, small: 'Where to?' }) }));
  assert.equal((await waitForTask('t1', fast)).status.state, 'input-required');
});

test('network errors are retried without failing, and reported as reconnecting', async () => {
  const flags = [];
  server((b, n) => {
    if (n <= 3) throw new TypeError('Failed to fetch');               // phone switching networks
    if (n === 4) return new Response('bad gateway', { status: 502 });  // proxy while the server restarts
    return ok({ jsonrpc: '2.0', id: b.id, result: task('completed', { reply: 'ok' }) });
  });
  const t = await waitForTask('t1', { ...fast, onReconnecting: on => flags.push(on) });
  assert.equal(t.status.state, 'completed');
  assert.deepEqual(flags, [true, true, true, true, false]);
});

test('gives up as "unreachable" only after the grace period', async () => {
  server(() => { throw new TypeError('Failed to fetch'); });
  const sleep = napper().sleep;
  await assert.rejects(waitForTask('t1', { sleep, maxFailMs: 30, fast: 5 }), e => e.code === 'unreachable' && /connection/i.test(explain(e)));
});

test('unknown task id -> task_not_found (no endless polling)', async () => {
  server(b => ok({ jsonrpc: '2.0', id: b.id, error: { code: -32001, message: 'Task not found' } }));
  await assert.rejects(waitForTask('nope', fast), e => e.code === 'task_not_found');
});

test('a restarting server (503 shutting_down) delays the send instead of failing it', async () => {
  const calls = server((b, n) => n === 1
    ? new Response(JSON.stringify({ jsonrpc: '2.0', id: b.id, error: { code: -32007, message: 'restarting', data: { error: 'shutting_down', retry_after: 0.001 } } }), { status: 503 })
    : ok({ jsonrpc: '2.0', id: b.id, result: task('working') }));
  const t = await sendTask({ parts: [] }, fast);
  assert.equal(t.status.state, 'working'); assert.equal(calls.length, 2);
});

test('a send that may have reached the server is not resent', async () => {
  const calls = server(() => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(sendTask({ parts: [] }, { ...fast, online: () => true }), e => e.status === 0);
  assert.equal(calls.length, 1);
});

test('stopping ends the poll', async () => {
  let stop = false;
  server(b => { stop = true; return ok({ jsonrpc: '2.0', id: b.id, result: task('working') }); });
  assert.equal(await waitForTask('t1', { ...fast, shouldStop: () => stop }), null);
});
