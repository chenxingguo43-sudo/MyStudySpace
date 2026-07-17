const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { extractRussianForms, analyzeWithPymorphy } = require('../../scripts/russian-dictionary/build-corpus-morphology');
const { invertFreeDictXml, FREEDICT_VERSION } = require('../../scripts/russian-dictionary/build-freedict');
const { extractGlossaryEntries } = require('../../scripts/russian-dictionary/build-markdown-glossary');
const { parseOpenRussianTsv } = require('../../scripts/russian-dictionary/build-openrussian');
const { extractRussianDefinitions } = require('../../scripts/russian-dictionary/build-wiktionary-supplement');

test('extracts normalized Russian forms from nested textbook JSON', () => {
  const forms = extractRussianForms({ prompt: 'Я знаю те́х людей.', nested: ['Из-за дождя', '中文'] });
  assert.deepEqual(forms, ['дождя', 'знаю', 'из-за', 'людей', 'тех', 'я']);
});

test('extracts only explicit source-traceable Markdown glossary entries', () => {
  const items = extractGlossaryEntries('| **адаптационный** | прил. | 适应的 | 示例 |\n普通俄语句子。', 'unit.md');
  assert.deepEqual(items, [{ word: 'адаптационный', meaning: '适应的', sourceFile: 'unit.md' }]);
});

test('parses pinned OpenRussian lemmas with English definitions', () => {
  const rows = parseOpenRussianTsv('bare\taccented\ttranslations_en\nбазироваться\tбази́роваться\tto be based; to be stationed\n', 'verbs.csv');
  assert.deepEqual(rows['базироваться'].meaningsEn, ['to be based', 'to be stationed']);
  assert.equal(rows['базироваться'].source, 'OpenRussian CC BY-SA 4.0');
});

test('extracts only Russian Wiktionary definition lines from source wikitext', () => {
  const source = '= {{-ru-}} =\n==== Значение ====\n# относящийся к [[адмиралтейство|адмиралтейству]] {{пример|текст}}\n# {{t:=|БАД|[[биологически активная добавка]]}}\n==== Синонимы ====\n# [[другой]]\n= {{-uk-}} =\n==== Значение ====\n# украинское значение';
  assert.deepEqual(extractRussianDefinitions(source), [
    'относящийся к адмиралтейству',
    'биологически активная добавка'
  ]);
});

test('analyzes a corpus form with pinned local pymorphy', () => {
  const result = analyzeWithPymorphy(['тех']);
  assert.ok(result['тех']);
  assert.ok(result['тех'].lemmas.includes('тот'));
  assert.ok(Array.isArray(result['тех'].tags));
});

test('inverts Chinese-Russian FreeDict entries into attributed Russian-Chinese entries', () => {
  const xml = fs.readFileSync('tests/fixtures/dictionary/freedict-zho-rus.tei', 'utf8');
  const result = invertFreeDictXml(xml);
  assert.deepEqual(result['тот'].meanings, ['那个']);
  assert.equal(result['тот'].source, `FreeDict zho-rus ${FREEDICT_VERSION}`);
});
