// Sign in with Apple (JS SDK, popup), Continue with Google (Google Identity Services), linking the other provider,
// the AI data-use consent, and connector sign-in popups.
import { request, session, ApiError } from './api.js';
import { CONFIG, h, icon, modal, googleMark } from './ui.js';

const APPLE_SDK = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
let sdk;
function loadAppleSDK() {
  if (window.AppleID?.auth) return Promise.resolve();
  sdk ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = APPLE_SDK; s.async = true;
    s.onload = () => (window.AppleID?.auth ? resolve() : reject(new Error('Sign in with Apple did not load')));
    s.onerror = () => { sdk = null; reject(new Error("Couldn't load Sign in with Apple. Check your connection.")); };
    document.head.append(s);
  });
  return sdk;
}
export const preloadApple = () => loadAppleSDK().catch(() => {});

const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

/** -> Apple's popup result {authorization:{id_token}, user?} or null when the user closed it. */
async function applePopup() {
  await loadAppleSDK();
  const state = rand();
  window.AppleID.auth.init({ clientId: CONFIG.appleClientId, scope: 'name email', redirectURI: CONFIG.appleRedirectURI, state, usePopup: true });
  let r;
  try { r = await window.AppleID.auth.signIn(); }
  catch (e) {
    if (e?.error === 'popup_closed_by_user' || e?.error === 'user_cancelled_authorize') return null;
    throw new Error(e?.error === 'popup_blocked_by_browser' ? 'Your browser blocked the Apple sign-in window. Allow pop-ups for attentionai.dev and try again.' : "Couldn't sign in with Apple.");
  }
  if (!r?.authorization?.id_token) throw new Error("Couldn't sign in with Apple.");
  if (r.authorization.state && r.authorization.state !== state) throw new Error('Sign-in response did not match. Try again.');
  return r;
}

/** -> {token, user_id, name} or null when the user closed the Apple popup. */
export async function signInWithApple() {
  const r = await applePopup();
  if (!r) return null;
  const idToken = r.authorization.id_token;
  const n = r.user?.name;
  const body = { identity_token: idToken };
  if (n && (n.firstName || n.lastName)) body.full_name = { givenName: n.firstName || '', familyName: n.lastName || '' };
  if (r.user?.email) body.email = r.user.email;
  const res = await request('/auth/apple', { method: 'POST', auth: false, body });
  if (!res?.token) throw new Error("Couldn't sign in.");
  session.set(res.token);
  return res;
}

// ---------- Continue with Google (Google Identity Services: ID token by popup; openid email profile only) ----------
const GIS_SDK = 'https://accounts.google.com/gsi/client';
let gsdk;
function loadGoogleSDK() {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsdk ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SDK; s.async = true;
    s.onload = () => (window.google?.accounts?.id ? resolve() : reject(new Error('Google sign-in did not load')));
    s.onerror = () => { gsdk = null; reject(new Error("Couldn't load Google sign-in. Check your connection.")); };
    document.head.append(s);
  });
  return gsdk;
}

/** Google's button only works on the origins registered for the web client. */
export const googleAvailable = (origin = location.origin) => CONFIG.googleOrigins.includes(origin);

let gisHandler = null, gisReady = false;
function initGIS() {
  if (gisReady) return;
  window.google.accounts.id.initialize({
    client_id: CONFIG.googleClientId, ux_mode: 'popup', auto_select: false, itp_support: true, context: 'signin',
    callback: r => gisHandler?.(r),
  });
  gisReady = true;
}

/** Stand-in shown while Google's script loads, and where Google sign-in can't run (local previews). */
export function googleButton(label = 'Continue with Google') {
  return h('button', { class: 'btn google', type: 'button' }, googleMark(), h('span', { text: label }));
}

/**
 * Puts Google's own "Continue with Google" button (rendered by GIS, per Google's branding) into `slot`, replacing the
 * stand-in. onIdToken(idToken) runs with the ID token after the user picks an account. -> false when Google sign-in
 * isn't available here (the stand-in stays). Only the most recently mounted button is live.
 */
export async function mountGoogleButton(slot, { onIdToken, onError = () => {} }) {
  if (!googleAvailable()) return false;
  try { await loadGoogleSDK(); } catch (e) { onError(e); return false; }
  if (!slot.isConnected) return false;
  initGIS();
  gisHandler = r => {
    if (r?.credential) onIdToken(r.credential);
    else onError(new Error("Couldn't sign in with Google."));
  };
  const host = h('div', { class: 'gsi-host' });
  const width = Math.round(Math.min(400, Math.max(200, slot.getBoundingClientRect().width || 320)));
  slot.replaceChildren(host);
  window.google.accounts.id.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'center', width });
  return true;
}

/** POST /auth/google {id_token} -> {token, user_id, name}; stores the session like Apple's. */
export async function signInWithGoogle(idToken) {
  const res = await request('/auth/google', { method: 'POST', auth: false, body: { id_token: idToken } });
  if (!res?.token) throw new Error("Couldn't sign in.");
  session.set(res.token);
  return res;
}

const LINK_ERRORS = {
  identity_in_use: p => `That ${p} account already has its own Attention account. Sign in with it there, or delete that account first.`,
  provider_already_linked: p => `A different ${p} account is already linked to this account.`,
  email_unverified: () => "That Google account's email isn't verified yet.",
  token_expired: () => 'That took too long. Try again.',
  invalid_token: p => `${p} sign-in couldn't be verified. Try again.`,
};
const PROVIDER_NAME = { apple: 'Apple', google: 'Google' };

/** POST /account/link {provider, id_token} -> the account's identities [{provider, email}]. */
export async function linkIdentity(provider, idToken) {
  try {
    const r = await request('/account/link', { method: 'POST', body: { provider, id_token: idToken } });
    if (!r?.ok) throw new Error("Couldn't link that account.");
    return r.identities || [];
  } catch (e) {
    const f = e instanceof ApiError && LINK_ERRORS[e.code];
    if (f) throw new Error(f(PROVIDER_NAME[provider] || provider));
    throw e;
  }
}

/** Account → Sign-in methods → Link Apple: Apple's popup, then POST /account/link. null when the popup was closed. */
export async function linkApple() {
  const r = await applePopup();
  return r ? linkIdentity('apple', r.authorization.id_token) : null;
}

export const CONSENT_VERSION = 3;     // 3: Second You learns and runs on the iPhone; its style data never leaves it

/** Same content as the iOS AIConsentView. Resolves true after POST /account/consent, false for "Not now". */
export async function askConsent() {
  const section = (title, iconName, items) => h('section', { class: 'consent-section' },
    h('h3', {}, icon(iconName), title),
    h('ul', {}, items.map(t => h('li', { text: t }))));
  for (;;) {
    const v = await modal({
      title: 'How Attention uses AI', className: 'consent', dismissable: false,
      body: [
        h('div', { class: 'consent-badge' }, icon('shield', 'icon big')),
        h('p', { class: 'muted', text: 'To answer you and get things done, Attention sends some of your data to the services below. Second You is different: it lives in the iPhone app and learns and runs on your iPhone. Please review this before you start.' }),
        section('What is sent', 'doc', ['Your messages to Attention, so it can answer them', 'Recordings you make, so they can be transcribed', 'Content from connected apps (like email or calendar) when you ask about it']),
        section('Second You stays on your iPhone', 'shield', ['Second You learns your style on your iPhone, from your own voice in recordings and from what you type to Attention in the iPhone app', 'It writes with Apple’s on-device model, not a cloud AI', 'Your style data (the lines it learns from, your style profile and examples) never leaves your iPhone and isn’t backed up to iCloud', 'Messages you send on the web are answered but not used to learn your style']),
        section('Who receives it', 'globe', ['Anthropic (Claude): to write Attention’s AI responses (not Second You’s)', 'ElevTalk: to transcribe recordings and tell speakers apart', 'Apple Push Notification service: to deliver your check-ins and alerts']),
        section('Why', 'spark', ['Only to provide Attention’s features to you: answers, transcripts, check-ins and tasks you approve']),
        section('What never happens', 'shield', ['Your data is not used for advertising', 'Your data is not sold']),
        h('p', {}, h('a', { class: 'text-link', href: '/privacy/', target: '_blank', rel: 'noopener' }, 'Read the Privacy Policy ', icon('ext'))),
        h('p', { class: 'small muted', text: 'You can delete your account and its data any time in Account → Delete account.' }),
      ],
      actions: [{ label: 'Agree and continue', value: 'agree' }, { label: 'Not now', value: 'later', kind: 'ghost' }],
    });
    if (v !== 'agree') return false;
    try { await request('/account/consent', { method: 'POST', body: { version: CONSENT_VERSION } }); return true; }
    catch (e) { if (e instanceof ApiError && e.status === 401) return false; await modal({ title: "Couldn't save that", body: h('p', { class: 'muted', text: e.message }), actions: [{ label: 'Try again', value: 1 }] }); }
  }
}

// ---------- connector sign-in (OAuth) in a popup ----------
// /oauth/callback/ (the relay) hands {type:"oauth", query} back by postMessage to the opener and, when a provider's
// Cross-Origin-Opener-Policy cut the opener link, by BroadcastChannel. Then POST /oauth/finish {code, state, ...}.
const PENDING_KEY = 'attention.oauth.pending';
const ALLOWED_ORIGINS = new Set([location.origin, 'https://attentionai.dev', 'https://www.attentionai.dev']);
let waiting = null;

function deliver(d) {
  if (!waiting || !d || d.type !== 'oauth' || typeof d.query !== 'string') return;
  const w = waiting; waiting = null;
  w.resolve(Object.fromEntries(new URLSearchParams(d.query)));
}
window.addEventListener('message', e => { if (ALLOWED_ORIGINS.has(e.origin)) deliver(e.data); });
try { const bc = new BroadcastChannel('attention-oauth'); bc.onmessage = e => deliver(e.data); } catch { /* old browser: postMessage only */ }

export function cancelOAuth() { if (waiting) { waiting.reject(new Error('canceled')); waiting = null; } }

/** -> the /oauth/finish result {ok, name, account:{label}, added}. Call from a click handler (opens a popup). */
export async function connectFlow(connectorId) {
  const popup = window.open('about:blank', 'attention-oauth', 'popup=yes,width=520,height=720');
  try { localStorage.setItem(PENDING_KEY, String(Date.now())); } catch { /* ignore */ }
  try {
    if (popup) popup.document.title = 'Connecting…';
    const r = await request(`/connectors/${encodeURIComponent(connectorId)}/connect`, { method: 'POST', body: {} });
    if (!r?.ok || !r.auth_url) throw new Error(r?.error || "Couldn't start sign-in.");
    const url = new URL(r.auth_url);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(url.hostname))) throw new Error('Unexpected sign-in address.');
    if (popup && !popup.closed) popup.location.replace(url.href);
    else if (!window.open(url.href, 'attention-oauth')) throw new Error('Your browser blocked the sign-in window. Allow pop-ups for attentionai.dev and try again.');
    cancelOAuth();
    const q = await new Promise((resolve, reject) => {
      waiting = { resolve, reject };
      setTimeout(() => { if (waiting?.resolve === resolve) { waiting = null; reject(new Error('Sign-in timed out. Try again.')); } }, 10 * 60 * 1000);
    });
    const body = {};
    for (const k of ['code', 'state', 'error', 'error_description', 'scope']) if (q[k]) body[k] = q[k];
    if (body.error && !body.code) throw new Error(body.error === 'access_denied' ? 'Sign-in was canceled.' : (body.error_description || body.error));
    const fin = await request('/oauth/finish', { method: 'POST', body });
    if (!fin?.ok) throw new Error(fin?.error || "Couldn't connect.");
    return fin;
  } catch (e) {
    try { popup?.close(); } catch { /* cross-origin */ }
    throw e;
  } finally {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
  }
}
