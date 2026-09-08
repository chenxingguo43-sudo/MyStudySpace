'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildBundle, compactTaskInput, parseClaudeOutput, runAdapter } = require('../scripts/reader-claude-adapter');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
}

function harness(role, structuredOutput) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-claude-adapter-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  const review = path.join(root, 'review.json');
  const output = path.join(root, 'output.json');
  const fake = path.join(root, 'fake-claude.js');
  const profileRelative = path.relative(path.resolve(__dirname, '..'), path.join(root, 'profile.json'));
  writeJson(path.join(root, 'profile.json'), { adapter: 'grammar' });
  writeJson(input, { taskId: 'ch0000:GL1-Q027', question: { canonicalAnswer: 'А', options: [] }, outputContract: {} });
  if (role === 'reviewer') writeJson(artifact, { answerAnalysis: { conclusion: 'draft' } });
  writeJson(output, { structured_output: structuredOutput });
  fs.writeFileSync(fake, `process.stdout.write(require('fs').readFileSync(${JSON.stringify(output)}, 'utf8'));`, 'utf8');
  const manifest = path.join(root, 'manifest.json');
  writeJson(manifest, {
    schema: 'reader-production-batch-v1',
    bookId: 'test',
    profile: profileRelative,
    requiredSkill: 'reader-question-explainer',
    role,
    stage: role === 'reviewer' ? 'semantic-review' : 'draft',
    tasks: [{ taskId: 'ch0000:GL1-Q027', inputHash: 'hash-27', inputFile: input, artifactFile: artifact, reviewFile: review, findings: [] }]
  });
  return { root, manifest, artifact, review, fake };
}

test('parses Claude Code structured output envelopes', () => {
  assert.deepEqual(parseClaudeOutput(JSON.stringify({ structured_output: { results: [] } })), { results: [] });
  assert.deepEqual(parseClaudeOutput(JSON.stringify({ result: '{"results":[]}' })), { results: [] });
});

test('compact knowledge-card input retains the source-owned concept contract', () => {
  const input = {
    taskType: 'knowledge-card',
    source: {
      knowledgePoint: { id: 'p1-card', title: '测试卡', rule: '规则' },
      conceptContract: { coreIdea: '规则', neighborHandoffs: [{ knowledgePointId: 'p1-neighbor' }] },
      exercises: []
    },
    question: {},
    outputContract: {}
  };
  const compact = compactTaskInput(input);
  assert.deepEqual(compact.source.conceptContract, input.source.conceptContract);
  assert.deepEqual(compact.source.knowledgePoint.conceptContract, input.source.conceptContract);
});

test('version-2 knowledge-card input omits the preserved legacy card from the model bundle', () => {
  const compact = compactTaskInput({
    taskType: 'knowledge-card',
    source: { knowledgePoint: {} },
    legacyCard: { id: 'p1-card', lessons: [{ title: '保留的旧内容' }] },
    outputContract: { teachingNarrativeVersion: 2 }
  });
  assert.equal(compact.legacyCard, undefined);
});

test('generator writes only the contracted artifact from structured output', () => {
  const result = { taskId: 'ch0000:GL1-Q027', inputHash: 'hash-27', answerAnalysisPatch: { conclusion: 'draft' } };
  const h = harness('generator', { results: [result] });
  const report = runAdapter(h.manifest, { command: process.execPath, commandArgs: [h.fake], model: 'opus' });
  const artifact = JSON.parse(fs.readFileSync(h.artifact, 'utf8'));
  assert.equal(report.written, 1);
  assert.equal(artifact.schema, 'reader-book-pipeline-artifact-v1');
  assert.deepEqual(artifact.answerAnalysisPatch, { conclusion: 'draft' });
  assert.equal(artifact.provenance.model, 'opus');
  assert.equal(fs.existsSync(h.review), false);
});

test('reviewer writes an independent review and does not replace the artifact', () => {
  const result = {
    taskId: 'ch0000:GL1-Q027', inputHash: 'hash-27', decision: 'reject',
    findings: [{ code: 'shallow', problem: 'The explanation is too shallow.', requiredFix: 'Explain the decision.' }]
  };
  const h = harness('reviewer', { results: [result] });
  const before = fs.readFileSync(h.artifact, 'utf8');
  runAdapter(h.manifest, { command: process.execPath, commandArgs: [h.fake], model: 'opus' });
  const review = JSON.parse(fs.readFileSync(h.review, 'utf8'));
  assert.equal(review.schema, 'reader-production-review-v1');
  assert.equal(review.decision, 'reject');
  assert.equal(fs.readFileSync(h.artifact, 'utf8'), before);
});

test('repair and escalation bundles carry the immediately preceding draft', () => {
  const h = harness('generator', { results: [] });
  const previous = path.join(h.root, 'previous.json');
  writeJson(previous, { answerAnalysisPatch: { conclusion: 'rich draft to repair' } });
  const manifest = JSON.parse(fs.readFileSync(h.manifest, 'utf8'));
  manifest.stage = 'escalation';
  manifest.tasks[0].proposedArtifactFile = previous;
  assert.equal(buildBundle(manifest)[0].proposedArtifact.answerAnalysisPatch.conclusion, 'rich draft to repair');
});

test('mismatched task identity is rejected before any output file is written', () => {
  const result = { taskId: 'wrong-task', inputHash: 'hash-27', answerAnalysisPatch: {} };
  const h = harness('generator', { results: [result] });
  assert.throws(
    () => runAdapter(h.manifest, { command: process.execPath, commandArgs: [h.fake] }),
    /missing task/
  );
  assert.equal(fs.existsSync(h.artifact), false);
});
