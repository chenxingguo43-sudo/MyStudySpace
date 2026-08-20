'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const reader = fs.readFileSync('reader.html', 'utf8');
const vocabulary = fs.readFileSync('vocabulary.html', 'utf8');

test('vocabulary ratings record live events and undo retracts them', () => {
  assert.match(vocabulary, /function saveRecord\(wordId, rating, options\)/);
  assert.match(vocabulary, /async function recordVocabularyShadowReview\(word, rawResult, options\)/);
  assert.match(vocabulary, /vocabularyLearningEvents\.recordReview\(/);
  assert.match(vocabulary, /async function recordVocabularyShadowUndo\(events\)/);
  assert.match(vocabulary, /vocabularyLearningEvents\.recordUndo\(\{ events: events, reason: 'vocabulary_rating_undone'/);
});

test('B2 records explicit answer submissions with tutor evidence but not selection or drafts', () => {
  assert.match(reader, /function recordB2Submission\(submodule, unitId, itemIds, submissions\)/);
  assert.match(reader, /submissions: \(submissions \|\| \[\]\)\.map/);
  assert.match(reader, /ReaderAnswerEvidence\.createSubmission\(item\)/);
  assert.match(reader, /recordB2Submission\('reading', currentReadingData\.id, \[questionId\], \[record\.answerEvidence\]\)/);
  assert.match(reader, /recordB2Submission\('listening', currentListeningData\.id/);
  assert.match(reader, /recordB2Submission\('exam', currentExamData/);
  assert.match(reader, /recordB2Submission\('reading-speaking'/);
  assert.match(reader, /record\.answerEvidence = window\.ReaderAnswerEvidence/);
  assert.match(reader, /answerEvidence\.finalErrorCategory = progress\[questionId\]\.errorCategory/);

  const selectQuiz = reader.match(/function selectQuizOption\(questionId, key\) \{([\s\S]*?)\n\}/);
  const saveDraft = reader.match(/function saveOpenResponseDraft\(questionId, value\) \{([\s\S]*?)\n\}/);
  assert.ok(selectQuiz && saveDraft);
  assert.doesNotMatch(selectQuiz[1], /recordB2Submission/);
  assert.doesNotMatch(saveDraft[1], /recordB2Submission/);
});

test('ordinary Reader completion records a chapter without adding duration', () => {
  const helper = reader.match(/function recordReaderChapterCompletion\(\) \{([\s\S]*?)\n\}/);
  assert.ok(helper);
  assert.match(helper[1], /action: 'complete'/);
  assert.match(helper[1], /completedCount: 1/);
  assert.doesNotMatch(helper[1], /durationSec/);
});
