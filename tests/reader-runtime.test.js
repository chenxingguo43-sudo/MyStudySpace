'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ReaderRuntime = require('../js/reader-runtime');

function response(body, ok = true) {
  return { ok, json: async function () { return body; } };
}

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)) };
}

test('runtime detection supports GitHub Pages, local files, and the local server', () => {
  assert.deepEqual(ReaderRuntime.RUNTIMES, ['web-server', 'static-web']);
  assert.equal(ReaderRuntime.getRuntime({ runtime: 'static-web' }), 'static-web');
  assert.equal(ReaderRuntime.getRuntime({ location: { protocol: 'file:' } }), 'static-web');
  assert.equal(ReaderRuntime.getRuntime({ location: { protocol: 'https:', hostname: 'chenxingguo43-sudo.github.io' } }), 'static-web');
  assert.equal(ReaderRuntime.getRuntime({ location: { protocol: 'http:', hostname: 'localhost' } }), 'web-server');
});

test('static Reader loads textbook and novel catalogues without server APIs', async () => {
  const requests = [];
  const runtime = ReaderRuntime.createReaderRuntime({ runtime: 'static-web', fetch: async url => {
    requests.push(String(url));
    if (url === 'data/novel/index.json') return response({ books: [{ id: 'local', kind: 'novel' }] });
    if (url === 'data/textbook/index.json') return response({ books: [{ id: 'study', kind: 'textbook' }] });
    if (url === 'data/textbook/study/ch0000.json') return response({ id: 'chapter' });
    throw new Error(`unexpected request: ${url}`);
  }});
  const catalogue = await runtime.loadCatalogue();
  assert.deepEqual(catalogue.books.map(book => book.id), ['local', 'study']);
  await runtime.loadChapter(catalogue.books[1], 0);
  assert.equal(requests.some(url => url.startsWith('/api/')), false);
});

test('Reader vocabulary records remain local and use stable keys', () => {
  const storage = memoryStorage();
  const runtime = ReaderRuntime.createReaderRuntime({ runtime: 'static-web', storage });
  runtime.saveVocabulary('слово', { word: 'слово', meaning: '词', source: 'reader' });
  assert.equal(runtime.readVocabularyRecords().слово.meaning, '词');
  assert.ok(storage.getItem('vocabulary-review-records'));
});

test('Reader and Vocabulary use the Reader runtime adapter', () => {
  const root = path.resolve(__dirname, '..');
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const vocabulary = fs.readFileSync(path.join(root, 'vocabulary.html'), 'utf8');
  assert.match(reader, /ReaderRuntime\.createReaderRuntime/);
  assert.match(reader, /readerRuntime\.loadCatalogue\(\)/);
  assert.match(reader, /readerRuntime\.loadChapter\(book, idx\)/);
  assert.match(vocabulary, /ReaderRuntime\.createReaderRuntime/);
  assert.match(vocabulary, /readerRuntime\.loadVocabularyExtras\(\)/);
  assert.doesNotMatch(reader, /AppShell|app-shell|app-runtime|app-home|profile\.html|Capacitor/);
  assert.doesNotMatch(vocabulary, /AppShell|app-shell|app-runtime|app-home|profile\.html|Capacitor/);
});
