import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage ??= { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { validDeal, tapPoint, openPage } = await import('../dist/web/browser.js');
const { setTransport, session } = await import('../dist/web/api.js');

const deal = { type: 'deal', title: 'Sony WH-1000XM5', store: 'Tech For Less', price: 231.49, was: 279.99, save: 48.5, web_url: 'https://www.amazon.com/dp/B09XS7JWHH' };

test('a deal card needs an https link, a price and a store', () => {
  assert.equal(validDeal(deal), true);
  assert.equal(validDeal({ ...deal, web_url: 'http://x.example/' }), false);
  assert.equal(validDeal({ ...deal, web_url: 'javascript:alert(1)' }), false);
  assert.equal(validDeal({ ...deal, price: '231' }), false);
  assert.equal(validDeal({ ...deal, store: '' }), false);
});

test('a click on the frame maps to viewport fractions, clamped', () => {
  const r = { left: 10, top: 20, width: 200, height: 400 };
  assert.deepEqual(tapPoint({ clientX: 110, clientY: 220 }, r), { x: 0.5, y: 0.5 });
  assert.deepEqual(tapPoint({ clientX: -50, clientY: 900 }, r), { x: 0, y: 1 });
});

test('opening a deal page posts only the url; refusals become plain messages', async () => {
  session.set('atk_test');
  const seen = [];
  const reply = status => async (url, init) => { seen.push([url, init.method, init.body]); return new Response(JSON.stringify(status === 200 ? { active: true } : { error: 'x' }), { status }); };
  setTransport(reply(200));
  assert.equal(await openPage(deal.web_url), null);
  assert.match(seen[0][0], /\/browser\/open$/);
  assert.equal(seen[0][1], 'POST');
  assert.deepEqual(JSON.parse(seen[0][2]), { url: deal.web_url });
  setTransport(reply(409)); assert.match(await openPage(deal.web_url), /busy/);
  setTransport(reply(403)); assert.match(await openPage(deal.web_url), /card/);
});
