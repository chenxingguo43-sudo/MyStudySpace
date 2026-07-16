const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  validateChapter,
  validateUnit,
  validateUnitManifest,
  assertPilotAnswerVector,
  toSafeText
} = require('../../scripts/russian-b2/lib/contracts');
const { buildPilot } = require('../../scripts/russian-b2/build-pilot');
const { buildBook } = require('../../scripts/russian-b2/build-book');
const { verifySourceLedger } = require('../../scripts/russian-b2/verify-source-ledger');

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

function makeUnit() {
  return {
    id: 'p2-q001-q010', chapterIndex: 0, part: 2,
    title: '接格关系（题 1-10）', module: '语法词汇', format: 'quiz-first',
    sourcePages: { questions: [18], rules: [24], answers: [25] },
    exercises: [Object.assign(makeExercise('P2-Q001', 'В'), { printedNumber: 1 })]
  };
}

function makeLedgerEntry() {
  return {
    exerciseId: 'P2-Q001', printedNumber: 1,
    questionPages: [18], rulePages: [24], answerPages: [25],
    answer: 'В', sourceExplanation: 'памятник кому', translation: '测试译文', status: 'verified'
  };
}

test('requires permanent unit and exercise identifiers', () => {
  const unit = makeUnit();
  assert.deepEqual(validateUnit(unit), []);
  unit.id = '';
  unit.exercises[0].id = 'Q001';
  delete unit.exercises[0].printedNumber;
  const errors = validateUnit(unit).join('\n');
  assert.match(errors, /unit.id/);
  assert.match(errors, /Pn-Qnnn/);
  assert.match(errors, /printedNumber/);
});

test('accepts original two-choice exercises without adding invented options', () => {
  const exercise = makeExercise('P1-Q001', 'А');
  exercise.options = exercise.options.slice(0, 2);
  exercise.sourceAnswer = 'А';
  exercise.answer = 'А';
  exercise.printedNumber = 1;
  assert.deepEqual(validateUnit(Object.assign(makeUnit(), { part: 1, exercises: [exercise] })), []);
});

test('rejects duplicate reader chapter indexes in the unit manifest', () => {
  const another = makeUnit();
  another.id = 'p2-q011-q020';
  assert.match(validateUnitManifest({ units: [makeUnit(), another] }).join('\n'), /chapterIndex.*unique/);
});

test('source ledger requires verified explanation and translation for each canonical exercise', () => {
  const unit = makeUnit();
  unit.exercises[0].sourceExplanation = '原书解析：памятник кому；译文：测试译文';
  assert.deepEqual(verifySourceLedger({ ledger: { part: 2, entries: [makeLedgerEntry()] }, units: [unit] }), []);
  const broken = makeLedgerEntry();
  broken.translation = '';
  assert.match(verifySourceLedger({ ledger: { part: 2, entries: [broken] }, units: [unit] }).join('\n'), /translation/);
});

test('source ledger derives exercise ID format from its declared part', () => {
  const unit = makeUnit();
  unit.id = 'p1-q001-q010';
  unit.part = 1;
  unit.exercises[0].id = 'P1-Q001';
  const entry = makeLedgerEntry();
  entry.exerciseId = 'P1-Q001';
  unit.exercises[0].sourceExplanation = '原书解析：' + entry.sourceExplanation + '；译文：' + entry.translation;
  assert.deepEqual(verifySourceLedger({ ledger: { part: 1, entries: [entry] }, units: [unit] }), []);
  unit.exercises[0].id = 'P2-Q001';
  assert.match(verifySourceLedger({ ledger: { part: 1, entries: [entry] }, units: [unit] }).join('\n'), /P1-Qnnn/);
});

test('source ledger rejects a declared Part 2 range with a missing printed question', () => {
  const first = makeLedgerEntry();
  const second = Object.assign(makeLedgerEntry(), { exerciseId: 'P2-Q003', printedNumber: 3 });
  const errors = verifySourceLedger({ ledger: { part: 2, expectedRange: [1, 3], entries: [first, second] }, units: [] });
  assert.match(errors.join('\n'), /missing printedNumber 2/);
});

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

test('pilot source content has exactly ten sequential verified permanent questions', () => {
  const chapter = require('../../俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json');
  assert.equal(chapter.exercises.length, 10);
  assert.deepEqual(chapter.exercises.map(exercise => exercise.id), [
    'P2-Q001', 'P2-Q002', 'P2-Q003', 'P2-Q004', 'P2-Q005',
    'P2-Q006', 'P2-Q007', 'P2-Q008', 'P2-Q009', 'P2-Q010'
  ]);
  assert.deepEqual(chapter.exercises.map(exercise => exercise.printedNumber), [1,2,3,4,5,6,7,8,9,10]);
  assert.ok(chapter.exercises.every(exercise => exercise.reviewStatus === 'verified'));
  assert.doesNotThrow(() => assertPilotAnswerVector(chapter));
});

test('manifest build creates matching reader JSON, Markdown, range map, and quality report', () => {
  const root = path.resolve('.');
  const result = buildBook({ root });
  const readerChapter = require('../../data/textbook/russian_b2/ch0000.json');
  const markdown = fs.readFileSync(result.markdownPaths[0], 'utf8');
  const rangeMap = JSON.parse(fs.readFileSync(result.rangeMapPath, 'utf8'));
  const quality = JSON.parse(fs.readFileSync(result.qualityReportPath, 'utf8'));
  const textbookIndex = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'index.json'), 'utf8'));
  const b2Book = textbookIndex.books.find(book => book.id === 'russian_b2');
  assert.equal(readerChapter.exercises.length, 10);
  assert.match(markdown, /P2-Q001/);
  assert.match(markdown, /答案与解析/);
  assert.deepEqual(rangeMap.entries[0].question_pages, [18, 19]);
  assert.deepEqual(rangeMap.entries[0].answer_pages, [25, 26, 27]);
  assert.deepEqual(quality.units.map(unit => unit.id), [
    'p2-q001-q010', 'p2-q011-q020', 'p2-q021-q030', 'p2-q031-q040',
    'p2-q041-q050', 'p2-q051-q060', 'p2-q061-q070'
  ]);
  assert.deepEqual(b2Book.unitIds, [
    'p2-q001-q010', 'p2-q011-q020', 'p2-q021-q030', 'p2-q031-q040',
    'p2-q041-q050', 'p2-q051-q060', 'p2-q061-q070'
  ]);
  assert.equal(buildPilot({ root }).readerPaths.length, 7);
});

test('published Part 2 units cover every verified source-ledger question', () => {
  const base = path.join('俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法词汇');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'index.json'), 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(path.join(base, 'part-02-source-ledger.json'), 'utf8'));
  const units = manifest.units.filter(entry => entry.published).map(entry => JSON.parse(fs.readFileSync(path.join(base, entry.source), 'utf8')));
  assert.equal(units.length, 7);
  assert.deepEqual(units.flatMap(unit => unit.exercises.map(exercise => exercise.printedNumber)), Array.from({ length: 70 }, (_, index) => index + 1));
  assert.deepEqual(verifySourceLedger({ ledger, units }), []);
});
