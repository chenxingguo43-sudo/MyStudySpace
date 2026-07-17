const test = require('node:test');
const assert = require('node:assert/strict');
const { auditMarkdownSource, extractQuestionDrafts, extractAnswerDrafts } = require('../../scripts/russian-b2/audit-markdown-source');

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

test('markdown source extractor preserves original two-choice question blocks', () => {
  const drafts = extractQuestionDrafts(`1. Первый вопрос ...\n(А) первый вариант (Б) второй вариант\n\n2. Второй вопрос ...\n(А) вариант А\n(Б) вариант Б\n`);
  assert.deepEqual(drafts, [
    { printedNumber: 1, question: 'Первый вопрос ...', options: [{ key: 'А', text: 'первый вариант' }, { key: 'Б', text: 'второй вариант' }] },
    { printedNumber: 2, question: 'Второй вопрос ...', options: [{ key: 'А', text: 'вариант А' }, { key: 'Б', text: 'вариант Б' }] }
  ]);
});

test('markdown source extractor accepts OCR option markers without an opening parenthesis', () => {
  const drafts = extractQuestionDrafts('30. Вопрос ...\nA) первый вариант (Б) второй вариант\n');
  assert.deepEqual(drafts[0].options, [{ key: 'А', text: 'первый вариант' }, { key: 'Б', text: 'второй вариант' }]);
});

test('markdown source extractor repairs repeated Latin B option markers by their printed position', () => {
  const questions = extractQuestionDrafts('3. Озеро ...\n(A) первый (Б) второй\n(B) третий (Г) четвёртый\n');
  assert.deepEqual(questions[0].options.map(option => option.key), ['А', 'Б', 'В', 'Г']);
});

test('markdown source extractor reads answer, explanation, and translation drafts', () => {
  const drafts = extractAnswerDrafts('1. 答案: В。解析: 规则说明。译文: 中文翻译。\n2. 答案: Б。解析: 第二条。译文: 第二个翻译。');
  assert.deepEqual(drafts, [
    { printedNumber: 1, answer: 'В', sourceExplanation: '规则说明。', translation: '中文翻译。' },
    { printedNumber: 2, answer: 'Б', sourceExplanation: '第二条。', translation: '第二个翻译。' }
  ]);
});

test('markdown source extractor normalizes OCR Greek gamma to the original Г option key', () => {
  const drafts = extractAnswerDrafts('2. 答案: Γ。解析: 规则。译文: 译文。');
  assert.equal(drafts[0].answer, 'Г');
});

test('markdown source extractor accepts a LaTex-wrapped Greek gamma answer', () => {
  const answers = extractAnswerDrafts('9. 答案: $\\Gamma$。解析: 规则。译文: 翻译。\n');
  assert.equal(answers[0].answer, 'Г');
});
