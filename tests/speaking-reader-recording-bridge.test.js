const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'js', 'speaking', 'reader-recording-bridge.js'), 'utf8');

test('Reader loads the provider-independent local speaking recording stack', () => {
  assert.match(html, /js\/speaking\/recording-store\.js/);
  assert.match(html, /js\/speaking\/media-recorder-adapter\.js/);
  assert.match(html, /js\/speaking\/recording-session\.js/);
  assert.match(html, /js\/speaking\/reader-recording-bridge\.js/);
  assert.match(html, /WhiteNightReaderSpeaking\.mount/);
});

test('speaking tasks expose start, stop, playback and delete paths without external AI', () => {
  assert.match(html, /data-speaking-start/);
  assert.match(html, /data-speaking-stop/);
  assert.match(bridge, /recordingStore|store\.list/);
  assert.match(bridge, /URL\.createObjectURL/);
  assert.match(bridge, /store\.remove/);
  assert.doesNotMatch(bridge, /fetch\(/);
});
