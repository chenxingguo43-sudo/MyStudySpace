const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { buildReadingUnits, buildReadingBook, publishReadingBook } = require('../../scripts/russian-b2/build-reading');

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

test('reading publisher writes one index and ten stable unit files', () => {
  const source = fs.readFileSync(path.join('D:', 'MyStudySpace', '俄语资料库', '俄语B2 全模块 Markdown版', '章节', '02-阅读.md'), 'utf8');
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-reading-'));
  const result = publishReadingBook({ markdown: source, outputDir });
  assert.equal(result.paths.length, 11);
  const firstUnit = JSON.parse(fs.readFileSync(path.join(outputDir, 'text-01.json'), 'utf8'));
  assert.match(firstUnit.body, /^\u041b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(outputDir, 'text-10.json'), 'utf8')).id, 'reading-text-10');
});
