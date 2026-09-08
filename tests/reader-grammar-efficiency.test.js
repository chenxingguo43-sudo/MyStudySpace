'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compactTaskInput } = require('../scripts/reader-claude-adapter');
const { deduplicateGrammarBundle, grammarDraftQualityInstructions, grammarPatchSchema } = require('../scripts/reader-codex-adapter');
const { grammarContractErrors, validateAnalysis, resolveProfile, createState, writeJsonAtomic } = require('../scripts/reader-book-pipeline');
const { normalizeArtifactFile } = require('../scripts/reader-book-worker');

const profile = { adapter: 'grammar', acceptedPresentationMode: 'two-layer', grammarTeachingMode: 'content-v1' };
const analysis = {
  presentation: { mode: 'two-layer' },
  completeSentence: { ru: 'Иванова выступила вчера.', zh: '伊万诺娃昨天演出了。' },
  conclusion: '选 Б：Иванова 是女性，过去时用 -ла。',
  decisionSteps: [{ text: 'вчера 表示昨天，先排除现在时。' }],
  sentenceSkeleton: { ru: 'Иванова выступила.', zh: '伊万诺娃演出了。' },
  correctOption: { key: 'Б', analysis: '职业名称不改变实际演出者的性别。' },
  distractors: [{ key: 'А', reason: 'выступил 是阳性过去时；它适合 Иванов，与女性 Иванова 不一致。' }],
  pitfall: '看到职业名词为阳性时，要继续核对姓名。',
  memoryRule: '这是过去时谓语与人物配合的规则，不能套到职业名称内部的定语上。',
  nextCheck: '先圈出实际人物，再核对过去时词尾。',
  _source: { ruleId: 'test-rule' }
};

test('content checks allow concise explanations but still reject missing teaching parts and wrong answers', () => {
  assert.deepEqual(grammarContractErrors(analysis, profile), []);
  assert.ok(grammarContractErrors(analysis).some((x) => x.includes('teaching depth')));
  assert.ok(grammarContractErrors({ ...analysis, nextCheck: '' }, profile).length);
  assert.ok(grammarContractErrors({ ...analysis, distractors: [{ key: 'А', reason: '' }] }, profile).length);
  const input = { source: { original: ['Иванова выступила вчера.'] }, question: { canonicalAnswer: 'Б', options: [{ key: 'А' }, { key: 'Б' }] } };
  assert.deepEqual(validateAnalysis(input, analysis, profile), []);
  assert.ok(validateAnalysis(input, { ...analysis, correctOption: { key: 'А', analysis: 'Wrong answer' } }, profile).length);
});

test('review projection removes only exact copies, preserving conflicting fields and evidence', () => {
  const value = { ...analysis, options: [
    { key: 'А', status: 'wrong', reason: analysis.distractors[0].reason },
    { key: 'Б', status: 'correct', reason: analysis.correctOption.analysis }
  ] };
  const bundle = [{ input: { source: { original: ['source'] } }, proposedArtifact: { answerAnalysis: value } }];
  const projected = deduplicateGrammarBundle(bundle)[0];
  assert.equal(projected.proposedArtifact.answerAnalysis.options, undefined);
  assert.deepEqual(projected.proposedArtifact.answerAnalysis._source, value._source);
  assert.equal(value.options.length, 2);
  value.options[0].reason = 'A conflicting explanation';
  assert.ok(deduplicateGrammarBundle(bundle)[0].proposedArtifact.answerAnalysis.options);
  assert.deepEqual(deduplicateGrammarBundle(bundle)[0].input, bundle[0].input);
});

test('plain source explanations are sent as text, not a numbered object of characters', () => {
  const value = compactTaskInput({ question: { existingAnalysis: '原书说明：谓语与姓名配合。' } });
  assert.equal(value.existingAnalysis, '原书说明：谓语与姓名配合。');
});

test('B2 full schema keeps complete sentences without unused output or word quotas', () => {
  const schema = grammarPatchSchema({ contentBased: true });
  assert.ok(schema.required.includes('completeSentence'));
  assert.equal(schema.properties.learnerSummary, undefined);
  const prompt = grammarDraftQualityInstructions({ contentBased: true });
  assert.doesNotMatch(prompt, /at least \d+|minimum lengths/);
  assert.match(prompt, /every live alternative/);
  assert.match(prompt, /uncertainty/);
});

test('refresh recognizes B2 analyses stored in chapters and preserves completed work', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-b2-refresh-'));
  const config = { ...profile, bookId: 'book', title: 'book', sourceDir: 'data/book', stateDir: '.reader-pipeline/book', requiredSkill: 'reader-question-explainer' };
  fs.mkdirSync(path.join(root, 'config', 'reader-book-pipeline'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data', 'book'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'reader-book-pipeline', 'book.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(root, 'data', 'book', 'ch0000.json'), JSON.stringify({
    title: 'book', exercises: [{ id: 'Q001', question: 'Иванова ... вчера.', answer: 'Б', options: [{ key: 'А', text: 'выступил' }, { key: 'Б', text: 'выступила' }], answerAnalysis: analysis }]
  }));
  const resolved = resolveProfile('book', root);
  const first = createState(resolved);
  const second = createState(resolved, first);
  assert.equal(first.tasks[0].status, 'completed');
  assert.equal(second.tasks[0].status, 'completed');
});

test('normalizing a repaired draft twice does not restore the old translation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-b2-translation-'));
  const inputFile = path.join(root, 'input.json');
  const artifactFile = path.join(root, 'artifact.json');
  fs.writeFileSync(inputFile, JSON.stringify({ bookId: 'russian-b2-grammar', question: { canonicalAnswer: 'Б', existingAnalysis: { completeSentence: { ru: 'Old sentence', zh: '旧译文' } } } }));
  fs.writeFileSync(artifactFile, JSON.stringify({ answerAnalysis: analysis }));
  normalizeArtifactFile(inputFile, artifactFile);
  normalizeArtifactFile(inputFile, artifactFile);
  assert.deepEqual(JSON.parse(fs.readFileSync(artifactFile, 'utf8')).answerAnalysis.completeSentence, analysis.completeSentence);
});

test('temporary Windows file contention retries the replacement without losing state', { skip: process.platform !== 'win32' }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-atomic-retry-'));
  const file = path.join(root, 'state.json');
  writeJsonAtomic(file, { revision: 1 });
  const rename = fs.renameSync;
  let attempts = 0;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === file && ++attempts <= 2) throw Object.assign(new Error('File busy'), { code: 'EPERM' });
    return rename(from, to);
  });
  writeJsonAtomic(file, { revision: 2 });
  assert.equal(attempts, 3);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).revision, 2);
});

test('persistent Windows file contention stays bounded and preserves the last saved state', { skip: process.platform !== 'win32' }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-atomic-failure-'));
  const file = path.join(root, 'state.json');
  writeJsonAtomic(file, { revision: 1 });
  const rename = fs.renameSync;
  let attempts = 0;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === file) {
      attempts++;
      throw Object.assign(new Error('File busy'), { code: 'EPERM' });
    }
    return rename(from, to);
  });
  assert.throws(() => writeJsonAtomic(file, { revision: 2 }), { code: 'EPERM' });
  assert.equal(attempts, 6);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).revision, 1);
});
