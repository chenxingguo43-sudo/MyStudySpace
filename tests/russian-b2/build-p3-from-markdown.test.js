const test = require('node:test');
const assert = require('node:assert/strict');
const { buildP3Units } = require('../../scripts/russian-b2/build-p3-from-markdown');

test('P3 builder repairs the missing original question 49', () => {
  const result = buildP3Units({
    questionsMarkdown: '1. Первый ...\n(А) а (Б) б\n',
    answersMarkdown: '1. 答案: А。解析: правило。译文: перевод。\n',
    expectedRange: [1, 1],
    chapterStart: 13
  });
  assert.equal(result.units[0].id, 'p3-q001-q001');
  assert.deepEqual(result.units[0].exercises[0].questionPages, [36]);
  assert.equal(result.ledger.part, 3);
});
