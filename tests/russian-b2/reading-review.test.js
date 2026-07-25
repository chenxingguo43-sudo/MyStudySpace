const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../../js/russian-b2/reading-review');

const question = {
  id: 'reading-q001', unitId: 'reading-text-01', answer: 'Б',
  options: [{ label: 'А', text: 'wrong', distractorTag: 'logic' }, { label: 'Б', text: 'right' }],
  answerSource: { pdfPage: 93 }
};

test('wrong reading answer enters pending review with reviewed distractor tag', () => {
  const record = Review.recordAttempt({}, question, 'А', '2026-07-23T10:00:00.000Z');
  assert.equal(record.errorCategory, 'logic');
  assert.equal(record.everWrong, true);
  assert.equal(record.reviewStatus, 'pending');
  assert.equal(record.attempts, 1);
  assert.equal(record.history.length, 1);
  assert.equal(record.needsClassification, false);
});

test('untagged wrong answer requests optional classification and allows skip', () => {
  const untagged = { ...question, options: [{ label: 'А', text: 'wrong' }, { label: 'Б', text: 'right' }] };
  const record = Review.recordAttempt({}, untagged, 'А', '2026-07-23T10:00:00.000Z');
  assert.equal(record.needsClassification, true);
  assert.equal(Review.setErrorCategory(record, '').needsClassification, false);
});

test('correct retry retains history and masters a prior wrong answer', () => {
  const wrong = Review.recordAttempt({}, question, 'А', '2026-07-23T10:00:00.000Z');
  const retry = Review.prepareRetry(wrong);
  const correct = Review.recordAttempt(retry, question, 'Б', '2026-07-24T10:00:00.000Z');
  assert.equal(retry.answered, false);
  assert.equal(correct.reviewStatus, 'mastered');
  assert.equal(correct.everWrong, true);
  assert.equal(correct.history.length, 2);
});
