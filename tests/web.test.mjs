import test from 'node:test';
import assert from 'node:assert/strict';
import { md, inline, paragraphs, esc } from '../dist/web/md.js';
import { cleanWebUrl } from '../dist/web/ui.js';

test('model text is escaped; only safe markdown becomes markup', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  const html = md('Hi <script>alert(1)</script> **bold** and *it*\n\n- one\n- two\n\n[x](javascript:alert(1)) [ok](https://a.example/?q="1")');
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /href="javascript/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>it<\/em>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<a href="https:\/\/a\.example\/\?q=&quot;1&quot;" target="_blank" rel="noopener noreferrer">ok<\/a>/);
  assert.match(inline('see https://example.com/path.'), /<a href="https:\/\/example\.com\/path"[^>]*>example\.com\/path<\/a>\./);
  assert.match(md('```\n<b>x</b>\n```'), /<pre><code>&lt;b&gt;x&lt;\/b&gt;<\/code><\/pre>/);
  assert.match(inline('`<i>` <i>'), /<code>&lt;i&gt;<\/code> &lt;i&gt;/);
});

test('replies split into bubbles on blank lines; a list stays with its intro', () => {
  assert.deepEqual(paragraphs('One.\n\nTwo.\n\n\nThree.'), ['One.', 'Two.', 'Three.']);
  assert.deepEqual(paragraphs("Here's tomorrow:\n\n- a\n- b\n\nAnything else?"), ["Here's tomorrow:\n- a\n- b", 'Anything else?']);
  assert.deepEqual(paragraphs('```\ncode\n\nmore\n```\n\nafter'), ['```\ncode\n\nmore\n```', 'after']);
});

test('open_app web_url drops geocode placeholders and non-web schemes', () => {
  assert.equal(cleanWebUrl('https://www.ubereats.com/search?q=pad%20thai&pl={lat},{lng}'), 'https://www.ubereats.com/search?q=pad+thai');
  assert.equal(cleanWebUrl('https://m.uber.com/ul/?action=setPickup&dropoff[latitude]={lat}&dropoff[longitude]={lng}&dropoff[nickname]=Home'),
    'https://m.uber.com/ul/?action=setPickup&dropoff%5Bnickname%5D=Home');
  assert.equal(cleanWebUrl('https://www.doordash.com/search/store/pad%20thai/'), 'https://www.doordash.com/search/store/pad%20thai/');
  assert.equal(cleanWebUrl('javascript:alert(1)'), null);
  assert.equal(cleanWebUrl('uber://?action=setPickup'), null);
  assert.equal(cleanWebUrl(''), null);
});
