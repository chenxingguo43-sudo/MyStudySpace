'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const EventStore = require('../js/learning-event-store');
const ReaderEvents = require('../js/reader-learning-events');

function setup() {
  const clock = { value: '2026-08-16T06:00:00.000Z' };
  const store = EventStore.createLearningEventStore({
    adapter: EventStore.createMemoryAdapter(),
    crypto,
    now: () => new Date(clock.value)
  });
  const recorder = ReaderEvents.createRecorder({
    store,
    now: () => new Date(clock.value),
    dedupeWindowMs: 15000
  });
  return { clock, recorder, store };
}

function context(overrides) {
  return {
    bookId: 'book-1', moduleId: 'reading-1', taskId: 'sentence-8',
    regionType: 'reading', sentenceRu: 'Дети наряжали ёлку.',
    sentenceZh: '孩子们装饰枞树。',
    ...overrides
  };
}

function successInput(overrides) {
  return {
    succeeded: true,
    queryForm: 'ёлку',
    surfaceForm: 'ёлку',
    lemma: 'елка',
    lemmaCandidates: ['елка'],
    partOfSpeech: 'noun',
    reliability: 'morphology-map',
    raw: { display: 'ёлка' },
    meaning: '枞树',
    context: context(),
    ...overrides
  };
}

test('a successful Reader lookup keeps ё and links the later vocabulary addition', async () => {
  const { recorder, store } = setup();
  const lookup = await recorder.recordLookup(successInput());
  assert.equal(lookup.event.eventType, 'dictionary_lookup_succeeded');
  assert.equal(lookup.event.subject.lexemeKey, 'ru:ёлка|noun');

  const addition = await recorder.recordVocabularyAddition({
    ...successInput(),
    lookupEvent: lookup.event,
    addMethod: 'reader_save_button'
  });
  assert.equal(addition.event.eventType, 'vocabulary_entry_added');
  assert.equal(addition.event.payload.lookupEventId, lookup.event.eventId);
  assert.equal(addition.identity.lexemeKey, 'ru:ёлка|noun');
  assert.deepEqual(await store.stats(), { events: 2, pending: 2, acknowledged: 0 });
});

test('short repeated lookup clicks reuse one event but a later genuine lookup is retained', async () => {
  const { clock, recorder, store } = setup();
  const first = await recorder.recordLookup(successInput());
  clock.value = '2026-08-16T06:00:05.000Z';
  const duplicate = await recorder.recordLookup(successInput());
  assert.equal(duplicate.skipped, true);
  assert.equal(duplicate.event.eventId, first.event.eventId);
  clock.value = '2026-08-16T06:00:16.000Z';
  const later = await recorder.recordLookup(successInput());
  assert.equal(later.skipped, false);
  assert.deepEqual(await store.stats(), { events: 2, pending: 2, acknowledged: 0 });
});

test('ambiguous or missing dictionary targets stay unresolved when saved', async () => {
  const { recorder, store } = setup();
  const missingInput = {
    succeeded: false,
    queryForm: 'стали',
    surfaceForm: 'стали',
    lemma: 'сталь',
    lemmaCandidates: ['сталь', 'стать'],
    partOfSpeech: '',
    reliability: 'morphology-guess',
    failureCategory: 'definition_not_found',
    meaning: '',
    context: context({ sentenceRu: 'Они стали сильнее.' })
  };
  const lookup = await recorder.recordLookup(missingInput);
  assert.equal(lookup.event.eventType, 'dictionary_lookup_missed');
  assert.ok(lookup.event.subject.unresolvedLexemeId);
  assert.equal(lookup.event.subject.lexemeKey, null);

  const addition = await recorder.recordVocabularyAddition({
    ...missingInput,
    lookupEvent: lookup.event,
    meaning: '本地词典暂未收录'
  });
  assert.equal(addition.event.eventType, 'vocabulary_entry_pending_resolution');
  assert.equal(addition.event.subject.unresolvedLexemeId, lookup.event.subject.unresolvedLexemeId);
  assert.equal(addition.identity.status, 'pending_resolution');
  assert.deepEqual(await store.stats(), { events: 2, pending: 2, acknowledged: 0 });
});

test('a morphology guess never becomes a formal lexeme automatically', () => {
  const identity = ReaderEvents.resolveLookupIdentity(successInput({ reliability: 'morphology-guess' }));
  assert.equal(identity.kind, 'unresolved');
});
