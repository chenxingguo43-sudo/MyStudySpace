const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateStudyNavigation, getStudyPointExerciseIds } = require('../../scripts/russian-b2/lib/contracts');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, '俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法词汇');

function loadPublishedNavigationFixture() {
  const manifest = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'));
  const units = manifest.units.filter(unit => unit.published)
    .map(unit => JSON.parse(fs.readFileSync(path.join(DATA, unit.source), 'utf8')));
  const navigation = JSON.parse(fs.readFileSync(path.join(DATA, 'part-study-navigation.json'), 'utf8'));
  return { navigation, units };
}

test('study navigation rejects a missing exercise and unsupported rule', () => {
  const errors = validateStudyNavigation({
    units: [{ id: 'p2-q001-q010', part: 2, exercises: [{ id: 'P2-Q001' }] }],
    navigation: { parts: [{
      id: 'p2', part: 2, title: 'P2', unitIds: ['p2-q001-q010'],
      knowledgePoints: [{ id: 'p2-case', title: '接格', exerciseIds: ['P2-Q999'], rule: '', pitfalls: '', sourcePages: [] }]
    }] }
  });
  assert.deepEqual(errors, [
    'p2-case: exercise P2-Q999 is not in part 2',
    'p2-case: rule is required',
    'p2-case: sourcePages is required'
  ]);
});

test('published navigation covers every published exercise once in original part order', () => {
  const { navigation, units } = loadPublishedNavigationFixture();
  assert.deepEqual(validateStudyNavigation({ navigation, units }), []);
  assert.equal(navigation.parts.length, 6);
  assert.deepEqual(navigation.parts.find(part => part.id === 'p6').unitIds, ['p6-q001-q028', 'p6-q029-q036']);

  const byExercise = new Map(units.flatMap(unit => unit.exercises.map(exercise => [exercise.id, { exercise, unit }])));
  for (const part of navigation.parts) {
    const expected = units.filter(unit => unit.part === part.part).flatMap(unit => unit.exercises).map(exercise => exercise.id);
    const actual = part.knowledgePoints.flatMap(point => getStudyPointExerciseIds(point, part.part, byExercise));
    assert.deepEqual(actual, expected, part.id + ' must cover each published exercise once in order');
  }
});
