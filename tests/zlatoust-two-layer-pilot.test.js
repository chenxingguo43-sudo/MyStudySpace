const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chapter = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'ch0000.json'), 'utf8'));
const document = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'theory', 'explanations', 'gl1', 'gl1-q001-q013.json'), 'utf8'));
const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');

test('GL1-Q008 is the source-consistent two-layer grammar pilot', () => {
  const exercise = chapter.exercises.find(item => item.id === 'GL1-Q008');
  const explanation = document.explanations.find(item => item.exerciseId === 'GL1-Q008');

  assert.equal(exercise.answer, 'Б');
  assert.deepEqual(exercise.options.map(item => item.key), ['А', 'Б']);
  assert.equal(explanation.correctOption.key, exercise.answer);
  assert.deepEqual(explanation.distractors.map(item => item.key), ['А']);
  assert.equal(explanation.presentation.mode, 'two-layer');
  assert.equal(explanation.presentation.status, 'pilot');
  assert.match(explanation.conclusion, /воспитал.*他培养了.*воспитала.*她培养了/);
  assert.match(explanation.sentenceSkeleton.ru, /^Татьяна Тарасова воспитала/);
  assert.match(explanation.memoryRule, /известный тренер.*воспитала/);
  assert.equal(explanation._source.rules[0].ruleId, 'gl1-1.1-feminine-verb-agreement');
});

test('Reader routes only marked grammar explanations through the two-layer renderer', () => {
  assert.match(reader, /explanation\.presentation && explanation\.presentation\.mode === 'two-layer'/);
  assert.match(reader, /return renderZlatoustTwoLayerExplanation\(exercise, explanation, state, answerKey, answerOption, mapping, label\)/);
  assert.match(reader, /function renderZlatoustTwoLayerExplanation\(/);
  assert.match(reader, /var analysisExpanded = !!record\.analysisExpanded/);
  assert.match(reader, /setZlatoustAnalysisExpanded/);
  assert.match(reader, /record\.analysisExpanded = expanded/);
  assert.match(reader, /把干扰拿掉再看/);
  assert.match(reader, /展开详细解析/);
  assert.match(reader, /下次怎么判断/);
});

test('grammar pilot stores the expanded-detail state separately from the outer answer toggle', () => {
  assert.match(reader, /analysisExpanded: false/);
  assert.match(reader, /class=\"rs-analysis-expanded zlatoust-analysis-expanded\".*analysisExpanded \? ' open' : ''/);
  assert.match(reader, /ontoggle=\"setZlatoustAnalysisExpanded/);
  assert.match(reader, /function setZlatoustAnalysisExpanded\(questionId, expanded\)/);
});
