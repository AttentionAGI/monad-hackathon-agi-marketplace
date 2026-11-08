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
  e.code = err.data?.error || '';
  e.data = err.data || {};
  return e;
}

/** One-line, human message for a failed request. */
export function explain(e) {
  switch (e?.code) {
    case 'quota_exceeded': return "You've used this month's AI credits. They reset at the start of next month, or subscribe to a bigger plan in the iPhone app.";
    case 'pro_required': return 'This needs an Attention subscription. Subscribe in the iPhone app.';
    case 'rate_limited': return `Too many requests. Try again in ${Math.max(1, Math.ceil((e.data?.retry_after || e.body?.retry_after || 30) / 60))} min.`;
    case 'too_many_in_flight': return "I'm still working on something else. Try again in a few seconds.";
    case 'message_too_long': return 'That message is too long. Try a shorter one.';
    default: return e?.message || 'Something went wrong.';
  }
}
