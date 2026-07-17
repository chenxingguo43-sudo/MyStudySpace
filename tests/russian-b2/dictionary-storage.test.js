const test = require('node:test');
const assert = require('node:assert/strict');
const { createDictionaryStorage } = require('../../js/russian-dictionary/storage');

const NOW = '2026-07-17T12:00:00.000Z';

test('adds a B2 source without overwriting legacy review progress', () => {
  const storage = new Map([[
    'vocabulary-review-records',
    JSON.stringify({ тот: { mastery: 3, interval: 9, source: 'novel' } })
  ]]);
  const db = createDictionaryStorage({ storage, now: () => NOW });

  const result = db.mergeSavedWord({
    form: 'тех',
    lemma: 'тот',
    meaning: '那个',
    partOfSpeech: 'pronoun',
    reliability: 'reviewed-function-form',
    context: {
      bookId: 'russian_b2', moduleId: 'grammar', taskId: 'P2-Q001',
      sentenceRu: 'Я знаю тех людей.'
    }
  });

  assert.equal(result.mastery, 3);
  assert.equal(result.interval, 9);
  assert.equal(result.source, 'novel');
  assert.equal(result.sources[0].taskId, 'P2-Q001');
});

test('deduplicates missing forms and increments occurrence count', () => {
  const db = createDictionaryStorage({ storage: new Map(), now: () => NOW });
  db.recordMissing({
    form: 'тех', lemmaCandidates: ['тот'], failureStage: 'lemma-resolution',
    context: { taskId: 'P2-Q001' }
  });
  const repeated = db.recordMissing({
    form: 'тех', lemmaCandidates: ['тот'], failureStage: 'lemma-resolution',
    context: { taskId: 'P2-Q002' }
  });

  assert.equal(repeated.occurrences, 2);
  assert.equal(repeated.contexts.length, 2);
  assert.equal(repeated.firstSeenAt, NOW);
  assert.equal(repeated.lastSeenAt, NOW);
});

test('keeps online results provisional until an explicit review', () => {
  const storage = new Map();
  const db = createDictionaryStorage({ storage, now: () => NOW });

  db.saveProvisional({
    form: 'редкость', lemma: 'редкость', provider: 'Russian Wiktionary',
    sourceUrl: 'https://ru.wiktionary.org/wiki/редкость', meaningRu: 'редкое явление', meaningZh: ''
  });

  assert.equal(db.getProvisional('редкость').provider, 'Russian Wiktionary');
  assert.equal(JSON.parse(storage.get('vocabulary-review-records') || '{}').редкость, undefined);

  const reviewed = db.markReviewed('редкость', { meaning: '罕见的事物', partOfSpeech: 'noun' });
  assert.equal(reviewed.meaning, '罕见的事物');
  assert.equal(db.getProvisional('редкость'), null);
  assert.equal(JSON.parse(storage.get('vocabulary-review-records')).редкость.meaning, '罕见的事物');
});
