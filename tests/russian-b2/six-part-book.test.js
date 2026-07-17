const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateStudyNavigation, getStudyPointExerciseIds } = require('../../scripts/russian-b2/lib/contracts');
const { buildSixPartBook } = require('../../scripts/russian-b2/build-six-part-book');

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
  assert.deepEqual(navigation.parts.find(part => part.id === 'p6').unitIds, ['p6-q001-q028', 'p6-context-q009-q050', 'p6-q029-q036']);

  const byExercise = new Map(units.flatMap(unit => unit.exercises.map(exercise => [exercise.id, { exercise, unit }])));
  for (const part of navigation.parts) {
    const expected = units.filter(unit => unit.part === part.part).flatMap(unit => unit.exercises)
      .sort((left, right) => left.printedNumber - right.printedNumber).map(exercise => exercise.id);
    const actual = part.knowledgePoints.flatMap(point => getStudyPointExerciseIds(point, part.part, byExercise));
    assert.deepEqual(actual, expected, part.id + ' must cover each published exercise once in order');
  }
});

test('six-part builder preserves all published exercises and their stable order', () => {
  const result = buildSixPartBook({ root: ROOT, write: false });
  assert.equal(result.parts.length, 6);
  const p2 = result.parts.find(part => part.id === 'p2');
  assert.deepEqual(p2.exercises.slice(54, 58).map(item => item.id), ['P2-Q055', 'P2-Q056', 'P2-Q057', 'P2-Q058']);
  const ids = result.parts.flatMap(part => part.exercises.map(item => item.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('P2-Q030 preserves the four source-verified interference options across its page break', () => {
  const result = buildSixPartBook({ root: ROOT, write: false });
  const exercise = result.parts.find(part => part.id === 'p2').exercises.find(item => item.id === 'P2-Q030');
  assert.deepEqual(exercise.options, [
    { key: 'А', text: 'мои дела' },
    { key: 'Б', text: 'моим делам' },
    { key: 'В', text: 'в мои дела' },
    { key: 'Г', text: 'к моим делам' }
  ]);
  assert.deepEqual(exercise.questionPages, [20, 21]);
});

test('P6 is a continuous 50-question part with retained source-material groups', () => {
  const result = buildSixPartBook({ root: ROOT, write: false });
  const p6 = result.parts.find(part => part.id === 'p6');
  assert.deepEqual(p6.exercises.map(exercise => exercise.printedNumber), Array.from({ length: 50 }, (_, index) => index + 1));
  assert.deepEqual(p6.contextGroups.map(group => group.exerciseIds.length), [18, 14]);
});
