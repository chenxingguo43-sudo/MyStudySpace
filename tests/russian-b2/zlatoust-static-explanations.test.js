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
