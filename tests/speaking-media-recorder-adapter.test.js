const test = require('node:test');
const assert = require('node:assert/strict');
const { createMediaRecorderAdapter } = require('../js/speaking/media-recorder-adapter');

function fakeEnvironment(options) {
  const settings = options || {};
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const stream = { active: true, getTracks() { return tracks; } };
  class FakeMediaRecorder {
    static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
    constructor(input, recorderOptions) {
      this.stream = input;
      this.mimeType = recorderOptions && recorderOptions.mimeType || 'audio/webm';
      this.state = 'inactive';
    }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      if (!settings.empty) this.ondataavailable({ data: new Blob(['voice'], { type: this.mimeType }) });
      this.onstop();
    }
  }
  let time = 100;
  return {
    env: {
      navigator: { mediaDevices: { getUserMedia: async () => {
        if (settings.permissionError) throw settings.permissionError;
        return stream;
      } } },
      MediaRecorder: FakeMediaRecorder,
      Blob,
      now: () => { time += 50; return time; }
    },
    tracks
  };
}

test('media recorder adapter records a non-empty blob and releases tracks', async () => {
  const fixture = fakeEnvironment();
  const adapter = createMediaRecorderAdapter(fixture.env);
  assert.deepEqual(await adapter.prepare(), { state: 'granted' });
  const started = await adapter.start();
  assert.equal(started.mimeType, 'audio/webm;codecs=opus');
  const result = await adapter.stop();
  assert.equal(result.blob.size, 5);
  assert.equal(result.durationMs, 50);
  assert.equal(fixture.tracks[0].stopped, true);
});

test('media recorder adapter cancel discards chunks and releases tracks', async () => {
  const fixture = fakeEnvironment();
  const adapter = createMediaRecorderAdapter(fixture.env);
  await adapter.start();
  await adapter.cancel();
  assert.equal(adapter.isRecording(), false);
  assert.equal(fixture.tracks[0].stopped, true);
});

test('media recorder adapter rejects an empty completed recording', async () => {
  const fixture = fakeEnvironment({ empty: true });
  const adapter = createMediaRecorderAdapter(fixture.env);
  await adapter.start();
  await assert.rejects(adapter.stop(), error => error.code === 'EMPTY_RECORDING');
  assert.equal(fixture.tracks[0].stopped, true);
});

test('media recorder adapter distinguishes denied permission', async () => {
  const denied = new Error('denied');
  denied.name = 'NotAllowedError';
  const fixture = fakeEnvironment({ permissionError: denied });
  const adapter = createMediaRecorderAdapter(fixture.env);
  await assert.rejects(adapter.prepare(), error => error.code === 'PERMISSION_DENIED');
});


