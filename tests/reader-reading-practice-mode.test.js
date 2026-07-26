const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const reader = fs.readFileSync('reader.html', 'utf8');

test('reading-speaking chapters provide separate reading and practice layouts', () => {
  assert.match(reader, /reader-reading-speaking-layout-mode/);
  assert.match(reader, /function setReadingSpeakingLayoutMode\(mode\)/);
  assert.match(reader, /data-rs-layout-mode="reading"/);
  assert.match(reader, /data-rs-layout-mode="practice"/);
  assert.match(reader, /rs-practice-panel/);
  assert.match(reader, /renderReadingSpeakingPracticePanel\(_currentRSExercises\)/);
});

test('practice mode keeps word lookup contextual instead of using the question rail', () => {
  assert.match(reader, /function positionReadingSpeakingDictionary\(element\)/);
  assert.match(reader, /reader-layout\.rs-practice-mode #detailPanel/);
  assert.match(reader, /onOpen: function\(_current, element\) \{ positionReadingSpeakingDictionary\(element\); \}/);
  assert.match(reader, /\(max-width: 1024px\) and \(orientation: portrait\)/);
});

test('desktop contextual dictionary card is clamped inside the viewport', () => {
  assert.match(reader, /var panelHeight = Math\.min\(480, Math\.max\(240, window\.innerHeight - 104\)\);/);
  assert.match(reader, /window\.innerHeight - panelHeight - 16/);
});

test('phones use one continuous reading-to-practice flow while wider screens keep a roomy question rail', () => {
  assert.match(reader, /function isReadingSpeakingPhoneViewport\(\)/);
  assert.match(reader, /\(max-width: 760px\)/);
  assert.match(reader, /\.rs-reader-mode-switch \{ display: none; \}/);
  assert.match(reader, /flex: 0 0 clamp\(320px, 32vw, 440px\)/);
  assert.match(reader, /isReadingSpeakingPhoneViewport\(\) \? 'practice' : getReadingSpeakingLayoutMode\(\)/);
});

test('reading practice exposes and refreshes a completed-question progress indicator', () => {
  assert.match(reader, /function getReadingSpeakingPracticeProgress\(exercises\)/);
  assert.match(reader, /id="rsPracticeProgressText"/);
  assert.match(reader, /id="rsPracticeProgressFill"/);
  assert.match(reader, /function updateReadingSpeakingPracticeProgress\(\)/);
  assert.match(reader, /updateReadingSpeakingPracticeProgress\(\);/);
});
