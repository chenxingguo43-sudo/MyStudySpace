const test = require('node:test');
const assert = require('node:assert/strict');
const { buildP4Units } = require('../../scripts/russian-b2/build-p4-from-markdown');

test('P4 builder repairs the missing original answer 47', () => {
  const result = buildP4Units({
    questionsMarkdown: '1. Первый ...\n(А) а (Б) б\n',
    answersMarkdown: '1. 答案: А。解析: правило。译文: перевод。\n',
    expectedRange: [1, 1],
    chapterStart: 18
  });
  assert.equal(result.units[0].id, 'p4-q001-q001');
  assert.deepEqual(result.units[0].exercises[0].questionPages, [47]);
  assert.equal(result.ledger.part, 4);
});
