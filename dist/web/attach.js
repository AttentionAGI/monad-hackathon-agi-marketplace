// Chat attachments: photos and files sent with a message as A2A file parts {kind:'file', file:{name, mimeType, bytes}}.
// Same rules as the server (attachments.py): at most 4 per message, 10 MB each after downscaling; photos are re-encoded
// as JPEG at most 2000 px on the long edge (that also drops their location metadata); GIFs are sent as they are;
// PDFs and text files (.txt .md .csv .json) as they are. The server checks everything again.
export const MAX_FILES = 4;
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_EDGE = 2000;
export const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif,application/pdf,.pdf,text/plain,.txt,text/markdown,.md,text/csv,.csv,application/json,.json';
export const ATTACH_ERRORS = new Set(['bad_attachment', 'unsupported_attachment', 'attachment_too_large', 'too_many_attachments']);

const TEXT_EXT = { txt: 'text/plain', md: 'text/markdown', markdown: 'text/markdown', csv: 'text/csv', json: 'application/json' };
const TEXT_MIME = new Set(Object.values(TEXT_EXT));
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']);
const ext = name => (String(name || '').match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();

/** A File-like {name, type, size} -> {kind: 'image'|'pdf'|'text', mime} or {error}. */
export function classify(file) {
  const type = String(file?.type || '').toLowerCase().split(';')[0].trim();
  const e = ext(file?.name);
  if (IMAGE_MIME.has(type) || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(e)) {
    const mime = IMAGE_MIME.has(type) ? type : ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', heif: 'image/heic' }[e] || `image/${e}`);
    return { kind: 'image', mime };
  }
  if (type === 'application/pdf' || e === 'pdf') return { kind: 'pdf', mime: 'application/pdf' };
  if (TEXT_MIME.has(type) || TEXT_EXT[e]) return { kind: 'text', mime: TEXT_MIME.has(type) ? type : TEXT_EXT[e] };
  return { error: `${file?.name || 'That file'} can't be attached. You can attach photos, PDFs and text files (.txt, .md, .csv, .json).` };
}

/** How many of `adding` fit next to `pending` -> {take, error?}. */
export function fit(pendingCount, addingCount) {
  const room = Math.max(0, MAX_FILES - pendingCount);
  return addingCount > room ? { take: room, error: `You can attach up to ${MAX_FILES} files to one message.` } : { take: addingCount };
}

export function scaleTo(w, h, max = MAX_EDGE) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

export function toBase64(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (typeof Buffer !== 'undefined') return Buffer.from(b).toString('base64');
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}

export const sizeLabel = n => (n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** A2A parts for one message: the text (if any), then each attachment as a file part. */
export function buildParts(text, atts) {
  const parts = text ? [{ kind: 'text', text }] : [];
  for (const a of atts || []) parts.push({ kind: 'file', file: { name: a.name, mimeType: a.mime, bytes: a.bytes } });
  return parts;
}

/** What the sent bubble keeps (localStorage): names, kinds and a small thumbnail - never the file itself. */
export const shown = atts => (atts || []).map(a => ({ name: a.name, kind: a.kind, mime: a.mime, size: a.size, thumb: a.thumb || null }));

// ---------- browser only ----------
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

function canvasOf(src, max) {
  const { w, h } = scaleTo(src.width || src.naturalWidth, src.height || src.naturalHeight, max);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);             // transparent PNG / WebP -> white, not black, as JPEG
  g.drawImage(src, 0, 0, w, h);
  return c;
}
const jpegBlob = (c, q) => new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q));

/** A picked File -> a pending attachment {id, name, kind, mime, size, bytes, thumb}. Throws Error(message) to show. */
export async function prepare(file) {
  const c = classify(file);
  if (c.error) throw new Error(c.error);
  const id = Math.random().toString(36).slice(2, 10);
  if (c.kind === 'image') {
    let src;
    try { src = await decode(file); } catch {
      throw new Error(c.mime === 'image/heic' ? "This browser can't read HEIC photos. Save it as JPEG and attach that." : `${file.name} couldn't be read as an image.`);
    }
    const thumb = canvasOf(src, 160).toDataURL('image/jpeg', 0.7);
    let blob, mime = 'image/jpeg', name = file.name.replace(/\.(heic|heif|png|webp|jpe?g)$/i, '') + '.jpg';
    if (c.mime === 'image/gif' && file.size <= MAX_BYTES) { blob = file; mime = 'image/gif'; name = file.name; }   // keep the animation
    else {
      const big = canvasOf(src, MAX_EDGE);
      for (const q of [0.85, 0.7, 0.5]) { blob = await jpegBlob(big, q); if (blob.size <= MAX_BYTES) break; }
    }
    src.close?.();
    if (blob.size > MAX_BYTES) throw new Error(`${file.name} is too large (max ${sizeLabel(MAX_BYTES)}).`);
    return { id, name, kind: 'image', mime, size: blob.size, bytes: toBase64(await blob.arrayBuffer()), thumb };
  }
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is too large (max ${sizeLabel(MAX_BYTES)}).`);
  return { id, name: file.name, kind: c.kind, mime: c.mime, size: file.size, bytes: toBase64(await file.arrayBuffer()), thumb: null };
}
