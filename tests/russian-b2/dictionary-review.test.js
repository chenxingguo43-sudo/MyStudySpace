const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../../js/russian-dictionary/review');

test('canonical identity requires reliable lemma and part of speech', () => {
  assert.deepEqual(Review.createIdentity({
    lemma: 'написать',
    reliability: 'morphology-map',
    entry: { partOfSpeech: 'verb' }
  }), { key: 'написать|verb', lemma: 'написать', partOfSpeech: 'verb' });
  assert.equal(Review.createIdentity({
    lemma: 'написать', reliability: 'morphology-guess', entry: { partOfSpeech: 'verb' }
  }), null);
});

test('merge keeps conservative scheduling and deduplicates forms and contexts', () => {
  const merged = Review.mergeRecords({
    mastery: 5, count: 2, interval: 9, nextReview: '2026-08-10T00:00:00.000Z',
    forms: ['написаны'], contexts: [{ surfaceForm: 'написаны', sentenceRu: 'Они написаны автором.' }]
  }, {
    mastery: 1, count: 8, interval: 1, nextReview: '2026-07-24T00:00:00.000Z',
    forms: ['написаны', 'написанного'], contexts: [
      { surfaceForm: 'написаны', sentenceRu: 'Они написаны автором.' },
      { surfaceForm: 'написанного', sentenceRu: 'Текст написанного письма сохранён.' }
    ]
  });
  assert.equal(merged.mastery, 1);
  assert.equal(merged.count, 8);
  assert.equal(merged.interval, 1);
  assert.equal(merged.nextReview, '2026-07-24T00:00:00.000Z');
  assert.deepEqual(merged.forms, ['написаны', 'написанного']);
  assert.equal(merged.contexts.length, 2);
});

test('context cloze masks one exact encountered form', () => {
  assert.deepEqual(Review.createContextCloze({
    lemma: 'написать',
    contexts: [{ surfaceForm: 'написаны', sentenceRu: 'Эти произведения написаны известным художником.' }]
  }), {
    prompt: 'Эти произведения ______ известным художником.',
    answer: 'написаны', lemma: 'написать', contextIndex: 0
  });
});

test('record transform merges only reliable identities', () => {
  const result = Review.transformRecords({
    написаны: { word: 'написаны', mastery: 3 },
    спорная: { word: 'спорная', mastery: 2 }
  }, key => key === 'написаны'
    ? { lemma: 'написать', reliability: 'morphology-map', entry: { partOfSpeech: 'verb' } }
    : { lemma: 'спорный', reliability: 'morphology-guess', entry: { partOfSpeech: 'adjective' } });
  assert.ok(result.records['написать|verb']);
  assert.ok(result.records.спорная);
  assert.equal(result.records['спорный|adjective'], undefined);
  assert.equal(result.aliases.написаны, 'написать|verb');
});
