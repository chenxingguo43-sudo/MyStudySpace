'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const EventStore = require('../js/learning-event-store');
const SyncClient = require('../js/learning-sync-client');

function createStore(clock) {
  return EventStore.createLearningEventStore({
    adapter: EventStore.createMemoryAdapter(),
    crypto,
    now: () => new Date(clock.value)
  });
}

async function addEvent(store) {
  return store.recordEvent({
    eventType: 'vocabulary_entry_added',
    source: { module: 'vocabulary', contentId: 'word-list', location: {} },
    subject: {
      surfaceForm: 'дом',
      lexemeKey: 'ru:дом|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-house',
      reviewUnitId: null
    },
    context: {},
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'sense-house', lookupEventId: null }
  });
}

test('a complete SQLite acknowledgement clears the browser outbox', async () => {
  const clock = { value: '2026-08-16T02:00:00.000Z' };
  const store = createStore(clock);
  const event = await addEvent(store);
  let sentBatch;
  const client = SyncClient.createSyncClient({
    store,
    crypto,
    now: () => new Date(clock.value),
    fetch: async (_url, request) => {
      sentBatch = JSON.parse(request.body);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          batchId: sentBatch.batchId,
          committedAt: '2026-08-16T02:00:01.000Z',
          acceptedEventIds: [event.eventId],
          duplicateEventIds: [],
          contentHash: 'batch-hash'
        })
      };
    }
  });
  assert.deepEqual(await client.syncOnce(), { sent: true, accepted: 1, duplicates: 0 });
  assert.equal(sentBatch.events[0].eventId, event.eventId);
  assert.deepEqual(await store.stats(), { events: 1, pending: 0, acknowledged: 1 });
});

test('an incomplete acknowledgement keeps the event for retry', async () => {
  const clock = { value: '2026-08-16T02:00:00.000Z' };
  const store = createStore(clock);
  await addEvent(store);
  const client = SyncClient.createSyncClient({
    store,
    crypto,
    now: () => new Date(clock.value),
    fetch: async () => ({
      ok: true,
      json: async () => ({ ok: true, acceptedEventIds: [], duplicateEventIds: [] })
    })
  });
  const result = await client.syncOnce();
  assert.equal(result.sent, false);
  assert.equal(result.errorCode, 'INCOMPLETE_ACK');
  assert.equal(result.retryAfterMs, 5000);
  assert.deepEqual(await store.stats(), { events: 1, pending: 1, acknowledged: 0 });
});

test('a lost response can be retried and acknowledged as a duplicate', async () => {
  const clock = { value: '2026-08-16T02:00:00.000Z' };
  const store = createStore(clock);
  const event = await addEvent(store);
  let calls = 0;
  const client = SyncClient.createSyncClient({
    store,
    crypto,
    now: () => new Date(clock.value),
    fetch: async (_url, request) => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('response lost'), { code: 'NETWORK_ERROR' });
      const batch = JSON.parse(request.body);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          batchId: batch.batchId,
          committedAt: '2026-08-16T02:00:01.000Z',
          acceptedEventIds: [],
          duplicateEventIds: [event.eventId],
          contentHash: 'batch-hash'
        })
      };
    }
  });
  assert.equal((await client.syncOnce()).sent, false);
  clock.value = '2026-08-16T02:00:05.000Z';
  assert.deepEqual(await client.syncOnce(), { sent: true, accepted: 0, duplicates: 1 });
  assert.deepEqual(await store.stats(), { events: 1, pending: 0, acknowledged: 1 });
});

test('retry delays stop growing after thirty minutes', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 99].map(SyncClient.nextRetryDelay), [0, 5000, 15000, 60000, 300000, 1800000, 1800000]);
});

test('starting before a delayed retry is due schedules the remaining wait', async () => {
  const clock = { value: '2026-08-16T02:00:00.000Z' };
  const store = createStore(clock);
  const event = await addEvent(store);
  await store.markFailed([event.eventId], {
    errorCode: 'NETWORK_ERROR',
    nextAttemptAt: '2026-08-16T02:00:05.000Z'
  });
  const delays = [];
  const client = SyncClient.createSyncClient({
    store,
    crypto,
    now: () => new Date(clock.value),
    fetch: async () => { throw new Error('should not send before due'); },
    setTimeout: (_callback, delay) => { delays.push(delay); return delays.length; },
    clearTimeout: () => {}
  });
  client.start();
  assert.deepEqual(await client.syncOnce(), { sent: false, reason: 'empty' });
  assert.deepEqual(delays, [0, 5000]);
  client.stop();
});
