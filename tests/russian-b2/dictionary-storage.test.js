const test = require('node:test');
const assert = require('node:assert/strict');
const { createDictionaryStorage } = require('../../js/russian-dictionary/storage');

const NOW = '2026-07-17T12:00:00.000Z';

function createThrowingStorage(entries = []) {
  const values = new Map(entries);
  let failKey = '';
  return {
    getItem: key => values.get(key) || null,
    setItem(key, value) {
      if (key === failKey) throw new Error('quota');
      values.set(key, value);
    },
    removeItem: key => values.delete(key),
    failOn: key => { failKey = key; },
    values
  };
}

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

test('merges inflected forms and origins into one explicitly saved lemma', () => {
  const storage = new Map();
  const db = createDictionaryStorage({ storage, now: () => NOW });

  db.mergeSavedWord({
    form: 'собеседники', lemma: 'собеседник',
    identity: { key: 'собеседник', lemma: 'собеседник', partOfSpeech: 'noun' },
    meaning: '对话者 / 交谈者', origin: 'listening', collection: 'saved',
    context: { taskId: 'LS-Q001', surfaceForm: 'собеседники', sentenceRu: 'Собеседники обсуждают проблему.' }
  });
  const merged = db.mergeSavedWord({
    form: 'собеседника', lemma: 'собеседник',
    identity: { key: 'собеседник', lemma: 'собеседник', partOfSpeech: 'noun' },
    origin: 'reader', collection: 'saved',
    context: { taskId: 'R-Q001', surfaceForm: 'собеседника', sentenceRu: 'Я слушаю собеседника.' }
  });

  const records = JSON.parse(storage.get('vocabulary-review-records'));
  assert.deepEqual(Object.keys(records), ['собеседник']);
  assert.deepEqual(merged.forms.sort(), ['собеседника', 'собеседники']);
  assert.deepEqual(merged.origins.sort(), ['listening', 'reader']);
  assert.equal(merged.collection, 'saved');
  assert.equal(merged.contexts.length, 2);
  assert.equal(merged.contexts[0].surfaceForm, 'собеседники');
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

test('migration backs up once and leaves uncertain records unchanged', () => {
  const storage = createThrowingStorage([[
    'vocabulary-review-records',
    JSON.stringify({ написаны: { word: 'написаны', mastery: 2 }, спорная: { word: 'спорная', mastery: 1 } })
  ]]);
  const db = createDictionaryStorage({ storage, now: () => NOW });
  const resolver = word => word === 'написаны'
    ? { lemma: 'написать', reliability: 'morphology-map', entry: { partOfSpeech: 'verb' } }
    : { lemma: 'спорный', reliability: 'morphology-guess', entry: { partOfSpeech: 'adjective' } };
  assert.equal(db.migrateSavedWords({ resolver }).status, 'migrated');
  assert.equal(db.migrateSavedWords({ resolver }).status, 'already-migrated');
  const records = JSON.parse(storage.values.get('vocabulary-review-records'));
  assert.equal(records['написать|verb'].mastery, 2);
  assert.equal(records.спорная.mastery, 1);
  assert.equal(JSON.parse(storage.values.get('rr_vocabulary_aliases_v2')).написаны, 'написать|verb');
  assert.equal([...storage.values.keys()].filter(key => key.startsWith('rr_vocabulary_backup_v2_')).length, 1);
});

test('migration write failure keeps the active records and migration marker absent', () => {
  const raw = JSON.stringify({ написаны: { mastery: 2 } });
  const storage = createThrowingStorage([['vocabulary-review-records', raw]]);
  storage.failOn('vocabulary-review-records');
  const db = createDictionaryStorage({ storage, now: () => NOW });
  const result = db.migrateSavedWords({ resolver: () => ({ lemma: 'написать', reliability: 'morphology-map', entry: { partOfSpeech: 'verb' } }) });
  assert.equal(result.status, 'failed');
  assert.equal(storage.values.get('vocabulary-review-records'), raw);
  assert.equal(storage.values.has('rr_vocabulary_migration_v2'), false);
});
