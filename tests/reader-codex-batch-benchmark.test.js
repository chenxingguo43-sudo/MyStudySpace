'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { carryForwardCompleteSentence, compactBundleForCodex, compactGrammarPatchSchema, grammarDraftQualityInstructions, normalizeProviderHashes, requiresCompleteSentenceRepair, validateManifest } = require('../scripts/reader-codex-adapter');
const { DEFAULT_TASKS, extractQ008Reference, manifest } = require('../scripts/reader-codex-batch-benchmark');

test('Codex adapter accepts an eight-task batch and rejects unsafe task identity', () => {
  const tasks = DEFAULT_TASKS.map((taskId, index) => ({ taskId, inputHash: String(index) }));
  assert.doesNotThrow(() => validateManifest({ schema: 'reader-production-batch-v1', tasks }));
  assert.throws(() => validateManifest({ schema: 'reader-production-batch-v1', tasks: [...tasks, { taskId: 'ninth', inputHash: '9' }] }), /at most 8/);
  assert.throws(() => validateManifest({ schema: 'reader-production-batch-v1', tasks: [tasks[0], tasks[0]] }), /unique/);
});

test('Codex adapter restores rewritten hashes only for an exact task-ID match', () => {
  const manifestValue = {
    tasks: [
      { taskId: 'task-1', inputHash: 'expected-1' },
      { taskId: 'task-2', inputHash: 'expected-2' }
    ]
  };
  const exact = { results: [
    { taskId: 'task-2', inputHash: 'rewritten-2' },
    { taskId: 'task-1', inputHash: 'rewritten-1' }
  ] };
  assert.equal(normalizeProviderHashes(manifestValue, exact), true);
  assert.equal(exact.results[0].inputHash, 'expected-2');
  assert.equal(exact.results[1].inputHash, 'expected-1');

  const unsafe = { results: [
    { taskId: 'task-1', inputHash: 'rewritten-1' },
    { taskId: 'wrong-task', inputHash: 'rewritten-2' }
  ] };
  assert.equal(normalizeProviderHashes(manifestValue, unsafe), false);
});

test('compact grammar output asks the model only for learner-authored fields', () => {
  const properties = compactGrammarPatchSchema().properties;
  assert.equal(Boolean(properties.completeSentence), false);
  assert.equal(Boolean(properties.provenance), false);
  assert.equal(Boolean(properties.options), false);
  assert.equal(Boolean(properties.correctOptionAnalysis), true);
  assert.equal(Boolean(properties.memoryRule), true);
});

test('translation repairs explicitly request a replacement complete sentence', () => {
  assert.equal(requiresCompleteSentenceRepair([{ code: 'completeSentence.zh-mismatch', problem: '译文与原句不符' }]), true);
  assert.equal(requiresCompleteSentenceRepair([{ code: 'MEANING_SUBJECT_MISTRANSLATED', problem: '主语译错' }]), true);
  assert.equal(requiresCompleteSentenceRepair([{ code: 'RULE_BOUNDARY', problem: '规则边界过宽' }]), false);
  const properties = compactGrammarPatchSchema({ includeCompleteSentence: true }).properties;
  assert.equal(Boolean(properties.completeSentence), true);
});

test('non-translation repair carries forward the accepted sentence from the prior draft', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-carry-sentence-'));
  const proposedArtifactFile = path.join(root, 'prior.json');
  const completeSentence = { ru: 'Исправленное предложение.', zh: '已经改正的译文。' };
  fs.writeFileSync(proposedArtifactFile, JSON.stringify({ answerAnalysis: { completeSentence } }));
  const patch = carryForwardCompleteSentence({ proposedArtifactFile }, { conclusion: '只修其他问题。' });
  assert.deepEqual(patch.completeSentence, completeSentence);
});

test('grammar drafts are told not to invent doubtful Russian examples', () => {
  const instructions = grammarDraftQualityInstructions();
  assert.match(instructions, /natural grammar/);
  assert.match(instructions, /instead of inventing a sentence/);
  assert.match(instructions, /natural Chinese/);
  assert.match(instructions, /misleading special meaning/);
});

test('compact reviewer bundle removes repeated fields but keeps every teaching decision', () => {
  const manifestValue = { role: 'reviewer', transportMode: 'compact-grammar-v1', compactPromptInput: true };
  const profile = { adapter: 'grammar' };
  const bundle = [{
    taskId: 'task-1',
    input: {
      question: { canonicalAnswer: 'Б', options: [{ key: 'А' }, { key: 'Б' }] },
      existingAnalysis: {
        completeSentence: { ru: 'Полное предложение.', zh: '完整句。' },
        conclusion: '旧版核心规则。',
        distractors: [{ key: 'А', reason: '旧版重复解释。' }]
      }
    },
    proposedArtifact: {
      schema: 'reader-book-pipeline-artifact-v1',
      taskId: 'task-1',
      inputHash: 'hash-1',
      provenance: { model: 'test' },
      answerAnalysis: {
        completeSentence: { ru: 'Полное предложение.', zh: '完整句。' },
        conclusion: '新版结论。',
        decisionSteps: [{ step: 1, text: '判断。' }],
        sentenceSkeleton: { ru: 'Основа.', zh: '骨架。' },
        correctOption: { key: 'Б', analysis: '正确项。' },
        distractors: [{ key: 'А', reason: '错误项。' }],
        mappings: [{ option: '答案', reason: '对应', source: '教材' }],
        options: [{ key: 'А', status: 'wrong', reason: '错误项。' }],
        evidenceItems: [{ quoteRu: '重复题干。' }],
        pitfall: '易错点。',
        memoryRule: '规则。',
        nextCheck: '检查。',
        _source: { rules: [{ ruleId: 'rule-1' }] }
      }
    }
  }];
  const [result] = compactBundleForCodex(manifestValue, profile, bundle);
  assert.deepEqual(Object.keys(result.input.existingAnalysis), ['completeSentence', 'conclusion']);
  assert.equal(result.proposedArtifact.provenance, undefined);
  assert.equal(result.proposedArtifact.answerAnalysis.options, undefined);
  assert.equal(result.proposedArtifact.answerAnalysis.evidenceItems, undefined);
  assert.equal(result.proposedArtifact.answerAnalysis.distractors[0].reason, '错误项。');
  assert.equal(result.proposedArtifact.answerAnalysis._source.rules[0].ruleId, 'rule-1');
});

test('benchmark manifest is isolated and carries all eight tasks in one call', () => {
  const root = path.resolve(__dirname, '..');
  const reference = extractQ008Reference(root);
  assert.equal(reference.exerciseId, 'GL1-Q008');
  assert.equal(reference._source, undefined);
  const profile = { bookId: 'zlatoust-grammar', profilePath: 'config/profile.json', requiredSkill: 'reader-question-explainer', repositoryRoot: root };
  const tasks = DEFAULT_TASKS.map((taskId) => ({ taskId }));
  const file = path.join(root, '.reader-pipeline', 'zlatoust-grammar', 'benchmarks', 'reference.json');
  const value = manifest(profile, 'benchmark', 'generator', tasks, file);
  assert.equal(value.tasks.length, 8);
  assert.equal(value.transportMode, 'compact-grammar-v1');
  assert.match(value.qualityReferenceFile, /benchmarks/);
});
