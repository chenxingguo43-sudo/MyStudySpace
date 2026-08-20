'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const EventStore = require('../js/learning-event-store');
const Schema = require('../js/learning-event-schema');
const SyncClient = require('../js/learning-sync-client');
const Transition = require('../js/vocabulary-fsrs-transition');
const { createLearningStore } = require('../server/learning-store');

function browserStore(clock) {
  return EventStore.createLearningEventStore({
    adapter: EventStore.createMemoryAdapter(),
    crypto,
    now: () => new Date(clock.value)
  });
}

async function addReview(store, rawResult) {
  const identity = await store.ensureReviewIdentity('ru:дом|noun', 'meaning_recognition');
  return store.recordEvent({
    eventType: 'review_attempt_completed',
    source: { module: 'vocabulary', contentId: 'house', location: {} },
    subject: {
      surfaceForm: 'дом', lexemeKey: 'ru:дом|noun', unresolvedLexemeId: null,
      senseId: identity.senseId, reviewUnitId: identity.reviewUnitId
    },
    context: { localDate: '2026-08-17', skill: 'meaning_recognition' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      testMode: 'visual', questionSnapshot: {}, answerSnapshot: {}, rawResult: rawResult || 'known',
      answerRevealedBeforeResponse: false, hintType: '', responseMs: 800,
      sameDayAttemptIndex: 1, elapsedDays: 0
    }
  });
}

function responseFor(result) {
  return {
    ok: true,
    json: async () => result
  };
}

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('browser keeps learning while Node is down and delivers automatically after recovery', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-offline-recovery-'));
  const clock = { value: '2026-08-17T02:00:00.000Z' };
  const browser = browserStore(clock);
  const event = await addReview(browser, 'known');
  let sqlite = null;
  let online = false;
  const client = SyncClient.createSyncClient({
    store: browser,
    crypto,
    now: () => new Date(clock.value),
    fetch: async (_url, request) => {
      if (!online) throw Object.assign(new Error('Node stopped'), { code: 'NODE_OFFLINE' });
      return responseFor(sqlite.ingestBatch(JSON.parse(request.body)));
    }
  });
  t.after(() => {
    if (sqlite) sqlite.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const failed = await client.syncOnce();
  assert.equal(failed.sent, false);
  assert.deepEqual(await browser.stats(), { events: 1, pending: 1, acknowledged: 0 });
  sqlite = createLearningStore({ databasePath: path.join(directory, 'offline.sqlite3'), now: () => new Date(clock.value) });
  online = true;
  clock.value = '2026-08-17T02:00:05.000Z';
  const recovered = await client.syncOnce();
  assert.equal(recovered.sent, true);
  assert.equal(sqlite.countEvents(), 1);
  assert.equal(sqlite.getEvent(event.eventId).eventId, event.eventId);
  assert.deepEqual(await browser.stats(), { events: 1, pending: 0, acknowledged: 1 });
});

test('a committed SQLite write with a lost response retries without double counting', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-lost-response-'));
  const clock = { value: '2026-08-17T02:00:00.000Z' };
  const browser = browserStore(clock);
  const event = await addReview(browser, 'fuzzy');
  const sqlite = createLearningStore({ databasePath: path.join(directory, 'lost.sqlite3'), now: () => new Date(clock.value) });
  let calls = 0;
  const client = SyncClient.createSyncClient({
    store: browser,
    crypto,
    now: () => new Date(clock.value),
    fetch: async (_url, request) => {
      calls += 1;
      const result = sqlite.ingestBatch(JSON.parse(request.body));
      if (calls === 1) throw Object.assign(new Error('response lost after commit'), { code: 'RESPONSE_LOST' });
      return responseFor(result);
    }
  });
  t.after(() => {
    sqlite.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  assert.equal((await client.syncOnce()).sent, false);
  assert.equal(sqlite.countEvents(), 1);
  clock.value = '2026-08-17T02:00:05.000Z';
  const retry = await client.syncOnce();
  assert.equal(retry.sent, true);
  assert.equal(retry.duplicates, 1);
  assert.equal(sqlite.countEvents(), 1);
  assert.equal(sqlite.getEvent(event.eventId).payload.rawResult, 'fuzzy');
});

test('database busy and an injected mid-transaction failure leave no partial batch', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-transaction-fault-'));
  const databasePath = path.join(directory, 'fault.sqlite3');
  const clock = { value: '2026-08-17T02:00:00.000Z' };
  const browser = browserStore(clock);
  const event = await addReview(browser, 'known');
  const identity = await browser.identity();
  const makeBatch = () => ({
    schema: Schema.BATCH_SCHEMA, schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId: crypto.randomUUID(), deviceId: identity.deviceId, events: [event]
  });
  let sqlite = createLearningStore({ databasePath, now: () => new Date(clock.value), busyTimeoutMs: 20 });
  const blocker = new DatabaseSync(databasePath);
  t.after(() => {
    try { blocker.close(); } catch (_error) {}
    sqlite.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  blocker.exec('BEGIN IMMEDIATE');
  assert.throws(() => sqlite.ingestBatch(makeBatch()), /busy|locked/i);
  blocker.exec('ROLLBACK');
  assert.equal(sqlite.countEvents(), 0);
  sqlite.close();

  let inject = true;
  sqlite = createLearningStore({
    databasePath,
    now: () => new Date(clock.value),
    failpoint(name) {
      if (inject && name === 'after_events_before_projection') throw new Error('simulated power loss');
    }
  });
  assert.throws(() => sqlite.ingestBatch(makeBatch()), /simulated power loss/);
  assert.equal(sqlite.countEvents(), 0);
  inject = false;
  sqlite.ingestBatch(makeBatch());
  assert.equal(sqlite.countEvents(), 1);
});

test('service restart plus JSON v2 export, clear, and import restores all hashes and snapshots', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-archive-recovery-'));
  const databasePath = path.join(directory, 'active.sqlite3');
  const restoredPath = path.join(directory, 'restored.sqlite3');
  const clock = { value: '2026-08-17T02:00:00.000Z' };
  const browser = browserStore(clock);
  const event = await addReview(browser, 'unknown');
  const identity = await browser.identity();
  let active = createLearningStore({ databasePath, now: () => new Date(clock.value) });
  let restored = null;
  t.after(() => {
    if (restored) restored.close();
    active.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  active.ingestBatch({
    schema: Schema.BATCH_SCHEMA, schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId: crypto.randomUUID(), deviceId: identity.deviceId, events: [event]
  });
  const oldRecords = {
    house: { mastery: 5, interval: 20, easeFactor: 2.6, history: [{ date: '2026-07-01', rating: 5 }], nextReview: '2026-08-20' }
  };
  const plan = Transition.createPlan(oldRecords, { asOfDate: '2026-08-17', createdAt: clock.value });
  active.saveLegacyVocabularySnapshot(plan);
  const beforeRestart = active.exportArchiveV2();
  active.close();
  active = createLearningStore({ databasePath, now: () => new Date(clock.value) });
  assert.equal(active.fsrsProjection().checkpoint.stateHash, beforeRestart.hashes.stateHash);

  const exported = active.exportArchiveV2();
  restored = createLearningStore({ databasePath: restoredPath, now: () => new Date(clock.value) });
  const result = restored.importArchiveV2(exported);
  assert.equal(result.archiveHash, exported.archiveHash);
  assert.equal(restored.countEvents(), 1);
  assert.equal(restored.fsrsProjection().checkpoint.sourceHash, exported.hashes.sourceHash);
  assert.equal(restored.fsrsProjection().checkpoint.stateHash, exported.hashes.stateHash);
  const restoredArchive = restored.exportArchiveV2();
  assert.deepEqual(restoredArchive.migrationSnapshots[0].snapshot, plan);
  assert.equal(restoredArchive.migrationSnapshots[0].contentHash, exported.migrationSnapshots[0].contentHash);

  const tampered = JSON.parse(JSON.stringify(exported));
  tampered.events[0].payload.rawResult = 'known';
  assert.throws(() => restored.importArchiveV2(tampered), /archive hash does not match/);
  assert.equal(restored.countEvents(), 1);
});

test('turning the new channel off returns to untouched legacy browser progress', () => {
  const oldRecords = {
    house: { mastery: 5, interval: 20, easeFactor: 2.6, history: [{ date: '2026-07-01', rating: 5 }], nextReview: '2026-08-20' }
  };
  const storage = memoryStorage({ 'vocabulary-review-records': JSON.stringify(oldRecords) });
  const plan = Transition.ensurePlan(storage, oldRecords, { asOfDate: '2026-08-17' });
  storage.setItem(Transition.CHANNEL_KEY, Transition.FSRS_CHANNEL);
  assert.equal(Transition.channel(storage), Transition.FSRS_CHANNEL);
  storage.removeItem(Transition.CHANNEL_KEY);
  assert.equal(Transition.channel(storage), Transition.LEGACY_CHANNEL);
  assert.deepEqual(JSON.parse(storage.getItem('vocabulary-review-records')), oldRecords);
  assert.deepEqual(plan.words[0].legacy.fullRecord, oldRecords.house);
});
