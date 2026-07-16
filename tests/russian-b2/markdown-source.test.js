const test = require('node:test');
const assert = require('node:assert/strict');
const { auditMarkdownSource } = require('../../scripts/russian-b2/audit-markdown-source');

test('markdown source audit reports missing questions and answer-only numbers', () => {
  const result = auditMarkdownSource({
    questions: '1. first\n2. second\n4. fourth\n',
    answers: '1. answer\n2. answer\n3. answer\n4. answer\n'
  });
  assert.deepEqual(result.questionNumbers, [1, 2, 4]);
  assert.deepEqual(result.answerNumbers, [1, 2, 3, 4]);
  assert.deepEqual(result.missingQuestions, [3]);
  assert.deepEqual(result.answerOnlyNumbers, [3]);
  assert.deepEqual(result.questionOnlyNumbers, []);
});
