'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const Schema = require('../js/learning-event-schema');
const Transition = require('../js/vocabulary-fsrs-transition');
const SchedulingControl = require('../js/vocabulary-scheduling-control');

function storage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function response(body, status) {
  return { ok: !status || status < 400, status: status || 200, async json() { return body; } };
}

function serverReadiness(ready) {
  return {
    ok: true,
    ready,
    checks: [
      { id: 'database', ok: true, message: '数据库完整且可写' },
      { id: 'projection', ok: true, message: 'FSRS 对照状态已生成' },
      { id: 'legacySnapshot', ok: true, message: '旧进度快照已保存' },
      { id: 'backupRestore', ok: ready, message: ready ? '备份可恢复' : '还没有可恢复备份' },
      { id: 'parameters', ok: true, message: '固定参数集' }
    ]
  };
}

function create(options) {
  const state = options || {};
  return SchedulingControl.createControl({
    storage: state.storage,
    eventStore: { async stats() { return { events: 4, pending: state.pending || 0, acknowledged: 4 }; } },
    syncClient: { async syncOnce() { return { sent: false, reason: 'empty' }; } },
    projectionClient: {
      async compareServer() {
        return { checkpoint: { comparison: { status: state.matched === false ? 'mismatch' : 'matched', matched: state.matched !== false } } };
      }
    },
    getLegacySnapshot() { return state.snapshot === false ? { ok: false } : { ok: true }; },
    confirmEnable: state.confirmEnable || (() => true),
    onChannelChange: state.onChannelChange,
    async fetch(url) {
      if (url === SchedulingControl.READINESS_ENDPOINT) return response(serverReadiness(state.serverReady !== false));
      if (url === SchedulingControl.BACKUP_CREATE_ENDPOINT) {
        state.created = true;
        return response({ ok: true, backup: { backupId: 'backup-1' } });
      }
      if (url === SchedulingControl.BACKUP_VERIFY_ENDPOINT) {
        state.verified = true;
        state.serverReady = true;
        return response({ ok: true });
      }
      return response({ ok: false }, 404);
    }
  });
}

test('pending events, hash mismatch, or missing backup each block FSRS enablement', async () => {
  for (const blocked of [
    { pending: 1 },
    { matched: false },
    { serverReady: false }
  ]) {
    const localStorage = storage({ 'vocabulary-review-records': '{"house":{"mastery":5}}' });
    const control = create({ ...blocked, storage: localStorage });
    await assert.rejects(control.enable(), error => error.code === 'SWITCH_NOT_READY');
    assert.equal(control.selectedChannel(), Transition.LEGACY_CHANNEL);
  }
});

test('all green checks enable FSRS, while disable preserves the old progress verbatim', async () => {
  const legacy = '{"house":{"mastery":5,"nextReview":"2026-08-20"}}';
  const localStorage = storage({ 'vocabulary-review-records': legacy });
  const changes = [];
  const control = create({ storage: localStorage, onChannelChange(channel) { changes.push(channel); } });
  assert.equal((await control.enable()).channel, Transition.FSRS_CHANNEL);
  assert.equal(control.selectedChannel(), Transition.FSRS_CHANNEL);
  assert.equal(localStorage.getItem('vocabulary-review-records'), legacy);
  control.disable();
  assert.equal(control.selectedChannel(), Transition.LEGACY_CHANNEL);
  assert.equal(localStorage.getItem('vocabulary-review-records'), legacy);
  assert.deepEqual(changes, [Transition.FSRS_CHANNEL, Transition.LEGACY_CHANNEL]);
});

test('backup preparation creates and restore-verifies an isolated backup before readiness', async () => {
  const state = { storage: storage(), serverReady: false };
  const result = await create(state).prepareBackup();
  assert.equal(state.created, true);
  assert.equal(state.verified, true);
  assert.equal(result.ready, true);
});

test('browser ledger recovery verifies the server archive and acknowledges historical devices without resending', async () => {
  const historical = Schema.normalizeLearningEvent({
    schema: Schema.EVENT_SCHEMA,
    schemaVersion: Schema.EVENT_SCHEMA_VERSION,
    eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    learnerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    deviceId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    eventType: 'vocabulary_entry_added',
    occurredAt: '2026-08-16T08:00:00.000+08:00',
    recordedAt: '2026-08-16T00:00:00.100Z',
    receivedAt: '2026-08-16T00:00:01.000Z',
    source: { module: 'vocabulary', contentId: 'recovery-test', location: {} },
    subject: {
      surfaceForm: 'дом', lexemeKey: 'ru:дом|noun', unresolvedLexemeId: null,
      senseId: 'house', reviewUnitId: null
    },
    context: {},
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'manual', initialSenseId: 'house', lookupEventId: null },
    correctsEventId: null
  });
  const archiveBody = {
    schema: 'belye-nochi-learning-archive', version: 2, databaseSchemaVersion: 2,
    exportedAt: '2026-08-17T00:00:00.000Z', events: [historical], migrationSnapshots: [],
    hashes: { sourceHash: 'a'.repeat(64), stateHash: 'b'.repeat(64) }
  };
  const archive = {
    ...archiveBody,
    archiveHash: crypto.createHash('sha256').update(Schema.canonicalStringify(archiveBody), 'utf8').digest('hex')
  };
  const events = [];
  let pending = 0;
  let acknowledged = 0;
  let syncCalls = 0;
  const control = SchedulingControl.createControl({
    storage: storage(),
    eventStore: {
      async stats() { return { events: events.length, pending, acknowledged }; },
      async allEvents() { return events.map(event => ({ ...event })); },
      async recordEvents(values) { events.push(...values); pending += values.length; return values; },
      async acknowledge(ids) { acknowledged += ids.length; pending = 0; }
    },
    syncClient: { async syncOnce() { syncCalls += 1; return { sent: false, reason: 'empty' }; } },
    projectionClient: {
      async compareServer() {
        return { checkpoint: { comparison: { status: events.length === 1 ? 'matched' : 'event_count_pending', matched: events.length === 1 } } };
      }
    },
    getLegacySnapshot() { return { ok: true }; },
    async fetch(url) {
      if (url === SchedulingControl.ARCHIVE_EXPORT_ENDPOINT) return response({ ok: true, archive });
      if (url === SchedulingControl.READINESS_ENDPOINT) {
        return response({ ...serverReadiness(true), eventCount: 1 });
      }
      return response({ ok: false }, 404);
    }
  });
  const first = await control.restoreBrowserLedger();
  assert.equal(first.restoredEventCount, 1);
  assert.deepEqual((await control.status({ refresh: false })).stats, { events: 1, pending: 0, acknowledged: 1 });
  assert.equal(syncCalls, 1);
  const second = await control.restoreBrowserLedger();
  assert.equal(second.restoredEventCount, 0);
  assert.equal(events.length, 1);
});

test('an enabled channel automatically falls back when a later integrity check fails', async () => {
  const localStorage = storage({ [Transition.CHANNEL_KEY]: Transition.FSRS_CHANNEL });
  const changes = [];
  const control = create({
    storage: localStorage,
    matched: false,
    onChannelChange(channel, reason) { changes.push({ channel, reason }); }
  });
  const result = await control.status({ refresh: true });
  assert.equal(result.autoRolledBack, true);
  assert.equal(control.selectedChannel(), Transition.LEGACY_CHANNEL);
  assert.deepEqual(changes, [{ channel: Transition.LEGACY_CHANNEL, reason: 'readiness_failed' }]);
});
