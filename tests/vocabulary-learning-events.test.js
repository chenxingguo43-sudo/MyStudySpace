'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const EventStore = require('../js/learning-event-store');
const VocabularyEvents = require('../js/vocabulary-learning-events');

function word(overrides) {
  return {
    id: 'vocabulary/tree',
    word: 'ёлка',
    meaning: '枞树',
    type: 'noun',
    source: 'vocab',
    ...overrides
  };
}

function setup() {
  const clock = { value: '2026-08-16T05:00:00.000Z' };
  const adapter = EventStore.createMemoryAdapter();
  const store = EventStore.createLearningEventStore({
    adapter,
    crypto,
    now: () => new Date(clock.value)
  });
  let kicks = 0;
  const recorder = VocabularyEvents.createRecorder({
    store,
    now: () => new Date(clock.value),
    syncClient: { kick: () => { kicks += 1; } }
  });
  return { adapter, clock, recorder, store, kicks: () => kicks };
}

test('formal identity preserves ё and rejects phrase cards without a formal part of speech', () => {
  assert.deepEqual(VocabularyEvents.resolveFormalIdentity(word()), {
    identityKey: 'ru:ёлка|noun',
    lexemeKey: 'ru:ёлка|noun',
    lemma: 'ёлка',
    partOfSpeech: 'noun',
    surfaceForm: 'ёлка'
  });
  assert.equal(VocabularyEvents.resolveFormalIdentity(word({ word: 'в общем / в итоге', type: 'sentence' })), null);
});

test('formal identity uses the cross-module lexeme key and accepts dictionary Chinese part-of-speech labels', () => {
  assert.deepEqual(VocabularyEvents.resolveFormalIdentity(word({ id: 'reader-123', type: '名词' })), {
    identityKey: 'ru:ёлка|noun',
    lexemeKey: 'ru:ёлка|noun',
    lemma: 'ёлка',
    partOfSpeech: 'noun',
    surfaceForm: 'ёлка'
  });
});

test('a saved Phase 1 learning identity is adopted under the shared lexeme key', async () => {
  const { recorder } = setup();
  const savedIdentity = {
    lexemeKey: 'ru:ёлка|noun',
    senseId: crypto.randomUUID(),
    reviewUnitId: crypto.randomUUID(),
    skill: 'meaning_recognition'
  };
  const result = await recorder.recordReview({
    word: word({ learningIdentity: savedIdentity }), mode: 'visual', rawResult: 'known', isNew: false,
    answerRevealedBeforeResponse: false, responseMs: 1200
  });
  assert.equal(result.identity.senseId, savedIdentity.senseId);
  assert.equal(result.identity.reviewUnitId, savedIdentity.reviewUnitId);
});

test('a first formal review atomically records addition and review before sync', async () => {
  const { kicks, recorder, store } = setup();
  const result = await recorder.recordReview({
    word: word(), mode: 'visual', rawResult: 'known', isNew: true,
    answerRevealedBeforeResponse: false, responseMs: 1200, sessionKind: 'scan'
  });
  assert.equal(result.skipped, false);
  assert.equal(result.added, true);
  assert.deepEqual(result.events.map(event => event.eventType), ['vocabulary_entry_added', 'review_attempt_completed']);
  assert.equal(result.events[0].subject.senseId, result.reviewEvent.subject.senseId);
  assert.equal(result.reviewEvent.subject.lexemeKey, 'ru:ёлка|noun');
  assert.equal(result.reviewEvent.payload.sameDayAttemptIndex, 1);
  assert.equal(result.reviewEvent.payload.answerRevealedBeforeResponse, false);
  assert.deepEqual(await store.stats(), { events: 2, pending: 2, acknowledged: 0 });
  assert.equal(kicks(), 1);
});

test('later reviews do not invent another addition and increment the same-day index', async () => {
  const { clock, recorder, store } = setup();
  await recorder.recordReview({
    word: word(), mode: 'visual', rawResult: 'unknown', isNew: true,
    answerRevealedBeforeResponse: false, responseMs: 900
  });
  clock.value = '2026-08-16T05:02:00.000Z';
  const second = await recorder.recordReview({
    word: word(), mode: 'visual', rawResult: 'known', isNew: true,
    answerRevealedBeforeResponse: false, responseMs: 800
  });
  assert.equal(second.added, false);
  assert.equal(second.events.length, 1);
  assert.equal(second.reviewEvent.payload.sameDayAttemptIndex, 2);
  assert.ok(second.reviewEvent.payload.elapsedDays > 0);
  assert.equal((await store.reviewAttempts(second.identity.reviewUnitId, '')).length, 2);
});

test('training directions share a sense but use separate review units', async () => {
  const { recorder } = setup();
  const visual = await recorder.recordReview({
    word: word(), mode: 'visual', rawResult: 'known', isNew: false,
    answerRevealedBeforeResponse: true, responseMs: 1500
  });
  const output = await recorder.recordReview({
    word: word(), mode: 'output', rawResult: 'fuzzy', isNew: false,
    answerRevealedBeforeResponse: false, responseMs: 3000
  });
  assert.equal(visual.identity.senseId, output.identity.senseId);
  assert.notEqual(visual.identity.reviewUnitId, output.identity.reviewUnitId);
  assert.equal(visual.identity.skill, 'meaning_recognition');
  assert.equal(output.identity.skill, 'form_recall');
});

test('undo appends exclusions and permits a later genuine re-add', async () => {
  const { recorder, store } = setup();
  const first = await recorder.recordReview({
    word: word(), mode: 'visual', rawResult: 'known', isNew: true,
    answerRevealedBeforeResponse: false, responseMs: 1000
  });
  const undone = await recorder.recordUndo({ events: first.events });
  assert.deepEqual(undone.events.map(event => event.eventType), ['evidence_corrected', 'evidence_corrected']);
  assert.equal(await store.vocabularyAdditionActive(first.identity.senseId), false);

  const repeated = await recorder.recordReview({
    word: word(), mode: 'visual', rawResult: 'known', isNew: true,
    answerRevealedBeforeResponse: false, responseMs: 1000
  });
  assert.equal(repeated.added, true);
  assert.deepEqual(repeated.events.map(event => event.eventType), ['vocabulary_entry_added', 'review_attempt_completed']);
});

test('unresolved legacy cards continue without writing guessed events', async () => {
  const { recorder, store } = setup();
  const result = await recorder.recordReview({
    word: word({ word: 'как ... так и ...', type: 'sentence' }),
    mode: 'visual', rawResult: 'known', isNew: true,
    answerRevealedBeforeResponse: true, responseMs: 1000
  });
  assert.deepEqual(result, { skipped: true, reason: 'formal_identity_unavailable' });
  assert.deepEqual(await store.stats(), { events: 0, pending: 0, acknowledged: 0 });
});
