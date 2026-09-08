'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { assertConfiguredModel, buildBundle, parseZCodeOutput, runAdapter } = require('../scripts/reader-zcode-adapter');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
}

function harness(role, response) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-zcode-adapter-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  const review = path.join(root, 'review.json');
  const output = path.join(root, 'output.json');
  const fake = path.join(root, 'fake-zcode.js');
  const profile = path.join(root, 'profile.json');
  const repositoryRoot = path.resolve(__dirname, '..');
  writeJson(profile, { adapter: 'grammar' });
  writeJson(input, { taskId: 'ch0000:GL1-Q027', outputContract: {}, question: { canonicalAnswer: 'А' } });
  if (role === 'reviewer') writeJson(artifact, { answerAnalysis: { conclusion: 'draft' } });
  writeJson(output, { response: JSON.stringify(response), usage: { totalTokens: 123 } });
  fs.writeFileSync(fake, `process.stdout.write(require('fs').readFileSync(${JSON.stringify(output)}, 'utf8'));`, 'utf8');
  const manifest = path.join(root, 'manifest.json');
  writeJson(manifest, {
    schema: 'reader-production-batch-v1', bookId: 'test', profile: path.relative(repositoryRoot, profile),
    requiredSkill: 'reader-question-explainer', role, stage: role === 'reviewer' ? 'semantic-review' : 'draft',
    tasks: [{ taskId: 'ch0000:GL1-Q027', inputHash: 'hash-27', inputFile: input, artifactFile: artifact, reviewFile: review, findings: [] }]
  });
  return { root, manifest, artifact, review, fake };
}

test('parses the Z Code headless JSON envelope and usage', () => {
  const parsed = parseZCodeOutput(JSON.stringify({ response: '{"results":[]}', usage: { totalTokens: 3 } }));
  assert.deepEqual(parsed.output, { results: [] });
  assert.equal(parsed.usage.totalTokens, 3);
  assert.throws(() => parseZCodeOutput(JSON.stringify({ response: '```json\n{}\n```' })), /not strict JSON/);
});

test('configured model guard prevents accidental provider drift', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-zcode-model-'));
  const config = path.join(root, 'config.json');
  writeJson(config, { model: 'provider/glm-5.3-flash' });
  assert.equal(assertConfiguredModel('glm-5.3-flash', config), 'glm-5.3-flash');
  assert.equal(assertConfiguredModel('glm-5.3-flash', config, 'provider'), 'glm-5.3-flash');
  assert.throws(() => assertConfiguredModel('glm-5.3', config), /model mismatch/);
  assert.throws(() => assertConfiguredModel('glm-5.3-flash', config, 'other-provider'), /provider mismatch/);
});

test('generator writes the contracted artifact without granting Z Code write access', () => {
  const item = { taskId: 'ch0000:GL1-Q027', inputHash: 'hash-27', answerAnalysisPatch: { conclusion: 'draft' } };
  const h = harness('generator', { results: [item] });
  const report = runAdapter(h.manifest, { command: process.execPath, commandArgs: [h.fake], model: 'glm-5.3-flash', skipModelCheck: true });
  const artifact = JSON.parse(fs.readFileSync(h.artifact, 'utf8'));
  assert.equal(report.usage.totalTokens, 123);
  assert.equal(artifact.schema, 'reader-book-pipeline-artifact-v1');
  assert.equal(artifact.provenance.provider, 'Z Code');
  assert.deepEqual(artifact.answerAnalysisPatch, { conclusion: 'draft' });
  assert.equal(fs.existsSync(h.review), false);
});

test('reviewer writes only the review contract and preserves the proposed artifact', () => {
  const item = { taskId: 'ch0000:GL1-Q027', inputHash: 'hash-27', decision: 'reject', findings: [{ code: 'shallow', problem: 'Too shallow.', requiredFix: 'Explain the decision.' }] };
  const h = harness('reviewer', { results: [item] });
  const before = fs.readFileSync(h.artifact, 'utf8');
  runAdapter(h.manifest, { command: process.execPath, commandArgs: [h.fake], skipModelCheck: true });
  const review = JSON.parse(fs.readFileSync(h.review, 'utf8'));
  assert.equal(review.decision, 'reject');
  assert.equal(fs.readFileSync(h.artifact, 'utf8'), before);
});

test('repair and escalation bundles carry the immediately preceding draft', () => {
  const h = harness('generator', { results: [] });
  const previous = path.join(h.root, 'previous.json');
  writeJson(previous, { answerAnalysisPatch: { conclusion: 'rich draft to repair' } });
  const manifest = JSON.parse(fs.readFileSync(h.manifest, 'utf8'));
  manifest.stage = 'repair';
  manifest.tasks[0].proposedArtifactFile = previous;
  assert.equal(buildBundle(manifest)[0].proposedArtifact.answerAnalysisPatch.conclusion, 'rich draft to repair');
});

test('identity mismatch is rejected before writing an artifact', () => {
  const h = harness('generator', { results: [{ taskId: 'wrong', inputHash: 'hash-27', answerAnalysisPatch: {} }] });
  assert.throws(() => runAdapter(h.manifest, { command: process.execPath, commandArgs: [h.fake], skipModelCheck: true }), /missing task/);
  assert.equal(fs.existsSync(h.artifact), false);
});
