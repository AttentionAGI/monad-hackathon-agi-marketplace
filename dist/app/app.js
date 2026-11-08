const icons={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',box:'<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M8 5l9 5"/>',chat:'<path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/><path d="M7 8h9M7 12h6"/>',storage:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',device:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 6h6M11 18h2"/>',search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',bell:'<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4zM10 20h4"/>',external:'<path d="M14 3h7v7M21 3 11 13M10 3H4v17h17v-6"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 3 3 3-2v-3l4-2-1-4-3-1-1-4z"/>'};
const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.grid}</svg>`;
const agents=[{id:'notetaker',name:'Notetaker',maker:'AttentionAGI',category:'Productivity',description:'Be in the moment. Let your notes take themselves.',price:'Free',rating:'4.9',color:'#ebebeb',ink:'#858585',type:0,label:'LESS TYPING. MORE LIVING.'},{id:'thinker',name:'Thinker',maker:'AttentionAGI',category:'Everyday',description:'A little perspective for your next big idea.',price:'Free',rating:'4.9',color:'#ebebeb',ink:'#8f8f8f',type:1,label:'MAKE ROOM FOR IDEAS.'},{id:'lingo',name:'Lingo',maker:'Lingua Labs',category:'Learning',description:'Find your words. In any language.',price:'$3 / mo',rating:'4.8',color:'#ededed',ink:'#999999',type:2,label:'THE WORLD, IN YOUR WORDS.'},{id:'focus',name:'Focus',maker:'Mindful',category:'Wellness',description:'A quieter mind, one conversation at a time.',price:'Free',rating:'4.9',color:'#ebebeb',ink:'#959595',type:3,label:'A MOMENT FOR YOURSELF.'},{id:'muse',name:'Muse',maker:'Studio North',category:'Creativity',description:'Turn passing thoughts into something good.',price:'$4 / mo',rating:'4.8',color:'#e8e8e8',ink:'#929292',type:4,label:'FOLLOW YOUR CURIOSITY.'},{id:'compass',name:'Compass',maker:'AttentionAGI',category:'Everyday',description:'A helpful nudge for wherever life takes you.',price:'Free',rating:'4.7',color:'#e9e9e9',ink:'#959595',type:5,label:'FIND YOUR NEXT STEP.'},{logo:'muse.svg',id:'meta-muse',name:'Meta Muse',maker:'Meta',category:'Creativity',description:'A space for creative prompts and fresh perspectives.',price:'Preview',rating:null,color:'#e8e8e8',ink:'#868686',type:4,label:'A NEW CREATIVE PERSPECTIVE.',preview:true,aliases:'meta muse'},
{logo:'codex.svg',id:'codex',name:'Codex',maker:'OpenAI',category:'Coding',description:'An option for coding tasks, explanations, and ideas.',price:'Preview',rating:null,color:'#ebebeb',ink:'#848484',type:0,label:'FROM THOUGHT TO CODE.',preview:true},
{logo:'cursor.svg',id:'cursor',name:'Cursor',maker:'Cursor',category:'Coding',description:'An option for working through your next coding project.',price:'Preview',rating:null,color:'#e7e7e7',ink:'#7e7e7e',type:5,label:'MAKE YOUR NEXT MOVE.',preview:true},
{logo:'grok.svg',id:'grok-bot',name:'Grok Bot',maker:'xAI',category:'Everyday',description:'An option for curious questions and everyday exploration.',price:'Preview',rating:null,color:'#ebebeb',ink:'#909090',type:1,label:'STAY A LITTLE CURIOUS.',preview:true,aliases:'grock grok bot'}];
function art(a){if(a.logo)return `<img class="provider-logo" src="/assets/logos/${a.logo}" alt="${a.name} logo">`;let shapes=['<path d="M26 28h42v45H26z" fill="none" stroke-width="2"/><path d="M34 21h42v45H34" fill="none" stroke-width="2"/><path d="M34 39h25M34 47h25M34 55h15" fill="none" stroke-width="2"/>','<g fill="none" stroke-width="1.4"><ellipse cx="50" cy="50" rx="28" ry="12"/><ellipse cx="50" cy="50" rx="28" ry="12" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="28" ry="12" transform="rotate(120 50 50)"/><circle cx="50" cy="50" r="6"/></g>','<path d="M22 26h38v31H38L25 67V57h-3z" fill="none" stroke-width="1.5"/><path d="M44 42h34v30H65L53 80v-8h-9" fill="none" stroke-width="1.5"/><text x="31" y="48" stroke="none" font-size="19" font-family="serif">a</text><text x="54" y="65" stroke="none" font-size="16" font-family="serif">あ</text>','<g fill="none" stroke-width="1.2"><ellipse cx="50" cy="51" rx="30" ry="10"/><ellipse cx="50" cy="46" rx="24" ry="10"/><ellipse cx="50" cy="40" rx="17" ry="10"/><ellipse cx="50" cy="33" rx="10" ry="8"/><path d="M20 52v10c0 15 60 15 60 0V52"/></g>','<g fill="none" stroke-width="1.3"><path d="m50 17 8 20 21-8-8 21 17 9-22 7 2 20-18-13-17 13 1-22-23-5 20-11-8-20 21 8z"/><path d="m50 33 4 12 14-2-10 10 7 13-15-7-12 8 4-16-10-7 14 1z"/></g>','<g fill="none" stroke-width="1.4"><circle cx="50" cy="50" r="29"/><circle cx="50" cy="50" r="23"/><path d="m59 32-5 22-22 14 12-23z"/><path d="M50 17v7M50 76v7M17 50h7M76 50h7"/></g>'];return `<svg class="art" viewBox="0 0 100 100" stroke="${a.ink}" fill="${a.ink}" aria-hidden="true">${shapes[a.type]}</svg>`}
const conversations=[{title:'A better start to the week',agent:'Notetaker',date:'Today, 9:41 AM',duration:'12 min',summary:'A quiet planning session for the week ahead. Three priorities: finish the prototype, make time for a walk, and reconnect with the team.',transcript:'Let’s keep this week simple. The prototype is the first priority. I also want to protect a little time to get outside each day. Can you turn that into a short plan?'},{title:'That idea on the walk home',agent:'Thinker',date:'Yesterday, 5:23 PM',duration:'8 min',summary:'Explored an idea for a neighborhood book exchange. Start with one shelf, invite a few neighbors, and see what gets shared.',transcript:'What if we made a tiny book exchange for our building? Something that starts small, but gives people a reason to connect.'},{title:'Design sync & next steps',agent:'Notetaker',date:'Oct 11, 2:30 PM',duration:'24 min',summary:'Reviewed the device interaction. Keep the listening state visible, make agent switching quick, and prioritize readable type on the small screen.',transcript:'The screen should tell you at a glance what is happening. We need a clear listening indicator, and a simple way to move between agents.'}];
// ---- AttentionAGI web: the iOS app's layout. Tabs Home · Chat · Artifacts; the logo (top right) opens everything else. ----
Object.assign(icons, {
  cloud: '<path d="M7 18a4 4 0 0 1-.7-7.94A6 6 0 0 1 18 9a4.5 4.5 0 0 1 .5 9z"/>',
  download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'
});
let persisted = {}; try { persisted = JSON.parse(localStorage.getItem('pocket-workspace') || '{}') } catch {}
let state = {
  tab: ['home', 'chat', 'artifacts'].includes(persisted.tab) ? persisted.tab : 'home',
  category: 'All agents', search: '', sort: 'popular', thread: 0,
  open: { device: false, market: true, recordings: false, ...(persisted.open || {}) },
  installed: (Array.isArray(persisted.installed) ? persisted.installed : ['notetaker', 'thinker']).filter((v, i, a) => agents.some(x => x.id === v) && a.indexOf(v) === i),
  drafts: Array.isArray(persisted.drafts) ? persisted.drafts.slice(-20) : [],
  storage: persisted.storage || 'AttentionAGI Cloud', retention: persisted.retention || '90 days', sync: persisted.sync ?? true, firmware: persisted.firmware || '1.4.2'
};
const save = () => { try { localStorage.setItem('pocket-workspace', JSON.stringify(state)) } catch { toast('Browser storage is unavailable. Changes last for this session.') } };
let deviceSide = 'angle';
const orbit = s => s === 'front' ? '0deg 90deg auto' : s === 'back' ? '180deg 90deg auto' : '-30deg 70deg auto';

function section(key, title, detail, body) {
  const open = !!state.open[key];
  return `<section class="glass section" data-open="${open}"><button class="section-head" data-toggle="${key}" aria-expanded="${open}">
    <h2>${title}</h2><span class="detail">${detail}</span><span class="chev" aria-hidden="true">⌄</span></button>
    <div class="section-body">${open ? body : ''}</div></section>`;
}

// ---------- Home ----------
const deviceView = () => `<div class="device-grid"><div><div class="model-stage" data-viewer-state="loading">
  <model-viewer src="/assets/attentionagi-device.glb" alt="Interactive 3D AttentionAGI device. Drag to rotate; scroll or pinch to zoom. Use arrow keys when focused."
    camera-controls disable-pan touch-action="pan-y" camera-orbit="${orbit(deviceSide)}" field-of-view="30deg" min-camera-orbit="auto 0deg 70%" max-camera-orbit="auto 180deg 180%"
    ${deviceSide === 'angle' ? 'auto-rotate auto-rotate-delay="2500" rotation-per-second="18deg"' : ''} environment-image="neutral" exposure="1.15" shadow-intensity="0.6" interaction-prompt="none" loading="eager" tabindex="0"></model-viewer>
  <img class="model-fallback" src="/assets/device-${deviceSide === 'back' ? 'back' : 'front'}.png" alt="AttentionAGI device ${deviceSide === 'back' ? 'back' : 'front'}">
  <span class="model-status" role="status">Loading 3D device…</span></div>
  <div class="segmented" role="group" aria-label="Device view">${[['front', 'Front'], ['back', 'Back'], ['angle', '3D']].map(([s, l]) => `<button data-side="${s}" aria-pressed="${deviceSide === s}">${l}</button>`).join('')}</div>
  <p class="hint">Drag to rotate · scroll or pinch to zoom</p></div>
  <div class="device-copy"><span class="eyebrow">YOUR EVERYDAY COMPANION</span><h3>AttentionAGI device</h3><p>Hold it close, talk, and the agent you picked gets it done.</p>
  <div class="facts"><div class="fact"><b>82%</b><span>Battery · demo</span></div><div class="fact"><b>BLE</b><span>Connected · demo</span></div>
  <div class="fact"><b>${state.firmware}</b><span>AttentionOS</span></div><div class="fact"><b>${state.installed.length}</b><span>Agents on it</span></div></div>
  <div class="device-actions"><button class="btn" data-action="pair">${icon('plus')}Connect a device</button><button class="btn ghost" data-action="update">${state.firmware === '1.5.0' ? 'Release notes' : 'Update to 1.5.0'}</button></div>
  <p class="note">Demo device: battery, BLE and firmware are sample data until hardware is connected.</p></div></div>`;

const marketBody = () => `<div class="toolbar"><label class="search">${icon('search')}<input id="search" placeholder="Find your next agent…" aria-label="Search agents" value="${escapeHTML(state.search)}"></label>
  <select id="sort" aria-label="Sort agents"><option value="popular">Most popular</option><option value="name">Name A–Z</option><option value="free">Free first</option></select></div>
  <div class="chips">${['All agents', 'Productivity', 'Everyday', 'Coding', 'Learning', 'Wellness', 'Creativity'].map(c => `<button class="chip" data-category="${c}" aria-pressed="${state.category === c}">${c}</button>`).join('')}</div>
  <div class="agent-grid" id="agent-grid"></div><p class="note">Provider options (Meta Muse, Codex, Cursor, Grok) are catalog previews, not live integrations.</p>`;

function card(a) {
  const added = state.installed.includes(a.id);
  return `<button class="agent-card" data-agent="${a.id}" aria-label="View ${a.name}"><div class="agent-art">${art(a)}</div><div class="agent-info">
    <div class="agent-title"><h3>${a.name}</h3><span class="rating">${a.preview ? 'Preview' : '★ ' + a.rating}</span></div>
    <div class="maker">${a.preview ? 'Catalog option · ' : 'by '}${a.maker}</div><p>${a.description}</p>
    <div class="card-foot"><span>${a.category}</span><span class="price ${added ? 'added' : ''}">${added ? 'Added ✓' : a.price}</span></div></div></button>`;
}

const recordingsBody = () => `<div class="rows">${conversations.map((c, i) => `<button class="row" data-open-thread="${i}"><span class="tile">${i === 1 ? '✺' : '▤'}</span>
  <div><strong>${c.title}</strong><small>${c.agent} · ${c.date}</small></div><span class="end">${c.duration} ›</span></button>`).join('')}</div>
  <p class="note">Sample conversations. Real recordings appear once a device and backend are connected.</p>`;

const home = () => `<div class="lede"><h1>Your agents, within reach.</h1><p>A pocket device for talking to AI agents, and one place to pick them, revisit conversations and manage the device.</p></div>
  ${section('device', 'AttentionAGI Device', 'Demo device', deviceView())}
  ${section('market', 'Agent marketplace', `${agents.length} agents`, marketBody())}
  ${section('recordings', 'Recordings', `${conversations.length} conversations`, recordingsBody())}`;

// ---------- Chat ----------
function chat() {
  const c = conversations[state.thread] || conversations[0];
  return `<div class="lede"><h1>Chat</h1><p>Pick up any conversation where you left off.</p></div>
  <div class="chat"><div class="threads">${conversations.map((x, i) => `<button class="row" data-thread="${i}" aria-current="${i === state.thread}"><span class="tile">${i === 1 ? '✺' : '▤'}</span>
    <div><strong>${x.title}</strong><small>${x.agent} · ${x.date}</small></div></button>`).join('')}</div>
  <div class="glass thread"><div class="thread-head"><h3>${c.title}</h3><span class="muted">${c.agent} · ${c.duration} · sample</span></div>
    <div class="bubble me">${c.transcript}</div>
    <div class="bubble agent"><div class="route">${icon('cloud')} ${c.agent}</div>${c.summary}</div>
    <button class="btn ghost" style="align-self:flex-start" data-export="${state.thread}">${icon('download')}Export conversation</button>
    <form class="composer" id="composer"><input name="msg" placeholder="Message ${c.agent}…" aria-label="Message" autocomplete="off"><button class="send" aria-label="Send">↑</button></form>
  </div></div>`;
}

// ---------- Artifacts ----------
function artifacts() {
  const mine = agents.filter(a => state.installed.includes(a.id));
  return `<div class="lede"><h1>Artifacts</h1><p>What you've collected and made: your agents, agent drafts, and conversation exports.</p></div>
  <section class="glass section" data-open="true"><div class="section-head"><h2>Your agents</h2><span class="detail">${mine.length}</span></div><div class="section-body"><div class="rows">
    ${mine.length ? mine.map(a => `<button class="row" data-agent="${a.id}"><span class="tile">${a.logo ? art(a) : ['▤', '✺', 'あ', '◎', '✳', '◇'][a.type]}</span><div><strong>${a.name}</strong><small>${a.preview ? 'Catalog preview' : 'by ' + a.maker} · ${a.category}</small></div><span class="end">›</span></button>`).join('')
      : '<div class="empty">No agents yet. Add one from the marketplace on Home.</div>'}</div></div></section>
  <section class="glass section" data-open="true"><div class="section-head"><h2>Agent drafts</h2><button class="btn ghost" style="margin-left:auto;min-height:34px" data-action="build">${icon('plus')}Build an agent</button></div><div class="section-body"><div class="rows">
    ${state.drafts.length ? state.drafts.map((d, i) => `<button class="row" data-draft="${i}"><span class="tile">✧</span><div><strong>${escapeHTML(d.name)}</strong><small>${escapeHTML(d.description)}</small></div><span class="end">${icon('download')}</span></button>`).reverse().join('')
      : '<div class="empty">No drafts yet. Build an agent to download a starter spec.</div>'}</div></div></section>
  <section class="glass section" data-open="true"><div class="section-head"><h2>Conversation exports</h2><span class="detail">text files</span></div><div class="section-body"><div class="rows">
    ${conversations.map((c, i) => `<button class="row" data-export="${i}"><span class="tile">${icon('download')}</span><div><strong>${c.title}</strong><small>${c.agent} · ${c.date}</small></div><span class="end">.txt</span></button>`).join('')}</div></div></section>`;
}

// ---------- shell ----------
function render() {
  const tabs = [['home', 'Home'], ['chat', 'Chat'], ['artifacts', 'Artifacts']];
  document.getElementById('app').innerHTML = `<div class="sky" aria-hidden="true"></div>
  <header class="top"><nav role="tablist" aria-label="Sections" style="display:contents">${tabs.map(([id, l]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${state.tab === id}">${l}</button>`).join('')}</nav>
    <button class="me" data-action="account" aria-label="Account and settings"><img src="/assets/logo.png" alt=""></button></header>
  <main class="page">${state.tab === 'chat' ? chat() : state.tab === 'artifacts' ? artifacts() : home()}</main>
  <footer><nav aria-label="Legal"><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Use</a><a href="/support/">Support</a></nav>A little technology. A more human day. · © 2026 Attention AI, Inc.</footer>`;
  if (state.tab === 'home' && state.open.market) {
    document.getElementById('sort').value = state.sort; renderCards();
    document.getElementById('search').addEventListener('input', e => { state.search = e.target.value; renderCards() });
    document.getElementById('sort').onchange = e => { state.sort = e.target.value; renderCards() };
  }
}
function renderCards() {
  let list = agents.filter(a => (state.category === 'All agents' || a.category === state.category) && (a.name + ' ' + a.description + ' ' + a.category + ' ' + (a.aliases || '') + ' ' + a.maker).toLowerCase().includes(state.search.toLowerCase()));
  if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === 'free') list.sort((a, b) => (a.price !== 'Free') - (b.price !== 'Free'));
  document.getElementById('agent-grid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">No agents found. Try another name or category.</div>';
}

function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
let toastTimer; function toast(m) { const el = document.getElementById('toast'); el.textContent = m; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500) }
function modal(content) { const d = document.getElementById('modal'); d.innerHTML = '<button class="modal-close" aria-label="Close dialog">×</button>' + content; d.querySelector('.modal-close').onclick = () => d.close(); if (!d.open) d.showModal() }
const closeModal = () => document.getElementById('modal').close();
function download(name, text, type) { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([text], { type })); l.download = name; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000) }

function agentModal(id) {
  const a = agents.find(a => a.id === id), added = state.installed.includes(id);
  modal(`<div class="modal-art">${art(a)}</div><div class="eyebrow">${a.category.toUpperCase()} · ${a.preview ? 'CATALOG PREVIEW' : '★ ' + a.rating}</div><h2>${a.name}</h2>
  <p>${a.description} ${a.preview ? '' : 'Built by ' + a.maker + ' for the moments that matter.'}</p>
  ${a.preview ? `<div class="box"><b>INTEGRATION PREVIEW</b>This catalog option is not connected to ${a.maker}. Account linking and live agent execution are not available in this prototype.</div>`
    : '<ul><li>Made for natural, voice-first conversations</li><li>Works with your storage preferences</li><li>Ready for your agent library</li></ul>'}
  <button class="btn wide" data-install="${id}">${added ? 'Remove from my agents' : a.preview ? 'Add to demo library' : a.price === 'Free' ? 'Add to my agents — Free' : 'Try in demo — ' + a.price}</button>
  <p class="note">Demo library only. No charge or device installation occurs.</p>`);
}
const acctRow = (action, ic, color, title, sub) => `<button class="acct-row" data-action="${action}"><span class="ico" style="background:${color}">${icon(ic)}</span><span>${title}<small>${sub}</small></span><span class="go">›</span></button>`;
function accountModal() {
  modal(`<div class="acct-head"><img src="/assets/logo.png" alt=""><div><h2 style="margin:0">Your workspace</h2><span class="muted">Saved in this browser</span></div></div>
  <div class="acct-group">${acctRow('device', 'device', '#8ca3fa', 'Device', 'Pair · AttentionOS ' + state.firmware)}${acctRow('storage', 'storage', '#f59ee8', 'Storage', state.storage + ' · ' + state.retention)}</div>
  <div class="acct-group">${acctRow('build', 'plus', '#54c7fa', 'Build an agent', 'Download a starter spec')}${acctRow('privacy', 'shield', '#f08c33', 'Privacy', 'What this prototype stores')}${acctRow('help', 'info', '#8e8e93', 'Help', 'Getting started')}</div>
  <div class="acct-group">${acctRow('reset', 'settings', '#454db3', 'Reset demo preferences', 'Clears this browser\'s library and settings')}</div>`);
}
function storageModal() {
  modal(`<div class="eyebrow">STORAGE</div><h2>Your thoughts. Your choice.</h2>
  <div class="setting"><div><h3>Storage destination</h3><p class="muted">Where your conversations live.</p></div><select id="storage" aria-label="Storage destination"><option>AttentionAGI Cloud</option><option>On-device only</option><option>Your own storage</option></select></div>
  <div class="setting"><div><h3>Keep conversations for</h3><p class="muted">Older ones are cleared automatically.</p></div><select id="retention" aria-label="Conversation retention"><option>30 days</option><option>90 days</option><option>1 year</option><option>Until I delete them</option></select></div>
  <div class="setting"><div><h3>Automatic sync</h3><p class="muted">When your device connects over BLE.</p></div><button class="switch ${state.sync ? '' : 'off'}" role="switch" aria-checked="${state.sync}" aria-label="Automatic sync" data-action="sync"><i></i></button></div>
  <p class="note">Preferences are saved locally. Cloud and personal storage aren't connected yet.</p>`);
  for (const k of ['storage', 'retention']) { const el = document.getElementById(k); el.value = state[k]; el.onchange = e => { state[k] = e.target.value; save(); toast('Preference saved') } }
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) { state.tab = t.dataset.tab; save(); render(); window.scrollTo(0, 0); return }
  const tg = e.target.closest('[data-toggle]'); if (tg) { const k = tg.dataset.toggle; state.open[k] = !state.open[k]; save(); render(); return }
  const side = e.target.closest('[data-side]');
  if (side) {
    deviceSide = side.dataset.side;
    document.querySelectorAll('model-viewer').forEach(v => { v.setAttribute('camera-orbit', orbit(deviceSide)); v.autoRotate = deviceSide === 'angle' });
    document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === deviceSide)));
    document.querySelectorAll('.model-fallback').forEach(img => { img.src = '/assets/device-' + (deviceSide === 'back' ? 'back' : 'front') + '.png' });
    return;
  }
  const c = e.target.closest('[data-category]'); if (c) { state.category = c.dataset.category; render(); return }
  const a = e.target.closest('[data-agent]'); if (a) { agentModal(a.dataset.agent); return }
  const inst = e.target.closest('[data-install]');
  if (inst) { const id = inst.dataset.install, had = state.installed.includes(id); state.installed = had ? state.installed.filter(x => x !== id) : [...state.installed, id]; save(); closeModal(); render(); toast(had ? 'Agent removed from your library' : 'Added to your agents.'); return }
  const ot = e.target.closest('[data-open-thread]'); if (ot) { state.thread = +ot.dataset.openThread; state.tab = 'chat'; save(); render(); window.scrollTo(0, 0); return }
  const th = e.target.closest('[data-thread]'); if (th) { state.thread = +th.dataset.thread; render(); return }
  const ex = e.target.closest('[data-export]');
  if (ex) { const c = conversations[+ex.dataset.export]; download(c.title.toLowerCase().replaceAll(' ', '-') + '.txt', `${c.title}\n${c.agent} · ${c.date}\n\nSUMMARY\n${c.summary}\n\nTRANSCRIPT\n${c.transcript}`, 'text/plain'); toast('Conversation exported'); return }
  const dr = e.target.closest('[data-draft]'); if (dr) { const d = state.drafts[+dr.dataset.draft]; download('attentionagi-agent-' + d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json', JSON.stringify(d, null, 2), 'application/json'); return }
  const action = e.target.closest('[data-action]')?.dataset.action; if (!action) return;
  if (action === 'account') accountModal();
  if (action === 'storage') storageModal();
  if (action === 'sync') { state.sync = !state.sync; save(); storageModal(); toast('Sync preference saved') }
  if (action === 'device') { closeModal(); state.tab = 'home'; state.open.device = true; save(); render(); document.querySelector('.model-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  if (action === 'update') modal(`<div class="eyebrow">ATTENTIONOS · RELEASE NOTES</div><h2>A smoother everyday.</h2><p>Version 1.5.0 brings thoughtful improvements.</p><ul><li>A clearer listening indicator</li><li>Faster switching between agents</li><li>Improved BLE reconnect behavior</li></ul><button class="btn wide" data-action="apply-update">${state.firmware === '1.5.0' ? 'Preview again' : 'Preview update'}</button><p class="note">This previews the update flow. No firmware is sent to hardware.</p>`);
  if (action === 'apply-update') { state.firmware = '1.5.0'; save(); closeModal(); render(); toast('Update preview complete. Demo device is on AttentionOS 1.5.0.') }
  if (action === 'pair') modal('<div class="eyebrow">CONNECT YOUR DEVICE</div><h2>Let’s get acquainted.</h2><p>On your AttentionAGI, open Settings → Connect and find your six-digit pairing code.</p><form id="pair-form"><label>Device pairing code<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required></label><button class="btn wide" type="submit">Check pairing code</button></form><p class="note">Hardware pairing is not connected in this prototype.</p>');
  if (action === 'build') modal('<div class="eyebrow">FOR THE BUILDERS</div><h2>A little idea. A new agent.</h2><p>Give it a name and a clear purpose to start.</p><form id="build-form"><label>Agent name<input name="name" maxlength="40" placeholder="e.g. Trail guide" required></label><label>What does it help with?<input name="purpose" maxlength="200" placeholder="A companion for the path less traveled" required></label><button class="btn wide" type="submit">Download agent draft</button></form><p class="note">Downloads a starter spec and keeps it in Artifacts. Publishing and runtime integration come next.</p>');
  if (action === 'help') modal('<div class="eyebrow">GETTING STARTED</div><h2>A little help, always close.</h2><ul><li>Find an agent in the marketplace on Home.</li><li>Add it to your agents.</li><li>Connect your device and hold it close to speak.</li><li>Pick up conversations in Chat.</li><li>Find your agents, drafts and exports in Artifacts.</li></ul><p>This prototype saves preferences in this browser. Device, AI runtime and cloud services are the next integration step.</p>');
  if (action === 'privacy') modal('<div class="eyebrow">YOUR DEVICE, YOUR CHOICE</div><h2>Room for private thoughts.</h2><p>This prototype stores only your library, drafts and settings in your browser. It does not access your microphone or upload conversations.</p>');
  if (action === 'reset') { try { localStorage.removeItem('pocket-workspace') } catch {} location.reload() }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'pair-form') toast('Code format checked. Connect the hardware API to finish pairing.');
  if (e.target.id === 'build-form') {
    const f = new FormData(e.target), spec = { name: String(f.get('name')), description: String(f.get('purpose')), version: '0.1.0', interface: 'voice', permissions: ['microphone'], status: 'draft' };
    state.drafts = [...state.drafts, spec].slice(-20); save();
    download('attentionagi-agent-draft.json', JSON.stringify(spec, null, 2), 'application/json');
    closeModal(); state.tab = 'artifacts'; render(); toast('Your agent draft is ready — it’s in Artifacts.');
  }
  if (e.target.id === 'composer') {
    const input = e.target.elements.msg, m = input.value.trim(); if (!m) return;
    input.value = '';
    toast('Live agents run in the Attention app and device. This web preview doesn’t send messages yet.');
  }
});
document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close() } });
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !document.getElementById('modal').open) { e.preventDefault(); document.getElementById('search')?.focus() } });
render();
