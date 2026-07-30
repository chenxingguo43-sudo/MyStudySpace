'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const AppRuntime = require('../js/app-runtime');

function response(body, ok = true) {
  return { ok, json: async function () { return body; } };
}

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('runtime detection honors explicit, Android marker, Capacitor, and file protocol', () => {
  assert.equal(AppRuntime.getRuntime({ runtime: 'static-web' }), 'static-web');
  assert.equal(AppRuntime.getRuntime({ document: { querySelector: () => ({ getAttribute: () => 'android' }) } }), 'android');
  assert.equal(AppRuntime.getRuntime({ document: { querySelector: () => null }, capacitor: { isNativePlatform: () => true } }), 'android');
  assert.equal(AppRuntime.getRuntime({ document: { querySelector: () => null }, capacitor: null, location: { protocol: 'file:' } }), 'static-web');
  assert.equal(AppRuntime.getRuntime({ document: { querySelector: () => null }, capacitor: null, location: { protocol: 'https:', hostname: 'chenxingguo43-sudo.github.io' } }), 'static-web');
  assert.equal(AppRuntime.getRuntime({ document: { querySelector: () => null }, capacitor: null, location: { protocol: 'https:' } }), 'web-server');
});

test('Android loads only textbooks and never requests a legacy Node API or novel path', async () => {
  const requests = [];
  const runtime = AppRuntime.createAppRuntime({
    runtime: 'android',
    storage: memoryStorage(),
    fetch: async function (url) {
      requests.push(String(url));
      if (url === 'data/textbook/index.json') return response({ books: [{ id: 'book', kind: 'textbook', dir: 'book' }] });
      if (url === 'data/textbook/book/ch0000.json') return response({ id: 'chapter' });
      throw new Error(`unexpected request: ${url}`);
    }
  });
  const catalogue = await runtime.loadCatalogue();
  assert.deepEqual(catalogue.books.map(book => book.id), ['book']);
  await runtime.loadChapter(catalogue.books[0], 0);
  await runtime.loadVocabularyExtras();
  await runtime.lookupDictionary('слово');
  await runtime.syncStudyStats({ reviewed: 1 });
  await runtime.syncVocabularyEntry({ word: 'слово' });
  await assert.rejects(runtime.loadChapter({ id: 'private', kind: 'novel' }, 0), /only permits textbook/);
  assert.deepEqual(requests, ['data/textbook/index.json', 'data/textbook/book/ch0000.json']);
  assert.equal(requests.some(url => url.includes('/api/') || url.includes('data/novel/')), false);
});

test('static web merges local catalogues but does not call Node APIs', async () => {
  const requests = [];
  const runtime = AppRuntime.createAppRuntime({
    runtime: 'static-web',
    fetch: async function (url) {
      requests.push(String(url));
      if (url === 'data/novel/index.json') return response({ books: [{ id: 'local', kind: 'novel' }] });
      if (url === 'data/textbook/index.json') return response({ books: [{ id: 'study', kind: 'textbook' }] });
      throw new Error(`unexpected request: ${url}`);
    }
  });
  const catalogue = await runtime.loadCatalogue();
  assert.deepEqual(catalogue.books.map(book => book.id), ['local', 'study']);
  assert.equal(requests.some(url => url.startsWith('/api/')), false);
});

test('web server keeps existing API integrations behind the adapter', async () => {
  const requests = [];
  const runtime = AppRuntime.createAppRuntime({
    runtime: 'web-server',
    fetch: async function (url) {
      requests.push(String(url));
      if (url === '/api/novel/index') return response({ books: [] });
      if (url === '/api/novel-vocab-list') return response([]);
      if (String(url).startsWith('/api/dictionary/lookup?')) return response({ found: false });
      if (url === '/api/vocab-sync' || url === '/api/novel-vocab') return response({ ok: true });
      throw new Error(`unexpected request: ${url}`);
    }
  });
  await runtime.loadCatalogue();
  await runtime.loadVocabularyExtras();
  await runtime.lookupDictionary('слово', { includeContext: true, context: 'Это слово.' });
  await runtime.syncStudyStats({ reviewed: 1 });
  await runtime.syncVocabularyEntry({ word: 'слово' });
  assert.equal(requests.length, 5);
  assert.equal(requests.every(url => url.startsWith('/api/')), true);
});

test('shared vocabulary storage is readable immediately without changing its key', () => {
  const storage = memoryStorage();
  const runtime = AppRuntime.createAppRuntime({ runtime: 'android', storage, fetch: async () => response({}) });
  runtime.saveVocabulary('слово', { word: 'слово', meaning: '词', source: 'reader' });
  assert.equal(runtime.readVocabularyRecords()['слово'].meaning, '词');
  assert.ok(storage.getItem('vocabulary-review-records'));
});

test('Reader and Vocabulary route legacy APIs through app-runtime', () => {
  const root = path.resolve(__dirname, '..');
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const vocabulary = fs.readFileSync(path.join(root, 'vocabulary.html'), 'utf8');
  for (const apiPath of AppRuntime.FORBIDDEN_ANDROID_API) {
    assert.equal(reader.includes(apiPath), false, apiPath);
    assert.equal(vocabulary.includes(apiPath), false, apiPath);
  }
  assert.match(reader, /appRuntime\.loadCatalogue\(\)/);
  assert.match(reader, /appRuntime\.loadChapter\(book, idx\)/);
  assert.match(vocabulary, /appRuntime\.loadVocabularyExtras\(\)/);
  assert.doesNotMatch(vocabulary, /window\.open\(url, ['"]_blank['"]\)/);
});
