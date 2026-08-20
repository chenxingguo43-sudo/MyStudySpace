const test = require('node:test');
const assert = require('node:assert/strict');
const { createRecordingSession } = require('../js/speaking/recording-session');
const { createMemoryRecordingStore } = require('../js/speaking/recording-store');

function fakeAdapter() {
  const calls = [];
  return {
    calls,
    async prepare() { calls.push('prepare'); },
    async start() { calls.push('start'); return { startedAt: 10, mimeType: 'audio/webm' }; },
    async stop() { calls.push('stop'); return { blob: new Blob(['voice'], { type: 'audio/webm' }), durationMs: 1350, mimeType: 'audio/webm' }; },
    async cancel() { calls.push('cancel'); },
    async dispose() { calls.push('dispose'); }
  };
}

function harness() {
  const adapter = fakeAdapter();
  const store = createMemoryRecordingStore();
  const states = [];
  const zones = [];
  const session = createRecordingSession({
    adapter,
    store,
    idFactory: () => 'recording-1',
    now: () => '2026-08-08T12:00:00.000Z',
    onChange: state => states.push(state.phase),
    onZoneChange: (next, previous) => zones.push([previous, next])
  });
  return { adapter, store, states, zones, session };
}

test('recording session sends and persists one recording', async () => {
  const fixture = harness();
  await fixture.session.prepare();
  await fixture.session.start({ sessionId: 'daily-1', context: 'daily' });
  const record = await fixture.session.finish('send');
  assert.equal(record.id, 'recording-1');
  assert.equal(record.disposition, 'sent');
  assert.equal(record.durationMs, 1350);
  assert.equal((await fixture.store.list()).length, 1);
  assert.deepEqual(fixture.adapter.calls, ['prepare', 'start', 'stop']);
  assert.equal(fixture.session.getState().phase, 'ready');
});

test('recording session cancellation does not persist audio', async () => {
  const fixture = harness();
  await fixture.session.prepare();
  await fixture.session.start();
  const result = await fixture.session.finish('cancel');
  assert.equal(result, null);
  assert.equal((await fixture.store.list()).length, 0);
  assert.deepEqual(fixture.adapter.calls, ['prepare', 'start', 'cancel']);
});

test('recording session marks transcribe audio as pending without inventing text', async () => {
  const fixture = harness();
  await fixture.session.prepare();
  await fixture.session.start();
  const record = await fixture.session.finish('transcribe');
  assert.equal(record.disposition, 'transcription_pending');
  assert.equal(record.transcriptStatus, 'pending');
  assert.equal(Object.hasOwn(record, 'rawTranscript'), false);
});

test('recording zone changes are stable and do not repeat notifications', async () => {
  const fixture = harness();
  await fixture.session.prepare();
  await fixture.session.start();
  fixture.session.setZone('cancel');
  fixture.session.setZone('cancel');
  fixture.session.setZone('send');
  fixture.session.setZone('transcribe');
  assert.deepEqual(fixture.zones, [['send', 'cancel'], ['cancel', 'send'], ['send', 'transcribe']]);
  await fixture.session.finish('cancel');
});

test('recording session finish is idempotent while persistence is pending', async () => {
  const adapter = fakeAdapter();
  let resolveSave;
  let saveCount = 0;
  const store = {
    save(record) {
      saveCount += 1;
      return new Promise(resolve => { resolveSave = () => resolve(record); });
    }
  };
  const session = createRecordingSession({ adapter, store, idFactory: () => 'once', now: () => '2026-08-08T12:00:00.000Z' });
  await session.prepare();
  await session.start();
  const first = session.finish('send');
  const second = session.finish('send');
  assert.equal(first, second);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof resolveSave, 'function');
  resolveSave();
  await first;
  assert.equal(saveCount, 1);
  assert.equal(adapter.calls.filter(call => call === 'stop').length, 1);
});


