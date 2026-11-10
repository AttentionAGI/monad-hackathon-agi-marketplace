// The cloud browser in a window, driven by the user's own hands (a cheaper-option card's "Cloud browser"): the live
// frame, click / scroll / type sent straight to the page (never to the AI). Done hands the browser back.
import { request } from './api.js';
import { h, toast } from './ui.js';

const FRAME_MS = 350;

/** A deal card needs an https link, a price and a store (like the iPhone app). */
export function validDeal(a) {
  return typeof a.web_url === 'string' && a.web_url.startsWith('https://') && typeof a.price === 'number' && !!a.store;
}

/** Map a click on the frame to fractions of the page's viewport (what POST /browser/tap takes). */
export function tapPoint(ev, rect) {
  const x = (ev.clientX - rect.left) / rect.width, y = (ev.clientY - rect.top) / rect.height;
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

/** POST /browser/open {url}: only a link one of this user's cards offered. -> null, or a message why not. */
export async function openPage(url) {
  try { await request('/browser/open', { method: 'POST', body: { url } }); return null; }
  catch (e) {
    if (e.status === 409) return 'Your cloud browser is busy with a task. Try again when it is done.';
    if (e.status === 403) return 'That page can only be opened from its card.';
    if (e.status === 404) return 'The cloud browser can’t open pages from here yet.';
    if (e.status === 429) return 'Too many tries. Wait a bit and try again.';
    return e.message || 'Couldn’t open it in the cloud browser.';
  }
}

export async function openCloudBrowser(url, title = 'Cloud browser') {
  const why = await openPage(url);
  if (why) return why;
  let frameUrl = null, timer = null, closed = false, err = '';
  const img = h('img', { class: 'cb-frame', alt: 'Your cloud browser', draggable: 'false' });
  const note = h('p', { class: 'card-note', text: 'Click, scroll and type: this goes to the page, not to the AI. Nothing is bought unless you check out yourself.' });
  const errEl = h('p', { class: 'card-note error', role: 'status' });
  const field = h('input', { class: 'cb-input', type: 'text', placeholder: 'Type into the page…', autocomplete: 'off', 'aria-label': 'Text to type into the page' });
  const say = m => { err = m; errEl.textContent = m; };
  const post = async (path, body) => {
    try { await request(`/browser/${path}`, { method: 'POST', body }); say(''); refresh(); return true; }
    catch (e) { say(e.status === 409 ? 'This cloud browser has closed. Open it again from the card.' : 'That didn’t reach the page. Try again.'); return false; }
  };
  const sendText = async () => {
    const t = field.value; if (!t) return;
    if (await post('type', { text: t })) field.value = '';
  };
  img.addEventListener('click', ev => post('tap', tapPoint(ev, img.getBoundingClientRect())));
  img.addEventListener('wheel', ev => { ev.preventDefault(); post('scroll', { dy: Math.max(-800, Math.min(800, ev.deltaY)) }); }, { passive: false });
  field.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); field.value ? sendText().then(() => post('key', { key: 'Enter' })) : post('key', { key: 'Enter' }); }
  });

  async function refresh() {
    if (closed || document.hidden) return;
    try {
      const res = await request('/browser/shot.jpg', { raw: true });
      const blob = await res.blob();
      if (!blob.size || closed) return;
      const u = URL.createObjectURL(blob), old = frameUrl;
      frameUrl = u; img.src = u;
      if (old) setTimeout(() => URL.revokeObjectURL(old), 1500);
    } catch { /* keep the last frame */ }
  }

  const dlg = h('dialog', { class: 'dialog cloud-browser', 'aria-label': title });
  const done = () => {
    if (closed) return;
    closed = true; clearInterval(timer);
    request('/browser/hold', { method: 'POST', body: { on: false } }).catch(() => {});
    dlg.close(); dlg.remove();
    if (frameUrl) setTimeout(() => URL.revokeObjectURL(frameUrl), 500);
  };
  dlg.append(
    h('div', { class: 'dialog-head' }, h('h2', { text: 'Your turn' }),
      h('button', { class: 'btn', type: 'button', onclick: done }, 'Done')),
    h('div', { class: 'dialog-body' }, note, h('div', { class: 'cb-wrap' }, img),
      h('div', { class: 'cb-row' }, field,
        h('button', { class: 'pill', type: 'button', onclick: sendText }, 'Type'),
        h('button', { class: 'pill', type: 'button', onclick: () => post('key', { key: 'Enter' }) }, 'Enter'),
        h('button', { class: 'pill', type: 'button', onclick: () => post('key', { key: 'Backspace' }), 'aria-label': 'Delete one character' }, '⌫')),
      errEl));
  dlg.addEventListener('cancel', e => { e.preventDefault(); done(); });
  document.body.append(dlg);
  dlg.showModal();
  refresh();
  timer = setInterval(refresh, FRAME_MS);
  if (err) toast(err);
  return null;
}

