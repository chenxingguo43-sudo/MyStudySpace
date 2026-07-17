const test = require('node:test');
const assert = require('node:assert/strict');
const { buildP1Units } = require('../../scripts/russian-b2/build-p1-from-markdown');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('P1 builder repairs the known question 42 and answer 46 source gaps', () => {
  const questions = '1. Первый ...\n(А) а (Б) б\n';
  const answers = '1. 答案: А。解析: правило。译文: перевод。\n';
  const result = buildP1Units({ questionsMarkdown: questions, answersMarkdown: answers, expectedRange: [1, 1], chapterStart: 7 });
  assert.equal(result.units[0].id, 'p1-q001-q001');
  assert.deepEqual(result.units[0].exercises[0].options, [{ key: 'А', text: 'а' }, { key: 'Б', text: 'б' }]);
  assert.equal(result.ledger.entries[0].answer, 'А');
  assert.deepEqual(result.units[0].exercises[0].questionPages, [6]);
});

test('P1 publisher writes canonical units and a source ledger', () => {
  const { publishP1 } = require('../../scripts/russian-b2/build-p1-from-markdown');
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'russian-b2-p1-'));
  const result = publishP1({
    questionsMarkdown: '1. Первый ...\n(А) а (Б) б\n',
    answersMarkdown: '1. 答案: А。解析: правило。译文: перевод。\n',
    expectedRange: [1, 1],
    chapterStart: 7,
    outputDirectory
  });
  assert.equal(result.unitPaths.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(result.unitPaths[0], 'utf8')).id, 'p1-q001-q001');
  assert.equal(JSON.parse(fs.readFileSync(result.ledgerPath, 'utf8')).part, 1);
});
