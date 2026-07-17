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

test('phrase lookup prefers an exact collocation and otherwise returns components', () => {
  const exact = Core.analyzePhrase('в состоянии', {
    lookupPhrase: value => value === 'в состоянии' ? { meaning: '处于……状态' } : null,
    resolveWord: () => null
  });
  assert.equal(exact.kind, 'phrase-exact');
  assert.equal(exact.entry.meaning, '处于……状态');

  const degraded = Core.analyzePhrase('тех людей', {
    lookupPhrase: () => null,
    resolveWord: word => ({ form: word, lemma: word === 'тех' ? 'тот' : 'человек' })
  });
  assert.equal(degraded.kind, 'phrase-components');
  assert.equal(degraded.components[0].lemma, 'тот');
});
