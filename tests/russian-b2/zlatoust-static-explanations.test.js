const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const grammarRoot = path.join(root, 'data', 'textbook', 'zlatoust_grammar');
const explanationRoot = path.join(grammarRoot, 'theory', 'explanations');
const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('static Zlatoust explanations cover and match all 597 exercises', () => {
  const manifest = loadJson(path.join(explanationRoot, 'index.json'));
  const explanations = new Map();

  for (const files of Object.values(manifest.chapters)) {
    for (const relativeFile of files) {
      const document = loadJson(path.join(grammarRoot, 'theory', relativeFile));
      assert.equal(document.schemaVersion, 1, relativeFile);
      for (const entry of document.explanations) {
        assert.ok(!explanations.has(entry.exerciseId), `duplicate ${entry.exerciseId}`);
        explanations.set(entry.exerciseId, entry);
      }
    }
  }

  let exerciseCount = 0;
  for (let chapterIndex = 0; chapterIndex < 5; chapterIndex++) {
    const chapter = loadJson(path.join(grammarRoot, `ch${String(chapterIndex).padStart(4, '0')}.json`));
    for (const exercise of chapter.exercises) {
      exerciseCount++;
      const explanation = explanations.get(exercise.id);
      assert.ok(explanation, `missing ${exercise.id}`);
      assert.equal(explanation.correctOption.key, exercise.sourceAnswer || exercise.answer, exercise.id);
      assert.ok(explanation.completeSentence.ru, `${exercise.id} has no completed Russian sentence`);
      assert.ok(explanation.completeSentence.zh, `${exercise.id} has no Chinese translation`);
      assert.ok(explanation.conclusion, `${exercise.id} has no conclusion`);
      assert.ok(explanation.decisionSteps.length, `${exercise.id} has no decision steps`);
      assert.ok(explanation.correctOption.analysis || explanation.sourceOnlyWarning, `${exercise.id} has no correct-option analysis or source-only warning`);
      assert.ok(explanation.memoryRule, `${exercise.id} has no memory rule`);

      const expectedDistractors = (exercise.options || [])
        .filter((option) => option.key !== (exercise.sourceAnswer || exercise.answer))
        .map((option) => option.key)
        .sort();
      const actualDistractors = explanation.distractors.map((item) => item.key).sort();
      assert.deepEqual(actualDistractors, expectedDistractors, exercise.id);
    }
  }

  assert.equal(exerciseCount, 597);
  assert.equal(explanations.size, 597);
});

test('GL1 Q034 corrects the printed answer-key error with instrumental свободным', () => {
  const chapter = loadJson(path.join(grammarRoot, 'ch0000.json'));
  const document = loadJson(path.join(explanationRoot, 'gl1', 'gl1-q027-q039.json'));
  const mapping = loadJson(path.join(grammarRoot, 'theory', 'mappings', 'exercise-to-rules.json')).exercises['GL1-Q034'];
  const repair = loadJson(path.join(grammarRoot, 'theory', 'quality-reports', 'chapter-01-data-repair.json'))
    .discrepancies.find((item) => item.exerciseId === 'GL1-Q034');
  const exercise = chapter.exercises.find((item) => item.id === 'GL1-Q034');
  const explanation = document.explanations.find((item) => item.exerciseId === 'GL1-Q034');

  assert.equal(exercise.answer, 'В');
  assert.equal(exercise.sourceAnswer, 'В');
  assert.equal(exercise.options.find((item) => item.key === 'В').text, 'свободным');
  assert.equal(explanation.correctOption.key, 'В');
  assert.match(explanation.completeSentence.ru, /чувствует себя абсолютно свободным\.$/);
  assert.match(explanation.memoryRule, /чувствовать себя кем\? каким\?.*第五格/);
  assert.match(mapping.mappingReason, /чувствовать себя.*第五格/);
  assert.equal(repair.pdfOriginal.answer, 'Г');
  assert.equal(repair.repairedContent.answer, 'В');
  assert.equal(repair.discrepancyType, 'printed-answer-key-error');
});

test('Reader loads rich explanations and keeps source-only provenance visible', () => {
  assert.match(reader, /loadZlatoustStaticExplanationDocuments\(chapterId\)/);
  assert.match(reader, /buildZlatoustStaticExplanationIndex\(state, result\[3\]\)/);
  assert.match(reader, /var staticExplanation = getZlatoustStaticExplanation\(exercise, state, answerKey\)/);
  assert.doesNotMatch(reader, /status === 'mapped' \? getZlatoustStaticExplanation/);
  assert.match(reader, /原书只提供了练习与答案，没有独立的逐题解析/);
  assert.match(reader, /正确项为什么对/);
  assert.match(reader, /其他选项为什么不对/);
  assert.match(reader, /记忆提示/);
});
