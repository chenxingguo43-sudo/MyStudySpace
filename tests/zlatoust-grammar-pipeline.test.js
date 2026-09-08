'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolveProfile,
  buildInventory,
  createState,
  grammarContractErrors,
  summarize
} = require('../scripts/reader-book-pipeline');

const root = path.resolve(__dirname, '..');

test('grammar adapter inventories exercises and links knowledge points', () => {
  const profile = resolveProfile('zlatoust-grammar', root);
  const inventory = buildInventory(profile);
  assert.equal(inventory.chapters.length, 5);
  assert.equal(inventory.tasks.length, 597);
  const q7 = inventory.tasks.find((task) => task.id === 'ch0000:GL1-Q007');
  assert.ok(q7);
  const inputFile = path.join(root, profile.stateDir, 'inputs', 'ch0000_GL1-Q007.json');
  const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  assert.equal(input.source.original.length, 1);
  assert.equal(input.question.canonicalAnswer, 'А');
  assert.equal(input.source.knowledgePoint.id, 'gl1-1-1');
  assert.deepEqual(input.question.questionPages, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
});

test('grammar state recognizes existing two-layer pilots and keeps the rest actionable', () => {
  const profile = resolveProfile('zlatoust-grammar', root);
  const state = createState(profile);
  const summary = summarize(state);
  const acceptedPilotIds = Array.from({ length: 7 }, (_, index) => `ch0000:GL1-Q${String(index + 7).padStart(3, '0')}`);
  assert.equal(summary.tasks, 597);
  for (const id of acceptedPilotIds) {
    assert.equal(state.tasks.find((task) => task.id === id)?.status, 'completed', `${id} should remain accepted`);
  }
  assert.ok(summary.statuses.completed >= acceptedPilotIds.length);
  assert.equal(summary.statuses.pending + summary.statuses.completed, summary.tasks);
  assert.equal(summary.nextAction, undefined);
});

test('grammar quality contract rejects a two-layer shell without a sentence skeleton', () => {
  const errors = grammarContractErrors({
    presentation: { mode: 'two-layer' },
    completeSentence: { ru: 'Тест.', zh: '测试。' },
    decisionSteps: [{ step: 1, text: '判断。' }],
    correctOption: { key: 'А', analysis: '正确。' },
    distractors: [],
    memoryRule: '规则。'
  });
  assert.match(errors.join('\n'), /sentenceSkeleton/);
});

test('grammar quality contract rejects object-valued option explanations', () => {
  const errors = grammarContractErrors({
    completeSentence: { ru: 'Тест.', zh: '测试。' },
    decisionSteps: [{ step: 1, text: '判断。' }],
    sentenceSkeleton: { ru: 'Тест.', zh: '测试。' },
    correctOption: { key: 'А', analysis: { key: 'А', analysis: '错误嵌套。' } },
    distractors: [],
    memoryRule: '规则。'
  });
  assert.match(errors.join('\n'), /string analysis/);
});

test('grammar quality contract rejects structurally complete but shallow teaching', () => {
  const errors = grammarContractErrors({
    completeSentence: { ru: 'Знание важно.', zh: '知识很重要。' },
    conclusion: '选 Б，因为 важно 是短尾。',
    decisionSteps: [{ step: 1, text: '找到主语。' }, { step: 2, text: '选择短尾。' }],
    sentenceSkeleton: { ru: 'Знание важно.', zh: '知识很重要。' },
    correctOption: { key: 'Б', analysis: 'важно 是短尾。' },
    distractors: [{ key: 'А', reason: 'важное 是长尾。' }],
    pitfall: '不要选错。',
    memoryRule: '谓语用短尾。',
    nextCheck: '检查词形。'
  });
  assert.match(errors.join('\n'), /teaching depth/);
  assert.match(errors.join('\n'), /combined learner-facing/);
});

test('learner-accepted Q008 passes the teaching-density contract', () => {
  const document = JSON.parse(fs.readFileSync(path.join(
    root,
    'data/textbook/zlatoust_grammar/theory/explanations/gl1/gl1-q001-q013.json'
  ), 'utf8'));
  const q8 = document.explanations.find((item) => item.exerciseId === 'GL1-Q008');
  assert.deepEqual(grammarContractErrors(q8), []);
});
