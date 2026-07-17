const test = require('node:test');
const assert = require('node:assert/strict');
const { createRussianDictionaryLookup } = require('../../server/russian-dictionary');

test('returns a source-labelled Wiktionary extract without inventing Chinese', async () => {
  const lookup = createRussianDictionaryLookup({
    fetchImpl: async () => ({ ok: true, json: async () => ({ query: { pages: { 1: { title: 'тех', extract: 'Форма местоимения тот.' } } } }) })
  });
  const result = await lookup('тех');
  assert.equal(result.found, true);
  assert.equal(result.provider, 'Russian Wiktionary');
  assert.equal(result.meaningRu, 'Форма местоимения тот.');
  assert.equal(result.meaningZh, '');
  assert.match(result.sourceUrl, /wiktionary/);
});

test('rejects invalid terms before making a network request', async () => {
  let called = false;
  const lookup = createRussianDictionaryLookup({ fetchImpl: async () => { called = true; } });
  await assert.rejects(() => lookup('../secret'), /Invalid Russian dictionary term/);
  assert.equal(called, false);
});

test('returns a labelled miss when Wiktionary has no page extract', async () => {
  const lookup = createRussianDictionaryLookup({
    fetchImpl: async () => ({ ok: true, json: async () => ({ query: { pages: { '-1': { missing: true } } } }) })
  });
  const result = await lookup('несуществующее');
  assert.equal(result.found, false);
  assert.equal(result.meaningRu, '');
});
