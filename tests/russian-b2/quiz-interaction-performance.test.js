const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');

test('quiz option interactions refresh only the active question', () => {
  const selectBody = reader.match(/function selectQuizOption\(questionId, key\) \{([\s\S]*?)\n\}/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  const refreshBody = reader.match(/function refreshQuizQuestion\(questionId, exercise, record\) \{([\s\S]*?)\n\}/);

  assert.ok(selectBody && submitBody && refreshBody);
  assert.match(selectBody[1], /refreshQuizQuestion/);
  assert.match(submitBody[1], /refreshQuizQuestion/);
  assert.match(reader, /function saveQuizRecord\(questionId, record\)/);
  assert.doesNotMatch(selectBody[1], /renderQuizChapter/);
  assert.doesNotMatch(submitBody[1], /renderQuizChapter/);
  assert.match(refreshBody[1], /target\.outerHTML = renderQuizItem/);
});

test('initial quiz rendering does not persist an empty record for every question', () => {
  const renderBody = reader.match(/function renderQuizChapter\(data, scrollPosition\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nvar READING_PROGRESS_KEY/);
  const recordBody = reader.match(/function getQuizRecord\(questionId\) \{([\s\S]*?)\n\}/);

  assert.ok(renderBody && recordBody);
  assert.match(renderBody[1], /var chapterRecords = getB2Progress\(\)\[getQuizUnitKey\(\)\] \|\| \{\}/);
  assert.match(renderBody[1], /chapterRecords\[exercise\.id\] \|\| createEmptyQuizRecord\(\)/);
  assert.doesNotMatch(renderBody[1], /getQuizRecord\(exercise\.id\)/);
  assert.doesNotMatch(recordBody[1], /saveB2Progress/);
});
