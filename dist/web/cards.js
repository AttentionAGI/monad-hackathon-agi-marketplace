// Cards under an agent reply (data.actions): open_app, deal, connect, disconnect, open, plan. Nothing here orders, pays,
// sends or buys: open_app opens the other site and the user finishes there; plans are App Store only.
import { request } from './api.js';
import { openCloudBrowser, validDeal } from './browser.js';
import { connectFlow } from './auth.js';
import { CONFIG, h, icon, confirmDialog, toast, iphoneOnly, cleanWebUrl } from './ui.js';
export { cleanWebUrl };

const KNOWN = new Set(['open_app', 'deal', 'connect', 'disconnect', 'open', 'plan']);
const OUTGOING = new Set(['pay', 'message']);

function prefillChips(prefill) {
  const entries = Array.isArray(prefill) ? prefill.map(f => [f.key, f.value]) : Object.entries(prefill || {});
  const hasName = entries.some(([k, v]) => k === 'to_name' && v);
  const shown = entries.filter(([k, v]) => v && !(k === 'to' && hasName))
    .map(([, v]) => String(v)).filter(v => v.length <= 60).slice(0, 4);
  return shown.length ? h('div', { class: 'chips' }, shown.map(v => h('span', { class: 'chip', text: v }))) : null;
}

/** Group: one primary open_app + up to 2 alternates (shown as pills), like the iOS app. */
function group(actions) {
  const out = [];
  for (const a of actions) {
    const last = out[out.length - 1];
    if (a.type === 'open_app' && last?.main.type === 'open_app' && last.alts.length < 2) last.alts.push(a);
    else out.push({ main: a, alts: [] });
  }
  return out;
}

/**
 * ctx: { changed(): persist + re-render, navigate(target), refresh?() }
 */
export function renderActions(actions, ctx) {
  const list = (actions || []).filter(a => a && KNOWN.has(a.type) && (a.type !== 'deal' || validDeal(a)));
  if (!list.length) return null;
  return h('div', { class: 'cards' }, group(list).map(g => {
    switch (g.main.type) {
      case 'open_app': return openAppCard(g.main, g.alts, ctx);
      case 'deal': return dealCard(g.main, ctx);
      case 'connect': return connectCard(g.main, ctx);
      case 'disconnect': return disconnectCard(g.main, ctx);
      case 'open': return openCard(g.main, ctx);
      case 'plan': return planCard(g.main);
      default: return null;
    }
  }));
}

function appBadge(name) {
  return h('span', { class: 'app-badge', 'aria-hidden': 'true', text: (name || '?').trim().charAt(0).toUpperCase() });
}

function openAppCard(a, alts, ctx) {
  const all = [a, ...alts];
  const opened = all.find(x => x._state === 'done');
  const outgoing = OUTGOING.has(a.category);
  const verb = x => (OUTGOING.has(x.category) ? 'Review in ' : 'Open in ') + (x.name || 'app');
  const open = x => {
    const url = cleanWebUrl(x.web_url);
    if (!url) { toast(`${x.name || 'That app'} opens from the iPhone app only.`); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
    for (const o of all) o._state = o === x ? 'done' : undefined;
    ctx.changed();
  };
  return h('article', { class: 'card' },
    h('div', { class: 'card-head' }, appBadge(a.name),
      h('div', {}, h('div', { class: 'card-kicker', text: a.name || '' }), h('div', { class: 'card-title', text: a.title || `Open ${a.name}` }))),
    prefillChips(a.prefill),
    a.subtitle ? h('p', { class: 'card-sub', text: a.subtitle }) : null,
    opened
      ? [h('p', { class: 'done-line' }, icon('check'), `Opened ${opened.name} — finish there`),
        h('button', { class: 'pill', type: 'button', onclick: () => open(opened) }, 'Open again ', icon('ext'))]
      : [h('button', { class: 'btn wide', type: 'button', onclick: () => open(a), disabled: !cleanWebUrl(a.web_url) }, verb(a), icon('ext')),
        outgoing ? h('p', { class: 'card-note', text: `Review in ${a.name} — you confirm and send it there.` }) : null,
        !cleanWebUrl(a.web_url) ? h('p', { class: 'card-note', text: `${a.name} opens from the iPhone app.` }) : null],
    alts.length && !opened ? h('div', { class: 'alts' }, h('span', { class: 'muted small', text: 'Or' }),
      alts.map(x => h('button', { class: 'pill', type: 'button', 'aria-label': verb(x), onclick: () => open(x) }, x.name))) : null);
}

const money = v => (typeof v === 'number' && isFinite(v))
  ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(v) ? 0 : 2 }) : '';


/** "Cheaper option": the same product at another US store. View (new tab) · Cloud browser · No thanks. Never buys. */
function dealCard(a, ctx) {
  const store = a.store || 'another store';
  const view = () => {
    const url = cleanWebUrl(a.web_url);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    a._state = 'done'; a._note = `Opened at ${store} — finish there`; ctx.changed();
  };
  const cloud = async () => {
    a._busy = true; a._err = ''; ctx.changed();
    const why = await openCloudBrowser(a.web_url, a.title || 'Cloud browser');
    a._busy = false;
    if (why) a._err = why; else { a._state = 'done'; a._note = 'Opened in your cloud browser'; }
    ctx.changed();
  };
  const no = () => { a._state = 'dismissed'; ctx.changed(); };
  const saveLine = typeof a.was === 'number' && typeof a.save === 'number'
    ? h('p', { class: 'deal-was' }, h('s', { text: money(a.was) }), a.was_store ? ` at ${a.was_store} · ` : ' · ',
      h('span', { class: 'deal-save', text: `Save ${money(a.save)}${typeof a.save_pct === 'number' ? ` (${a.save_pct}%)` : ''}` }))
    : null;
  return h('article', { class: 'card deal' },
    h('div', { class: 'card-head' }, h('span', { class: 'app-badge deal-badge', 'aria-hidden': 'true', text: '$' }),
      h('div', {}, h('div', { class: 'card-kicker', text: 'Cheaper option' }), h('div', { class: 'card-title', text: a.title || 'This item' }))),
    h('p', { class: 'deal-price' }, h('strong', { text: money(a.price) }), ` at ${store}`),
    saveLine,
    a._state === 'dismissed' ? h('p', { class: 'card-note', text: 'Dismissed' })
      : a._state === 'done'
        ? [h('p', { class: 'done-line' }, icon('check'), a._note || 'Opened'),
          h('button', { class: 'pill', type: 'button', onclick: view }, 'Open again ', icon('ext'))]
        : [h('p', { class: 'deal-ask', text: 'Want to see it?' }),
          h('button', { class: 'btn wide', type: 'button', onclick: view }, `View at ${store}`, icon('ext')),
          h('div', { class: 'alts' },
            h('button', { class: 'pill', type: 'button', onclick: cloud, disabled: !!a._busy, 'aria-busy': a._busy ? 'true' : null }, icon('globe'), a._busy ? ' Opening…' : ' Cloud browser'),
            h('button', { class: 'pill', type: 'button', onclick: no }, 'No thanks'))],
    a._err ? h('p', { class: 'card-note error', text: a._err }) : null,
    h('p', { class: 'card-note', text: a.note || 'Before tax and shipping. You check out yourself.' }));
}

function connectCard(a, ctx) {
  const accounts = a.accounts || [];
  const run = async () => {
    a._state = 'busy'; a._note = ''; ctx.changed();
    try {
      const r = await connectFlow(a.connector_id);
      a._state = 'done'; a._note = `${r.name || a.name} connected${r.account?.label ? ` · ${r.account.label}` : ''}`;
      toast(a._note);
      ctx.refresh?.();
    } catch (e) {
      a._state = undefined; a._note = e.message === 'canceled' ? '' : e.message;
    }
    ctx.changed();
  };
  return h('article', { class: 'card' },
    h('div', { class: 'card-head' }, appBadge(a.name),
      h('div', {}, h('div', { class: 'card-kicker', text: a.name || 'Connect' }), h('div', { class: 'card-title', text: a.title || `Connect ${a.name}` }))),
    a.subtitle ? h('p', { class: 'card-sub', text: a.subtitle }) : null,
    accounts.length ? h('div', { class: 'chips' }, accounts.map(x => h('span', { class: 'chip' }, icon('check'), x.label))) : null,
    a._state === 'done'
      ? h('p', { class: 'done-line' }, icon('check'), a._note || 'Connected')
      : h('button', { class: 'btn wide', type: 'button', onclick: run, disabled: a._state === 'busy', 'aria-busy': a._state === 'busy' ? 'true' : null },
        a._state === 'busy' ? 'Waiting for sign-in…' : (accounts.length ? 'Add account' : 'Connect'), a._state === 'busy' ? null : icon('link')),
    a._note && a._state !== 'done' ? h('p', { class: 'card-note error', text: a._note }) : null,
    a._state === 'busy' ? h('p', { class: 'card-note', text: 'Finish in the window that opened. Ask again here once you are connected.' }) : null);
}

function disconnectCard(a, ctx) {
  const run = async () => {
    if (!await confirmDialog(`Disconnect ${a.label || a.subtitle || 'this account'}?`, 'Attention will no longer read or act in this account. You can connect it again any time.', 'Disconnect', true)) return;
    a._state = 'busy'; ctx.changed();
    try {
      await request(`/connectors/${encodeURIComponent(a.connector_id)}/disconnect`, { method: 'POST', body: a.account_id ? { account_id: a.account_id } : {} });
      a._state = 'done'; a._note = `Disconnected ${a.label || ''}`.trim();
      ctx.refresh?.();
    } catch (e) { a._state = undefined; a._note = e.message; }
    ctx.changed();
  };
  return h('article', { class: 'card' },
    h('div', { class: 'card-head' }, appBadge(a.subtitle || a.label),
      h('div', {}, h('div', { class: 'card-kicker', text: a.subtitle || '' }), h('div', { class: 'card-title', text: a.title || `Disconnect ${a.label}` }))),
    a._state === 'done'
      ? h('p', { class: 'done-line' }, icon('check'), a._note)
      : h('button', { class: 'btn ghost danger-text wide', type: 'button', onclick: run, disabled: a._state === 'busy' }, a._state === 'busy' ? 'Disconnecting…' : 'Disconnect'),
    a._note && a._state !== 'done' ? h('p', { class: 'card-note error', text: a._note }) : null);
}

const IPHONE_TARGETS = { record: 'Recording', voice_setup: 'Voice setup', second_you_train: 'Training your Second You', second_you_quiz: 'The “Is this you?” quiz' };

function openCard(a, ctx) {
  const go = () => {
    const t = a.target;
    if (IPHONE_TARGETS[t]) return iphoneOnly(IPHONE_TARGETS[t]);
    ctx.navigate(t);
  };
  return h('article', { class: 'card compact' },
    h('button', { class: 'btn ghost wide', type: 'button', onclick: go }, a.title || 'Open', icon('chev')));
}

function planCard(a) {
  const name = a.plan ? `Attention ${a.plan[0].toUpperCase()}${a.plan.slice(1)}` : 'Attention';
  return h('article', { class: 'card' },
    h('div', { class: 'card-head' }, h('img', { class: 'app-badge logo', src: '/assets/logo.png', alt: '' }),
      h('div', {}, h('div', { class: 'card-kicker', text: name }), h('div', { class: 'card-title', text: a.title || `Upgrade to ${name}` }))),
    h('p', { class: 'card-sub', text: 'Subscriptions are handled by the App Store. Subscribe in the Attention iPhone app — your plan applies here automatically.' }),
    h('a', { class: 'btn wide', href: CONFIG.testflight, target: '_blank', rel: 'noopener noreferrer' }, 'Subscribe in the iOS app', icon('ext')));
}
