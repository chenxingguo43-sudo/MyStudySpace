'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Activity = require('../js/study-activity-store');

test('activity records normalize stable fields and local dates', () => {
  const record = Activity.normalizeRecord({
    module: 'reader',
    action: 'study',
    startedAt: '2026-08-07T15:55:00.000Z',
    durationSec: 12.8,
    content: { itemIds: ['chapter-1', 'chapter-1', ''] }
  });
  assert.equal(record.schema, 'belye-nochi-study-activity/v1');
  assert.equal(record.localDate, '2026-08-07');
  assert.deepEqual(record.content.itemIds, ['chapter-1']);
  assert.equal(record.durationSec, 12);
});

test('activity store updates one session instead of duplicating checkpoints', async () => {
  const store = Activity.createStore({ adapter: createMemoryAdapter() });
  const session = await store.startSession({ module: 'reader', startedAt: '2026-08-07T01:00:00.000Z' });
  await store.checkpoint(session.id, { durationSec: 30 });
  const finished = await store.finishSession(session.id, {
    durationSec: 90,
    completedCount: 1,
    content: { itemIds: ['reading:ch0001'] },
    endedAt: '2026-08-07T01:02:00.000Z'
  });
  const records = await store.queryRange('2026-08-07');
  assert.equal(records.length, 1);
  assert.equal(finished.durationSec, 90);
  assert.equal((await store.aggregateDay('2026-08-07')).totalDurationSec, 90);
});

test('daily aggregation deduplicates completed content and keeps attempts', async () => {
  const store = Activity.createStore({ adapter: createMemoryAdapter() });
  await store.appendLegacyEvent({
    module: 'vocabulary', action: 'review', localDate: '2026-08-07', durationSec: 20,
    attemptCount: 3, completedCount: 1, content: { itemIds: ['word:1'] }
  });
  await store.appendLegacyEvent({
    module: 'vocabulary', action: 'review', localDate: '2026-08-07', durationSec: 30,
    attemptCount: 1, completedCount: 1, content: { itemIds: ['word:1'] }
  });
  const summary = await store.aggregateDay('2026-08-07');
  assert.equal(summary.totalDurationSec, 50);
  assert.equal(summary.attempts, 4);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.byModule.vocabulary.completedCount, 1);
  assert.equal(summary.byModule.vocabulary.durationSec, 50);
});

test('local date shifting is stable across month and year boundaries', () => {
  assert.equal(Activity.shiftLocalDate('2026-08-01', -1), '2026-07-31');
  assert.equal(Activity.shiftLocalDate('2027-01-01', -6), '2026-12-26');
});

test('retracted records disappear from default queries and aggregates', async () => {
  const store = Activity.createStore({ adapter: createMemoryAdapter() });
  const record = await store.appendLegacyEvent({ module: 'b2', action: 'submit', localDate: '2026-08-07', completedCount: 1, content: { itemIds: ['b2:q1'] } });
  await store.retract(record.id, 'manual correction');
  assert.equal((await store.queryRange('2026-08-07')).length, 0);
  assert.equal((await store.aggregateDay('2026-08-07')).completedCount, 0);
});

test('recordEvent stores a live exact activity event', async () => {
  const store = Activity.createStore({ adapter: createMemoryAdapter() });
  const record = await store.recordEvent({
    module: 'vocabulary', action: 'review', attemptCount: 1, completedCount: 1,
    content: { itemIds: ['vocabulary:word-1'] }
  });
  assert.equal(record.kind, 'event');
  assert.equal(record.capture.mode, 'live');
  assert.equal(record.quality.timePrecision, 'exact');
  assert.equal(record.attemptCount, 1);
});

function createMemoryAdapter() {
  const records = new Map();
  return {
    async get(id) { return records.get(id) || null; },
    async put(record) { records.set(record.id, record); return record; },
    async all() { return [...records.values()]; }
  };
}
