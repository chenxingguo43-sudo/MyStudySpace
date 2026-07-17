const test = require('node:test');
const assert = require('node:assert/strict');

const { buildP6ContextUnits } = require('../../scripts/russian-b2/build-p6-context');

test('P6 context builder retains both source-material groups and all 32 linked questions', () => {
  const result = buildP6ContextUnits();

  assert.deepEqual(result.contextGroups.map(group => group.exerciseIds.length), [18, 14]);
  assert.deepEqual(result.exercises.map(exercise => exercise.printedNumber), [
    ...Array.from({ length: 18 }, (_, index) => index + 9),
    ...Array.from({ length: 14 }, (_, index) => index + 37)
  ]);
  assert.ok(result.contextGroups.every(group => group.materials.length > 0));
  assert.ok(result.contextGroups.every(group => group.materials.every(material => material.sourcePages.length > 0)));
});
