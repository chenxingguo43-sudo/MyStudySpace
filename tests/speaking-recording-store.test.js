const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_DATABASE,
  STORES,
  createMemoryRecordingStore,
  createRecordingStore,
  validateRecording
} = require('../js/speaking/recording-store');

function recording(overrides) {
  const blob = new Blob(['voice'], { type: 'audio/webm' });
  return Object.assign({
    id: 'rec-1',
    sessionId: 'session-1',
    context: 'daily',
    disposition: 'sent',
    createdAt: '2026-08-08T10:00:00.000Z',
    durationMs: 1200,
    mimeType: 'audio/webm',
    blob,
    transcriptStatus: 'not_requested'
  }, overrides || {});
}

test('recording store publishes a separate V2 database contract', () => {
  assert.equal(DEFAULT_DATABASE, 'white_night_speaking_v2');
  assert.deepEqual(Object.keys(STORES), ['recordings', 'sessions', 'turns', 'outbox']);
});

test('recording validation derives size and rejects empty blobs', () => {
  const value = validateRecording(recording());
  assert.equal(value.size, 5);
  assert.equal(value.durationMs, 1200);
  assert.throws(() => validateRecording(recording({ blob: new Blob([]) })), /录音文件为空/);
});

test('memory recording store saves, sorts, removes and reports storage usage', async () => {
  const store = createMemoryRecordingStore();
  await store.save(recording({ id: 'older', createdAt: '2026-08-08T09:00:00.000Z' }));
  await store.save(recording({ id: 'newer', createdAt: '2026-08-08T11:00:00.000Z' }));
  assert.deepEqual((await store.list()).map(item => item.id), ['newer', 'older']);
  assert.equal((await store.get('newer')).sessionId, 'session-1');
  assert.deepEqual(await store.stats(), { count: 2, bytes: 10 });
  assert.equal(await store.remove('older'), true);
  assert.deepEqual(await store.stats(), { count: 1, bytes: 5 });
});

test('browser recording store reports IndexedDB absence explicitly', async () => {
  const store = createRecordingStore({ indexedDB: null });
  await assert.rejects(store.open(), error => error.code === 'INDEXEDDB_UNAVAILABLE');
});


