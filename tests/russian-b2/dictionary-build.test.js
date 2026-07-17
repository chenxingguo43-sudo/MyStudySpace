const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { extractRussianForms, analyzeWithPymorphy } = require('../../scripts/russian-dictionary/build-corpus-morphology');
const { invertFreeDictXml, FREEDICT_VERSION } = require('../../scripts/russian-dictionary/build-freedict');

test('extracts normalized Russian forms from nested textbook JSON', () => {
  const forms = extractRussianForms({ prompt: 'Я знаю те́х людей.', nested: ['Из-за дождя', '中文'] });
  assert.deepEqual(forms, ['дождя', 'знаю', 'из-за', 'людей', 'тех', 'я']);
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
