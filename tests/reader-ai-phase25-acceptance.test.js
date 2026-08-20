'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Schema = require('../js/learning-event-schema');
const { createLearningStore } = require('../server/learning-store');
const { createReaderAiStore } = require('../server/reader-ai-store');

function reviewEvent() {
  return {
    schema: Schema.EVENT_SCHEMA,
    schemaVersion: Schema.EVENT_SCHEMA_VERSION,
    eventId: '10000000-0000-4000-8000-000000000001',
    learnerId: '20000000-0000-4000-8000-000000000002',
    deviceId: '30000000-0000-4000-8000-000000000003',
    eventType: 'review_attempt_completed',
    occurredAt: '2026-08-18T09:00:00.000+08:00',
    recordedAt: '2026-08-18T01:00:00.100Z',
    receivedAt: null,
    source: { module: 'vocabulary', contentId: 'acceptance-word', location: {} },
    subject: {
      surfaceForm: 'мир',
      lexemeKey: 'ru:мир|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-world',
      reviewUnitId: 'review-world'
    },
    context: { localDate: '2026-08-18', skill: 'meaning_recognition' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      testMode: 'visual',
      questionSnapshot: {},
      answerSnapshot: {},
      rawResult: 'known',
      answerRevealedBeforeResponse: false,
      hintType: '',
      responseMs: 1200,
      sameDayAttemptIndex: 1,
      elapsedDays: 0
    },
    correctsEventId: null
  };
}

function stableProjection(value) {
  return {
    checkpoint: {
      projectionName: value.checkpoint.projectionName,
      projectionVersion: value.checkpoint.projectionVersion,
      parameterSetId: value.checkpoint.parameterSetId,
      sourceEventCount: value.checkpoint.sourceEventCount,
      sourceHash: value.checkpoint.sourceHash,
      stateHash: value.checkpoint.stateHash
    },
    records: value.records
  };
}

test('saved grammar and dictionary AI results survive restart without changing FSRS', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'white-night-phase25-acceptance-'));
  const databasePath = path.join(directory, 'white-night-learning.sqlite3');
  let learningStore = createLearningStore({ databasePath });
  let aiStore = createReaderAiStore({ databasePath: learningStore.databasePath });

  try {
    learningStore.ingestBatch({
      schema: Schema.BATCH_SCHEMA,
      schemaVersion: Schema.BATCH_SCHEMA_VERSION,
      batchId: '40000000-0000-4000-8000-000000000004',
      deviceId: '30000000-0000-4000-8000-000000000003',
      events: [reviewEvent()]
    });

    const projectionBefore = stableProjection(learningStore.fsrsProjection('2026-08-18T02:00:00.000Z'));
    const eventCountBefore = learningStore.countEvents();

    const grammar = aiStore.beginRequest({
      clientRequestId: 'reader-ai:phase25-grammar-001',
      requestType: 'grammar',
      deliveryMode: 'direct',
      templateVersion: 'reader-ai-v1',
      source: { kind: 'reader-question', id: 'GRAMMAR-Q1' },
      input: { question: 'Я интересуюсь ...', userAnswer: 'B', correctAnswer: 'A' }
    }).interaction;
    aiStore.complete(grammar.interactionId, { answerReason: '动词要求工具格。' }, 'mock-model');

    const dictionary = aiStore.beginRequest({
      clientRequestId: 'reader-ai:phase25-dictionary-001',
      requestType: 'dictionary',
      deliveryMode: 'direct',
      templateVersion: 'reader-ai-v1',
      source: { kind: 'reader-lookup', id: 'LOOKUP-1' },
      lexemeKey: 'ru:мир|noun',
      input: { target: 'мир', localDictionaryFound: true }
    }).interaction;
    aiStore.complete(dictionary.interactionId, { contextMeaning: '世界；和平。' }, 'mock-model');

    assert.equal(learningStore.countEvents(), eventCountBefore);
    assert.deepEqual(
      stableProjection(learningStore.fsrsProjection('2026-08-18T02:00:00.000Z')),
      projectionBefore
    );

    aiStore.close();
    aiStore = createReaderAiStore({ databasePath });
    assert.equal(aiStore.get(grammar.interactionId).answer.answerReason, '动词要求工具格。');
    assert.equal(aiStore.get(dictionary.interactionId).answer.contextMeaning, '世界；和平。');

    learningStore.close();
    learningStore = createLearningStore({ databasePath });
    assert.equal(learningStore.countEvents(), eventCountBefore);
    assert.deepEqual(
      stableProjection(learningStore.fsrsProjection('2026-08-18T02:00:00.000Z')),
      projectionBefore
    );
  } finally {
    aiStore.close();
    learningStore.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
