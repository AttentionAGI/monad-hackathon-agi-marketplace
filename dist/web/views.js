// Home (Attention Score, Second You, recordings), Artifacts (tasks) and the Account sheet.
import { request, explain } from './api.js';
import { connectFlow, linkIdentity, linkApple, googleButton, mountGoogleButton, googleAvailable } from './auth.js';
import { CONFIG, h, icon, modal, confirmDialog, toast, iphoneOnly, timeAgo, duration, legalLinks, googleMark } from './ui.js';

const loading = () => h('div', { class: 'skeleton', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
const errorLine = (e, retry) => h('p', { class: 'muted small' }, explain(e), ' ', retry ? h('button', { class: 'text-link', type: 'button', onclick: retry }, 'Retry') : null);

function meter(value, max, label) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const bar = h('span', { class: 'meter-fill' });
  bar.style.width = `${pct}%`;
  return h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max || 0), 'aria-valuenow': String(Math.round(value || 0)), 'aria-label': label }, bar);
}

function fill(card, load, draw) {
  const body = h('div', { class: 'panel-body' }, loading());
  card.append(body);
  const run = async () => {
    body.replaceChildren(loading());
    try { body.replaceChildren(...[draw(await load())].flat(Infinity).filter(Boolean)); }
    catch (e) { if (e.status !== 401) body.replaceChildren(errorLine(e, run)); }
  };
  run();
  return card;
}

// ---------- Home ----------
export function renderHome(container, { recId, navigate }) {
  if (recId) return renderRecording(container, recId);
  const page = h('div', { class: 'page home' },
    h('div', { class: 'home-grid' },
      fill(h('article', { class: 'glass panel' }, h('h2', { text: 'Attention Score' })), () => request('/attention/today'), drawScore),
      secondYouPanel(),
      fill(h('article', { class: 'glass panel span-2' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Recordings' }),
          h('button', { class: 'pill', type: 'button', onclick: () => iphoneOnly('Recording') }, icon('mic'), 'Record'))),
      () => request('/recordings'), drawRecordings)));
  container.replaceChildren(page);
}

function drawScore(d) {
  const out = [];
  if (d.status === 'ok' && d.score != null) {
    const ring = h('div', { class: 'ring', role: 'img', 'aria-label': `Score ${d.score} of 100, ${d.label || ''}` },
      h('strong', { text: String(d.score) }), h('span', { text: 'of 100' }));
    ring.style.setProperty('--p', String(d.score));
    out.push(h('div', { class: 'score-row' }, ring,
      h('div', {}, h('p', { class: 'score-label', text: d.label || 'Today' }), h('p', { class: 'muted small', text: 'Today, compared with your usual day.' }))));
  } else if (d.status === 'calibrating') {
    const n = d.days_collected || 0, of = d.min_days || 7;
    out.push(h('p', { class: 'big-line', text: 'Calibrating' }),
      h('p', { class: 'muted small', text: `Day ${Math.min(n, of)} of ${of}. Your score starts once Attention knows your usual day.` }),
      meter(n, of, 'Calibration progress'));
  } else {
    out.push(h('p', { class: 'big-line', text: 'No data yet today' }),
      h('p', { class: 'muted small', text: d.last ? `Last score ${d.last.score} (${d.last.label}) on ${new Date(`${d.last.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}.` : 'Record your day with the iPhone app to get your score.' }));
  }
  const drivers = (d.drivers || []).filter(x => x?.text);
  if (drivers.length) out.push(h('ul', { class: 'drivers' }, drivers.map(x => h('li', { class: x.effect || 'neutral', text: x.text }))));
  out.push(h('p', { class: 'fine', text: "An estimate of your day's load, not medical advice." }));
  return out;
}

// Second You lives in the iPhone app: it learns and runs on the phone (Apple's on-device model), so the web has no
// levels, quiz or training to show, only where to find it.
function secondYouPanel() {
  return h('article', { class: 'glass panel' },
    h('h2', { text: 'Second You' }),
    h('p', { text: 'Second You lives in the Attention iPhone app. It learns how you write and talk, and drafts replies like you, right on your iPhone with Apple’s on-device model.' }),
    h('p', { class: 'muted small', text: 'Your style data never leaves your iPhone, so there is nothing to show here on the web.' }),
    h('div', { class: 'callout' }, icon('shield'),
      h('p', {}, 'Open Second You in the iPhone app. ', h('a', { class: 'text-link', href: CONFIG.testflight, target: '_blank', rel: 'noopener noreferrer' }, 'Get it on TestFlight'))));
}

const recTitle = s => {
  const d = s.started ? new Date(s.started * 1000) : (s.date ? new Date(`${s.date}T${s.start || '12:00:00'}`) : null);
  return d && !isNaN(d) ? d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recording';
};
const recStatus = s => ({ done: '', queued: 'Waiting to transcribe', processing: 'Transcribing…', uploading: 'Uploading…', failed: "Couldn't transcribe" })[s.status] ?? (s.status || '');

function drawRecordings(d) {
  const list = [...(d.sessions || [])].sort((a, b) => (b.started || 0) - (a.started || 0));
  const items = list.length ? h('div', { class: 'rows' }, list.slice(0, 30).map(s => {
    const others = (s.speakers || []).filter(x => !x.me).map(x => x.name).filter(Boolean);
    const meta = [s.duration_s ? duration(s.duration_s) : '', recStatus(s), others.length ? `with ${others.slice(0, 3).join(', ')}` : ''].filter(Boolean).join(' · ');
    return h('a', { class: 'list-row', href: `#/home/rec/${encodeURIComponent(s.id)}` },
      h('span', { class: 'row-icon', 'aria-hidden': 'true' }, icon('mic')),
      h('span', { class: 'row-main' }, h('span', { class: 'row-title', text: recTitle(s) }), h('span', { class: 'row-sub', text: meta || 'Recording' })),
      icon('chev'));
  })) : h('p', { class: 'muted', text: 'No recordings yet.' });
  return [items,
    h('div', { class: 'callout' }, icon('mic'),
      h('p', {}, 'Record with the iPhone app. ', h('a', { class: 'text-link', href: CONFIG.testflight, target: '_blank', rel: 'noopener noreferrer' }, 'Get it on TestFlight')))];
}

function renderRecording(container, id) {
  const page = h('div', { class: 'page narrow' },
    h('a', { class: 'back', href: '#/home' }, icon('back'), 'Home'));
  const card = h('article', { class: 'glass panel' });
  page.append(card);
  container.replaceChildren(page);
  fill(card, () => request(`/recordings/${encodeURIComponent(id)}`), s => {
    const segs = s.segments || [];
    return [
      h('h1', { class: 'detail-title', text: recTitle(s) }),
      h('p', { class: 'muted small', text: [s.duration_s ? duration(s.duration_s) : '', recStatus(s), s.error || ''].filter(Boolean).join(' · ') }),
      segs.length ? h('ol', { class: 'transcript' }, segs.map(g => h('li', { class: g.me ? 'me' : '' },
        h('span', { class: 'who', text: g.me ? 'You' : (g.speaker || 'Someone') }), h('p', { text: g.text || '' }))))
        : h('p', { class: 'muted', text: 'The transcript, split by speaker, appears here when Attention has finished it.' }),
    ];
  });
}

// ---------- Artifacts ----------
const STATE = { completed: ['Done', 'ok'], 'input-required': ['Waiting for you', 'wait'], failed: ['Failed', 'bad'], canceled: ['Canceled', 'off'], working: ['Running', 'wait'], submitted: ['Running', 'wait'] };
export function renderArtifacts(container) {
  const page = h('div', { class: 'page narrow' },
    h('header', { class: 'page-head' }, h('h1', { text: 'Artifacts' }), h('p', { class: 'muted', text: 'What your agent has done for you.' })));
  const card = h('section', { class: 'glass panel' });
  page.append(card);
  container.replaceChildren(page);
  fill(card, () => request('/tasks'), d => {
    const tasks = d.tasks || [];
    if (!tasks.length) return h('div', { class: 'empty-block' }, h('p', { class: 'big-line', text: 'Nothing yet' }),
      h('p', { class: 'muted', text: 'Ask Attention to do something. Finished tasks are listed here.' }),
      h('a', { class: 'btn', href: '#/chat' }, 'Start a chat'));
    return h('div', { class: 'rows' }, tasks.map(t => {
      const [label, tone] = STATE[t.state] || [t.state || '', 'off'];
      return h('details', { class: 'list-row task' },
        h('summary', {},
          h('span', { class: `state-dot ${tone}`, 'aria-hidden': 'true' }),
          h('span', { class: 'row-main' }, h('span', { class: 'row-title', text: t.gist || t.text || 'Task' }),
            h('span', { class: 'row-sub', text: [label, t.small || t.big, timeAgo(t.created)].filter(Boolean).join(' · ') }))),
        h('div', { class: 'task-detail' },
          t.text ? h('p', {}, h('span', { class: 'muted', text: 'You asked: ' }), t.text) : null,
          t.small ? h('p', { text: t.small }) : null,
          h('p', { class: 'muted small', text: [t.domain, t.device].filter(Boolean).join(' · ') })));
    }));
  });
}

// ---------- Account ----------
export function initials(name) {
  const p = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '';
}

export function openAccount(me, { focus, signOut, deleted } = {}) {
  const planBox = h('section', { class: 'sheet-section', id: 'acct-plan', 'aria-labelledby': 'acct-plan-h' }, h('h3', { id: 'acct-plan-h', text: 'Plan' }));
  const connBox = h('section', { class: 'sheet-section', id: 'acct-conn', 'aria-labelledby': 'acct-conn-h' }, h('h3', { id: 'acct-conn-h', text: 'Connections' }));
  fill(planBox, () => request('/account/plan'), drawPlan);
  const drawConn = () => { connBox.querySelector('.panel-body')?.remove(); fill(connBox, () => request('/connectors'), d => drawConnectors(d, drawConn)); };
  drawConn();
  const methodsBox = Array.isArray(me.identities) ? signInMethods(me) : null;      // (older servers: no identities)
  const body = [
    h('div', { class: 'profile' },
      h('span', { class: 'avatar big', 'aria-hidden': 'true' }, initials(me.name) || icon('user')),
      h('div', {}, h('p', { class: 'profile-name', text: me.name || 'Your account' }), me.email ? h('p', { class: 'muted small', text: me.email }) : null)),
    methodsBox, planBox, connBox,
    h('section', { class: 'sheet-section' },
      h('button', { class: 'btn ghost wide', type: 'button', onclick: async e => { e.currentTarget.closest('dialog')?.__done(null); signOut(); } }, 'Sign out'),
      h('button', { class: 'btn ghost danger-text wide', type: 'button', onclick: async e => {
        const dlg = e.currentTarget.closest('dialog');
        if (!await confirmDialog('Delete your account?', 'This permanently deletes your Attention account: recordings, transcripts, connected apps and chat history on our servers. Second You keeps its data only on your iPhone, and the iPhone app erases it when it signs out. It cannot be undone. An App Store subscription must be canceled separately in your Apple ID settings.', 'Delete account', true)) return;
        try { await request('/account/delete', { method: 'POST', body: {} }); dlg?.__done(null); deleted(); }
        catch (err) { toast(explain(err)); }
      } }, 'Delete account')),
    legalLinks('legal'),
  ];
  const p = modal({ title: 'Account', body, className: 'sheet' });
  if (focus) setTimeout(() => document.getElementById(focus === 'connections' ? 'acct-conn' : 'acct-plan')?.scrollIntoView({ block: 'start' }), 50);
  return p;
}

// Sign-in methods: Apple / Google on this account, and "Link" for the missing one (POST /account/link). Linking never
// merges two accounts: an Apple / Google account that already has its own Attention account is refused by the server.
function signInMethods(me) {
  const box = h('section', { class: 'sheet-section', id: 'acct-methods', 'aria-labelledby': 'acct-methods-h' });
  const draw = () => {
    const ids = me.identities || [];
    const err = h('p', { class: 'small warn', role: 'alert' });
    const done = list => { me.identities = list; draw(); toast('Sign-in method linked'); };
    const fail = e => { err.textContent = e?.message || "Couldn't link that account."; };
    const row = (provider, label, mark) => {
      const id = ids.find(x => x.provider === provider);
      const sub = id ? (id.email || 'Linked') : 'Not linked';
      return h('div', { class: 'method-row' },
        h('span', { class: 'method-mark', 'aria-hidden': 'true' }, mark),
        h('div', { class: 'method-text' }, h('span', { class: 'row-title', text: label }), h('span', { class: 'row-sub', text: sub })),
        id ? h('span', { class: 'chip' }, icon('check'), 'Linked') : null);
    };
    const kids = [h('h3', { id: 'acct-methods-h', text: 'Sign-in methods' }),
      row('apple', 'Apple', icon('apple')), row('google', 'Google', googleMark())];
    if (!ids.some(x => x.provider === 'apple')) {
      const b = h('button', { class: 'btn apple link-btn', type: 'button' }, icon('apple'), h('span', { text: 'Link Apple' }));
      b.addEventListener('click', async () => {
        err.textContent = ''; b.disabled = true;
        try { const list = await linkApple(); if (list) return done(list); } catch (e) { fail(e); }
        b.disabled = false;
      });
      kids.push(b);
    }
    if (!ids.some(x => x.provider === 'google')) {
      const stand = googleButton('Link Google');
      stand.addEventListener('click', () => { err.textContent = googleAvailable() ? 'Google sign-in is still loading. Try again in a moment.' : 'Linking Google works on attentionai.dev.'; });
      const slot = h('div', { class: 'google-slot link-btn' }, stand);
      kids.push(h('p', { class: 'muted small', text: 'Link Google: choose the Google account to add.' }), slot);
      setTimeout(() => mountGoogleButton(slot, {
        onIdToken: async t => { err.textContent = ''; try { done(await linkIdentity('google', t)); } catch (e) { fail(e); } },
        onError: fail,
      }), 0);
    }
    kids.push(err, h('p', { class: 'muted small', text: 'Link both to reach this same account with either one.' }));
    box.replaceChildren(...kids);
  };
  draw();
  return box;
}

function drawPlan(p) {
  const name = (p.plan || 'free').replace(/^./, c => c.toUpperCase());
  const u = p.usage || {};
  const resets = u.resets_at ? new Date(u.resets_at * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  return [
    h('div', { class: 'plan-row' }, h('strong', { text: `Attention ${name}` }), u.exempt ? h('span', { class: 'chip', text: 'Owner' }) : null),
    u.limit ? [meter(u.used || 0, u.limit, 'AI credits used this month'),
      h('p', { class: `small ${u.warning ? 'warn' : 'muted'}`, text: `${(u.used || 0).toLocaleString()} of ${u.limit.toLocaleString()} ${u.unit || 'credits'} used${resets ? ` · resets ${resets}` : ''}` })] : null,
    h('p', { class: 'muted small', text: 'Subscriptions are bought and managed in the iPhone app (App Store).' }),
    p.plan === 'free' ? h('a', { class: 'btn wide', href: CONFIG.testflight, target: '_blank', rel: 'noopener noreferrer' }, 'Subscribe in the iOS app', icon('ext')) : null,
  ];
}

function drawConnectors(d, redraw) {
  const all = d.connectors || [];
  const connected = all.filter(c => c.connected);
  const available = all.filter(c => !c.connected);
  const connect = async (c, btn) => {
    btn.disabled = true; btn.textContent = 'Waiting for sign-in…';
    try { const r = await connectFlow(c.id); toast(`${r.name || c.name} connected${r.account?.label ? ` · ${r.account.label}` : ''}`); redraw(); }
    catch (e) { if (e.message !== 'canceled') toast(e.message); btn.disabled = false; btn.textContent = connected.includes(c) ? '+ Add account' : 'Connect'; }
  };
  const disconnect = async (c, a) => {
    if (!await confirmDialog(`Disconnect ${a.label || c.name}?`, `Attention will no longer read or act in this ${c.name} account.`, 'Disconnect', true)) return;
    try { await request(`/connectors/${encodeURIComponent(c.id)}/disconnect`, { method: 'POST', body: { account_id: a.account_id } }); toast(`Disconnected ${a.label || c.name}`); redraw(); }
    catch (e) { toast(explain(e)); }
  };
  const canConnect = c => c.auth === 'oauth';
  return [
    connected.length ? h('ul', { class: 'conn-list' }, connected.map(c => h('li', { class: 'conn' },
      h('div', { class: 'conn-head' }, h('span', { class: 'app-badge', 'aria-hidden': 'true', text: c.name[0] }),
        h('strong', { text: c.name }), c.needs_reauth ? h('span', { class: 'chip warn', text: 'Sign in again' }) : null),
      h('ul', { class: 'acct-list' }, (c.accounts || []).map(a => h('li', {},
        h('span', { class: 'acct-label', text: a.label || c.name }),
        h('button', { class: 'text-link danger-text', type: 'button', onclick: () => disconnect(c, a), 'aria-label': `Disconnect ${a.label || c.name}` }, 'Disconnect')))),
      canConnect(c) ? h('button', { class: 'pill', type: 'button', onclick: e => connect(c, e.currentTarget) }, '+ Add account') : null)))
      : h('p', { class: 'muted small', text: 'No apps connected yet.' }),
    available.length ? h('details', { class: 'more-apps' },
      h('summary', { text: `Add a connection (${available.length})` }),
      h('ul', { class: 'conn-list compact' }, available.map(c => h('li', { class: 'conn-row' },
        h('span', { class: 'app-badge', 'aria-hidden': 'true', text: c.name[0] }),
        h('span', { class: 'row-main' }, h('span', { class: 'row-title', text: c.name }), c.note ? h('span', { class: 'row-sub', text: c.note }) : null),
        canConnect(c) ? h('button', { class: 'pill', type: 'button', onclick: e => connect(c, e.currentTarget) }, 'Connect')
          : h('span', { class: 'muted small', text: 'In the iPhone app' }))))) : null,
  ];
}
