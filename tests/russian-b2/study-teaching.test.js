const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildStudyCards } = require('../../scripts/russian-b2/lib/study-cards');
const { buildP3Units } = require('../../scripts/russian-b2/build-p3-from-markdown');
const root = path.resolve(__dirname, '../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const chapter = read('data/textbook/russian_b2/ch0002.json');
const card = read('data/textbook/russian_b2/study-cards/p3-gerund-subject.json');
const base = '俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/';
const p3CardIds = ['p3-active-participles', 'p3-passive-participles', 'p3-gerund-meanings', 'p3-gerund-subject'];

test('all P3 teaching cards remain concept-first lessons with one primary home for every formal question', () => {
  const navigation = read(base + 'part-study-navigation.json').parts.find(part => part.id === 'p3');
  const cards = p3CardIds.map(id => read(`data/textbook/russian_b2/study-cards/${id}.json`));
  const formalMappings = [];

  for (const current of cards) {
    const n = current.teachingNarrative;
    const point = navigation.knowledgePoints.find(item => item.id === current.id);
    assert.ok(n, `${current.id} needs its teaching narrative`);
    assert.equal(n.version, 2);
    assert.equal(n.progressKey, 'teachingV2');
    assert.ok(['accepted', 'accepted-pilot'].includes(n.status));
    assert.ok(n.intro && n.quickContrast);
    assert.ok(!n.quickTitle || n.quickTitle.trim());
    assert.ok(!n.heroProblem || n.heroProblem.trim());
    assert.ok(!n.mindMapRootLines || n.mindMapRootLines.length >= 2);
    assert.equal(n.mindMap.length, n.sections.length);
    assert.ok(n.decisionSteps.length >= 4);
    assert.ok(n.transferTasks.length >= 2);
    assert.ok(n.neighboringScope.covered);
    assert.ok(n.neighboringScope.handOff.length);

    const formal = n.sections.flatMap(section => section.exerciseIds);
    assert.deepEqual([...formal].sort(), [...current.exerciseIds].sort());
    assert.equal(new Set(formal).size, formal.length);
    assert.deepEqual(n.mappings.map(mapping => mapping.exerciseId), current.exerciseIds);
    assert.equal(new Set(n.mappings.map(mapping => mapping.exerciseId)).size, n.mappings.length);

    const legacyCheckIds = current.checks.concat(current.lessons.flatMap(lesson => lesson.instantChecks)).map(check => check.id);
    const narrativeCheckIds = n.sections.map(section => section.check.id);
    assert.equal(new Set(narrativeCheckIds).size, narrativeCheckIds.length);
    assert.ok(narrativeCheckIds.every(id => !legacyCheckIds.includes(id)));

    for (const section of n.sections) {
      assert.ok(section.paragraphs.length, `${current.id}/${section.id} needs concept teaching`);
      assert.ok(section.examples.length, `${current.id}/${section.id} needs an example`);
      assert.ok(section.check.options[section.check.answer]);
      assert.ok(section.check.feedback.correct);
      assert.ok(section.check.feedback.misconception);
      assert.ok(section.check.feedback.review);
      assert.ok(section.check.retry.options[section.check.retry.answer]);
    }
    for (const mapping of n.mappings) {
      const section = n.sections.find(item => item.id === mapping.sectionId);
      assert.ok(section.exerciseIds.includes(mapping.exerciseId));
      for (const secondaryId of mapping.also) assert.ok(n.sections.some(item => item.id === secondaryId));
      assert.deepEqual(
        point.teachingMapping.find(item => item.exerciseId === mapping.exerciseId),
        { ...mapping, title: section.title }
      );
      formalMappings.push({ cardId: current.id, exerciseId: mapping.exerciseId, sectionId: mapping.sectionId });
    }

    // This is the deterministic portion of the exercise-removal gate: every
    // branch keeps its own explanation, check, feedback, and changed-context retry.
    const withoutFormalQuestions = n.sections.map(({ exerciseIds, ...section }) => section);
    assert.ok(withoutFormalQuestions.every(section => section.paragraphs.length && section.check && section.check.retry));
  }

  const expectedIds = Array.from({ length: 50 }, (_, index) => `P3-Q${String(index + 1).padStart(3, '0')}`);
  assert.deepEqual(formalMappings.map(item => item.exerciseId), expectedIds);
  assert.equal(new Set(formalMappings.map(item => item.exerciseId)).size, expectedIds.length);
  for (const mapping of formalMappings) assert.ok(mapping.cardId && mapping.sectionId);
});

test('accepted pilot teaches the full concept and gives each formal question one home', () => {
  const n = card.teachingNarrative;
  const point = chapter.knowledgePoints.find(p => p.id === card.id);
  assert.equal(n.version, 2);
  assert.equal(n.progressKey, 'teachingV2');
  assert.equal(n.status, 'accepted-pilot');
  assert.equal(n.sections.length, 9);
  assert.deepEqual(
    n.sections.filter(s => !s.exerciseIds.length).map(s => s.id),
    ['mentioned-is-not-actor', 'true-impersonal', 'rewrite-preserve-meaning']
  );
  assert.ok(n.mindMap.length >= 9);
  assert.equal(n.decisionSteps.length, 4);
  assert.equal(n.transferTasks.length, 3);
  assert.ok(n.neighboringScope.covered);
  assert.deepEqual(card.exerciseIds, point.exerciseIds);
  const formal = n.sections.flatMap(s => s.exerciseIds);
  assert.deepEqual([...formal].sort(), [...card.exerciseIds].sort());
  assert.equal(new Set(formal).size, formal.length);
  assert.deepEqual(n.mappings.map(m => m.exerciseId), card.exerciseIds);
  for (const m of n.mappings) {
    assert.ok(n.sections.find(s => s.id === m.sectionId).exerciseIds.includes(m.exerciseId));
    for (const id of m.also) assert.ok(n.sections.some(s => s.id === id));
    const published = point.teachingMapping.find(p => p.exerciseId === m.exerciseId);
    assert.deepEqual(published, { ...m, title: n.sections.find(s => s.id === m.sectionId).title });
  }
  const checkIds = n.sections.map(s => s.check.id);
  const oldIds = card.checks.concat(card.lessons.flatMap(l => l.instantChecks)).map(c => c.id).concat([
    'v2-same-actor', 'v2-related', 'v2-you', 'v2-need', 'v2-boundary', 'v2-transfer'
  ]);
  assert.equal(new Set(checkIds).size, checkIds.length);
  assert.ok(checkIds.every(id => !oldIds.includes(id)));
  for (const s of n.sections) {
    assert.ok(s.check.options[s.check.answer]);
    assert.ok(s.check.feedback.correct);
    assert.ok(s.check.feedback.misconception);
    assert.ok(s.check.feedback.review);
    assert.ok(s.check.retry.options[s.check.retry.answer]);
  }
  const withoutFormalQuestions = n.sections.map(({ exerciseIds, ...section }) => section);
  assert.equal(withoutFormalQuestions.length, 9);
  assert.ok(withoutFormalQuestions.every(s => s.paragraphs.length && s.check && s.check.retry));
});

test('pilot regenerates unchanged from source card and navigation', () => {
  const generated = buildStudyCards({ root, write: false }).cards.find(c => c.id === card.id);
  assert.deepEqual(generated, card);
  const source = read(base + 'part-study-navigation.json').parts.find(p => p.id === 'p3').knowledgePoints.find(p => p.id === card.id);
  assert.deepEqual(source.teachingMapping, chapter.knowledgePoints.find(p => p.id === card.id).teachingMapping);
});

test('Q048 corrected text, evidence, and rebuild agree without changing the answer', () => {
  const exercise = chapter.exercises.find(e => e.id === 'P3-Q048');
  const source = read(base + 'p3-q041-q050.json').exercises.find(e => e.id === exercise.id);
  assert.equal(exercise.question, '..., много часов занимаясь в библиотеке.');
  assert.equal(source.question, exercise.question);
  assert.equal(exercise.answer, 'А');
  assert.equal(exercise.answerAnalysis.evidence.ru, exercise.question);
  assert.equal(exercise.answerAnalysis.evidenceItems[0].quoteRu, exercise.question);
  assert.match(exercise.sourceCorrections[0].previous, /занималась/);
  const markdown = fs.readFileSync(path.join(root, '俄语资料库/俄语B2 全模块 Markdown版/章节/01-语法和词汇.md'), 'utf8');
  const start = markdown.indexOf('45. . . . , помогая');
  const answers = markdown.indexOf('45. 答案: A。解析: помогая');
  const units = buildP3Units({ questionsMarkdown: markdown.slice(start, answers), answersMarkdown: markdown.slice(answers), expectedRange: [45, 50] });
  const rebuilt = units.units.flatMap(u => u.exercises).find(e => e.id === 'P3-Q048');
  assert.equal(rebuilt.question, exercise.question);
});

test('Q046 source ledger aligns with the published answer and retains correction history', () => {
  const ledger = read(base + 'part-03-source-ledger.json').entries.find(e => e.exerciseId === 'P3-Q046');
  assert.equal(ledger.answer, chapter.exercises.find(e => e.id === ledger.exerciseId).answer);
  assert.equal(ledger.corrections[0].previous, 'Б');
});
