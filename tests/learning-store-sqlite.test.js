'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const Schema = require('../js/learning-event-schema');
const { createLearningStore } = require('../server/learning-store');

const IDS = Object.freeze({
  event: '11111111-1111-4111-8111-111111111111',
  learner: '22222222-2222-4222-8222-222222222222',
  device: '33333333-3333-4333-8333-333333333333',
  batch: '44444444-4444-4444-8444-444444444444',
  batch2: '55555555-5555-4555-8555-555555555555'
});

function event(overrides) {
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
      surfaceForm: 'мир',
      lexemeKey: 'ru:мир|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-world',
      reviewUnitId: null
    },
    context: { meaningSnapshot: '世界' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'sense-world', lookupEventId: null },
    correctsEventId: null,
    ...overrides
  };
}

function batch(batchId, events) {
  return {
    schema: Schema.BATCH_SCHEMA,
    schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId,
    deviceId: IDS.device,
    events
  };
}

function reviewEvent(overrides) {
  return event({
    eventId: '66666666-6666-4666-8666-666666666666',
    eventType: 'review_attempt_completed',
    subject: {
      surfaceForm: 'мир', lexemeKey: 'ru:мир|noun', unresolvedLexemeId: null,
      senseId: 'sense-world', reviewUnitId: 'review-world'
    },
    context: { localDate: '2026-08-16', skill: 'meaning_recognition' },
    payload: {
      testMode: 'visual', questionSnapshot: {}, answerSnapshot: {}, rawResult: 'known',
      answerRevealedBeforeResponse: false, hintType: '', responseMs: 900,
      sameDayAttemptIndex: 1, elapsedDays: 0
    },
    ...overrides
  });
}

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-learning-test-'));
  const store = createLearningStore({
    databasePath: path.join(directory, 'test.sqlite3'),
    now: () => new Date('2026-08-16T03:00:00.000Z')
  });
  t.after(() => {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return store;
}

test('SQLite commits a valid batch and reports a healthy writable store', t => {
  const store = setup(t);
  const result = store.ingestBatch(batch(IDS.batch, [event()]));
  assert.equal(result.committedAt, '2026-08-16T03:00:00.000Z');
  assert.deepEqual(result.acceptedEventIds, [IDS.event]);
  assert.deepEqual(result.duplicateEventIds, []);
  assert.equal(store.countEvents(), 1);
  assert.equal(store.getEvent(IDS.event).receivedAt, '2026-08-16T03:00:00.000Z');
  assert.deepEqual(store.health(), {
    ok: true,
    writable: true,
    schemaVersion: 2,
    eventCount: 1,
    projectionCount: 0,
    latestCommitAt: '2026-08-16T03:00:00.000Z',
    latestBackupAt: null,
    secondaryBackupReady: false,
    recovery: { performed: false, reason: 'new-database' },
    fsrsProjection: {
      projectionVersion: 1,
      sourceEventCount: 1,
      reviewUnitCount: 0,
      rebuiltAt: '2026-08-16T03:00:00.000Z'
    },
    fsrsCalibration: {
      matchedLearningDays: 0,
      targetLearningDays: 14,
      firstMatchedDate: null,
      latestMatchedDate: null,
      complete: false
    }
  });
});

test('repeating the same batch is idempotent and keeps its original commit time', t => {
  const store = setup(t);
  const first = store.ingestBatch(batch(IDS.batch, [event()]));
  const repeated = store.ingestBatch(batch(IDS.batch, [event()]));
  assert.equal(repeated.committedAt, first.committedAt);
  assert.deepEqual(repeated.acceptedEventIds, []);
  assert.deepEqual(repeated.duplicateEventIds, [IDS.event]);
  assert.equal(store.countEvents(), 1);
});

test('the same batch id with different content is rejected as a conflict', t => {
  const store = setup(t);
  store.ingestBatch(batch(IDS.batch, [event()]));
  assert.throws(
    () => store.ingestBatch(batch(IDS.batch, [event({ context: { meaningSnapshot: '和平' } })])),
    error => error.code === 'BATCH_ID_CONFLICT'
  );
  assert.equal(store.countEvents(), 1);
  assert.equal(store.getEvent(IDS.event).context.meaningSnapshot, '世界');
});

test('one invalid event rejects an otherwise valid batch before any row is written', t => {
  const store = setup(t);
  assert.throws(
    () => store.ingestBatch(batch(IDS.batch, [event(), event({
      eventId: '77777777-7777-4777-8777-777777777777',
      eventType: 'unsupported_event'
    })])),
    error => error.code === 'UNSUPPORTED_EVENT_TYPE'
  );
  assert.equal(store.countEvents(), 0);
});

test('the same event in a new batch is acknowledged as a duplicate', t => {
  const store = setup(t);
  store.ingestBatch(batch(IDS.batch, [event()]));
  const repeated = store.ingestBatch(batch(IDS.batch2, [event()]));
  assert.deepEqual(repeated.acceptedEventIds, []);
  assert.deepEqual(repeated.duplicateEventIds, [IDS.event]);
  assert.equal(store.countEvents(), 1);
});

test('an event id conflict rejects the whole batch without overwriting history', t => {
  const store = setup(t);
  store.ingestBatch(batch(IDS.batch, [event()]));
  assert.throws(
    () => store.ingestBatch(batch(IDS.batch2, [event({ context: { meaningSnapshot: '和平' } })])),
    error => error.code === 'EVENT_ID_CONFLICT'
  );
  assert.equal(store.countEvents(), 1);
  assert.equal(store.getEvent(IDS.event).context.meaningSnapshot, '世界');
});

test('SQLite rebuilds the FSRS shadow projection in the same commit as review events', t => {
  const store = setup(t);
  const result = store.ingestBatch(batch(IDS.batch, [reviewEvent()]));
  assert.equal(result.projectionCheckpoint.sourceEventCount, 1);
  assert.equal(result.projectionCheckpoint.reviewUnitCount, 1);
  const projection = store.fsrsProjection('2026-08-16T03:00:00.000Z');
  assert.equal(projection.records.length, 1);
  assert.equal(projection.records[0].reviewUnitId, 'review-world');
  assert.equal(projection.records[0].lastRating, 'Good');
  assert.equal(projection.records[0].nextReviewDate, '2026-08-19');
  assert.equal(projection.records[0].masteryLevel, 'initial');
  assert.equal(projection.records[0].retrievability, 1);
  assert.equal(projection.records[0].due, false);
});

test('a matching browser checkpoint counts once only when that device really learned that day', t => {
  const store = setup(t);
  const committed = store.ingestBatch(batch(IDS.batch, [reviewEvent()]));
  const report = {
    deviceId: IDS.device,
    localDate: '2026-08-16',
    comparedAt: '2026-08-16T03:00:01.000Z',
    sourceEventCount: committed.projectionCheckpoint.sourceEventCount,
    sourceHash: committed.projectionCheckpoint.sourceHash,
    stateHash: committed.projectionCheckpoint.stateHash
  };
  const first = store.recordProjectionComparison(report);
  const repeated = store.recordProjectionComparison({ ...report, comparedAt: '2026-08-16T03:00:02.000Z' });
  assert.equal(first.status, 'matched_learning_day');
  assert.equal(first.qualifiedLearningDay, true);
  assert.equal(repeated.calibration.matchedLearningDays, 1);
  assert.equal(store.health().projectionCount, 1);
  assert.deepEqual(store.health().fsrsCalibration, {
    matchedLearningDays: 1,
    targetLearningDays: 14,
    firstMatchedDate: '2026-08-16',
    latestMatchedDate: '2026-08-16',
    complete: false
  });
});

test('a matching refresh without a real event on that device does not count as a learning day', t => {
  const store = setup(t);
  const committed = store.ingestBatch(batch(IDS.batch, [reviewEvent()]));
  const result = store.recordProjectionComparison({
    deviceId: '77777777-7777-4777-8777-777777777777',
    localDate: '2026-08-16',
    comparedAt: '2026-08-16T03:00:01.000Z',
    sourceEventCount: committed.projectionCheckpoint.sourceEventCount,
    sourceHash: committed.projectionCheckpoint.sourceHash,
    stateHash: committed.projectionCheckpoint.stateHash
  });
  assert.equal(result.status, 'matched_without_learning');
  assert.equal(result.calibration.matchedLearningDays, 0);
});

test('opening a schema v1 database adds the projection state hash without losing rows', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-learning-migration-'));
  const databasePath = path.join(directory, 'legacy.sqlite3');
  const legacy = new DatabaseSync(databasePath);
  legacy.exec(`
    CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    INSERT INTO schema_migrations(version, applied_at) VALUES (1, '2026-08-16T00:00:00.000Z');
    CREATE TABLE projection_checkpoints (
      projection_name TEXT PRIMARY KEY,
      projection_version INTEGER NOT NULL,
      source_event_count INTEGER NOT NULL,
      source_hash TEXT NOT NULL,
      rebuilt_at TEXT NOT NULL
    );
  `);
  legacy.close();
  const store = createLearningStore({ databasePath, now: () => new Date('2026-08-16T03:00:00.000Z') });
  t.after(() => {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  assert.equal(store.health().schemaVersion, 2);
  assert.equal(store.health().eventCount, 0);
  assert.equal(store.health().fsrsProjection.sourceEventCount, 0);
});

module.exports = { IDS, batch, event };
