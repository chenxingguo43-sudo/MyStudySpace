'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Schema = require('../js/learning-event-schema');
const EventStore = require('../js/learning-event-store');
const SyncClient = require('../js/learning-sync-client');
const Transition = require('../js/vocabulary-fsrs-transition');
const { createLearningStore, fileSha256 } = require('../server/learning-store');

function event(id, batchDevice, occurredAt) {
  return {
    schema: Schema.EVENT_SCHEMA,
    schemaVersion: Schema.EVENT_SCHEMA_VERSION,
    eventId: id,
    learnerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    deviceId: batchDevice,
    eventType: 'vocabulary_entry_added',
    occurredAt,
    recordedAt: occurredAt,
    receivedAt: null,
    source: { module: 'vocabulary', contentId: 'backup-test', location: {} },
    subject: {
      surfaceForm: 'дом', lexemeKey: 'ru:дом|noun', unresolvedLexemeId: null,
      senseId: 'house', reviewUnitId: null
    },
    context: { localDate: occurredAt.slice(0, 10) },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'house', lookupEventId: null },
    correctsEventId: null
  };
}

function batch(batchId, eventValue) {
  return {
    schema: Schema.BATCH_SCHEMA,
    schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId,
    deviceId: eventValue.deviceId,
    events: [eventValue]
  };
}

function setup(t, options) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-backup-test-'));
  const store = createLearningStore({
    databasePath: path.join(directory, 'learning.sqlite3'),
    automaticBackups: false,
    ...(options || {})
  });
  t.after(() => {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { directory, store };
}

test('a verified backup restores into an independent database with matching hashes', async t => {
  const now = new Date('2026-08-17T02:00:00.000Z');
  const { directory, store } = setup(t, { now: () => now });
  const device = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  store.ingestBatch(batch(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', device, '2026-08-17T10:00:00.000+08:00')
  ));
  const plan = Transition.createPlan({ house: { mastery: 5, nextReview: '2026-08-20' } }, {
    asOfDate: '2026-08-17', createdAt: now.toISOString()
  });
  store.saveLegacyVocabularySnapshot(plan);

  const backup = await store.createBackup({ kind: 'daily' });
  assert.equal(backup.verifiedAt, null);
  const filePath = path.join(directory, 'backups', `daily-20260817020000-${backup.backupId}.sqlite3`);
  assert.equal(fileSha256(filePath), backup.contentHash);

  const restored = await store.verifyRestore(backup.backupId);
  assert.equal(restored.database.eventCount, 1);
  assert.equal(restored.database.sourceEventCount, 1);
  assert.match(restored.database.sourceHash, /^[0-9a-f]{64}$/);
  assert.match(restored.database.stateHash, /^[0-9a-f]{64}$/);
  assert.equal(restored.backup.verifiedAt, now.toISOString());
  assert.equal(store.switchReadiness().ready, true);
});

test('tampering with a backup is rejected and never touches the live database', async t => {
  const now = new Date('2026-08-17T02:00:00.000Z');
  const { directory, store } = setup(t, { now: () => now });
  const backup = await store.createBackup({ kind: 'daily' });
  const filePath = path.join(directory, 'backups', `daily-20260817020000-${backup.backupId}.sqlite3`);
  fs.appendFileSync(filePath, Buffer.from('tampered'));
  await assert.rejects(store.verifyRestore(backup.backupId), error => error.code === 'BACKUP_HASH_MISMATCH');
  assert.equal(store.countEvents(), 0);
  assert.equal(store.health().ok, true);
});

test('retention keeps only 7 daily and 4 weekly verified files', async t => {
  let now = new Date('2026-01-01T00:00:00.000Z');
  const { directory, store } = setup(t, { now: () => now });
  for (let index = 0; index < 9; index += 1) {
    now = new Date(Date.UTC(2026, 0, index + 1));
    await store.createBackup({ kind: 'daily' });
  }
  for (let index = 0; index < 6; index += 1) {
    now = new Date(Date.UTC(2026, 1, index * 7 + 1));
    await store.createBackup({ kind: 'weekly' });
  }
  const backups = store.listBackups();
  assert.equal(backups.filter(item => item.kind === 'daily').length, 7);
  assert.equal(backups.filter(item => item.kind === 'weekly').length, 4);
  assert.equal(fs.readdirSync(path.join(directory, 'backups')).filter(name => name.endsWith('.sqlite3')).length, 11);
});

test('automatic backup cadence is daily and weekly without using system time', async t => {
  let now = new Date('2026-08-01T00:00:00.000Z');
  const { store } = setup(t, { now: () => now, automaticBackups: true });
  const first = await store.maybeCreateAutomaticBackups();
  assert.deepEqual(first.created.map(item => item.kind), ['daily', 'weekly']);
  now = new Date('2026-08-01T23:00:00.000Z');
  assert.equal((await store.maybeCreateAutomaticBackups()).created.length, 0);
  now = new Date('2026-08-02T01:00:00.000Z');
  assert.deepEqual((await store.maybeCreateAutomaticBackups()).created.map(item => item.kind), ['daily']);
  now = new Date('2026-08-09T02:00:00.000Z');
  assert.deepEqual((await store.maybeCreateAutomaticBackups()).created.map(item => item.kind), ['daily', 'weekly']);
});

test('a backup failure does not roll back an already committed learning event', async t => {
  let failBackup = false;
  const { store } = setup(t, {
    now: () => new Date('2026-08-17T02:00:00.000Z'),
    failpoint(name) {
      if (failBackup && name === 'after_backup_temp') throw new Error('simulated backup interruption');
    }
  });
  const device = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  store.ingestBatch(batch(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', device, '2026-08-17T10:00:00.000+08:00')
  ));
  failBackup = true;
  await assert.rejects(store.createBackup({ kind: 'daily' }), /simulated backup interruption/);
  assert.equal(store.countEvents(), 1);
  assert.equal(store.health().ok, true);
  assert.equal(store.switchReadiness().ready, false);
  assert.equal(store.switchReadiness().lastBackupError.code, 'BACKUP_FAILED');
});

test('verified backup is copied to the secondary location with an external recovery manifest', async t => {
  const now = new Date('2026-08-17T02:00:00.000Z');
  const { directory, store } = setup(t, { now: () => now });
  const backup = await store.createBackup({ kind: 'daily' });
  await store.verifyRestore(backup.backupId);

  const secondaryNames = fs.readdirSync(path.join(directory, 'secondary-backups'));
  const sqliteName = secondaryNames.find(name => name.endsWith('.sqlite3'));
  const manifestName = secondaryNames.find(name => name.endsWith('.sqlite3.verified.json'));
  assert.ok(sqliteName);
  assert.equal(manifestName, `${sqliteName}.verified.json`);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'secondary-backups', manifestName), 'utf8'));
  assert.equal(manifest.backupId, backup.backupId);
  assert.equal(manifest.contentHash, fileSha256(path.join(directory, 'secondary-backups', sqliteName)));
  assert.equal(store.switchReadiness().checks.find(check => check.id === 'secondaryBackup').ok, true);
});

test('corrupt database is quarantined, restored from a verified backup, then accepts browser catch-up', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-corrupt-recovery-'));
  const databasePath = path.join(directory, 'learning.sqlite3');
  const now = new Date('2026-08-17T02:00:00.000Z');
  const browser = EventStore.createLearningEventStore({
    adapter: EventStore.createMemoryAdapter(), crypto, now: () => now
  });
  const identity = await browser.identity();
  const device = identity.deviceId;
  const first = event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', device, '2026-08-17T10:00:00.000+08:00');
  const afterBackup = event('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', device, '2026-08-17T11:00:00.000+08:00');
  first.learnerId = identity.learnerId;
  afterBackup.learnerId = identity.learnerId;
  let store = createLearningStore({ databasePath, automaticBackups: false, now: () => now });
  t.after(() => {
    if (store) store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  store.ingestBatch(batch('dddddddd-dddd-4ddd-8ddd-dddddddddddd', first));
  const backup = await store.createBackup({ kind: 'daily' });
  await store.verifyRestore(backup.backupId);
  await browser.recordEvent(afterBackup);
  store.ingestBatch(batch('ffffffff-ffff-4fff-8fff-ffffffffffff', afterBackup));
  assert.equal(store.countEvents(), 2);
  store.close();
  store = null;
  fs.writeFileSync(databasePath, Buffer.from('deliberately corrupt sqlite sample'));

  store = createLearningStore({ databasePath, automaticBackups: false, now: () => now });
  assert.equal(store.recoveryStatus.performed, true);
  assert.equal(store.recoveryStatus.backupId, backup.backupId);
  assert.equal(store.countEvents(), 1);
  const quarantined = path.join(store.recoveryStatus.quarantineDirectory, path.basename(databasePath));
  assert.equal(fs.readFileSync(quarantined, 'utf8'), 'deliberately corrupt sqlite sample');

  const syncClient = SyncClient.createSyncClient({
    store: browser,
    crypto,
    now: () => now,
    fetch: async (_url, request) => ({
      ok: true,
      json: async () => store.ingestBatch(JSON.parse(request.body))
    })
  });
  const catchUp = await syncClient.syncOnce();
  assert.equal(catchUp.sent, true);
  assert.deepEqual(await browser.stats(), { events: 1, pending: 0, acknowledged: 1 });
  assert.equal(store.countEvents(), 2);
  assert.equal(store.health().recovery.performed, true);
});

test('a damaged newer backup is skipped in favor of the previous verified backup', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-backup-fallback-'));
  const databasePath = path.join(directory, 'learning.sqlite3');
  let now = new Date('2026-08-17T02:00:00.000Z');
  const device = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  let store = createLearningStore({ databasePath, automaticBackups: false, now: () => now });
  t.after(() => {
    if (store) store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  store.ingestBatch(batch(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', device, '2026-08-17T10:00:00.000+08:00')
  ));
  const older = await store.createBackup({ kind: 'daily' });
  await store.verifyRestore(older.backupId);
  now = new Date('2026-08-18T02:00:00.000Z');
  store.ingestBatch(batch(
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    event('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', device, '2026-08-18T10:00:00.000+08:00')
  ));
  const newer = await store.createBackup({ kind: 'daily' });
  await store.verifyRestore(newer.backupId);
  store.close();
  store = null;

  for (const location of ['backups', 'secondary-backups']) {
    const target = fs.readdirSync(path.join(directory, location))
      .find(name => name.includes(newer.backupId) && name.endsWith('.sqlite3'));
    fs.appendFileSync(path.join(directory, location, target), Buffer.from('tampered'));
  }
  fs.writeFileSync(databasePath, Buffer.from('corrupt active database'));
  store = createLearningStore({ databasePath, automaticBackups: false, now: () => now });
  assert.equal(store.recoveryStatus.backupId, older.backupId);
  assert.equal(store.countEvents(), 1);
});

test('recovery failure rolls quarantine moves back and never replaces the damaged database', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-recovery-rollback-'));
  const databasePath = path.join(directory, 'learning.sqlite3');
  const now = new Date('2026-08-17T02:00:00.000Z');
  let store = createLearningStore({ databasePath, automaticBackups: false, now: () => now });
  t.after(() => {
    if (store) store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const backup = await store.createBackup({ kind: 'daily' });
  await store.verifyRestore(backup.backupId);
  store.close();
  store = null;
  fs.writeFileSync(databasePath, Buffer.from('corrupt but must remain recoverable'));

  assert.throws(() => createLearningStore({
    databasePath,
    automaticBackups: false,
    now: () => now,
    failpoint(name) {
      if (name === 'after_database_quarantine') throw new Error('simulated restore interruption');
    }
  }), error => error.code === 'DATABASE_RECOVERY_FAILED');
  assert.equal(fs.readFileSync(databasePath, 'utf8'), 'corrupt but must remain recoverable');
});

test('corrupt database without a verified backup is left untouched and startup stops', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-no-backup-'));
  const databasePath = path.join(directory, 'learning.sqlite3');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(databasePath, Buffer.from('only copy of corrupt data'));
  assert.throws(() => createLearningStore({
    databasePath,
    automaticBackups: false,
    now: () => new Date('2026-08-17T02:00:00.000Z')
  }), error => error.code === 'CORRUPT_DATABASE_NO_VERIFIED_BACKUP');
  assert.equal(fs.readFileSync(databasePath, 'utf8'), 'only copy of corrupt data');
  assert.equal(fs.existsSync(path.join(directory, 'quarantine')), false);
});
