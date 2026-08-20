'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Schema = require('../js/learning-event-schema');

const IDS = Object.freeze({
  event: '11111111-1111-4111-8111-111111111111',
  learner: '22222222-2222-4222-8222-222222222222',
  device: '33333333-3333-4333-8333-333333333333',
  batch: '44444444-4444-4444-8444-444444444444'
});

function vocabularyEvent(overrides) {
  return {
    schema: Schema.EVENT_SCHEMA,
    schemaVersion: Schema.EVENT_SCHEMA_VERSION,
    eventId: IDS.event,
    learnerId: IDS.learner,
    deviceId: IDS.device,
    eventType: 'vocabulary_entry_added',
    occurredAt: '2026-08-16T08:00:00.000+08:00',
    recordedAt: '2026-08-16T00:00:00.100Z',
    receivedAt: null,
    source: { module: 'vocabulary', contentId: 'word-list', location: {} },
    subject: {
      surfaceForm: 'ёлка',
      lexemeKey: 'ru:ёлка|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-tree',
      reviewUnitId: null
    },
    context: { meaningSnapshot: '枞树' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'sense-tree', lookupEventId: null },
    correctsEventId: null,
    ...overrides
  };
}

function reviewEvent(overrides) {
  const base = vocabularyEvent({
    eventType: 'review_attempt_completed',
    subject: {
      surfaceForm: 'ёлка',
      lexemeKey: 'ru:ёлка|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-tree',
      reviewUnitId: 'review-tree-meaning'
    },
    evidence: { kind: 'objective', strength: 'strong', quality: 'accepted' },
    payload: {
      testMode: 'meaning-recall',
      questionSnapshot: { prompt: 'ёлка' },
      answerSnapshot: { response: '枞树' },
      rawResult: 'correct',
      answerRevealedBeforeResponse: false,
      hintType: '',
      responseMs: 1800,
      sameDayAttemptIndex: 1,
      elapsedDays: 3
    }
  });
  return { ...base, ...overrides };
}

test('normalizes a Phase 0 vocabulary event without losing ё', () => {
  const value = Schema.normalizeLearningEvent(vocabularyEvent());
  assert.equal(value.subject.lexemeKey, 'ru:ёлка|noun');
  assert.equal(value.receivedAt, null);
  assert.equal(value.payload.initialSenseId, 'sense-tree');
});

test('review attempts require a positive same-day attempt index', () => {
  const input = reviewEvent();
  input.payload.sameDayAttemptIndex = 0;
  assert.throws(
    () => Schema.normalizeLearningEvent(input),
    error => error.code === 'INVALID_ATTEMPT_INDEX' && error.field === 'payload.sameDayAttemptIndex'
  );
});

test('review attempts record whether the answer was revealed before the response', () => {
  const input = reviewEvent();
  delete input.payload.answerRevealedBeforeResponse;
  assert.throws(
    () => Schema.normalizeLearningEvent(input),
    error => error.code === 'INVALID_BOOLEAN'
  );
});

test('batch validation rejects duplicate event ids and device mismatches', () => {
  const event = vocabularyEvent();
  const batch = {
    schema: Schema.BATCH_SCHEMA,
    schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId: IDS.batch,
    deviceId: IDS.device,
    events: [event, event]
  };
  assert.throws(() => Schema.normalizeEventBatch(batch), error => error.code === 'DUPLICATE_EVENT_IN_BATCH');

  batch.events = [{ ...event, deviceId: '55555555-5555-4555-8555-555555555555' }];
  assert.throws(() => Schema.normalizeEventBatch(batch), error => error.code === 'BATCH_DEVICE_MISMATCH');
});

test('canonical JSON is stable regardless of object key insertion order', () => {
  assert.equal(
    Schema.canonicalStringify({ z: 1, a: { y: 2, x: 3 } }),
    Schema.canonicalStringify({ a: { x: 3, y: 2 }, z: 1 })
  );
});

test('evidence corrections require and preserve their target event', () => {
  const original = reviewEvent();
  const correction = {
    ...original,
    eventId: '66666666-6666-4666-8666-666666666666',
    eventType: 'evidence_corrected',
    payload: {
      correctedFields: ['evidence.quality'],
      oldValueSummary: 'accepted',
      newValue: 'excluded',
      reason: 'vocabulary_rating_undone'
    },
    correctsEventId: original.eventId
  };
  const value = Schema.normalizeLearningEvent(correction);
  assert.equal(value.correctsEventId, original.eventId);
  assert.equal(value.payload.newValue, 'excluded');

  correction.correctsEventId = null;
  assert.throws(() => Schema.normalizeLearningEvent(correction), error => error.code === 'CORRECTION_TARGET_REQUIRED');
});

test('Reader lookup events validate success and missing payloads', () => {
  const success = vocabularyEvent({
    eventType: 'dictionary_lookup_succeeded',
    source: { module: 'reader', contentId: 'chapter-1', location: {} },
    subject: {
      surfaceForm: 'ёлку', lexemeKey: 'ru:ёлка|noun', unresolvedLexemeId: null,
      senseId: null, reviewUnitId: null
    },
    evidence: { kind: 'objective', strength: 'neutral', quality: 'accepted' },
    payload: {
      queryForm: 'ёлку', matchMethod: 'morphology-map',
      displayedMeaning: '枞树', guessFirstMode: false
    }
  });
  assert.equal(Schema.normalizeLearningEvent(success).payload.displayedMeaning, '枞树');

  const missing = vocabularyEvent({
    eventType: 'dictionary_lookup_missed',
    source: { module: 'reader', contentId: 'chapter-1', location: {} },
    subject: {
      surfaceForm: 'стали', lexemeKey: null,
      unresolvedLexemeId: 'pending-steel-or-become', senseId: null, reviewUnitId: null
    },
    evidence: { kind: 'objective', strength: 'neutral', quality: 'accepted' },
    payload: {
      queryForm: 'стали', failureCategory: 'definition_not_found',
      lemmaCandidates: ['сталь', 'стать']
    }
  });
  assert.deepEqual(Schema.normalizeLearningEvent(missing).payload.lemmaCandidates, ['сталь', 'стать']);
});

test('pending vocabulary additions require an unresolved subject', () => {
  const pending = vocabularyEvent({
    eventType: 'vocabulary_entry_pending_resolution',
    source: { module: 'reader', contentId: 'chapter-1', location: {} },
    subject: {
      surfaceForm: 'стали', lexemeKey: null,
      unresolvedLexemeId: 'pending-steel-or-become', senseId: null, reviewUnitId: null
    },
    payload: {
      addMethod: 'reader_save_button', lookupEventId: IDS.event,
      lemmaCandidates: ['сталь', 'стать']
    }
  });
  const normalized = Schema.normalizeLearningEvent(pending);
  assert.equal(normalized.payload.lookupEventId, IDS.event);
  pending.subject = { ...pending.subject, lexemeKey: 'ru:стать|verb', unresolvedLexemeId: null };
  assert.throws(
    () => Schema.normalizeLearningEvent(pending),
    error => error.code === 'PENDING_VOCABULARY_SUBJECT_MISMATCH'
  );
});

module.exports = { IDS, reviewEvent, vocabularyEvent };
