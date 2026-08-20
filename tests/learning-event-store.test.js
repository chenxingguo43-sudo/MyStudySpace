'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const EventStore = require('../js/learning-event-store');

function eventInput(overrides) {
  return {
    eventType: 'vocabulary_entry_added',
    source: { module: 'vocabulary', contentId: 'word-list', location: {} },
    subject: {
      surfaceForm: 'мир',
      lexemeKey: 'ru:мир|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-world',
      reviewUnitId: null
    },
    context: { meaningSnapshot: '世界' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'sense-world', lookupEventId: null },
    ...overrides
  };
}

function setup() {
  const adapter = EventStore.createMemoryAdapter();
  const store = EventStore.createLearningEventStore({
    adapter,
    crypto,
    now: () => new Date('2026-08-16T01:00:00.000Z')
  });
  return { adapter, store };
}

test('identity is stable and recording atomically creates an outbox item', async () => {
  const { adapter, store } = setup();
  const firstIdentity = await store.identity();
  const secondIdentity = await store.identity();
  assert.deepEqual(secondIdentity, firstIdentity);

  const event = await store.recordEvent(eventInput());
  const stats = await store.stats();
  assert.equal(event.learnerId, firstIdentity.learnerId);
  assert.equal(event.deviceId, firstIdentity.deviceId);
  assert.deepEqual(stats, { events: 1, pending: 1, acknowledged: 0 });
  assert.equal((await adapter.getEvent(event.eventId)).eventId, event.eventId);
});

test('acknowledgement keeps the event and clears only its outbox delivery', async () => {
  const { adapter, store } = setup();
  const event = await store.recordEvent(eventInput());
  await store.acknowledge([event.eventId], {
    batchId: crypto.randomUUID(),
    committedAt: '2026-08-16T01:00:01.000Z',
    contentHash: 'hash'
  });
  assert.deepEqual(await store.stats(), { events: 1, pending: 0, acknowledged: 1 });
  assert.equal((await adapter.getEvent(event.eventId)).eventId, event.eventId);
});

test('same event id with different content is a conflict', async () => {
  const { store } = setup();
  const eventId = crypto.randomUUID();
  await store.recordEvent(eventInput({ eventId, recordedAt: '2026-08-16T01:00:00.000Z' }));
  await assert.rejects(
    store.recordEvent(eventInput({
      eventId,
      recordedAt: '2026-08-16T01:00:00.000Z',
      context: { meaningSnapshot: '和平' }
    })),
    error => error.code === 'EVENT_ID_CONFLICT'
  );
});

test('failed delivery is delayed without deleting the saved event', async () => {
  const { adapter, store } = setup();
  const event = await store.recordEvent(eventInput());
  await store.markFailed([event.eventId], {
    errorCode: 'NETWORK_ERROR',
    nextAttemptAt: '2026-08-16T01:00:05.000Z'
  });
  assert.equal((await store.pendingBatch(100, '2026-08-16T01:00:04.000Z')).length, 0);
  assert.equal((await store.pendingBatch(100, '2026-08-16T01:00:05.000Z')).length, 1);
  assert.equal((await adapter.allOutbox())[0].attemptCount, 1);
});

test('review identities keep one sense and separate review units per skill', async () => {
  const { store } = setup();
  const visual = await store.ensureReviewIdentity('word-house', 'meaning_recognition');
  const output = await store.ensureReviewIdentity('word-house', 'form_recall');
  const visualAgain = await store.ensureReviewIdentity('word-house', 'meaning_recognition');
  assert.equal(visual.senseId, output.senseId);
  assert.notEqual(visual.reviewUnitId, output.reviewUnitId);
  assert.equal(visual.reviewUnitId, visualAgain.reviewUnitId);
});

test('a saved identity can seed the shared key but cannot silently replace it', async () => {
  const { store } = setup();
  const preferred = {
    senseId: crypto.randomUUID(),
    reviewUnitId: crypto.randomUUID(),
    skill: 'meaning_recognition'
  };
  const adopted = await store.ensureReviewIdentity('ru:дом|noun', 'meaning_recognition', preferred);
  assert.equal(adopted.senseId, preferred.senseId);
  assert.equal(adopted.reviewUnitId, preferred.reviewUnitId);
  await assert.rejects(
    store.ensureReviewIdentity('ru:дом|noun', 'meaning_recognition', {
      ...preferred,
      senseId: crypto.randomUUID()
    }),
    error => error.code === 'LEARNING_IDENTITY_CONFLICT' && error.field === 'senseId'
  );
});

test('unresolved identities remain stable for the same pending target', async () => {
  const { store } = setup();
  const first = await store.ensureUnresolvedIdentity('стали|chapter-1|sentence-2');
  const second = await store.ensureUnresolvedIdentity('стали|chapter-1|sentence-2');
  const elsewhere = await store.ensureUnresolvedIdentity('стали|chapter-3|sentence-8');
  assert.equal(first.unresolvedLexemeId, second.unresolvedLexemeId);
  assert.notEqual(first.unresolvedLexemeId, elsewhere.unresolvedLexemeId);
});

test('multiple local events are appended to the ledger and outbox together', async () => {
  const { store } = setup();
  const identity = await store.ensureReviewIdentity('word-house', 'meaning_recognition');
  const events = await store.recordEvents([
    eventInput({
      subject: {
        surfaceForm: 'мир', lexemeKey: 'ru:мир|noun', unresolvedLexemeId: null,
        senseId: identity.senseId, reviewUnitId: null
      },
      payload: { addMethod: 'vocabulary_first_review', initialSenseId: identity.senseId, lookupEventId: null }
    }),
    {
      eventType: 'review_attempt_completed',
      source: { module: 'vocabulary', contentId: 'word-list', location: {} },
      subject: {
        surfaceForm: 'мир', lexemeKey: 'ru:мир|noun', unresolvedLexemeId: null,
        senseId: identity.senseId, reviewUnitId: identity.reviewUnitId
      },
      context: { localDate: '2026-08-16' },
      evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
      payload: {
        testMode: 'visual', questionSnapshot: {}, answerSnapshot: {}, rawResult: 'known',
        answerRevealedBeforeResponse: false, hintType: '', responseMs: 1000,
        sameDayAttemptIndex: 1, elapsedDays: 0
      }
    }
  ]);
  assert.equal(events.length, 2);
  assert.deepEqual(await store.stats(), { events: 2, pending: 2, acknowledged: 0 });
});
