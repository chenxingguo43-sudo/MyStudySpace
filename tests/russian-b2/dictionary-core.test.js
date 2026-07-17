const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../js/russian-dictionary/core');

test('tokenizes stressed and hyphenated Russian without losing punctuation', () => {
  assert.deepEqual(Core.tokenizeRussian('Из-за э́тих проблем.'), [
    { type: 'word', value: 'Из-за', normalized: 'из-за' },
    { type: 'text', value: ' ' },
    { type: 'word', value: 'э́тих', normalized: 'этих' },
    { type: 'text', value: ' ' },
    { type: 'word', value: 'проблем', normalized: 'проблем' },
    { type: 'text', value: '.' }
  ]);
});

test('renders safe word targets with serialized lookup context', () => {
  const html = Core.renderRussianText('тех < людей', {
    bookId: 'russian_b2',
    moduleId: 'grammar',
    taskId: 'P2-Q001',
    regionType: 'prompt',
    sentenceRu: 'Я знаю тех людей.',
    sentenceZh: '我认识那些人。'
  });

  assert.match(html, /class="ru-word"/);
  assert.match(html, /data-word="тех"/);
  assert.match(html, /data-lookup-context=/);
  assert.match(html, /&lt;/);
  assert.doesNotMatch(html, /<script/);
});

test('resolves a function-word form to its reviewed lemma', () => {
  const entry = { word: 'тот', meaning: '那个' };
  const result = Core.resolveLemma('тех', {
    functionForms: { тех: ['тот'] },
    lookupLemma: lemma => lemma === 'тот' ? entry : null
  });

  assert.equal(result.lemma, 'тот');
  assert.equal(result.entry, entry);
  assert.equal(result.reliability, 'reviewed-function-form');
});
