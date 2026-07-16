const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');

test('reader resolves textbook paths from metadata instead of a B2-specific branch', () => {
  assert.match(reader, /function getBookDataDir\(bookId\)/);
  assert.doesNotMatch(reader, /bookId === 'russian_b2'/);
  assert.match(reader, /data\/textbook/);
});

test('reader shows the textbook badge from metadata', () => {
  assert.match(reader, /b\.kind === 'textbook'/);
  assert.doesNotMatch(reader, /b\.id === 'reading_speaking'/);
});

test('reader provides quiz-first interaction without auto-revealing answers', () => {
  assert.match(reader, /function renderQuizChapter\(data(?:, scrollPosition)?\)/);
  assert.match(reader, /function selectQuizOption\(questionId, key\)/);
  assert.match(reader, /function submitQuizQuestion\(questionId\)/);
  assert.match(reader, /function toggleQuizExplanation\(questionId\)/);
  assert.match(reader, /rr_b2_progress_v1/);
  assert.match(reader, /查看答案与解析/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(submitBody);
  assert.doesNotMatch(submitBody[1], /toggleQuizExplanation\(/);
});

test('quiz shows verified source explanations inline and completion is not scroll-triggered', () => {
  assert.match(reader, /原书解析（已核对）/);
  assert.match(reader, /exercise\.sourceExplanation/);
  assert.doesNotMatch(reader, /function renderSourceViewer\(/);
  assert.doesNotMatch(reader, /function openQuizSourceViewer\(/);
  assert.doesNotMatch(reader, /查看原书页/);
  assert.match(reader, /function finishQuizChapter\(\)/);
  assert.doesNotMatch(reader, /renderQuizChapter[\s\S]{0,6000}markChapterDone\(/);
});

test('quiz interactions preserve the reader scroll position', () => {
  assert.match(reader, /function rerenderQuizChapterPreservingScroll\(\)/);
  const selectBody = reader.match(/function selectQuizOption\(questionId, key\) \{([\s\S]*?)\n\}/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  const explanationBody = reader.match(/function toggleQuizExplanation\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(selectBody && submitBody && explanationBody);
  assert.match(selectBody[1], /rerenderQuizChapterPreservingScroll\(\)/);
  assert.match(submitBody[1], /rerenderQuizChapterPreservingScroll\(\)/);
  assert.match(explanationBody[1], /rerenderQuizChapterPreservingScroll\(\)/);
});

test('B2 progress uses permanent unit identifiers and migrates the pilot once', () => {
  assert.match(reader, /function getQuizUnitKey\(\)/);
  assert.match(reader, /function migrateB2Progress\(progress\)/);
  assert.match(reader, /currentQuizData\.id/);
  assert.match(reader, /russian_b2:p2-q001-q010/);
  assert.doesNotMatch(reader, /var chapterKey = curBook\.id \+ ':' \+ curCh/);
});
