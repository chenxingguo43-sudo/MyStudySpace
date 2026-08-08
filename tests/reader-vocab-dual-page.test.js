const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const legacyIndex = read('legacy/index.html');
const reader = read('reader.html');
const vocabulary = read('vocabulary.html');
const appShellCss = read('css/app-shell.css');
const server = read('server.js');

test('root entry sends learners directly to the reader', () => {
  assert.match(server, /req\.url === '\/' \? '\/reader\.html'/);
  assert.match(index, /location\.replace\('reader\.html'\)/);
  assert.match(index, /href="reader\.html"/);
  assert.doesNotMatch(index, /<iframe\b/i);
  assert.match(legacyIndex, /id="pomodoro-frame"/);
});

test('reader and vocabulary expose direct same-tab navigation', () => {
  assert.match(reader, /class="reader-page-switcher reader-shell-nav"/);
  assert.match(reader, /function openVocabulary\(\) \{\s*saveLastRead\(\);\s*appRuntime\.navigate\('vocabulary\.html'\);/);
  assert.match(reader, /aria-current="page">阅读器/);
  assert.match(reader, /onclick="openVocabulary\(\)">生词本/);
  assert.doesNotMatch(reader, /href="vocabulary\.html" target="_blank"/);
  assert.match(vocabulary, /class="slim-page-switcher"/);
  assert.match(vocabulary, /function openReader\(\) \{ appRuntime\.navigate\('reader\.html'\); \}/);
  assert.match(vocabulary, /aria-current="page">生词本/);
});

test('Android app shell removes the duplicate web page switchers', () => {
  assert.match(appShellCss, /html\.app-shell-enabled \.slim-page-switcher,[\s\S]*html\.app-shell-enabled \.reader-page-switcher \{ display: none; \}/);
});

test('vocabulary owns its custom background data and preserves legacy choices once', () => {
  assert.match(vocabulary, /VOCAB_CUSTOM_BG_KEY = 'vocabulary-custom-bgs-v1'/);
  assert.match(vocabulary, /LEGACY_POMODORO_CUSTOM_BG_KEY = 'pomodoro-custom-bgs'/);
  assert.match(vocabulary, /function getVocabCustomBackgrounds\(\)/);
  assert.match(vocabulary, /localStorage\.setItem\(VOCAB_CUSTOM_BG_KEY, JSON\.stringify\(legacy\)\)/);
  assert.doesNotMatch(vocabulary, /getPomodoroCustomBackgrounds|savePomodoroCustomBackgrounds/);
});
