'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const EventStore = require('../js/learning-event-store');
const Projection = require('../js/vocabulary-fsrs-projection');
const ProjectionClient = require('../js/learning-projection-client');
const Schema = require('../js/learning-event-schema');
const { createLearningStore } = require('../server/learning-store');

function setup() {
  const store = EventStore.createLearningEventStore({
    adapter: EventStore.createMemoryAdapter(),
    crypto,
    now: () => new Date('2026-08-16T01:00:00.000Z')
  });
  const client = ProjectionClient.createProjectionClient({
    store,
    crypto: crypto.webcrypto,
    now: () => new Date('2026-08-16T01:00:01.000Z')
  });
  return { store, client };
}

async function recordReview(store) {
  const identity = await store.ensureReviewIdentity('ru:мир|noun', 'meaning_recognition');
  return store.recordEvent({
    eventType: 'review_attempt_completed',
    occurredAt: '2026-08-16T00:00:00.000Z',
    source: { module: 'vocabulary', contentId: 'word', location: {} },
    subject: {
      surfaceForm: 'мир', lexemeKey: 'ru:мир|noun', unresolvedLexemeId: null,
      senseId: identity.senseId, reviewUnitId: identity.reviewUnitId
    },
    context: { localDate: '2026-08-16', skill: 'meaning_recognition' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      testMode: 'visual', questionSnapshot: {}, answerSnapshot: {}, rawResult: 'known',
      answerRevealedBeforeResponse: false, hintType: '', responseMs: 900,
      sameDayAttemptIndex: 1, elapsedDays: 0
    }
  });
}

test('browser projection rebuild stores records and a deterministic checkpoint', async () => {
  const { store, client } = setup();
  await recordReview(store);
  const first = await client.rebuild();
  const second = await client.rebuild(first.checkpoint);
  assert.equal(first.records.length, 1);
  assert.equal(first.checkpoint.sourceEventCount, 1);
  assert.equal(first.checkpoint.reviewUnitCount, 1);
  assert.equal(first.checkpoint.sourceHash.length, 64);
  assert.equal(first.checkpoint.stateHash.length, 64);
  assert.deepEqual(second.checkpoint.comparison, {
    status: 'matched', matched: true, localEventCount: 1, serverEventCount: 1,
    sourceMatched: true, stateMatched: true
  });
  assert.equal((await store.projectionsByType(Projection.PROJECTION_TYPE)).length, 1);
  assert.equal((await store.projectionCheckpoint(Projection.PROJECTION_NAME)).comparison.status, 'matched');
});

test('different event counts wait for sync instead of reporting a false mismatch', async () => {
  const { client } = setup();
  const result = await client.rebuild({ sourceEventCount: 3, sourceHash: 'server', stateHash: 'server' });
  assert.deepEqual(result.checkpoint.comparison, {
    status: 'event_count_pending', matched: null, localEventCount: 0, serverEventCount: 3
  });
});

test('equal event counts with a different state hash are reported as a real mismatch', async () => {
  const { store, client } = setup();
  await recordReview(store);
  const local = await client.rebuild();
  const result = await client.rebuild({
    sourceEventCount: local.checkpoint.sourceEventCount,
    sourceHash: local.checkpoint.sourceHash,
    stateHash: '0'.repeat(64)
  });
  assert.equal(result.checkpoint.comparison.status, 'mismatch');
  assert.equal(result.checkpoint.comparison.sourceMatched, true);
  assert.equal(result.checkpoint.comparison.stateMatched, false);
});

test('browser Web Crypto and SQLite produce matching hashes for the same event ledger', async t => {
  const { store, client } = setup();
  await recordReview(store);
  const events = await store.allEvents();
  const identity = await store.identity();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-projection-compare-'));
  const sqlite = createLearningStore({
    databasePath: path.join(directory, 'compare.sqlite3'),
    now: () => new Date('2026-08-16T01:00:02.000Z')
  });
  t.after(() => {
    sqlite.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const committed = sqlite.ingestBatch({
    schema: Schema.BATCH_SCHEMA,
    schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId: crypto.randomUUID(),
    deviceId: identity.deviceId,
    events
  });
  const local = await client.rebuild(committed.projectionCheckpoint);
  assert.equal(local.checkpoint.comparison.status, 'matched');
  assert.equal(local.checkpoint.sourceHash, committed.projectionCheckpoint.sourceHash);
  assert.equal(local.checkpoint.stateHash, committed.projectionCheckpoint.stateHash);
});

test('server comparison reports only hashes, counts, device and local date for calibration', async () => {
  const { store, client } = setup();
  await recordReview(store);
  const checkpoint = (await client.rebuild()).checkpoint;
  const requests = [];
  const reportingClient = ProjectionClient.createProjectionClient({
    store,
    crypto: crypto.webcrypto,
    now: () => new Date('2026-08-16T01:00:01.000Z'),
    fetch: async function (url, options) {
      requests.push({ url, options: options || {} });
      if (url === ProjectionClient.ENDPOINT) {
        return { ok: true, json: async () => ({ ok: true, checkpoint, records: [] }) };
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          status: 'matched_learning_day',
          matched: true,
          qualifiedLearningDay: true,
          calibration: { matchedLearningDays: 1, targetLearningDays: 14, complete: false }
        })
      };
    }
  });
  const result = await reportingClient.compareServer();
  assert.equal(result.calibration.status, 'matched_learning_day');
  assert.equal(requests.length, 2);
  const report = JSON.parse(requests[1].options.body);
  assert.deepEqual(Object.keys(report).sort(), [
    'comparedAt', 'deviceId', 'localDate', 'sourceEventCount', 'sourceHash', 'stateHash'
  ]);
  assert.equal(report.localDate, '2026-08-16');
  assert.equal(report.sourceHash, checkpoint.sourceHash);
  assert.equal(report.stateHash, checkpoint.stateHash);
});
