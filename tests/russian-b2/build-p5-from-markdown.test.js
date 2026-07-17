const test = require('node:test');
const assert = require('node:assert/strict');
const { buildP5Units } = require('../../scripts/russian-b2/build-p5-from-markdown');

test('P5 builder restores original questions 4 and 29', () => {
  const result = buildP5Units({
    questionsMarkdown: '1. Первый ...\n(А) а (Б) б\n',
    answersMarkdown: '1. 答案: А。解析: правило。译文: перевод。\n',
    expectedRange: [1, 1], chapterStart: 23
  });
  assert.equal(result.units[0].id, 'p5-q001-q001');
  assert.equal(result.ledger.part, 5);
  assert.deepEqual(result.units[0].exercises[0].questionPages, [59]);
});
