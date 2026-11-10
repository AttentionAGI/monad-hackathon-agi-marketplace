// Chat: one thread at a time, kept in this browser (per account), sent to the agent as A2A message/send with
// metadata.context (recent turns) and taskId/contextId while a task waits for an answer or an approval.
import { request, rpc, explain, sendTask, waitForTask, napper, transient, SETTLED } from './api.js';
import { md, paragraphs } from './md.js';
import { renderActions } from './cards.js';
import { h, icon, uid, timeAgo, legalLinks, CONFIG } from './ui.js';
import { ACCEPT, ATTACH_ERRORS, MAX_FILES, buildParts, fit, prepare, shown, sizeLabel } from './attach.js';

const MAX_THREADS = 40, MAX_ITEMS = 200, MAX_CONTEXT = 60;
const RESUME_MS = 24 * 3600 * 1000;           // a task the server ran while this tab was closed: picked up again for 24 h
const nap = napper();                          // polling backoff; a tab coming back to the front wakes it
const SUGGESTIONS = ["What's on my calendar tomorrow?", 'Summarize my unread email', 'Order pad thai for dinner', 'Find a table for two on Friday'];

let me = null, hooks = {};
let threads = [], currentId = null;
let busy = null, gen = 0;
const queued = [];                  // added while a task ran, and the task finished first: sent next
let els = null;
let progTimer = null, frameTimer = null, frameOn = false, frameTick = 0, frameUrl = null;
let pending = [], preparing = 0, attachNote = '';     // the composer's attachments (not yet sent)

const key = () => `attention.threads.${me?.user_id || 'me'}`;
const cur = () => threads.find(t => t.id === currentId) || null;

export function initChat(user, h0) {
  me = user; hooks = h0 || {};
  try { threads = JSON.parse(localStorage.getItem(key()) || '[]'); } catch { threads = []; }
  if (!Array.isArray(threads)) threads = [];
  let resumable = null;
  for (const t of threads) for (const it of t.items || []) {
    if (it.kind === 'running' || (it.kind === 'failed' && it.pollId)) {
      // the server keeps running a task after the tab closes: poll it again (the newest one), else say so
      if (it.pollId && Date.now() - (it.pollStarted || 0) < RESUME_MS) {
        if (!resumable || (it.pollStarted || 0) > (resumable[1].pollStarted || 0)) resumable = [t, it];
        if (it.kind === 'running') { it.kind = 'failed'; it.text = 'Interrupted. Ask again.'; }
      } else if (it.kind === 'running') { it.kind = 'failed'; it.text = 'Interrupted. Ask again.'; t.taskId = null; delete it.pollId; }
    }
    delete it.fresh;
  }
  if (resumable) resume(...resumable);
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  nap.wake();                                     // back in front: poll now, not after a backoff
  if (busy) return;
  const t = cur(), it = [...(t?.items || [])].reverse().find(i => i.pollId);
  if (it && it.kind === 'failed' && Date.now() - (it.pollStarted || 0) < RESUME_MS) resume(t, it);
});

export function resetChat({ wipe = false } = {}) {
  stopProgress(); stopFrames(); gen++; busy = null;
  if (wipe) try { localStorage.removeItem(key()); } catch { /* ignore */ }
  threads = []; currentId = null; els = null; me = null; pending = []; attachNote = '';
}

function save() {
  threads.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  threads = threads.slice(0, MAX_THREADS);
  for (const t of threads) { t.items = t.items.slice(-MAX_ITEMS); t.context = (t.context || []).slice(-MAX_CONTEXT); }
  try { localStorage.setItem(key(), JSON.stringify(threads, (k, v) => (k === 'fresh' ? undefined : v))); } catch { /* storage full: keep in memory */ }
}

function newThread() {
  const t = { id: uid().slice(0, 12), title: '', updated: Date.now(), items: [], context: [], taskId: null, contextId: null };
  threads.unshift(t);
  currentId = t.id;
  history.replaceState(null, '', `#/chat/${t.id}`);
  return t;
}

// ---------- view ----------
export function mountChat(container, threadId) {
  currentId = threadId && threads.some(t => t.id === threadId) ? threadId : (threadId ? null : currentId);
  if (busy && !threadId) currentId = busy.threadId;
  const input = h('textarea', {
    id: 'composer-input', rows: '1', placeholder: 'Message Attention', 'aria-label': 'Message Attention', autocomplete: 'off', enterkeyhint: 'send', maxlength: '8000',
    oninput: () => { grow(); updateComposer(); },
    onpaste: e => {                                      // a pasted screenshot / photo is attached
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) { e.preventDefault(); addFiles(files); }
    },
    onkeydown: e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
    },
  });
  const sendBtn = h('button', { class: 'send', type: 'submit', 'aria-label': 'Send' }, icon('send'));
  const side = h('aside', { class: 'threads', id: 'threads', 'aria-label': 'Chats' },
    h('div', { class: 'threads-head' },
      h('h2', { text: 'Chats' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'New chat', title: 'New chat', onclick: startNew }, icon('edit'))),
    h('nav', { class: 'thread-list', 'aria-label': 'Recent chats' }),
    legalLinks('legal side-legal'));
  const msgs = h('div', { class: 'msgs', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions', tabindex: '-1' }, h('div', { class: 'msgs-inner' }));
  const picker = h('input', { type: 'file', multiple: true, accept: ACCEPT, hidden: true, tabindex: '-1', 'aria-hidden': 'true',
    onchange: e => { addFiles([...(e.target.files || [])]); e.target.value = ''; } });
  const attachBtn = h('button', { class: 'attach-btn', type: 'button', 'aria-label': 'Attach photos or files', title: 'Attach photos or files',
    onclick: () => picker.click() }, icon('clip'));
  const tray = h('div', { class: 'attach-tray', 'aria-live': 'polite' });
  const form = h('form', {
    class: 'composer', onsubmit: e => { e.preventDefault(); submit(); },
    ondragover: e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); form.classList.add('drop'); } },
    ondragleave: () => form.classList.remove('drop'),
    ondrop: e => { form.classList.remove('drop'); if (e.dataTransfer?.files?.length) { e.preventDefault(); addFiles([...e.dataTransfer.files]); } },
  }, tray, h('div', { class: 'composer-box with-attach' }, attachBtn, picker, input, sendBtn));
  const main = h('div', { class: 'chat-main' },
    h('div', { class: 'chat-bar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Show chats', 'aria-controls': 'threads', onclick: () => toggleDrawer(true) }, icon('menu')),
      h('span', { class: 'chat-bar-title' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'New chat', onclick: startNew }, icon('edit'))),
    msgs, form, legalLinks('legal composer-legal'));
  const scrim = h('div', { class: 'scrim', onclick: () => toggleDrawer(false) });
  const view = h('section', { class: 'chat-view' }, side, main, scrim);
  view.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('open')) toggleDrawer(false); });
  container.replaceChildren(view);
  els = { view, side, list: side.querySelector('.thread-list'), msgs, inner: msgs.firstChild, input, sendBtn, tray, attachBtn, title: main.querySelector('.chat-bar-title') };
  renderTray();
  render(true);
  if (busy) { startProgress(); startFrames(); } else if (frameWanted()) startFrames();
  if (matchMedia('(min-width: 821px)').matches) setTimeout(() => input.focus({ preventScroll: true }), 0);
}

function grow() {
  const i = els?.input; if (!i) return;
  i.style.height = 'auto';
  i.style.height = `${Math.min(i.scrollHeight, 200)}px`;
}

function toggleDrawer(open) {
  if (!els) return;
  els.side.classList.toggle('open', open);
  els.view.classList.toggle('drawer-open', open);
  if (open) els.side.querySelector('button')?.focus();
}

function startNew() {
  if (busy) stop();
  currentId = null;
  history.replaceState(null, '', '#/chat');
  toggleDrawer(false);
  render(true);
  els?.input.focus();
}

function updateComposer() {
  if (!els) return;
  const b = els.sendBtn;
  const stops = busy && !els.input.value.trim();          // while it works: Stop, or Send once there's something to add
  b.replaceChildren(icon(stops ? 'stop' : 'send'));
  b.setAttribute('aria-label', stops ? 'Stop' : 'Send');
  b.classList.toggle('stop', !!stops);
  b.disabled = !busy && ((!els.input.value.trim() && !pending.length) || preparing > 0);
}

function submit() {
  const text = els.input.value.trim();
  if (busy) {
    if (!text) { stop(); return; }
    els.input.value = ''; grow(); updateComposer();
    interject(text);
    return;
  }
  if ((!text && !pending.length) || preparing) return;
  const atts = pending; pending = []; attachNote = '';
  els.input.value = ''; grow(); renderTray(); updateComposer();
  send(text, { attachments: atts });
}

// ---------- attachments (attach.js): picked, pasted or dropped; shown above the input with a remove x ----------
async function addFiles(files) {
  if (!files.length) return;
  const { take, error } = fit(pending.length + preparing, files.length);
  attachNote = error || '';
  const todo = files.slice(0, take);
  preparing += todo.length; renderTray(); updateComposer();
  for (const f of todo) {
    try { pending.push(await prepare(f)); } catch (e) { attachNote = e.message || "That file couldn't be attached."; }
    preparing -= 1; renderTray(); updateComposer();
  }
}

function removeAttachment(id) {
  pending = pending.filter(a => a.id !== id); attachNote = '';
  renderTray(); updateComposer(); els?.input.focus();
}

function attachmentNode(a, onRemove) {
  const x = onRemove ? h('button', { class: 'att-x', type: 'button', 'aria-label': `Remove ${a.name}`, onclick: onRemove }, icon('close')) : null;
  if (a.kind === 'image' && a.thumb) {
    return h('div', { class: 'att thumb', title: a.name }, h('img', { src: a.thumb, alt: a.name }), x);
  }
  return h('div', { class: 'att file', title: a.name }, icon('doc'),
    h('span', { class: 'att-meta' }, h('span', { class: 'att-name', text: a.name }),
      h('span', { class: 'att-size', text: [a.kind === 'pdf' ? 'PDF' : a.kind === 'image' ? 'Image' : 'Text', a.size ? sizeLabel(a.size) : ''].filter(Boolean).join(' · ') })), x);
}

function renderTray() {
  if (!els?.tray) return;
  const kids = pending.map(a => attachmentNode(a, () => removeAttachment(a.id)));
  for (let i = 0; i < preparing; i++) kids.push(h('div', { class: 'att thumb loading', 'aria-label': 'Preparing attachment' }, h('span', { class: 'dots' }, h('i'), h('i'), h('i'))));
  els.tray.replaceChildren(...(kids.length ? [h('div', { class: 'att-row' }, kids)] : []),
    attachNote ? h('p', { class: 'att-note', role: 'alert', text: attachNote }) : null);
  els.tray.hidden = !kids.length && !attachNote;
  els.attachBtn.disabled = pending.length + preparing >= MAX_FILES;
}

function render(stick) {
  if (!els || !els.view.isConnected) return;
  const near = els.msgs.scrollHeight - els.msgs.scrollTop - els.msgs.clientHeight < 140;
  renderList();
  const t = cur();
  els.title.textContent = t?.title || 'New chat';
  if (!t || !t.items.length) els.inner.replaceChildren(emptyState());
  else {
    const lastAgentIdx = t.items.map(i => i.role).lastIndexOf('agent');
    els.inner.replaceChildren(...t.items.map((it, i) => itemNode(t, it, i === lastAgentIdx)));
    for (const it of t.items) delete it.fresh;
  }
  updateComposer();
  if (stick || near) requestAnimationFrame(() => { els.msgs.scrollTop = els.msgs.scrollHeight; });
}

function renderList() {
  const list = threads.filter(t => t.items.length).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  els.list.replaceChildren(...(list.length ? list.map(t => h('a', {
    class: 'thread', href: `#/chat/${t.id}`, 'aria-current': t.id === currentId ? 'page' : null,
    onclick: () => toggleDrawer(false),
  }, h('span', { class: 'thread-title', text: t.title || 'New chat' }), h('span', { class: 'thread-time', text: timeAgo((t.updated || 0) / 1000) })))
    : [h('p', { class: 'muted small thread-empty', text: 'Your chats show up here.' })]));
}

function emptyState() {
  const first = (me?.name || '').trim().split(/\s+/)[0];
  return h('div', { class: 'empty-state' },
    h('img', { src: '/assets/logo.png', alt: '', width: '52', height: '52', class: 'empty-logo' }),
    h('h1', { text: first ? `Hi, ${first}` : 'Hi there' }),
    h('p', { class: 'muted', text: 'What can I take care of? I ask before anything is sent, booked or paid.' }),
    h('div', { class: 'suggest' }, SUGGESTIONS.map(s => h('button', { class: 'suggestion', type: 'button', onclick: () => send(s) }, s))));
}

function cardCtx(t) {
  return {
    changed: () => { save(); render(); },
    navigate: target => hooks.navigate?.(target),
    refresh: () => hooks.connectionsChanged?.(),
  };
}

function itemNode(t, it, isLastAgent) {
  const enter = it.fresh != null ? { class: 'enter', style: `--d:${it.fresh * 320}ms` } : {};
  const row = (cls, ...kids) => h('div', { class: `row ${cls} ${enter.class || ''}`, style: enter.style || null }, ...kids);
  if (it.role === 'user') return row('user',
    it.attachments?.length ? h('div', { class: 'att-row sent' }, it.attachments.map(a => attachmentNode(a))) : null,
    it.text ? h('div', { class: 'bubble user', text: it.text }) : null);
  const pending = isLastAgent && !busy && t.taskId && !it.answer;
  switch (it.kind) {
    case 'running':
      return row('agent', h('div', { class: 'bubble agent running' },
        h('span', { class: 'dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
        h('span', { class: 'live-text', id: 'live-text', text: it.text || 'Working on it…' }),
        it.reconnecting ? h('span', { class: 'muted small reconnecting', id: 'live-reconnecting', text: ' · Reconnecting…' }) : null),
      frameNode());
    case 'confirm':
      return row('agent', h('article', { class: 'card approval' },
        h('div', { class: 'approval-head' }, icon('shield'), h('span', { text: 'Needs your OK' })),
        h('div', { class: 'md', html: md(it.text) }),
        it.page ? h('p', { class: 'card-note', text: `On ${it.page}` }) : null,
        it.domain === 'web' ? frameNode() : null,
        pending
          ? [h('p', { class: 'card-note', text: 'Nothing happens until you approve.' }),
            h('div', { class: 'card-actions' },
              h('button', { class: 'btn', type: 'button', onclick: () => send('yes', { silent: true }) }, icon('check'), 'Approve'),
              h('button', { class: 'btn ghost', type: 'button', onclick: () => send('no', { silent: true }) }, 'Cancel'))]
          : h('p', { class: `done-line ${it.answer === 'Canceled' ? 'muted' : ''}` }, icon(it.answer === 'Canceled' ? 'close' : 'check'), it.answer || 'Closed')));
    case 'question':
      return row('agent', h('div', { class: 'bubble agent' },
        h('div', { class: 'md', html: md(it.text) }),
        it.takeover ? h('p', { class: 'card-note', text: 'This step needs you on the cloud browser (for example, signing in). Use Take over in the iPhone app, then continue here.' }) : null),
      it.domain === 'web' ? frameNode() : null,
      pending ? choiceNode(it) : null,
      pending ? h('div', { class: 'quick' },
        it.takeover ? h('button', { class: 'pill', type: 'button', onclick: () => send('done', { display: 'Done — continue' }) }, 'Done — continue') : h('span', { class: 'muted small', text: 'Reply below' }),
        h('button', { class: 'pill', type: 'button', onclick: () => cancelTask(t, it) }, 'Cancel')) : null);
    case 'failed':
      return row('agent', h('div', { class: 'bubble agent error', role: 'alert' }, icon('alert'), h('span', { text: it.text }),
        ['quota_exceeded', 'pro_required'].includes(it.code) ? h('a', { class: 'text-link', href: CONFIG.testflight, target: '_blank', rel: 'noopener noreferrer' }, 'Subscribe in the iOS app') : null,
        it.retry && !busy ? h('button', { class: 'pill', type: 'button', onclick: () => { const r = it.retry; delete it.retry; delete it.pollId; send(r); } }, 'Try again') : null));
    case 'canceled':
      return row('agent system', h('p', { class: 'system-line', text: it.text || 'Canceled' }));
    default:
      return row('agent', it.text ? h('div', { class: 'bubble agent md', html: md(it.text) }) : null, renderActions(it.actions, cardCtx(t)),
        isLastAgent && !busy ? choiceNode(it) : null);
  }
}

/** Tappable picks from a reply ({question, options, multi}) or a question's own options. */
function pickList(data) {
  const c = data && typeof data.choices === 'object' && data.choices ? data.choices : (data?.ask && Array.isArray(data.options) ? { options: data.options } : null);
  const options = (c?.options || []).map(o => String(o || '').trim()).filter(Boolean).slice(0, 6);
  return options.length >= 2 ? { options, multi: !!c.multi } : null;
}

/** One tap sends a single pick; with multi, tap several, then Send. */
function choiceNode(it) {
  const c = it.choices;
  if (!c) return null;
  const picked = new Set();
  const sendBtn = h('button', { class: 'btn choice-send', type: 'button', hidden: true, onclick: () => send([...picked].join(', ')) }, 'Send');
  const chips = c.options.map(o => {
    const b = h('button', { class: 'choice', type: 'button', 'aria-pressed': 'false' }, c.multi ? h('span', { class: 'choice-box', 'aria-hidden': 'true' }) : null, o);
    b.onclick = () => {
      if (!c.multi) { send(o); return; }
      if (picked.has(o)) picked.delete(o); else picked.add(o);
      b.setAttribute('aria-pressed', String(picked.has(o)));
      sendBtn.hidden = picked.size === 0; sendBtn.textContent = picked.size ? `Send ${picked.size}` : 'Send';
    };
    return b;
  });
  return h('div', { class: 'choices' }, c.multi ? h('p', { class: 'muted small', text: 'Pick any' }) : null, h('div', { class: 'choice-row' }, chips), c.multi ? sendBtn : null);
}

function frameNode() {
  return h('figure', { class: `frame ${frameUrl ? 'on' : ''}` },
    h('img', { 'data-frame': '1', alt: 'Live view of the cloud browser', src: frameUrl || null }),
    h('figcaption', {}, h('span', { class: 'live-dot', 'aria-hidden': 'true' }), 'Cloud browser'));
}

// ---------- talking to the agent ----------
const lastAgent = t => [...(t?.items || [])].reverse().find(i => i.role === 'agent');

export async function send(text, { silent = false, display, attachments = [] } = {}) {
  text = String(text || '').trim();
  if ((!text && !attachments.length) || busy) return;
  const t = cur() || newThread();
  const waiting = lastAgent(t);
  if (t.taskId && waiting && ['confirm', 'question'].includes(waiting.kind) && !waiting.answer) {
    waiting.answer = text === 'yes' ? 'Approved' : text === 'no' ? 'Canceled' : 'Answered';
  }
  if (!silent) t.items.push({ id: uid(), role: 'user', kind: 'text', text: display || text, fresh: 0, ...(attachments.length ? { attachments: shown(attachments) } : {}) });
  if (!t.title) t.title = (text || attachments.map(a => a.name).join(', ')).slice(0, 80);
  t.context = t.context || [];
  t.context.push(`user: ${text}${attachments.length ? ` [attached: ${attachments.map(a => a.name).join(', ')}]` : ''}`);
  const live = { id: uid(), role: 'agent', kind: 'running', text: '', fresh: 1 };
  t.items.push(live);
  t.updated = Date.now();
  if (!t.taskId) t.prompt = text;                 // what "Try again" sends (a follow-up retries the original request)
  const prompt = t.prompt || text;
  const my = ++gen;
  busy = { threadId: t.id, itemId: live.id, since: Date.now() / 1000 - 1 };
  save(); render(true);
  startProgress(); startFrames();
  const stopped = () => my !== gen;
  try {
    const message = {
      role: 'user', kind: 'message', messageId: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      parts: buildParts(text, attachments),
      metadata: { device: 'web', thread: t.id, context: t.context.slice(-30).join('\n') },
    };
    if (t.taskId) { message.taskId = t.taskId; if (t.contextId) message.contextId = t.contextId; }
    const task = await sendTask(message, { shouldStop: stopped, onReconnecting: on => reconnecting(live, on), sleep: nap.sleep });
    if (stopped()) return;
    reconnecting(live, false);
    let final = task;
    if (task?.id && task?.status?.state && !SETTLED.has(task.status.state)) {
      // the server is on it: keep its id on the card (a reload picks it up again), poll until it settles
      Object.assign(live, { pollId: task.id, pollStarted: Date.now(), prompt }); save();
      final = await poll(t, live, task.id, stopped);
      if (!final) return;
    }
    delete live.pollId;
    applyTask(t, live, final);
  } catch (e) {
    if (ATTACH_ERRORS.has(e?.code) && attachments.length && !pending.length) { pending = attachments; renderTray(); }   // fix and resend
    failed(t, live, e, stopped, prompt);
  } finally {
    settle(t, my);
  }
}

/** Poll the task on this card -> the settled task, or null when stopped. */
function poll(t, live, id, stopped) {
  return waitForTask(id, {
    shouldStop: stopped, sleep: nap.sleep,
    onReconnecting: on => reconnecting(live, on),
    onUpdate: task => {                                   // the step it's on (tasks/get carries it too)
      const p = task?.metadata?.progress;
      const shown = task?.metadata?.partial || p?.small;      // the reply as it is written, else the step it's on
      if (shown && live.text !== shown) { live.text = shown; const el = document.getElementById('live-text'); if (el) el.textContent = shown; }
    },
  });
}

/** Pick up a task the server kept running (tab reloaded, or the connection came back after polling gave up). */
async function resume(t, it) {
  if (busy || !it.pollId) return;
  const my = ++gen, stopped = () => my !== gen;
  busy = { threadId: t.id, itemId: it.id, since: Date.now() / 1000 - 1 };
  Object.assign(it, { kind: 'running', text: '' }); delete it.retry; delete it.code;
  save(); render(); startProgress(); startFrames();
  try {
    const final = await poll(t, it, it.pollId, stopped);
    if (!final) return;
    delete it.pollId;
    applyTask(t, it, final);
  } catch (e) {
    failed(t, it, e, stopped, it.prompt || t.prompt);
  } finally {
    settle(t, my);
  }
}

function failed(t, live, e, stopped, prompt) {
  if (stopped() || e?.name === 'AbortError') return;
  if (e.status === 401) return;
  delete live.reconnecting;
  if (e.code !== 'unreachable') delete live.pollId;       // unreachable: it may still finish — kept for a later resume
  const retry = transient(e) || ['task_not_found', 'unreachable', 'offline'].includes(e.code);
  Object.assign(live, { kind: 'failed', text: explain(e), code: e.code || '', retry: retry && prompt ? prompt : undefined });
  t.taskId = null; t.contextId = null;
}

function settle(t, my) {
  if (my !== gen) return;
  busy = null;
  stopProgress();
  if (!frameWanted()) stopFrames();
  t.updated = Date.now();
  save(); render(true);
  hooks.taskFinished?.();
  sendQueued();
}

function reconnecting(it, on) {
  if (!!it.reconnecting === on) return;
  if (on) it.reconnecting = true; else delete it.reconnecting;
  render();
}

function applyTask(t, live, task) {
  const parts = task?.status?.message?.parts || [];
  const text = String(parts.find(p => p?.kind === 'text')?.text || '').trim();
  const data = parts.find(p => p?.kind === 'data')?.data || {};
  const state = task?.status?.state;
  const actions = Array.isArray(data.actions) ? data.actions : null;
  for (const m of task?.metadata?.unread || []) if (!queued.includes(m)) queued.push(m);
  t.context.push(`agent: ${data.reply || [data.big, data.small].filter(Boolean).join(' — ') || text}`);
  Object.assign(live, { domain: data.domain || null, page: data.page || null, irreversible: !!data.irreversible, takeover: !!data.takeover });
  if (state === 'input-required') {
    t.taskId = task.id || t.taskId; t.contextId = task.contextId || t.contextId;
    live.kind = data.ask ? 'question' : 'confirm';
    live.choices = data.ask ? pickList(data) : null;
    live.text = data.ask ? (text || data.small) : (text.replace(/^Approve\s*[—-]\s*/, '') || data.small || 'Approve this?');
    return;
  }
  t.taskId = null; t.contextId = null;
  delete live.reconnecting;
  if (state === 'failed') {
    live.kind = 'failed';
    // "Interrupted by a server update — tap to try again": the whole sentence + a Try again button
    live.text = data.interrupted ? (text || data.small) : (data.small || data.big || text || "That didn't work.");
    if (data.retry) live.retry = data.retry_text || t.prompt || undefined;
    return;
  }
  if (state === 'canceled') { live.kind = 'canceled'; live.text = 'Canceled'; return; }
  const body = data.reply || text || data.small || data.big || 'Done.';
  const ps = paragraphs(body);
  const choices = pickList(data);
  live.kind = 'text';
  live.text = ps[0] || body;
  live.actions = ps.length > 1 ? null : actions;
  live.choices = ps.length > 1 ? null : choices;
  const at = t.items.indexOf(live);
  const more = ps.slice(1).map((p, i) => ({ id: uid(), role: 'agent', kind: 'text', text: p, fresh: i + 2, actions: i === ps.length - 2 ? actions : null,
                                            choices: i === ps.length - 2 ? choices : null }));
  t.items.splice(at + 1, 0, ...more);
}

async function cancelTask(t, it) {
  const id = t.taskId;
  it.answer = 'Canceled'; t.taskId = null; t.contextId = null;
  t.items.push({ id: uid(), role: 'agent', kind: 'canceled', text: 'Canceled', fresh: 0 });
  save(); render(true);
  if (id) rpc('tasks/cancel', { id }).catch(() => {});
}

/** The user adds something while a task runs: it goes into that run. Too late for it? It's sent once the run has settled. */
async function interject(text) {
  const t = threads.find(x => x.id === busy?.threadId);
  const live = t?.items.find(i => i.id === busy.itemId);
  if (!t || !live) { queued.push(text); return; }
  t.items.splice(t.items.indexOf(live), 0, { id: uid(), role: 'user', kind: 'text', text, fresh: 0 });
  t.context.push(`user: ${text}`);
  t.updated = Date.now(); save(); render(true);
  let taken = false;
  if (live.pollId) try { taken = (await rpc('tasks/interject', { id: live.pollId, text }))?.accepted === true; } catch { /* sent after it settles */ }
  if (!taken) { queued.push(text); if (!busy) sendQueued(); }
}

function sendQueued() {
  if (busy || !queued.length) return;
  const text = queued.splice(0).join('\n');
  send(text, { silent: true });
}

function stop() {
  if (!busy) return;
  const t = threads.find(x => x.id === busy.threadId);
  const it = t?.items.find(i => i.id === busy.itemId);
  const running = it?.pollId;
  gen++; busy = null;
  stopProgress(); stopFrames();
  request('/abort').catch(() => {});
  if (running) { rpc('tasks/cancel', { id: running }).catch(() => {}); delete it.pollId; }
  if (it) delete it.reconnecting;
  if (it) { it.kind = 'canceled'; it.text = 'Stopped'; }
  if (t) { t.taskId = null; t.contextId = null; }
  save(); render();
}

// ---------- live progress + the cloud browser's frame ----------
function startProgress() {
  stopProgress();
  progTimer = setInterval(async () => {
    if (!busy) return;
    const b = busy;
    try {
      const p = await request('/progress');
      if (busy !== b || !p?.small || (p.t || 0) < b.since) return;
      const t = threads.find(x => x.id === b.threadId);
      const it = t?.items.find(i => i.id === b.itemId);
      if (it && it.text !== p.small) {
        it.text = p.small;
        const el = document.getElementById('live-text');
        if (el) el.textContent = p.small;
      }
    } catch { /* keep the last line */ }
  }, 800);
}
function stopProgress() { clearInterval(progTimer); progTimer = null; }

function frameWanted() {
  if (busy) return true;
  const t = cur(), last = lastAgent(t);
  return !!(t?.taskId && last && !last.answer && ['confirm', 'question'].includes(last.kind) && last.domain === 'web');
}

function startFrames() {
  if (frameTimer) return;
  frameOn = false; frameTick = 0;
  frameTimer = setInterval(frameStep, 1000);
}
function stopFrames() {
  clearInterval(frameTimer); frameTimer = null; frameOn = false;
  if (frameUrl) { const u = frameUrl; frameUrl = null; setTimeout(() => URL.revokeObjectURL(u), 500); }
  document.querySelectorAll('.frame.on').forEach(f => f.classList.remove('on'));
}
async function frameStep() {
  if (!frameWanted()) { stopFrames(); return; }
  if (document.hidden) return;
  if (!frameOn) {
    if (frameTick++ % 2) return;                 // check the browser state every 2 s until it is live
    try {
      const s = await request('/browser/state');
      frameOn = !!s?.active && (!busy || (s.t || 0) >= busy.since - 2);
    } catch { return; }
    if (!frameOn) return;
  }
  try {
    const res = await request('/browser/shot.jpg', { raw: true });
    const blob = await res.blob();
    if (!blob.size || !frameTimer) return;
    const u = URL.createObjectURL(blob), old = frameUrl;
    frameUrl = u;
    document.querySelectorAll('img[data-frame]').forEach(img => { img.src = u; img.closest('.frame')?.classList.add('on'); });
    if (old) setTimeout(() => URL.revokeObjectURL(old), 1500);
  } catch { /* no frame yet */ }
}

export const isBusy = () => !!busy;
