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
  assert.match(reader, /function renderQuizChapter\(data\)/);
  assert.match(reader, /function selectQuizOption\(questionId, key\)/);
  assert.match(reader, /function submitQuizQuestion\(questionId\)/);
  assert.match(reader, /function toggleQuizExplanation\(questionId\)/);
  assert.match(reader, /rr_b2_progress_v1/);
  assert.match(reader, /查看答案与解析/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(submitBody);
  assert.doesNotMatch(submitBody[1], /toggleQuizExplanation\(/);
});

test('quiz source pages use local WebP assets and completion is not scroll-triggered', () => {
  assert.match(reader, /function setSourcePage\(pageNumber\)/);
  assert.match(reader, /PDF-' \+ String\(pageNumber\)\.padStart\(3, '0'\) \+ '\.webp'/);
  assert.match(reader, /function finishQuizChapter\(\)/);
  assert.doesNotMatch(reader, /renderQuizChapter[\s\S]{0,6000}markChapterDone\(/);
  assert.match(reader, /关闭原书页/);
});
