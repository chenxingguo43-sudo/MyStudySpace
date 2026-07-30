const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const reader = fs.readFileSync(path.join(__dirname, '..', '..', 'reader.html'), 'utf8');

test('tablet dictionary loads core morphology independently from large supplements', () => {
  assert.match(reader, /var DICTIONARY_DATA_VERSION = '[^']+'/);
  assert.match(reader, /fetchDictionaryJson\('data\/dictionary\/corpus-morphology\.json', \{\}\)/);
  assert.match(reader, /supplementalLookupPromise = fetchDictionaryJson\('data\/dictionary\/freedict-rus-zh\.json', \{\}\)/);
  assert.match(reader, /return fetchDictionaryJson\('data\/dictionary\/openrussian-en\.json', \{\}\)/);
  assert.match(reader, /补充词典加载中/);
});

test('failed dictionary resources are not reported as genuine missing words', () => {
  assert.match(reader, /dictionaryLoadFailures\[path\] = true/);
  assert.match(reader, /部分词典数据加载失败，请刷新后重试/);
  assert.match(reader, /Object\.keys\(dictionaryLoadFailures\)\.length === 0/);
});

test('clicked words have a persistent cross-device lookup highlight', () => {
  assert.match(reader, /\.ru-word\.dictionary-active/);
});
