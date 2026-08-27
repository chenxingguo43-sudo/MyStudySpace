const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const reader = read('reader.html');
const vocabulary = read('vocabulary.html');
const server = read('server.js');

test('root entry sends learners directly to the Reader', () => {
  assert.match(server, /req\.url === '\/' \? '\/reader\.html'/);
  assert.match(index, /location\.replace\('reader\.html'\)/);
  assert.match(index, /href="reader\.html"/);
  assert.doesNotMatch(index, /<iframe\b/i);
});

test('GitHub exposes a single Reader surface without APP navigation', () => {
  assert.doesNotMatch(reader, /reader-page-switcher|slim-page-switcher|openVocabulary|app-home|profile\.html|AppShell|app-shell/);
  assert.doesNotMatch(vocabulary, /slim-page-switcher|AppShell|app-shell|app-home|profile\.html/);
  assert.match(reader, /Reader 工具/);
  assert.match(reader, /function renderQuizChapter/);
  assert.match(reader, /function selectQuizOption/);
  assert.match(reader, /function submitQuizQuestion/);
});

test('vocabulary remains an internal Reader study tool with local saved records', () => {
  assert.match(vocabulary, /VOCAB_CUSTOM_BG_KEY = 'vocabulary-custom-bgs-v1'/);
  assert.match(vocabulary, /localStorage/);
});
