const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../js/russian-dictionary/core');
const { morphologyGuess } = require('../../data/russian-morphology');

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

test('removes stress without corrupting the Russian letter й', () => {
  assert.equal(Core.normalizeRussian('люде́й'), 'людей');
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

test('resolves common declined pronouns before definition lookup', () => {
  const forms = { тех: ['тот'], этих: ['этот'], всех: ['весь'], кого: ['кто'], чего: ['что'] };
  for (const [form, expected] of Object.entries({ тех: 'тот', этих: 'этот', всех: 'весь', кого: 'кто', чего: 'что' })) {
    const result = Core.resolveLemma(form, {
      functionForms: forms,
      morphology: {},
      lookupLemma: lemma => ({ word: lemma, meaning: lemma })
    });
    assert.equal(result.lemma, expected);
    assert.equal(result.reliability, 'reviewed-function-form');
  }
});

test('offers hard-stem noun plural candidates for dictionary-validated fallback', () => {
  const candidates = morphologyGuess('собеседники');
  assert.ok(candidates.includes('собеседник'));
  const dictionary = { собеседник: { meaning: '对话者 / 交谈者' } };
  const accepted = candidates.find(candidate => dictionary[candidate]);
  assert.equal(accepted, 'собеседник');
  assert.equal(dictionary[accepted].meaning, '对话者 / 交谈者');
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
