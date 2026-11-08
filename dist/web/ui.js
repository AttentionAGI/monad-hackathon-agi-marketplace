// DOM helpers, icons, dialogs and toasts. Text always goes in as text nodes; `html` is only ever md() output.
export const CONFIG = {
  appleClientId: 'dev.attentionai.web',
  appleRedirectURI: 'https://attentionai.dev/auth/apple/',
  testflight: 'https://testflight.apple.com/join/CAsCUPvT',
};

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

const PATHS = {
  send: 'M12 19V5M5 12l7-7 7 7',
  stop: 'M7 7h10v10H7z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
  ext: 'M7 17L17 7M9 7h8v8',
  check: 'M5 12.5l4.5 4.5L19 7',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
  alert: 'M12 8v5M12 16.5v.5M10.3 4l-8 14a2 2 0 001.7 3h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6',
};
const APPLE = 'M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-4.2zM14 5.2c.7-.8 1.2-2 1-3.2-1 0-2.2.7-3 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.4z';

export function icon(name, cls = 'icon') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  if (name === 'apple') { p.setAttribute('d', APPLE); p.setAttribute('fill', 'currentColor'); }
  else {
    p.setAttribute('d', PATHS[name] || PATHS.spark);
    p.setAttribute('fill', name === 'stop' ? 'currentColor' : 'none');
    p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2');
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  }
  svg.append(p);
  return svg;
}

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/**
 * A modal <dialog>. body: Node(s). actions: [{label, value, kind: 'primary'|'ghost'|'danger'}].
 * Resolves with the chosen value (or null when dismissed with Esc / the close button).
 */
export function modal({ title, body, actions = [], className = '', dismissable = true, labelledBy }) {
  return new Promise(resolve => {
    const titleId = labelledBy || `dlg-${Math.random().toString(36).slice(2, 8)}`;
    const dlg = h('dialog', { class: `dialog ${className}`, 'aria-labelledby': titleId });
    const done = v => { dlg.close(); dlg.remove(); resolve(v); };
    const head = h('div', { class: 'dialog-head' },
      title ? h('h2', { id: titleId, text: title }) : null,
      dismissable ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => done(null) }, icon('close')) : null);
    const foot = actions.length ? h('div', { class: 'dialog-actions' }, actions.map(a =>
      h('button', { type: 'button', class: `btn ${a.kind === 'ghost' ? 'ghost' : a.kind === 'danger' ? 'danger' : ''} wide`, onclick: () => done(a.value) }, a.label))) : null;
    dlg.append(...[head, h('div', { class: 'dialog-body' }, body), foot].filter(Boolean));
    dlg.addEventListener('cancel', e => { e.preventDefault(); if (dismissable) done(null); });
    dlg.addEventListener('click', e => { if (e.target === dlg && dismissable) done(null); });
    document.body.append(dlg);
    dlg.showModal();
    dlg.__done = done;
  });
}

export function confirmDialog(title, text, okLabel = 'OK', danger = false) {
  return modal({
    title, body: h('p', { class: 'muted', text }),
    actions: [{ label: okLabel, value: true, kind: danger ? 'danger' : 'primary' }, { label: 'Cancel', value: false, kind: 'ghost' }],
  }).then(Boolean);
}

/** "Record with the iPhone app" (no recording on the web). */
export function iphoneOnly(what = 'Recording') {
  return modal({
    title: `${what} is on iPhone`,
    body: [h('p', { class: 'muted', text: `${what} uses your iPhone's microphone (or the Attention card), so it lives in the iPhone app. Everything you record shows up here too.` })],
    actions: [{ label: 'Get the iPhone app', value: 'go' }, { label: 'Not now', value: null, kind: 'ghost' }],
  }).then(v => { if (v === 'go') window.open(CONFIG.testflight, '_blank', 'noopener,noreferrer'); });
}

export function timeAgo(sec) {
  if (!sec) return '';
  const d = Date.now() / 1000 - sec;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  const date = new Date(sec * 1000);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(d > 300 * 86400 ? { year: 'numeric' } : {}) });
}

export function duration(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

export function legalLinks(cls = 'legal') {
  return h('nav', { class: cls, 'aria-label': 'About and legal' },
    h('a', { href: '/about/' }, 'About'), h('span', { 'aria-hidden': 'true' }, ' · '),
    h('a', { href: '/privacy/' }, 'Privacy'), h('span', { 'aria-hidden': 'true' }, ' · '),
    h('a', { href: '/terms/' }, 'Terms'));
}

/** Only open real web pages. */
export function safeHttpUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; }
}

export function openExternal(url) {
  const u = safeHttpUrl(url);
  if (u) window.open(u, '_blank', 'noopener,noreferrer');
  return !!u;
}

/** web_url without the {lat}/{lng}/{nickname} placeholders the iPhone app would geocode. */
export function cleanWebUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const all = [...u.searchParams];
  const keep = all.filter(([k, v]) => !/[{}]/.test(k) && !/[{}]/.test(v));
  if (keep.length !== all.length) u.search = new URLSearchParams(keep).toString();   // only re-encode when something was dropped
  if (/[{}]|%7B|%7D/i.test(u.pathname)) u.pathname = '/';
  if (/[{}]|%7B|%7D/i.test(u.hash)) u.hash = '';
  return u.href;
}
