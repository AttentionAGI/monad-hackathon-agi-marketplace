// Safe, small Markdown for model text: every character is escaped; only bold, italic, inline code, code blocks,
// lists, headings (as bold lines) and http(s)/mailto links are turned into markup. No raw HTML ever passes through.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TOKEN = new RegExp([
  '`([^`\\n]+)`',                                                        // 1 inline code
  '\\[([^\\]\\n]{1,300})\\]\\(((?:https?:\\/\\/|mailto:)[^\\s)]+)\\)',   // 2 text, 3 url
  '(https?:\\/\\/[^\\s<>"\'`]*[^\\s<>"\'`.,;:!?)\\]])',                // 4 bare url
  '\\*\\*([^*\\n]+)\\*\\*',                                              // 5 bold
  '__([^_\\n]+)__',                                                      // 6 bold
  '(?<![\\w*])\\*([^*\\s][^*\\n]*?)\\*(?![\\w*])',                       // 7 italic
].join('|'), 'g');

const link = (url, inner) => `<a class="lk" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}<span class="lk-arrow" aria-hidden="true">\u00a0↗</span></a>`;

export function inline(s) {
  let out = '', last = 0;
  for (const m of s.matchAll(TOKEN)) {
    out += esc(s.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] != null) out += `<code>${esc(m[1])}</code>`;
    else if (m[2] != null) out += link(m[3], inline(m[2]).replace(/<\/?a\b[^>]*>/g, ''));
    else if (m[4] != null) out += link(m[4], esc(m[4].replace(/^https?:\/\//, '').replace(/\/$/, '')));
    else if (m[5] != null || m[6] != null) out += `<strong>${inline(m[5] ?? m[6])}</strong>`;
    else if (m[7] != null) out += `<em>${inline(m[7])}</em>`;
  }
  return out + esc(s.slice(last));
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const NUMBER = /^\s*(\d{1,3})[.)]\s+(.*)$/;

/** Markdown -> safe HTML string. */
export function md(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}${list.start > 1 ? ` start="${list.start}"` : ''}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flushPara(); flushList();
      const code = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && RULE.test(lines[i + 1])) {   // a markdown table
      flushPara(); flushList();
      const head = cells(line), rows = [];
      for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) rows.push(cells(lines[i]).slice(0, head.length));
      i--;
      out.push(`<div class="mdt-wrap"><table class="mdt"><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
        `<tbody>${rows.map(r => `<tr>${head.map((_, k) => `<td>${inline(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) { flushPara(); flushList(); out.push(`<p><strong>${inline(h[1])}</strong></p>`); continue; }
    const b = line.match(BULLET), n = !b && line.match(NUMBER);
    if (b || n) {
      flushPara();
      const tag = b ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [], start: n ? Number(n[1]) : 1 }; }
      list.items.push(b ? b[1] : n[2]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('');
}

/** A long answer reads like a chat: one bubble per paragraph. A list stays with the line that introduces it (iOS rule). */
export function paragraphs(text) {
  const raw = String(text ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const part of raw) {
    const isList = /^([-*•]\s|\d+[.)]\s)/.test(part);
    const last = out[out.length - 1];
    if (last && /^```/.test(last) && !/```$/.test(last)) { out[out.length - 1] = `${last}\n\n${part}`; continue; }
    if (isList && last && (last.endsWith(':') || /\n[-*•] /.test(last) || /^[-*•] /.test(last) || /(^|\n)\d+[.)] /.test(last))) {
      out[out.length - 1] = `${last}\n${part}`;
      continue;
    }
    out.push(part);
  }
  return out;
}
