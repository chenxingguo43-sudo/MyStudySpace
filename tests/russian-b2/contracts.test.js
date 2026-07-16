const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateChapter,
  assertPilotAnswerVector,
  toSafeText
} = require('../../scripts/russian-b2/lib/contracts');

function makeExercise(id, answer) {
  return {
    id,
    type: 'single-choice',
    question: 'Тестовый вопрос',
    options: [
      { key: 'А', text: 'a' }, { key: 'Б', text: 'b' },
      { key: 'В', text: 'c' }, { key: 'Г', text: 'd' }
    ],
    answer,
    sourceAnswer: answer,
    sourceEvidence: 'PDF-025',
    referenceExplanation: '参考解析（AI，待复核）：测试。',
    pitfalls: ['测试干扰项'],
    questionPages: [18],
    answerPages: [25],
    reviewStatus: 'verified'
  };
}

test('accepts the complete Q001–Q010 pilot answer vector', () => {
  const answers = ['В', 'В', 'Б', 'А', 'Г', 'Г', 'А', 'А', 'А', 'Б'];
  const chapter = {
    index: 0, title: '名词与形容词接格（题 1–10）', module: '语法词汇',
    format: 'quiz-first',
    sourcePages: { questions: [18, 19], rules: [24], answers: [25, 26, 27] },
    exercises: answers.map((answer, index) => makeExercise(`Q${String(index + 1).padStart(3, '0')}`, answer))
  };
  assert.deepEqual(validateChapter(chapter), []);
  assert.doesNotThrow(() => assertPilotAnswerVector(chapter));
});

test('rejects answer/sourceAnswer mismatches and missing AI label', () => {
  const exercise = makeExercise('Q001', 'В');
  exercise.sourceAnswer = 'Б';
  exercise.referenceExplanation = '没有来源标签的解释';
  const errors = validateChapter({
    index: 0, title: 'x', module: '语法词汇', format: 'quiz-first',
    sourcePages: { questions: [18], rules: [24], answers: [25] }, exercises: [exercise]
  });
  assert.match(errors.join('\n'), /sourceAnswer/);
  assert.match(errors.join('\n'), /参考解析（AI，待复核）/);
});

test('escapes unsafe text before reader HTML rendering', () => {
  assert.equal(toSafeText('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});
