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
  assert.match(reader, /\.reader-layout\.rs-reading-mode \.reader-pane \{ flex: 0 1 70%/);
  assert.match(reader, /\.reader-layout\.rs-reading-mode \.resize-handle \{ display: block; \}/);
  assert.match(reader, /\.reader-layout\.rs-reading-mode #detailPanel \{ min-width: 300px; \}/);
  assert.match(reader, /if \(!isPractice\) restoreSplitRatio\(\);/);
});

test('landscape split clamps the reading pane against the dictionary minimum width', () => {
  assert.match(reader, /function getHorizontalSplitBounds\(layout, pane\)/);
  assert.match(reader, /rect\.width - handleWidth - detailMinWidth/);
  assert.match(reader, /setHorizontalSplitBasis\(layoutEl, paneEl, e\.clientX - rect\.left\)/);
  assert.match(reader, /overflow-x: hidden; overflow-x: clip/);
});

test('landscape reading keeps the docked dictionary open on outside clicks', () => {
  assert.match(reader, /var keepSplitDictionaryOpen = isReadingSpeakingSplitViewport\(\)/);
  assert.match(reader, /!keepSplitDictionaryOpen && panel/);
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

test('phones use one continuous flow while landscape restores the right-side practice rail', () => {
  assert.match(reader, /function isReadingSpeakingPhoneViewport\(\)/);
  assert.match(reader, /\(max-width: 760px\)/);
  assert.match(reader, /\.rs-reader-mode-switch \{ display: none; \}/);
  assert.match(reader, /\.reader-layout\.rs-practice-mode \{ display: flex; flex-direction: row; \}/);
  assert.match(reader, /flex: none; width: clamp\(320px, 32vw, 440px\)/);
  assert.match(reader, /border-top: 0; border-left: 1px solid var\(--border\)/);
  assert.match(reader, /isReadingSpeakingPhoneViewport\(\) \? 'practice' : getReadingSpeakingLayoutMode\(\)/);
});

test('landscape practice rail stays below the sticky toolbar during touch scrolling', () => {
  assert.match(reader, /height: calc\(100dvh - 48px\); max-height: none; overflow-y: auto;/);
  assert.match(reader, /position: fixed; top: 48px; right: 0; z-index: 90;/);
  assert.match(reader, /width: clamp\(320px, 32vw, 440px\); min-width: 300px;/);
  assert.match(reader, /margin-right: clamp\(320px, 32vw, 440px\)/);
  assert.match(reader, /overscroll-behavior: contain; -webkit-overflow-scrolling: touch;/);
});

test('reading practice exposes and refreshes a completed-question progress indicator', () => {
  assert.match(reader, /function getReadingSpeakingPracticeProgress\(exercises\)/);
  assert.match(reader, /id="rsPracticeProgressText"/);
  assert.match(reader, /id="rsPracticeProgressFill"/);
  assert.match(reader, /function updateReadingSpeakingPracticeProgress\(\)/);
  assert.match(reader, /updateReadingSpeakingPracticeProgress\(\);/);
});
