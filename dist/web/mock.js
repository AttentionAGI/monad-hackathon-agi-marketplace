// Local preview data (?mock=1 on localhost only; main.js never loads this anywhere else). Shapes follow agent.py.
const now = () => Date.now() / 1000;
const UID = 'u_demo';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const openApp = (app_id, name, category, title, subtitle, web_url, prefill = {}) =>
  ({ type: 'open_app', app_id, name, category, title, subtitle, web_url, ios_scheme: '', app_store_id: '', prefill });
const FOOD = [
  openApp('doordash', 'DoorDash', 'food', 'Pad Thai on DoorDash', 'Opens search - you pick the restaurant and order', 'https://www.doordash.com/search/store/pad%20thai/', { q: 'Pad Thai' }),
  openApp('ubereats', 'Uber Eats', 'food', 'Pad Thai on Uber Eats', '', 'https://www.ubereats.com/search?q=pad%20thai&pl={lat},{lng}', { q: 'Pad Thai' }),
  openApp('grubhub', 'Grubhub', 'food', 'Pad Thai on Grubhub', '', 'https://www.grubhub.com/search?queryText=pad%20thai', { q: 'Pad Thai' }),
];
const VENMO = [openApp('venmo', 'Venmo', 'pay', 'Pay $24 to Sam on Venmo', 'Nothing is sent until you confirm in Venmo', 'https://venmo.com/?txn=pay&recipients=sam&amount=24&note=dinner', { amount: '24', to_name: 'Sam', note: 'dinner' })];
const NOTION = { type: 'connect', connector_id: 'notion', name: 'Notion', icon: 'notion', accounts: [], add_account: true, auth: 'oauth', title: 'Connect Notion', subtitle: 'Read your pages and databases' };

let task = null;
const STEPS = ['Reading your request', 'Checking your calendar', 'Drafting a reply', 'Almost done'];
let stepAt = 0;
const RUNNING = new Map();               // non-blocking sends: task id -> {due, result}

function taskObj(state, text, data) {
  task = { id: `task-${Math.random().toString(36).slice(2, 8)}`, contextId: 'ctx-demo' };
  return { id: task.id, contextId: task.contextId, kind: 'task', status: { state, message: { role: 'agent', kind: 'message', parts: [{ kind: 'text', text }, { kind: 'data', data }] } }, metadata: {} };
}

function reply(text, m) {
  const t = text.toLowerCase();
  if (m.taskId && t === 'yes') return taskObj('completed', 'Sent. Sam has your note.', { big: 'Sent', small: 'Sent your email to Sam', domain: 'apps' });
  if (m.taskId && t === 'no') return taskObj('canceled', 'Canceled.', { big: 'Canceled', small: '' });
  if (/pad thai|order|dinner|food/.test(t)) return taskObj('completed', '', { big: 'Open', small: '', domain: 'food', reply: 'Pad Thai on DoorDash — tap to open, you place the order. Or try Uber Eats / Grubhub.', actions: FOOD });
  if (/venmo|pay /.test(t)) return taskObj('completed', '', { big: 'Open', domain: 'pay', reply: 'Venmo is ready to pay Sam $24 — tap to open; nothing is sent until you confirm it in Venmo.', actions: VENMO });
  if (/notion/.test(t)) return taskObj('completed', '', { big: 'Connect', domain: 'app_action', reply: "Notion isn't connected yet. Connect it below, then ask me again.", actions: [NOTION] });
  if (/email|tell|send/.test(t)) return taskObj('input-required', 'Send email — Reply to Sam Lee: "Running about 10 minutes late, see you soon."\n\n- **From:** alex@work.co\n- **To:** sam@acme.co', { big: 'Send email', small: 'Reply to Sam Lee', irreversible: true, domain: 'apps' });
  if (/table|book/.test(t)) return taskObj('input-required', 'Which time works — 7:00 or 8:30 pm?', { big: 'Ask', small: 'Which time works?', ask: true, domain: 'restaurant' });
  return taskObj('completed', '', {
    big: 'Answer', domain: 'chat',
    reply: "Here's tomorrow:\n\n- **9:30** Design review with Priya (45 min)\n- **12:00** Lunch with Sam at Tartine\n- **3:00** Investor call — notes in [your doc](https://example.com/notes)\n\nYou have a free block from 1:00 to 3:00. Want me to hold it for focus time?",
  });
}

const CONNECTORS = [
  { id: 'gmail', name: 'Gmail', category: 'email', auth: 'oauth', connected: true, accounts: [{ account_id: 'g1', label: 'alex@gmail.com' }, { account_id: 'g2', label: 'alex@work.co' }], needs_reauth: false, note: '' },
  { id: 'google-calendar', name: 'Google Calendar', category: 'calendar', auth: 'oauth', connected: true, accounts: [{ account_id: 'c1', label: 'alex@work.co' }], needs_reauth: false, note: '' },
  { id: 'notion', name: 'Notion', category: 'docs', auth: 'oauth', connected: false, accounts: [], note: 'Pages and databases' },
  { id: 'linear', name: 'Linear', category: 'work', auth: 'oauth', connected: false, accounts: [], note: 'Issues and projects' },
  { id: 'google-drive', name: 'Google Drive', category: 'files', auth: 'oauth', connected: false, accounts: [], note: 'Files you pick' },
  { id: 'slack', name: 'Slack', category: 'chat', auth: 'oauth_app', connected: false, accounts: [], note: '' },
];

const SESSIONS = [
  { id: 's3', started: now() - 3600 * 3, status: 'done', duration_s: 1520, speakers: [{ label: 'A', name: 'Me', me: true }, { label: 'B', name: 'Priya', me: false }],
    segments: [
      { speaker: 'Me', me: true, text: "Let's move the launch review to Thursday so the deck has the new numbers." },
      { speaker: 'Priya', me: false, text: 'Works for me. I will send the updated chart tonight.' },
      { speaker: 'Me', me: true, text: 'Great — and remind me to book the room for ten people.' },
    ] },
  { id: 's2', started: now() - 86400 - 7200, status: 'done', duration_s: 640, speakers: [{ label: 'A', name: 'Me', me: true }, { label: 'B', name: 'Sam', me: false }], segments: [] },
  { id: 's1', started: now() - 600, status: 'processing', duration_s: 300, speakers: [], segments: [] },
];

const TASKS = [
  { id: 't1', state: 'completed', domain: 'apps', gist: 'Reply to Sam about the launch', text: 'Email Sam that the review moved to Thursday', small: 'Sent your email to Sam', created: now() - 1800, device: 'web' },
  { id: 't2', state: 'completed', domain: 'food', gist: 'Pad Thai on DoorDash', text: 'Order pad thai for dinner', small: 'Opened DoorDash', created: now() - 7200, device: 'app' },
  { id: 't3', state: 'input-required', domain: 'web', gist: 'Book a table at Nopa', text: 'Book a table for two at Nopa Friday', small: 'Which time works?', created: now() - 86400, device: 'app' },
  { id: 't4', state: 'failed', domain: 'web', gist: 'Renew passport appointment', text: 'Find a passport appointment', small: 'The site needs you to sign in', created: now() - 86400 * 3, device: 'app' },
];

function seedThread() {
  const key = `attention.threads.${UID}`;
  try { if (localStorage.getItem(key)) return; } catch { return; }
  const id = () => Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();
  const threads = [{
    id: 'demo', title: "What's on my calendar tomorrow?", updated: t0, taskId: 'task-demo', contextId: 'ctx-demo', context: [],
    items: [
      { id: id(), role: 'user', kind: 'text', text: "What's on my calendar tomorrow?" },
      { id: id(), role: 'agent', kind: 'text', text: "Here's tomorrow:\n- **9:30** Design review with Priya (45 min)\n- **12:00** Lunch with Sam at Tartine\n- **3:00** Investor call — notes in [your doc](https://example.com/notes)" },
      { id: id(), role: 'agent', kind: 'text', text: 'You have a free block from 1:00 to 3:00. Want me to hold it for focus time?' },
      { id: id(), role: 'user', kind: 'text', text: 'Order pad thai for dinner' },
      { id: id(), role: 'agent', kind: 'text', text: 'Pad Thai on DoorDash — tap to open, you place the order. Or try Uber Eats / Grubhub.', actions: FOOD },
      { id: id(), role: 'user', kind: 'text', text: "What's on my Notion roadmap?" },
      { id: id(), role: 'agent', kind: 'text', text: "Notion isn't connected yet. Connect it below, then ask me again.", actions: [NOTION] },
      { id: id(), role: 'user', kind: 'text', text: "Email Sam that I'm running 10 minutes late" },
      { id: id(), role: 'agent', kind: 'confirm', domain: 'apps', irreversible: true, text: 'Send email — Reply to Sam Lee: "Running about 10 minutes late, see you soon."\n\n- **From:** alex@work.co\n- **To:** sam@acme.co' },
    ],
  }, {
    id: 'demo2', title: 'Pay Sam back for dinner', updated: t0 - 86400 * 1000, taskId: null, contextId: null, context: [],
    items: [{ id: id(), role: 'user', kind: 'text', text: 'Pay Sam back for dinner, $24 on Venmo' },
      { id: id(), role: 'agent', kind: 'text', text: 'Venmo is ready to pay Sam $24 — tap to open; nothing is sent until you confirm it in Venmo.', actions: VENMO }],
  }, {
    id: 'demo3', title: 'Summarize my unread email', updated: t0 - 86400 * 3000, taskId: null, contextId: null, context: [],
    items: [{ id: id(), role: 'user', kind: 'text', text: 'Summarize my unread email' }, { id: id(), role: 'agent', kind: 'text', text: 'You have 4 unread. Nothing urgent.' }],
  }];
  try { localStorage.setItem(key, JSON.stringify(threads)); } catch { /* ignore */ }
}

export function install({ setTransport, session, signedOut }) {
  const consent = new URLSearchParams(location.search).get('mock') !== 'consent';
  if (signedOut) session.clear();
  else { if (!session.token) session.set('mock-token'); seedThread(); }
  setTransport(async (url, init = {}) => {
    const u = new URL(url);
    const path = u.pathname;
    const body = init.body ? JSON.parse(init.body) : {};
    await sleep(120);
    if (path === '/auth/apple') return json({ token: 'mock-token', user_id: UID, name: 'Alex Rivera' });
    if (path === '/account/me') return json({ user_id: UID, owner: false, name: 'Alex Rivera', email: 'alex@example.com', ai_consent: consent ? { version: '1', at: now() } : null, auth: 'token' });
    if (path === '/account/plan') return json({ plan: 'pro', features: [], usage: { used: 1840, limit: 5000, unit: 'credits', resets_at: now() + 86400 * 23, warning: false } });
    if (path === '/account/consent' || path === '/auth/logout' || path === '/account/delete' || path === '/abort') return json({ ok: true });
    if (path === '/connectors') return json({ connectors: CONNECTORS });
    let m = path.match(/^\/connectors\/([\w-]+)\/(connect|disconnect)$/);
    if (m) {
      if (m[2] === 'connect') return json({ ok: true, auth_url: `${location.origin}/oauth/callback/?code=mock-code&state=mock-${m[1]}`, callback_scheme: 'attention' });
      return json({ ok: true, removed: 1, account_id: body.account_id || null });
    }
    if (path === '/oauth/finish') { const cid = String(body.state || '').replace(/^mock-/, ''); const c = CONNECTORS.find(x => x.id === cid); return json({ ok: true, id: cid, name: c?.name || cid, connector: cid, account: { account_id: 'n1', label: 'alex@example.com' }, added: true }); }
    if (path === '/attention/today') return json({ date: new Date().toISOString().slice(0, 10), status: 'ok', score: 72, label: 'Steady', min_days: 7, days_collected: 12,
      drivers: [{ key: 'focus_block_min', text: 'Longest focus block 1 h 40 min, longer than usual', effect: 'more_room' }, { key: 'conversation_min', text: '3 h 10 min in conversations, more than usual', effect: 'less_room' }, { key: 'topic_switches', text: 'Fewer topic switches than usual', effect: 'more_room' }] });
    if (path === '/you/progress') return json({ level: 3, level_name: 'Knows your style', xp: 640, xp_level_floor: 500, xp_next: 900, percent_to_next_level: 35, streak_days: 4,
      quests: [{ id: 'quiz', title: 'Rate 3 drafts', xp: 45, done: false, action: 'quiz' }, { id: 'connect:calendar', title: 'Connect Google Calendar', xp: 200, done: false, action: 'connect:calendar' }, { id: 'approve', title: 'Ask your agent to do something and approve it', xp: 35, done: false, action: 'chat' }] });
    if (path === '/recordings') return json({ sessions: SESSIONS });
    m = path.match(/^\/recordings\/([\w-]+)$/);
    if (m) { const s = SESSIONS.find(x => x.id === m[1]); return s ? json(s) : json({ error: 'not found' }, 404); }
    if (path === '/tasks') return json({ tasks: TASKS });
    if (path === '/progress') { stepAt = Math.min(stepAt + 1, STEPS.length * 2); return json({ big: 'Working', small: STEPS[Math.floor(stepAt / 2) % STEPS.length], t: now() }); }
    if (path === '/browser/state') return json({ active: false });
    if (path === '/browser/shot.jpg') return new Response(new Blob([]), { status: 404 });
    if (path === '/' && body.method === 'message/send') {
      stepAt = 0;
      const msg = body.params.message;
      const text = msg.parts.map(p => p.text).join(' ').trim();
      if (body.params.configuration?.blocking === false) {      // non-blocking: "working" now, tasks/get has the answer
        const result = reply(text, msg), id = result.id || `mock-${Math.random().toString(36).slice(2, 10)}`;
        result.id = id;
        RUNNING.set(id, { due: Date.now() + 2200, result });
        return json({ jsonrpc: '2.0', id: body.id, result: { id, contextId: result.contextId, kind: 'task', status: { state: 'working' }, metadata: {} } });
      }
      await sleep(2200);
      return json({ jsonrpc: '2.0', id: body.id, result: reply(text, msg) });
    }
    if (path === '/' && body.method === 'tasks/get') {
      const r = RUNNING.get(body.params?.id);
      if (!r) return json({ jsonrpc: '2.0', id: body.id, error: { code: -32001, message: 'Task not found' } });
      if (Date.now() < r.due) {
        stepAt = Math.min(stepAt + 1, STEPS.length * 2);
        return json({ jsonrpc: '2.0', id: body.id, result: { id: body.params.id, kind: 'task', status: { state: 'working' },
          metadata: { progress: { big: 'Working', small: STEPS[Math.floor(stepAt / 2) % STEPS.length], t: now() } } } });
      }
      return json({ jsonrpc: '2.0', id: body.id, result: r.result });
    }
    if (path === '/' && body.method === 'tasks/cancel') return json({ jsonrpc: '2.0', id: body.id, result: null });
    return json({ error: 'not found' }, 404);
  });
}
