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

test('landscape reading mode restores the draggable dictionary split without affecting portrait', () => {
  assert.match(reader, /function isReadingSpeakingSplitViewport\(\)/);
  assert.match(reader, /\(min-width: 900px\) and \(orientation: landscape\)/);
  assert.match(reader, /\.reader-layout\.rs-reading-mode \.reader-pane \{ flex: 0 0 70%/);
  assert.match(reader, /\.reader-layout\.rs-reading-mode \.resize-handle \{ display: block; \}/);
  assert.match(reader, /if \(!isPractice\) restoreSplitRatio\(\);/);
});

test('word lookup extracts a sentence around the tapped word and highlights that word', () => {
  assert.match(reader, /function extractLookupSentence\(element\)/);
  assert.match(reader, /range\.setEndBefore\(element\)/);
  assert.match(reader, /function renderHighlightedLookupContext\(sentence, word\)/);
  assert.match(reader, /class="dict-context-word"/);
});

test('practice mode keeps word lookup contextual instead of using the question rail', () => {
  assert.match(reader, /function positionReadingSpeakingDictionary\(element\)/);
  assert.match(reader, /reader-layout\.rs-practice-mode #detailPanel/);
  assert.match(reader, /onOpen: function\(_current, element\) \{ positionReadingSpeakingDictionary\(element\); \}/);
  assert.match(reader, /\(max-width: 1366px\) and \(orientation: portrait\)/);
});

test('desktop contextual dictionary card is clamped inside the viewport', () => {
  assert.match(reader, /var panelHeight = Math\.min\(480, Math\.max\(240, window\.innerHeight - 104\)\);/);
  assert.match(reader, /window\.innerHeight - panelHeight - 16/);
});

test('phones use one continuous reading-to-practice flow while wider screens keep full-width practice content', () => {
  assert.match(reader, /function isReadingSpeakingPhoneViewport\(\)/);
  assert.match(reader, /\(max-width: 760px\)/);
  assert.match(reader, /\.rs-reader-mode-switch \{ display: none; \}/);
  assert.match(reader, /\.reader-layout\.rs-practice-mode \.reader-pane \{ flex: 1 1 auto; width: 100%/);
  assert.match(reader, /isReadingSpeakingPhoneViewport\(\) \? 'practice' : getReadingSpeakingLayoutMode\(\)/);
});

test('reading practice exposes and refreshes a completed-question progress indicator', () => {
  assert.match(reader, /function getReadingSpeakingPracticeProgress\(exercises\)/);
  assert.match(reader, /id="rsPracticeProgressText"/);
  assert.match(reader, /id="rsPracticeProgressFill"/);
  assert.match(reader, /function updateReadingSpeakingPracticeProgress\(\)/);
  assert.match(reader, /updateReadingSpeakingPracticeProgress\(\);/);
});
