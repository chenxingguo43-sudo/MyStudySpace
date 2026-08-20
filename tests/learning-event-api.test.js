'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Schema = require('../js/learning-event-schema');
const Transition = require('../js/vocabulary-fsrs-transition');
const { createLearningEventApi, isLoopbackAddress, isSameOrigin } = require('../server/learning-event-api');
const { createLearningStore } = require('../server/learning-store');

const IDS = Object.freeze({
  event: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  learner: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  device: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  batch: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  batch2: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
});

function makeEvent(overrides) {
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
      surfaceForm: 'дом',
      lexemeKey: 'ru:дом|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-house',
      reviewUnitId: null
    },
    context: {},
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'sense-house', lookupEventId: null },
    correctsEventId: null,
    ...overrides
  };
}

function makeBatch(batchId, events) {
  return {
    schema: Schema.BATCH_SCHEMA,
    schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId,
    deviceId: IDS.device,
    events
  };
}

async function setup(t, options) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-api-test-'));
  const store = createLearningStore({
    databasePath: path.join(directory, 'test.sqlite3'),
    now: () => new Date('2026-08-16T04:00:00.000Z')
  });
  const handler = createLearningEventApi({ store, ...(options || {}) });
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!handler(request, response, pathname)) {
      response.writeHead(404);
      response.end('Not Found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { baseUrl, store };
}

async function jsonResponse(url, options) {
  const response = await fetch(url, options);
  return { status: response.status, body: await response.json() };
}

test('loopback detection accepts local addresses and rejects LAN addresses', () => {
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('127.0.0.2'), true);
  assert.equal(isLoopbackAddress('192.168.1.20'), false);
});

test('same-origin validation also requires a local Host header', () => {
  assert.equal(isSameOrigin({ headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }), true);
  assert.equal(isSameOrigin({ headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } }), true);
  assert.equal(isSameOrigin({ headers: { host: 'example.test', origin: 'http://example.test' } }), false);
});

test('health endpoint exposes counts but no database path or learning content', async t => {
  const { baseUrl } = await setup(t);
  const result = await jsonResponse(`${baseUrl}/api/learning-store/health`);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.eventCount, 0);
  assert.equal('databasePath' in result.body, false);
});

test('FSRS projection endpoint exposes the local shadow calculation and checkpoint', async t => {
  const { baseUrl } = await setup(t);
  const result = await jsonResponse(`${baseUrl}/api/learning-projections/fsrs`);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.checkpoint.projectionVersion, 1);
  assert.equal(result.body.checkpoint.sourceEventCount, 0);
  assert.deepEqual(result.body.records, []);
});

test('comparison endpoint rejects malformed reports without changing calibration', async t => {
  const { baseUrl, store } = await setup(t);
  const result = await jsonResponse(`${baseUrl}/api/learning-projections/fsrs/comparison`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ deviceId: 'not-a-device' })
  });
  assert.equal(result.status, 422);
  assert.equal(result.body.error.code, 'INVALID_PROJECTION_COMPARISON');
  assert.equal(store.health().fsrsCalibration.matchedLearningDays, 0);
});

test('batch endpoint commits valid same-origin JSON', async t => {
  const { baseUrl, store } = await setup(t);
  const result = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify(makeBatch(IDS.batch, [makeEvent()]))
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.acceptedEventIds, [IDS.event]);
  assert.equal(store.countEvents(), 1);
});

test('invalid batches are rejected atomically with a safe validation error', async t => {
  const { baseUrl, store } = await setup(t);
  const invalid = makeBatch(IDS.batch, [makeEvent({ eventType: 'unknown_event' })]);
  const result = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify(invalid)
  });
  assert.equal(result.status, 422);
  assert.equal(result.body.error.code, 'BATCH_VALIDATION_FAILED');
  assert.equal(result.body.error.details.validationCode, 'UNSUPPORTED_EVENT_TYPE');
  assert.equal(store.countEvents(), 0);
});

test('event id conflicts return 409 and preserve the original event', async t => {
  const { baseUrl, store } = await setup(t);
  const request = batch => jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify(batch)
  });
  assert.equal((await request(makeBatch(IDS.batch, [makeEvent()]))).status, 200);
  const conflict = await request(makeBatch(IDS.batch2, [makeEvent({ context: { meaningSnapshot: '房屋' } })]));
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'EVENT_ID_CONFLICT');
  assert.equal(store.countEvents(), 1);
  assert.deepEqual(store.getEvent(IDS.event).context, {});
});

test('batch endpoint rejects cross-origin, wrong media type, and oversized bodies', async t => {
  const { baseUrl } = await setup(t, { maxBodyBytes: 128 });
  const crossOrigin = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://example.test' },
    body: '{}'
  });
  assert.equal(crossOrigin.status, 403);

  const wrongType = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', Origin: baseUrl },
    body: '{}'
  });
  assert.equal(wrongType.status, 415);

  const oversized = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ value: 'x'.repeat(200) })
  });
  assert.equal(oversized.status, 413);
});

test('legacy snapshot and JSON v2 archive endpoints round-trip with hash verification', async t => {
  const { baseUrl, store } = await setup(t);
  const headers = { 'Content-Type': 'application/json', Origin: baseUrl };
  const plan = Transition.createPlan({
    house: { mastery: 5, interval: 20, easeFactor: 2.6, history: [], nextReview: '2026-08-20' }
  }, { asOfDate: '2026-08-16' });
  const saved = await jsonResponse(`${baseUrl}/api/learning-migrations/vocabulary-legacy-snapshot`, {
    method: 'POST', headers, body: JSON.stringify(plan)
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.recordCount, 1);
  assert.equal(saved.body.duplicate, false);

  const committed = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST', headers, body: JSON.stringify(makeBatch(IDS.batch, [makeEvent()]))
  });
  assert.equal(committed.status, 200);
  const exported = await jsonResponse(`${baseUrl}/api/learning-archive/v2/export`);
  assert.equal(exported.status, 200);
  assert.equal(exported.body.archive.version, 2);
  assert.equal(exported.body.archive.events.length, 1);
  assert.equal(exported.body.archive.migrationSnapshots.length, 1);

  const imported = await jsonResponse(`${baseUrl}/api/learning-archive/v2/import`, {
    method: 'POST', headers, body: JSON.stringify(exported.body.archive)
  });
  assert.equal(imported.status, 200);
  assert.deepEqual(imported.body.duplicateEventIds, [IDS.event]);
  assert.equal(store.countEvents(), 1);

  const tampered = JSON.parse(JSON.stringify(exported.body.archive));
  tampered.events[0].context.changed = true;
  const rejected = await jsonResponse(`${baseUrl}/api/learning-archive/v2/import`, {
    method: 'POST', headers, body: JSON.stringify(tampered)
  });
  assert.equal(rejected.status, 422);
  assert.equal(rejected.body.error.code, 'INVALID_LEARNING_ARCHIVE');
  assert.equal(store.countEvents(), 1);
});

test('backup endpoints create, list, restore-verify, and unlock server readiness', async t => {
  const { baseUrl } = await setup(t);
  const headers = { 'Content-Type': 'application/json', Origin: baseUrl };
  const plan = Transition.createPlan({
    house: { mastery: 5, interval: 20, easeFactor: 2.6, history: [], nextReview: '2026-08-20' }
  }, { asOfDate: '2026-08-16' });
  assert.equal((await jsonResponse(`${baseUrl}/api/learning-migrations/vocabulary-legacy-snapshot`, {
    method: 'POST', headers, body: JSON.stringify(plan)
  })).status, 200);

  const committed = await jsonResponse(`${baseUrl}/api/learning-events/batch`, {
    method: 'POST', headers, body: JSON.stringify(makeBatch(IDS.batch, [makeEvent()]))
  });
  assert.equal(committed.status, 200);
  assert.equal(committed.body.backup.ok, true);
  assert.equal(committed.body.backup.created.length, 2);

  const listed = await jsonResponse(`${baseUrl}/api/learning-backups`);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.backups.length, 2);
  assert.equal('fileName' in listed.body.backups[0], false);

  const before = await jsonResponse(`${baseUrl}/api/learning-switch/readiness`);
  assert.equal(before.status, 200);
  assert.equal(before.body.ready, false);
  assert.equal(before.body.checks.find(check => check.id === 'backupRestore').ok, false);

  const verified = await jsonResponse(`${baseUrl}/api/learning-backups/verify-restore`, {
    method: 'POST', headers, body: JSON.stringify({ backupId: listed.body.backups[0].backupId })
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.database.eventCount, 1);

  const after = await jsonResponse(`${baseUrl}/api/learning-switch/readiness`);
  assert.equal(after.status, 200);
  assert.equal(after.body.ready, true);

  const missing = await jsonResponse(`${baseUrl}/api/learning-backups/verify-restore`, {
    method: 'POST', headers, body: JSON.stringify({ backupId: 'missing' })
  });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'BACKUP_NOT_FOUND');
});
