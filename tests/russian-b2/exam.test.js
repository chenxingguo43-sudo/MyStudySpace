const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createExamAttempt, resumeExamAttempt, buildExamModule, publishExamReaderModule, importReadingQuestions } = require('../../scripts/russian-b2/build-exam');

const root = path.resolve(__dirname, '..', '..');

test('exam attempt follows the six B2 sections and preserves an interrupted timer', () => {
  const attempt = createExamAttempt({ now: '2026-07-17T00:00:00.000Z' });
  assert.deepEqual(attempt.sections.map(section => section.id), ['grammar', 'reading', 'writing', 'listening', 'speaking', 'review']);
  assert.equal(attempt.interrupted, false);
  const resumed = resumeExamAttempt(attempt, { remainingMs: 123000 });
  assert.equal(resumed.interrupted, true);
  assert.equal(resumed.remainingMs, 123000);
});

test('exam module imports five source-verified B2 subtests in printed order', () => {
  const exam = buildExamModule({ root });
  assert.deepEqual(exam.sections.map(section => section.id), ['grammar-lexicon', 'reading', 'writing', 'listening', 'speaking']);
  assert.deepEqual(exam.sections.map(section => section.durationMinutes), [90, 60, 55, 35, 45]);
  assert.deepEqual(exam.sections.map(section => section.sourcePages), [
    [118, 149], [150, 157], [158, 163], [164, 176], [177, 189]
  ]);
  assert.ok(exam.sections.every(section => section.reviewStatus === 'source-verified'));
});

test('exam publisher creates stable reader chapters without inventing unverified source questions', () => {
  const outputDir = path.join(root, 'tmp', 'exam-reader-test');
  const result = publishExamReaderModule({ root, outputDir });
  assert.equal(result.index.chapters, 5);
  const grammar = JSON.parse(require('node:fs').readFileSync(path.join(outputDir, 'ch0000.json'), 'utf8'));
  assert.equal(grammar.format, 'exam-practice');
  assert.equal(grammar.importStatus, 'source-indexed');
  assert.equal(grammar.questions, undefined);
});

test('exam reading keeps the complete original answer-key vector before questions are published', () => {
  const exam = buildExamModule({ root });
  const reading = exam.sections.find(section => section.id === 'reading');
  assert.deepEqual(reading.answerKey, [
    'Б', 'В', 'Б', 'Б', 'В', 'Б', 'Б', 'В',
    'А', 'Б', 'Б', 'В', 'В', 'В', 'А',
    'В', 'Б', 'А', 'В', 'Б', 'В', 'В', 'В', 'Б', 'А'
  ]);
  assert.equal(reading.answerKeySource.pdfPages.join(','), '154,157');
});

test('exam reading imports all 25 original questions with complete choices and verified answer alignment', () => {
  const result = importReadingQuestions({ root });
  assert.equal(result.questions.length, 25);
  assert.deepEqual(result.questions.map(question => question.printedNumber), Array.from({ length: 25 }, (_, index) => index + 1));
  assert.ok(result.questions.every(question => question.prompt.length >= 10 && question.options.length === 3));
  assert.deepEqual(result.questions.map(question => question.answer), result.answerKey);
  assert.ok(result.questions.every(question => question.answerSource.kind === 'b2-original'));
  assert.ok(result.questions.every(question => question.questionSource.kind === 'b2-original'));
});

test('exam writing keeps the three original tasks with their distinct genre and word limits', () => {
  const exam = buildExamModule({ root });
  const writing = exam.sections.find(section => section.id === 'writing');
  assert.equal(writing.importStatus, 'source-verified');
  assert.deepEqual(writing.tasks.map(task => task.id), ['exam-writing-01', 'exam-writing-02', 'exam-writing-03']);
  assert.deepEqual(writing.tasks.map(task => task.wordTarget), ['50–70', '50–70', '100–150']);
  assert.deepEqual(writing.tasks.map(task => task.source.pdfPages), [[164, 165], [166], [166]]);
  assert.ok(writing.tasks.every(task => task.prompt.length > 50 && task.source.kind === 'b2-original'));
});

test('exam shelf metadata distinguishes published subtests from source-indexed ones', () => {
  const catalogue = JSON.parse(fs.readFileSync(path.join('data', 'textbook', 'index.json'), 'utf8'));
  const examBook = catalogue.books.find(book => book.id === 'russian_b2_exam');
  assert.ok(examBook);
  assert.match(examBook.description, /阅读与写作/);
  assert.match(examBook.description, /来源索引/);
});
