// Talks to agent.py (https://api.attentionai.dev). Bearer token auth; a 401 on an authenticated call signs out.
export const API_BASE = 'https://api.attentionai.dev';
const TOKEN_KEY = 'attention.token';

let transport = (url, init) => fetch(url, init);
/** Mock mode (local only) swaps the network for canned responses. */
export function setTransport(fn) { transport = fn; }

export const session = {
  get token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* private mode: this tab only */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

let unauthorized = () => {};
export function onUnauthorized(fn) { unauthorized = fn; }

export class ApiError extends Error {
  constructor(status, body) {
    const b = body || {};
    const msg = (typeof b.message === 'string' && b.message) || (typeof b.error === 'string' && b.error) || (status ? `Request failed (${status})` : 'Network error');
    super(msg);
    this.status = status;
    this.body = b;
    this.code = typeof b.error === 'string' ? b.error : (b.error?.data?.error || '');
  }
}

/**
 * request('/account/me') -> parsed JSON. Options: method, body (JSON), auth (default true), raw (return the Response), signal.
 */
export async function request(path, { method = 'GET', body, auth = true, raw = false, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? session.token : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await transport(API_BASE + path, {
      method, headers, signal, credentials: 'omit', cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, { error: 'offline', message: "Can't reach Attention right now. Check your connection and try again." });
  }
  if (res.status === 401 && token) {
    unauthorized();
    throw new ApiError(401, { error: 'unauthorized', message: 'Your session ended. Sign in again.' });
  }
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, {});
    return res;
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty or not JSON */ }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

let rpcId = 0;
/** A2A JSON-RPC on POST /. Errors (quota, rate limit, pro required) come back as ApiError with .code set. */
export async function rpc(method, params) {
  rpcId += 1;
  let r;
  try {
    r = await request('/', { method: 'POST', body: { jsonrpc: '2.0', id: rpcId, method, params } });
  } catch (e) {
    if (e instanceof ApiError && e.body?.error && typeof e.body.error === 'object') throw rpcError(e.body.error, e.status);
    throw e;
  }
  if (r?.error) throw rpcError(r.error, 200);
  return r?.result;
}

function rpcError(err, status) {
  const e = new ApiError(status, { message: err.message || 'Something went wrong' });
  e.code = err.data?.error || (err.code === -32001 ? 'task_not_found' : '');
  e.rpcCode = err.code;
  e.data = err.data || {};
  return e;
}

// ---------- non-blocking tasks: message/send answers at once, then tasks/get until the task settles ----------
// (agent.py: params.configuration.blocking=false). A request is never held open for the whole task, so a laptop
// sleeping, a Wi-Fi switch or a server deploy can't lose the answer.
export const SETTLED = new Set(['input-required', 'completed', 'failed', 'canceled']);
/** Worth retrying: no answer at all, a 5xx (a proxy while the server restarts), or the server draining for a deploy. */
export const transient = e => e?.status === 0 || e?.status >= 500 || e?.code === 'shutting_down';
const STOPPED = () => Object.assign(new Error('stopped'), { name: 'AbortError' });

/** A sleep that wake() ends early (e.g. the tab became visible again: poll now instead of after a backoff). */
export function napper() {
  const waiting = new Set();
  return {
    sleep: ms => new Promise(res => { const done = () => { clearTimeout(t); waiting.delete(done); res(); }; const t = setTimeout(done, ms); waiting.add(done); }),
    wake: () => { for (const f of [...waiting]) f(); },
  };
}
const plainSleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * message/send, non-blocking. Retried (up to maxWaitMs) only while the server is restarting (503 shutting_down) or the
 * browser is offline — then the message surely never arrived. Any other failure is thrown: the server may have it.
 */
export async function sendTask(message, { shouldStop = () => false, onReconnecting = () => {}, sleep = plainSleep, maxWaitMs = 180000, online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false) } = {}) {
  const start = Date.now(); let backoff = 1000;
  for (;;) {
    try { return await rpc('message/send', { message, configuration: { blocking: false } }); } catch (e) {
      const restarting = e?.code === 'shutting_down';
      if (!restarting && !(e?.status === 0 && !online())) throw e;
      const wait = restarting ? Math.min(10000, Math.max(1000, (e.data?.retry_after || 5) * 1000)) : backoff;
      if (shouldStop() || Date.now() - start + wait > maxWaitMs) throw e;
      onReconnecting(true);
      await sleep(wait);
      if (shouldStop()) throw STOPPED();
      backoff = Math.min(backoff * 2, 10000);
    }
  }
}

/**
 * Poll tasks/get (every ~1 s for 30 s, then ~2 s) until the task settles -> the task, or null when stopped.
 * Network / 5xx errors are retried with backoff for up to maxFailMs without failing; past that it throws
 * code 'unreachable'. An unknown id throws code 'task_not_found'.
 */
export async function waitForTask(id, { shouldStop = () => false, onUpdate = () => {}, onReconnecting = () => {}, sleep = plainSleep, maxFailMs = 180000, fast = 1000, slow = 2000 } = {}) {
  const start = Date.now(); let failingSince = null, backoff = fast;
  while (!shouldStop()) {
    let task;
    try { task = await rpc('tasks/get', { id }); } catch (e) {
      if (shouldStop()) return null;
      if (!transient(e)) throw e;
      failingSince ??= Date.now();
      onReconnecting(true);
      if (Date.now() - failingSince > maxFailMs) { e.code = 'unreachable'; throw e; }
      await sleep(backoff); backoff = Math.min(backoff * 2, 10 * fast);
      continue;
    }
    if (shouldStop()) return null;
    if (failingSince !== null) onReconnecting(false);
    failingSince = null; backoff = fast;
    onUpdate(task);
    const state = task?.status?.state;
    if (!state || SETTLED.has(state)) return task;
    await sleep(Date.now() - start < 30000 ? fast : slow);
  }
  return null;
}

/** One-line, human message for a failed request. */
export function explain(e) {
  switch (e?.code) {
    case 'quota_exceeded': return "You've used this month's AI credits. They reset at the start of next month, or subscribe to a bigger plan in the iPhone app.";
    case 'pro_required': return 'This needs an Attention subscription. Subscribe in the iPhone app.';
    case 'rate_limited': return `Too many requests. Try again in ${Math.max(1, Math.ceil((e.data?.retry_after || e.body?.retry_after || 30) / 60))} min.`;
    case 'too_many_in_flight': return "I'm still working on something else. Try again in a few seconds.";
    case 'message_too_long': return 'That message is too long. Try a shorter one.';
    case 'shutting_down': return 'Attention is restarting. Try again in a moment.';
    case 'task_not_found': return 'The agent lost track of this one. Try again.';
    case 'unreachable': return "Lost the connection for a few minutes. It may still finish. Reload to check, or try again.";
    default: return e?.message || 'Something went wrong.';
  }
}
