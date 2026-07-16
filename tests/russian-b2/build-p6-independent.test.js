const test = require('node:test');
const assert = require('node:assert/strict');
const { buildP6IndependentUnits } = require('../../scripts/russian-b2/build-p6-independent');

test('P6 builder publishes only the declared independent ranges', () => {
  const result = buildP6IndependentUnits({
    questionsMarkdown: '1. Первый ...\n(А) а (Б) б\n',
    answersMarkdown: '1. 答案: А。解析: правило。译文: перевод。\n',
    publishedNumbers: [1], chapterStart: 28
  });
  assert.deepEqual(result.units[0].exercises.map(exercise => exercise.printedNumber), [1]);
  assert.equal(result.ledger.part, 6);
  assert.deepEqual(result.excludedRanges, [[9, 26], [37, 50]]);
});
