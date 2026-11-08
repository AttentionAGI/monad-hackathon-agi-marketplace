// Attention on the web: signed-out shell (Continue with Apple), AI consent, then Home · Chat · Artifacts + Account.
import { request, session, onUnauthorized, setTransport, explain } from './api.js';
import { signInWithApple, askConsent, preloadApple } from './auth.js';
import { initChat, mountChat, resetChat } from './chat.js';
import { renderHome, renderArtifacts, openAccount, initials } from './views.js';
import { h, icon, legalLinks, toast } from './ui.js';

const root = document.getElementById('root');
const qs = new URLSearchParams(location.search);
// ?mock=1 feeds sample API responses for local previews only; it never runs on attentionai.dev.
const MOCK = qs.has('mock') && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const DRAFT_KEY = 'attention.draft';

let me = null;
let shell = null;

async function boot() {
  if (MOCK) {
    const m = await import('./mock.js');
    m.install({ setTransport, session, signedOut: qs.get('mock') === 'signedout' });
  }
  onUnauthorized(() => signOutLocal('Your session ended. Sign in again.'));
  window.addEventListener('hashchange', route);
  if (!session.token) return renderSignedOut();
  await start();
}

async function start() {
  root.replaceChildren(h('div', { class: 'boot', 'aria-busy': 'true' }, h('img', { src: '/assets/logo.png', alt: 'Loading Attention', width: '56', height: '56' })));
  try { me = await request('/account/me'); }
  catch (e) {
    if (e.status === 401) return;
    root.replaceChildren(h('div', { class: 'center-msg' },
      h('img', { src: '/assets/logo.png', alt: '', width: '48', height: '48' }),
      h('p', { text: explain(e) }),
      h('button', { class: 'btn', type: 'button', onclick: start }, 'Try again'),
      h('button', { class: 'text-link', type: 'button', onclick: () => signOut() }, 'Sign out')));
    return;
  }
  if (!me.ai_consent) {
    root.replaceChildren();
    if (!await askConsent()) return signOut();
    me.ai_consent = { version: '1' };
  }
  initChat(me, {
    navigate: target => navigate(target),
    connectionsChanged: () => {},
  });
  renderShell();
  route();
  const draft = (() => { try { return sessionStorage.getItem(DRAFT_KEY); } catch { return null; } })();
  if (draft) {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    const input = document.getElementById('composer-input');
    if (input) { input.value = draft; input.dispatchEvent(new Event('input')); input.focus(); }
  }
}

// ---------- signed out ----------
function renderSignedOut(message) {
  me = null; shell = null;
  preloadApple();
  const err = h('p', { class: 'so-error', role: 'alert', text: message || '' });
  const btn = h('button', { class: 'btn apple', type: 'button' }, icon('apple'), h('span', { text: 'Continue with Apple' }));
  btn.addEventListener('click', async () => {
    err.textContent = '';
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    try {
      const r = await signInWithApple();
      if (r) { await start(); return; }
    } catch (e) { err.textContent = e.message || "Couldn't sign in."; }
    btn.disabled = false; btn.removeAttribute('aria-busy');
  });
  const input = h('textarea', { rows: '1', placeholder: 'Message Attention', 'aria-label': 'Message Attention (sign in to send)', maxlength: '8000' });
  const nudge = () => {
    const v = input.value.trim();
    if (v) try { sessionStorage.setItem(DRAFT_KEY, v); } catch { /* ignore */ }
    err.textContent = 'Sign in to send your message.';
    btn.focus();
    btn.classList.remove('nudge'); void btn.offsetWidth; btn.classList.add('nudge');
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); nudge(); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 160)}px`; });
  root.replaceChildren(h('div', { class: 'signed-out' },
    h('header', { class: 'so-top' }, h('a', { class: 'brand', href: '/' }, h('img', { src: '/assets/logo.png', alt: '', width: '28', height: '28' }), h('span', { text: 'Attention' }))),
    h('main', { class: 'so-main' },
      h('div', { class: 'so-card' },
        h('img', { class: 'so-logo', src: '/assets/logo.png', alt: '', width: '64', height: '64' }),
        h('h1', { text: 'Attention' }),
        h('p', { class: 'so-lede', text: 'Your AI that remembers your day and gets things done — always with your approval.' }),
        btn,
        err,
        h('p', { class: 'fine' }, 'By continuing, you agree to our ', h('a', { href: '/terms/' }, 'Terms'), ' and acknowledge our ', h('a', { href: '/privacy/' }, 'Privacy Policy'), '.'))),
    h('div', { class: 'so-composer' },
      h('form', { class: 'composer', onsubmit: e => { e.preventDefault(); nudge(); } },
        h('div', { class: 'composer-box' }, input, h('button', { class: 'send', type: 'submit', 'aria-label': 'Send' }, icon('send')))),
      legalLinks('legal'))));
}

// ---------- signed in ----------
function renderShell() {
  const tab = (id, label) => h('a', { class: 'tab', href: `#/${id}`, 'data-tab': id }, label);
  const avatar = h('button', { class: 'avatar', type: 'button', 'aria-label': 'Account', title: 'Account', onclick: () => account() },
    initials(me.name) || icon('user'));
  const view = h('main', { class: 'view', id: 'view' });
  shell = { view };
  root.replaceChildren(h('div', { class: 'app' },
    h('header', { class: 'topbar' },
      h('a', { class: 'brand', href: '#/chat', 'aria-label': 'Attention' }, h('img', { src: '/assets/logo.png', alt: '', width: '28', height: '28' })),
      h('nav', { class: 'tabs', 'aria-label': 'Sections' }, tab('home', 'Home'), tab('chat', 'Chat'), tab('artifacts', 'Artifacts')),
      avatar),
    view));
}

function route() {
  if (!shell || !me) return;
  const [, section = 'chat', a, b] = (location.hash || '#/chat').split('/');
  const name = ['home', 'chat', 'artifacts'].includes(section) ? section : 'chat';
  document.querySelectorAll('.tab').forEach(t => { if (t.dataset.tab === name) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  shell.view.dataset.view = name;
  if (name === 'chat') mountChat(shell.view, a ? decodeURIComponent(a) : null);
  else if (name === 'home') renderHome(shell.view, { recId: a === 'rec' && b ? decodeURIComponent(b) : null, navigate });
  else renderArtifacts(shell.view);
  if (name !== 'chat') shell.view.scrollTop = 0;
  document.title = name === 'chat' ? 'Attention' : `${name[0].toUpperCase()}${name.slice(1)} · Attention`;
}

function navigate(target) {
  if (['account', 'subscription', 'connections'].includes(target)) return account(target === 'connections' ? 'connections' : target === 'subscription' ? 'plan' : null);
  if (target === 'chat') { location.hash = '#/chat'; return; }
  if (target === 'second_you' || target === 'home') { location.hash = '#/home'; return; }
  location.hash = '#/chat';
}

function account(focus) {
  return openAccount(me, { focus, signOut, deleted: () => signOutLocal('Your account was deleted.') });
}

async function signOut() {
  try { await request('/auth/logout', { method: 'POST', body: {} }); } catch { /* signing out locally anyway */ }
  signOutLocal();
}

function signOutLocal(message) {
  resetChat({ wipe: true });
  session.clear();
  document.querySelectorAll('dialog').forEach(d => { try { d.__done ? d.__done(null) : d.remove(); } catch { d.remove(); } });
  history.replaceState(null, '', location.pathname + location.search);
  renderSignedOut(message);
}

boot().catch(e => { console.error(e); toast('Something went wrong loading Attention.'); });
