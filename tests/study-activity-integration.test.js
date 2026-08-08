'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const reader = fs.readFileSync('reader.html', 'utf8');
const vocabulary = fs.readFileSync('vocabulary.html', 'utf8');

test('vocabulary ratings record live events and undo retracts them', () => {
  assert.match(vocabulary, /function recordVocabularyRating\(wordId\)/);
  assert.match(vocabulary, /attemptCount: 1/);
  assert.match(vocabulary, /itemIds: \['vocabulary:' \+ String\(wordId\)\]/);
  assert.match(vocabulary, /activityRecordPromise = recordVocabularyRating\(w\.id\)/);
  assert.match(vocabulary, /StudyActivityStore\.retract\(record\.id, 'vocabulary-rating-undone'\)/);
});

test('B2 records explicit answer submissions but not selection or drafts', () => {
  assert.match(reader, /function recordB2Submission\(submodule, unitId, itemIds\)/);
  assert.match(reader, /recordB2Submission\('reading', currentReadingData\.id, \[questionId\]\)/);
  assert.match(reader, /recordB2Submission\('listening', currentListeningData\.id/);
  assert.match(reader, /recordB2Submission\('exam', currentExamData/);
  assert.match(reader, /recordB2Submission\('reading-speaking'/);

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
