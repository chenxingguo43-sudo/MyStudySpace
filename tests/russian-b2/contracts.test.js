const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  validateChapter,
  assertPilotAnswerVector,
  toSafeText
} = require('../../scripts/russian-b2/lib/contracts');
const { buildPilot } = require('../../scripts/russian-b2/build-pilot');

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
    sourceExplanation: '原书解析：测试规则；译文：测试译文。',
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

test('rejects answer/sourceAnswer mismatches, missing source explanation, and missing AI label', () => {
  const exercise = makeExercise('Q001', 'В');
  exercise.sourceAnswer = 'Б';
  exercise.sourceExplanation = '';
  exercise.referenceExplanation = '没有来源标签的解释';
  const errors = validateChapter({
    index: 0, title: 'x', module: '语法词汇', format: 'quiz-first',
    sourcePages: { questions: [18], rules: [24], answers: [25] }, exercises: [exercise]
  });
  assert.match(errors.join('\n'), /sourceAnswer/);
  assert.match(errors.join('\n'), /sourceExplanation/);
  assert.match(errors.join('\n'), /参考解析（AI，待复核）/);
});

test('escapes unsafe text before reader HTML rendering', () => {
  assert.equal(toSafeText('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('requires all pilot question, rule, and answer page references', () => {
  const chapter = require('../../俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json');
  const pages = new Set([
    ...chapter.sourcePages.questions,
    ...chapter.sourcePages.rules,
    ...chapter.sourcePages.answers
  ]);
  assert.deepEqual([...pages].sort((a, b) => a - b), [18, 19, 24, 25, 26, 27]);
});

test('pilot source content has exactly ten sequential verified questions', () => {
  const chapter = require('../../俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json');
  assert.equal(chapter.exercises.length, 10);
  assert.deepEqual(chapter.exercises.map(exercise => exercise.id), [
    'Q001', 'Q002', 'Q003', 'Q004', 'Q005',
    'Q006', 'Q007', 'Q008', 'Q009', 'Q010'
  ]);
  assert.ok(chapter.exercises.every(exercise => exercise.reviewStatus === 'verified'));
  assert.doesNotThrow(() => assertPilotAnswerVector(chapter));
});

test('build creates matching reader JSON, Markdown, and range map', () => {
  const root = path.resolve('.');
  const result = buildPilot({ root });
  const readerChapter = require('../../data/textbook/russian_b2/ch0000.json');
  const markdown = fs.readFileSync(result.markdownPath, 'utf8');
  const rangeMap = JSON.parse(fs.readFileSync(result.rangeMapPath, 'utf8'));
  assert.equal(readerChapter.exercises.length, 10);
  assert.match(markdown, /Q001/);
  assert.match(markdown, /答案与解析/);
  assert.deepEqual(rangeMap.entries[0].question_pages, [18, 19]);
  assert.deepEqual(rangeMap.entries[0].answer_pages, [25, 26, 27]);
});
