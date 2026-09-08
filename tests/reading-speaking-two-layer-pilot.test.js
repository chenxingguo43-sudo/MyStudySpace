const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chapter = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'reading_speaking', 'ch0000.json'), 'utf8'));
const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
const exercise = chapter.exercises.find((item) => item.num === 1);

test('Murom question 1 is a source-consistent two-layer pilot', () => {
  assert.ok(exercise);
  assert.equal(exercise.answer, 'в');
  assert.equal(exercise.answerAnalysis.presentation.mode, 'two-layer');
  assert.equal(exercise.answerAnalysis.presentation.status, 'pilot');
  assert.equal(exercise.answerAnalysis.locatorStatus, 'exact');

  const correct = exercise.answerAnalysis.options.filter((item) => item.status === 'correct');
  assert.deepEqual(correct.map((item) => item.key), ['в']);
  assert.deepEqual(exercise.answerAnalysis.options.map((item) => item.key), ['а', 'б', 'в']);
  assert.equal(exercise.answerAnalysis.options.filter((item) => item.status === 'wrong').length, 2);
  assert.equal(exercise.answerAnalysis.mappings.length, 1);

  const evidence = exercise.answerAnalysis.evidenceItems[0];
  assert.equal(evidence.paragraphIndex, 8);
  assert.ok(chapter.original[evidence.paragraphIndex].includes(evidence.quoteRu));
  assert.ok(exercise.answerAnalysis.conclusion.length < 90);
  assert.ok(exercise.answerAnalysis.nextCheck);
});

test('Reader routes marked analyses through the two-layer renderer', () => {
  assert.match(reader, /analysis\.presentation && analysis\.presentation\.mode === 'two-layer'/);
  assert.match(reader, /function renderReadingTwoLayerExplanation\(analysis, exId\)/);
  assert.match(reader, /快速看懂/);
  assert.match(reader, /展开详细解析/);
  assert.match(reader, /rs-analysis-source/);
});
