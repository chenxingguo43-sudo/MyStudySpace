'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const archive = require('../js/app-archive');

function memoryStorage(initial, failKey) {
  const values = new Map(Object.entries(initial || {}));
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (key === failKey) throw new Error('quota');
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); }
  };
}

function memoryIndexedDb(initial, failPutId) {
  let committed = new Map((initial || []).map(record => [record.id, record]));
  const indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          objectStoreNames: { contains: name => name === archive.RECORDING_STORE },
          createObjectStore() {},
          close() {},
          transaction(_storeName, mode) {
            const transaction = { error: null };
            const working = new Map(committed);
            let failed = false;
            transaction.objectStore = () => ({
              getAll() {
                const getRequest = {};
                queueMicrotask(() => {
                  getRequest.result = Array.from(committed.values());
                  if (getRequest.onsuccess) getRequest.onsuccess();
                });
                return getRequest;
              },
              clear() { working.clear(); },
              put(record) {
                if (record.id === failPutId) {
                  failed = true;
                  transaction.error = new Error('simulated write failure');
                  return;
                }
                working.set(record.id, record);
              }
            });
            setTimeout(() => {
              if (mode === 'readwrite' && failed) {
                if (transaction.onabort) transaction.onabort();
                return;
              }
              if (mode === 'readwrite') committed = working;
              if (transaction.oncomplete) transaction.oncomplete();
            }, 0);
            return transaction;
          }
        };
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
  return { indexedDB, records: () => Array.from(committed.values()) };
}

test('archive exports only audited learning keys and preserves raw JSON', () => {
  const storage = memoryStorage({
    rr_state_book: '{"chapter":2}',
    rr_b2_progress_v1: '{"unit":{"q1":{"wrong":true}}}',
    'vocabulary-settings': '{"dailyGoal":20}',
    v1_local_profile: '{"nickname":"梅子"}',
    rr_dictionary_provisional_v1: '{"слово":{"reviewStatus":"provisional"}}',
    rr_local_lookup_cache: '{"temporary":true}',
    unrelated_secret: '{"token":"do-not-export"}'
  });
  const result = archive.createArchive(storage, { now: '2026-08-12T01:00:00.000Z' });
  const records = result.modules.localStorage.records;
  assert.equal(result.schema, 'belye-nochi-learning-archive');
  assert.equal(result.version, 1);
  assert.equal(records.rr_state_book.value, '{"chapter":2}');
  assert.ok(records.rr_b2_progress_v1);
  assert.ok(records['vocabulary-settings']);
  assert.ok(records.v1_local_profile);
  assert.ok(records.rr_dictionary_provisional_v1);
  assert.equal(records.rr_local_lookup_cache, undefined);
  assert.equal(records.unrelated_secret, undefined);
  assert.deepEqual(result.warnings, []);
});

test('archive allowlist covers current Reader, Vocabulary, profile and dictionary user data', () => {
  [
    'rr_lastread_russian_b2', 'rr_bookmarks_world_people', 'russian_b2_writing_versions_v1',
    'russian_b2_speaking_notes_v1', 'rr_listening_quality_v1',
    'russian_b2_exam_writing_drafts_v1', 'vocabulary-review-records',
    'vocabulary-custom-bgs-v1', 'v1_daily_checkins', 'rr_vocabulary_backup_v2_2026-08-12'
  ].forEach(key => assert.equal(archive.isAllowedKey(key), true, key));
  ['rr_sync_fail_queue', 'rr_local_lookup_cache', 'rr_split_h', 'pomodoro-sessions'].forEach(key =>
    assert.equal(archive.isAllowedKey(key), false, key));
});

test('validation rejects malformed JSON, unsupported versions, unknown modules and unknown keys', () => {
  assert.throws(() => archive.parseArchive('{broken'), /不是有效 JSON/);
  const base = {
    schema: archive.ARCHIVE_SCHEMA,
    version: archive.ARCHIVE_VERSION,
    exportedAt: '2026-08-12T01:00:00.000Z',
    modules: { localStorage: { records: {} } }
  };
  assert.match(archive.validateArchive({ ...base, version: 99 }).join(' '), /版本/);
  assert.match(archive.validateArchive({ ...base, modules: { ...base.modules, futureModule: {} } }).join(' '), /未知学习档案模块/);
  assert.match(archive.validateArchive({ ...base, modules: { localStorage: { records: { secret: { value: '{}' } } } } }).join(' '), /不允许导入/);
  assert.match(archive.validateArchive({ ...base, modules: { localStorage: { records: { rr_b2_progress_v1: { value: '{bad' } } } } }).join(' '), /不是有效 JSON/);
});

test('merge import combines stable-id records, unions arrays and keeps newer timestamped records', () => {
  const storage = memoryStorage({
    rr_b2_progress_v1: JSON.stringify({ unit: {
      q1: { wrong: true, updatedAt: '2026-08-12T02:00:00.000Z' }, q2: { wrong: false }
    } }),
    v1_daily_checkins: JSON.stringify({ dates: ['2026-08-10', '2026-08-11'] })
  });
  const imported = {
    schema: archive.ARCHIVE_SCHEMA,
    version: 1,
    exportedAt: '2026-08-12T03:00:00.000Z',
    modules: { localStorage: { records: {
      rr_b2_progress_v1: { value: JSON.stringify({ unit: {
        q1: { wrong: false, updatedAt: '2026-08-12T01:00:00.000Z' }, q3: { wrong: true }
      } }) },
      v1_daily_checkins: { value: JSON.stringify({ dates: ['2026-08-11', '2026-08-12'] }) }
    } } }
  };
  const result = archive.importArchive(storage, imported);
  const progress = JSON.parse(storage.getItem('rr_b2_progress_v1'));
  const checkins = JSON.parse(storage.getItem('v1_daily_checkins'));
  assert.equal(result.mode, 'merge');
  assert.equal(progress.unit.q1.wrong, true);
  assert.equal(progress.unit.q2.wrong, false);
  assert.equal(progress.unit.q3.wrong, true);
  assert.deepEqual(checkins.dates, ['2026-08-10', '2026-08-11', '2026-08-12']);
});

test('invalid imports do not change local data', () => {
  const storage = memoryStorage({ rr_b2_progress_v1: '{"local":true}' });
  assert.throws(() => archive.importArchive(storage, { schema: 'wrong' }), /校验失败/);
  assert.equal(storage.getItem('rr_b2_progress_v1'), '{"local":true}');
});

test('a failed write rolls back every key already changed', () => {
  const storage = memoryStorage({
    rr_b2_progress_v1: '{"local":true}',
    'vocabulary-settings': '{"dailyGoal":10}'
  }, 'vocabulary-settings');
  const imported = {
    schema: archive.ARCHIVE_SCHEMA,
    version: 1,
    exportedAt: '2026-08-12T03:00:00.000Z',
    modules: { localStorage: { records: {
      rr_b2_progress_v1: { value: '{"imported":true}' },
      'vocabulary-settings': { value: '{"dailyGoal":30}' }
    } } }
  };
  assert.throws(() => archive.importArchive(storage, imported, { mode: 'replace' }), /已回滚/);
  assert.equal(storage.getItem('rr_b2_progress_v1'), '{"local":true}');
  assert.equal(storage.getItem('vocabulary-settings'), '{"dailyGoal":10}');
});

test('export reports unreadable records without exporting corrupt values', () => {
  const storage = memoryStorage({
    rr_b2_progress_v1: '{broken',
    'vocabulary-settings': '{"dailyGoal":20}'
  });
  const result = archive.createArchive(storage, { now: '2026-08-12T01:00:00.000Z' });
  assert.equal(result.modules.localStorage.records.rr_b2_progress_v1, undefined);
  assert.ok(result.modules.localStorage.records['vocabulary-settings']);
  assert.deepEqual(result.warnings.map(item => item.key), ['rr_b2_progress_v1']);
});

test('quick archives omit recordings while complete archives preserve Blob metadata and bytes', async () => {
  const storage = memoryStorage({ rr_b2_progress_v1: '{}' });
  const attempt = {
    id: 'speaking-1:100',
    taskId: 'speaking-1',
    createdAt: '2026-08-12T04:00:00.000Z',
    mimeType: 'audio/webm',
    blob: new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'audio/webm' })
  };
  const database = memoryIndexedDb([attempt]);
  const quick = archive.createArchive(storage, { now: '2026-08-12T05:00:00.000Z' });
  const complete = await archive.createCompleteArchive(storage, {
    now: '2026-08-12T05:00:00.000Z', indexedDB: database.indexedDB
  });
  assert.equal(quick.modules.recordings, undefined);
  const saved = complete.modules.recordings.stores.attempts.records[0];
  assert.equal(saved.id, attempt.id);
  assert.equal(saved.taskId, attempt.taskId);
  assert.equal(saved.mimeType, 'audio/webm');
  assert.equal(saved.audio.encoding, 'base64');
  assert.equal(saved.audio.size, 4);
  const restored = archive.deserializeRecordingAttempt(saved);
  assert.deepEqual(Array.from(new Uint8Array(await restored.blob.arrayBuffer())), [1, 2, 3, 4]);
});

test('recording validation rejects unsupported stores and corrupt audio metadata', () => {
  const validRecord = {
    id: 'task:1', taskId: 'task', createdAt: '2026-08-12T04:00:00.000Z', mimeType: 'audio/webm',
    audio: { encoding: 'base64', size: 1, data: 'AQ==' }
  };
  const module = {
    database: archive.RECORDING_DATABASE,
    version: archive.RECORDING_DATABASE_VERSION,
    stores: { attempts: { keyPath: 'id', records: [validRecord] }, other: { records: [] } }
  };
  assert.match(archive.validateRecordingsModule(module).join(' '), /未知录音对象仓库/);
  const corrupt = structuredClone(module);
  delete corrupt.stores.other;
  corrupt.stores.attempts.records[0].audio.size = -1;
  assert.match(archive.validateRecordingsModule(corrupt).join(' '), /音频数据无效/);
  const brokenBase64 = structuredClone(module);
  delete brokenBase64.stores.other;
  brokenBase64.stores.attempts.records[0].audio.data = '%%%=';
  assert.match(archive.validateRecordingsModule(brokenBase64).join(' '), /Base64 音频损坏/);
});

test('recording merge keeps existing attempts and selects newer duplicate metadata', () => {
  const local = [
    { id: 'same', taskId: 'task', createdAt: '2026-08-12T04:00:00.000Z', marker: 'local' },
    { id: 'local-only', taskId: 'task', createdAt: '2026-08-12T01:00:00.000Z' }
  ];
  const imported = [
    { id: 'same', taskId: 'task', createdAt: '2026-08-12T05:00:00.000Z', marker: 'imported' },
    { id: 'imported-only', taskId: 'task', createdAt: '2026-08-12T02:00:00.000Z' }
  ];
  const merged = archive.mergeRecordingAttempts(local, imported);
  assert.equal(merged.length, 3);
  assert.equal(merged.find(record => record.id === 'same').marker, 'imported');
  assert.ok(merged.some(record => record.id === 'local-only'));
  assert.ok(merged.some(record => record.id === 'imported-only'));
});

test('failed IndexedDB recording import aborts the transaction without half-written attempts', async () => {
  const original = {
    id: 'original', taskId: 'task', createdAt: '2026-08-12T01:00:00.000Z',
    mimeType: 'audio/webm', blob: new Blob(['old'], { type: 'audio/webm' })
  };
  const database = memoryIndexedDb([original], 'fail');
  const recordingModule = {
    database: archive.RECORDING_DATABASE,
    version: archive.RECORDING_DATABASE_VERSION,
    stores: { attempts: { keyPath: 'id', records: [
      { id: 'first', taskId: 'task', createdAt: '2026-08-12T02:00:00.000Z', mimeType: 'audio/webm', audio: { encoding: 'base64', size: 1, data: 'AQ==' } },
      { id: 'fail', taskId: 'task', createdAt: '2026-08-12T03:00:00.000Z', mimeType: 'audio/webm', audio: { encoding: 'base64', size: 1, data: 'Ag==' } }
    ] } }
  };
  await assert.rejects(archive.importRecordings(database.indexedDB, recordingModule, { mode: 'replace' }), /回滚|失败/);
  assert.deepEqual(database.records().map(record => record.id), ['original']);
});

test('complete import restores localStorage when its recording transaction fails', async () => {
  const storage = memoryStorage({ rr_b2_progress_v1: '{"local":true}' });
  const database = memoryIndexedDb([], 'fail');
  const complete = {
    schema: archive.ARCHIVE_SCHEMA,
    version: archive.ARCHIVE_VERSION,
    exportedAt: '2026-08-12T05:00:00.000Z',
    modules: {
      localStorage: { records: { rr_b2_progress_v1: { value: '{"imported":true}' } } },
      recordings: {
        database: archive.RECORDING_DATABASE,
        version: archive.RECORDING_DATABASE_VERSION,
        stores: { attempts: { keyPath: 'id', records: [
          { id: 'fail', taskId: 'task', createdAt: '2026-08-12T03:00:00.000Z', mimeType: 'audio/webm', audio: { encoding: 'base64', size: 1, data: 'Ag==' } }
        ] } }
      }
    }
  };
  await assert.rejects(archive.importLearningArchive(storage, database.indexedDB, complete), /已恢复/);
  assert.equal(storage.getItem('rr_b2_progress_v1'), '{"local":true}');
});
