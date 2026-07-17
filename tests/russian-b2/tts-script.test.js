const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('TTS generator uses the installed edge-tts subtitle API and writes WebVTT', () => {
  const script = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'russian-b2', 'generate-tts.py'),
    'utf8'
  );
  assert.match(script, /submaker\.feed\(chunk\)/);
  assert.match(script, /submaker\.get_srt\(\)/);
  assert.match(script, /SentenceBoundary/);
  assert.match(script, /WEBVTT/);
  assert.match(script, /--unit/);
});
