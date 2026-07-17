const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { buildReadingUnits, buildReadingBook, publishReadingBook, publishReadingReaderModule, resolveReadingSourcePath, loadReadingSupport } = require('../../scripts/russian-b2/build-reading');

test('reading builder preserves all ten source texts in printed order', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const result = buildReadingUnits({ markdown: source });
  assert.deepEqual(result.units.map(unit => unit.id), Array.from({ length: 10 }, (_, index) => `reading-text-${String(index + 1).padStart(2, '0')}`));
  assert.ok(result.units.every(unit => unit.body.length > 0));
  assert.deepEqual(result.units.map(unit => unit.sourcePages), [
    [76, 77], [77, 78], [79], [80, 81], [81, 82],
    [83, 84], [84, 85, 86], [86, 87], [88, 89], [90, 91, 92]
  ]);
});

test('reading builder preserves sixty questions and the original answer-key sequence', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const result = buildReadingUnits({ markdown: source });
  const questions = result.units.flatMap(unit => unit.questions);
  assert.deepEqual(questions.map(question => question.printedNumber), Array.from({ length: 60 }, (_, index) => index + 1));
  assert.deepEqual(questions.map(question => question.answer), [
    'В', 'В', 'В', 'В', 'В', 'А', 'А', 'В', 'В', 'В',
    'В', 'В', 'В', 'А', 'А', 'В', 'В', 'В', 'А', 'В',
    'А', 'В', 'А', 'В', 'В', 'В', 'В', 'В', 'В', 'А',
    'А', 'А', 'В', 'А', 'В', 'А', 'В', 'В', 'В', 'В',
    'В', 'А', 'В', 'В', 'В', 'В', 'В', 'В', 'А', 'В',
    'В', 'В', 'В', 'А', 'А', 'В', 'А', 'В', 'В', 'В'
  ]);
  assert.deepEqual(questions.filter(question => question.options.length !== 3).map(question => ({
    printedNumber: question.printedNumber,
    optionCount: question.options.length
  })), []);
  assert.ok(questions.every(question => question.answerSource.pdfPage === 93));
});

test('reading book exposes source-verified units without claiming unfinished translations are approved', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const book = buildReadingBook({ markdown: source });
  assert.equal(book.index.units.length, 10);
  assert.ok(book.units.every(unit => unit.reviewStatus === 'source-verified'));
  assert.ok(book.units.every(unit => unit.translationStatus === 'pending'));
  assert.match(book.units[0].body, /^\u041b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435/);
});

test('reading builder preserves approved learning support as a separate overlay layer', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const supportById = {
    'reading-text-01': { translationStatus: 'learning-support-approved', translations: ['译文'], structure: [{ role: '结构', paragraphs: [1], note: '说明' }], reusableExpressions: [{ ru: 'опираться на', zh: '以……为依据' }], retelling: { steps: ['复述'] } }
  };
  const book = buildReadingBook({ markdown: source, supportById });
  assert.equal(book.units[0].translationStatus, 'learning-support-approved');
  assert.equal(book.units[0].translations[0], '译文');
  assert.equal(book.units[1].translationStatus, 'pending');
});

test('Text 2 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-02'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 6);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 3 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-03'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 6);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 4 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-04'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 5);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 5 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-05'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 7);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 6 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-06'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 9);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 7 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-07'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 16);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 8 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-08'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 17);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 9 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-09'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 6);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('Text 10 has approved paragraph-level learning support with a retelling path', () => {
  const support = loadReadingSupport(path.resolve('.'))['reading-text-10'];
  assert.equal(support.translationStatus, 'learning-support-approved');
  assert.equal(support.translations.length, 6);
  assert.ok(support.structure.length >= 4);
  assert.ok(support.reusableExpressions.length >= 5);
  assert.ok(support.retelling.steps.length >= 3);
});

test('reading module remains available inside the unified B2 dashboard', () => {
  const dashboard = JSON.parse(fs.readFileSync(path.join('data', 'textbook', 'russian_b2', 'book.json'), 'utf8'));
  const readingModule = dashboard.modules.find(module => module.id === 'reading');
  assert.ok(readingModule);
  assert.equal(readingModule.format, 'reading-practice');
  assert.equal(readingModule.chapters, 10);
});

test('reading publisher writes one index and ten stable unit files', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-reading-'));
  const result = publishReadingBook({ markdown: source, outputDir });
  assert.equal(result.paths.length, 11);
  const firstUnit = JSON.parse(fs.readFileSync(path.join(outputDir, 'text-01.json'), 'utf8'));
  assert.match(firstUnit.body, /^\u041b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(outputDir, 'text-10.json'), 'utf8')).id, 'reading-text-10');
});

test('reading publisher creates reader chapters with a source-labelled answer key', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-reading-reader-'));
  const result = publishReadingReaderModule({ markdown: source, outputDir });
  assert.equal(result.paths.length, 11);
  const firstChapter = JSON.parse(fs.readFileSync(path.join(outputDir, 'ch0000.json'), 'utf8'));
  assert.equal(firstChapter.format, 'reading-practice');
  assert.equal(firstChapter.original[0].startsWith('Литературоведение'), true);
  assert.equal(firstChapter.questions.length, 3);
  assert.equal(firstChapter.questions[0].answerSource.pdfPage, 93);
  const moduleIndex = JSON.parse(fs.readFileSync(path.join(outputDir, 'index.json'), 'utf8'));
  assert.equal(moduleIndex.chapters, 10);
});

test('reading CLI resolves the canonical source outside an isolated worktree', () => {
  const sourcePath = resolveReadingSourcePath(path.resolve('.'));
  assert.equal(fs.existsSync(sourcePath), true);
  assert.match(sourcePath, /俄语B2 全模块 Markdown版/);
});
