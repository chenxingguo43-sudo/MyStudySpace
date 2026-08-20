'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Evidence = require('../js/reader-answer-evidence');

test('creates a versioned wrong-answer snapshot for tutor review', () => {
  const snapshot = Evidence.createSubmission({
    id: 'GL1-Q009', printedNumber: 9, question: 'Question',
    options: [{ key: 'А', text: 'побеждала' }, { key: 'Б', text: 'побеждал' }],
    selected: 'Б', answer: 'А', lastAnsweredAt: '2026-08-12T10:00:00.000Z',
    ruleIds: ['agreement', 'agreement'], mappingReason: 'Verified by source'
  });
  assert.equal(snapshot.schema, 'belye-nochi-answer-evidence/v1');
  assert.equal(snapshot.questionId, 'GL1-Q009');
  assert.equal(snapshot.result, 'wrong');
  assert.equal(snapshot.selectedAnswer, 'Б');
  assert.equal(snapshot.correctAnswer, 'А');
  assert.deepEqual(snapshot.ruleIds, ['agreement']);
  assert.equal(snapshot.options[1].text, 'побеждал');
});

test('records an open response without pretending it was objectively correct', () => {
  const snapshot = Evidence.createSubmission({ id: 'Q-open', response: 'Мой ответ' });
  assert.equal(snapshot.result, 'recorded');
  assert.equal(snapshot.selectedAnswer, 'Мой ответ');
  assert.equal(snapshot.correctAnswer, '');
});

test('selects the latest ten unique questions across activity records', () => {
  const records = [
    { submodule: 'grammar', createdAt: '2026-08-12T10:00:00Z', content: { unitId: 'gl1', submissions: [{ questionId: 'Q1', selectedAnswer: 'A', correctAnswer: 'B', answeredAt: '2026-08-12T10:00:00Z' }] } },
    { submodule: 'grammar', createdAt: '2026-08-12T11:00:00Z', content: { unitId: 'gl1', submissions: [{ questionId: 'Q1', selectedAnswer: 'B', correctAnswer: 'B', answeredAt: '2026-08-12T11:00:00Z' }, { questionId: 'Q2', selectedAnswer: 'A', correctAnswer: 'A', answeredAt: '2026-08-12T10:30:00Z' }] } }
  ];
  const latest = Evidence.latestSubmissions(records, 10);
  assert.deepEqual(latest.map(item => item.questionId), ['Q1', 'Q2']);
  assert.equal(latest[0].result, 'correct');
  assert.equal(latest[0].submodule, 'grammar');
});

test('builds a concise tutor prompt with rules and no invented diagnosis', () => {
  const prompt = Evidence.buildTutorPrompt([{ questionId: 'Q1', prompt: '题目', selectedAnswer: 'Б', correctAnswer: 'А', result: 'wrong', ruleIds: ['rule-1'], ruleEvidence: '已核对' }]);
  assert.match(prompt, /共同错误模式/);
  assert.match(prompt, /待确认/);
  assert.match(prompt, /Q1/);
  assert.match(prompt, /Reader 规则 ID：rule-1/);
  assert.match(prompt, /Reader 规则依据：已核对/);
});
