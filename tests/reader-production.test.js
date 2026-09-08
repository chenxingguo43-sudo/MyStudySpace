'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { initialize, loadState, resolveProfile, unblockTask } = require('../scripts/reader-book-pipeline');
const { commandTimeoutMs, planProduction, repairFindings, runProduction } = require('../scripts/reader-production');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const fakeAdapter = String.raw`
'use strict';
const fs = require('node:fs');
const mode = process.argv[2];
const delayMs = Number(process.argv[3]) || 0;
const manifest = JSON.parse(fs.readFileSync(process.argv[process.argv.length - 1], 'utf8'));
const batchNumber = Number((process.argv[process.argv.length - 1].match(/-(\d+)-(?:generator|reviewer|escalation)-/) || [])[1] || 0);
fs.appendFileSync('.adapter-calls.jsonl', JSON.stringify({
  role: manifest.role,
  stage: manifest.stage,
  findings: manifest.tasks.map((task) => task.findings || []),
  proposedArtifactFiles: manifest.tasks.map((task) => task.proposedArtifactFile || null),
  batchNumber,
  startedAt: Date.now(),
  taskIds: manifest.tasks.map((task) => task.taskId)
}) + '\n');
const delays = fs.existsSync('.adapter-delays.json') ? JSON.parse(fs.readFileSync('.adapter-delays.json', 'utf8')) : {};
const waitMs = delays[batchNumber]?.[manifest.role] ?? delayMs;
if (waitMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
if (mode === 'fail-first-batch' && batchNumber === 1) process.exit(7);
for (const task of manifest.tasks) {
  const input = JSON.parse(fs.readFileSync(task.inputFile, 'utf8'));
  if (manifest.role === 'reviewer') {
    const artifact = JSON.parse(fs.readFileSync(task.artifactFile, 'utf8'));
    const provider = artifact.answerAnalysis.provenance.provider;
    const accept = mode === 'accept' || (mode === 'escalation-only' && provider === 'escalation');
    fs.writeFileSync(task.reviewFile, JSON.stringify({
      schema: 'reader-production-review-v1', taskId: task.taskId, inputHash: task.inputHash,
      decision: accept ? 'accept' : 'reject',
      findings: accept ? [] : [{ code: 'semantic-reject', problem: 'Independent review rejected this draft.', requiredFix: 'Use escalation.' }]
    }));
    continue;
  }
  const answer = String(input.question.canonicalAnswer);
  const options = input.question.options.map((option) => ({
    key: option.key,
    status: String(option.key) === answer ? 'correct' : 'wrong',
    reason: String(option.key) === answer ? 'This option follows the source evidence.' : 'This option contradicts the source evidence.'
  }));
  fs.writeFileSync(task.artifactFile, JSON.stringify({
    schema: 'reader-book-pipeline-artifact-v1', taskId: task.taskId, inputHash: task.inputHash,
    answerAnalysis: {
      version: 'reading-evidence-v2', presentation: { mode: 'two-layer', status: 'production' },
      provenance: { kind: 'ai-generated', provider: manifest.role, reviewStatus: 'draft' },
      conclusion: '正确答案与原文直接陈述一致，人物、动作和范围都没有发生改变。',
      correctReason: '原文证据直接支持正确选项。',
      evidenceItems: [{ paragraphIndex: 0, quoteRu: input.source.original[0] }],
      mappings: [{ source: 'Источник ответа', option: answer, reason: '直接对应' }],
      options,
      completeSentence: { ru: 'Источник ответа.', zh: '答案来源。' },
      sentenceSkeleton: { ru: 'Источник ответа.', zh: '答案来源。' },
      decisionSteps: [{ text: '先核对题干中的线索，再比较选项差别。' }],
      correctOption: { key: answer, analysis: '正确项对应题干给出的条件。' },
      distractors: options.filter(x => x.status === 'wrong').map(x => ({ key: x.key, reason: x.reason })),
      memoryRule: '本题判断依赖题干中的条件，不能无条件推广。',
      pitfall: '不要只看到相同词形就选择，要核对命题关系。',
      nextCheck: '回到原文再次核对人物、动作、时间和范围。',
      locatorStatus: 'exact'
    }
  }));
}
`;

function createHarness({ reviewerMode = 'accept', testCommand = null, initializeState = true, escalateTransportFailures = true, escalationAttempts = 1, taskCount = 1, pipelineOverlap = false, parallelBatches = 1, adapter = 'reading-speaking', adapterDelayMs = 0 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-production-'));
  const source = path.join(root, 'data', 'book');
  const adapterFile = path.join(root, 'fake-adapter.js');
  fs.writeFileSync(adapterFile, fakeAdapter, 'utf8');
  writeJson(path.join(source, 'ch0000.json'), {
    title: 'Test chapter',
    original: [`Источник ответа. ${'Дополнительный исходный текст. '.repeat(25)}`],
    translated: ['答案来源。'],
    exercises: Array.from({ length: taskCount }, (_, index) => ({
      id: `Q${String(index + 1).padStart(3, '0')}`, type: 'choice', num: index + 1, question: `Вопрос ${index + 1}?`,
      options: [{ key: 'а', text: 'верно' }, { key: 'б', text: 'неверно' }],
      answer: 'а', answerSource: 'test', sourceAnchor: { paragraphIndex: 0, quote: 'Источник ответа.' }
    }))
  });
  const profile = {
    schemaVersion: 1,
    bookId: 'test-book',
    title: 'Test book',
    adapter,
    ...(adapter === 'grammar' ? { grammarTeachingMode: 'content-v1' } : {}),
    sourceDir: 'data/book',
    stateDir: '.reader-pipeline/test-book',
    chapterPattern: '^ch\\d{4}\\.json$',
    requiredSkill: 'reader-question-explainer',
    outputField: 'answerAnalysis',
    acceptedPresentationMode: 'two-layer',
    defaultBatchSize: 1,
    maxBatchSize: 2,
    maxAttempts: 3,
    tests: testCommand ? [testCommand] : []
  };
  writeJson(path.join(root, 'config', 'reader-book-pipeline', 'test-book.json'), profile);
  writeJson(path.join(root, 'config', 'reader-production.json'), {
    schema: 'reader-production-config-v1',
    defaultPreset: 'test',
    presets: {
      test: {
        batchSize: 1,
        generatorAttempts: 1,
        reviewerAttempts: 1,
        escalationAttempts,
        escalateTransportFailures,
        pipelineOverlap,
        parallelBatches,
        generator: { command: [process.execPath, adapterFile, 'generate', String(adapterDelayMs)] },
        reviewer: { command: [process.execPath, adapterFile, reviewerMode, String(adapterDelayMs)] },
        escalation: { command: [process.execPath, adapterFile, 'generate', String(adapterDelayMs)] }
      }
    }
  });
  if (initializeState) initialize(resolveProfile('test-book', root));
  return { root, source };
}

test('plan resolves all roles without initializing or changing book state', () => {
  const { root } = createHarness({ initializeState: false });
  const result = planProduction('test-book', { root });
  assert.equal(result.initialized, false);
  assert.equal(result.summary, null);
  assert.equal(fs.existsSync(path.join(root, '.reader-pipeline')), false);
  assert.deepEqual(Object.keys(result.roles), ['generator', 'reviewer', 'escalation']);
});

test('independent reviewer acceptance allows validated integration', async () => {
  const { root, source } = createHarness();
  const report = await runProduction('test-book', { root, maxBatches: 1 });
  assert.equal(report.integrated, 1);
  assert.equal(report.blocked, 0);
  const chapter = JSON.parse(fs.readFileSync(path.join(source, 'ch0000.json'), 'utf8'));
  assert.equal(chapter.exercises[0].answer, 'а');
  assert.equal(chapter.exercises[0].answerAnalysis.presentation.mode, 'two-layer');
  assert.equal(loadState(resolveProfile('test-book', root)).tasks[0].status, 'completed');
});

test('one generator call and one reviewer call process a multi-task batch', async () => {
  const { root } = createHarness({ taskCount: 2 });
  const report = await runProduction('test-book', { root, limit: 2, maxBatches: 1, worker: 'batch-test' });
  assert.equal(report.integrated, 2);
  assert.equal(report.reviewed, 2);
  const calls = fs.readFileSync(path.join(root, '.adapter-calls.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.deepEqual(calls.map((call) => call.role), ['generator', 'reviewer']);
  assert.deepEqual(calls[0].taskIds, ['ch0000:Q001', 'ch0000:Q002']);
  assert.deepEqual(calls[1].taskIds, calls[0].taskIds);
  const generatorManifest = readJson(path.join(root, '.reader-pipeline', 'test-book', 'production', 'batch-batch-test-1-generator-1.json'));
  const reviewerManifest = readJson(path.join(root, '.reader-pipeline', 'test-book', 'production', 'batch-batch-test-1-reviewer-1.json'));
  assert.equal(generatorManifest.tasks.length, 2);
  assert.equal(reviewerManifest.tasks.length, 2);
  const invocationLog = fs.readFileSync(report.usage.logFile, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.deepEqual(invocationLog.map((item) => item.taskCount), [2, 2]);
  assert.equal(invocationLog.every((item) => item.elapsedMs >= 0), true);
});

test('zero escalation attempts leaves rejected work in the repair queue', async () => {
  const { root } = createHarness({ reviewerMode: 'reject', escalationAttempts: 0 });
  const report = await runProduction('test-book', { root, maxBatches: 1 });
  assert.equal(report.integrated, 0);
  assert.equal(report.blocked, 1);
  const calls = fs.readFileSync(path.join(root, '.adapter-calls.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.deepEqual(calls.map((call) => call.role), ['generator', 'reviewer']);
});

test('review rejection routes the task to escalation before integration', async () => {
  const { root, source } = createHarness({ reviewerMode: 'escalation-only' });
  const report = await runProduction('test-book', { root, maxBatches: 1 });
  assert.equal(report.integrated, 1);
  const chapter = JSON.parse(fs.readFileSync(path.join(source, 'ch0000.json'), 'utf8'));
  assert.equal(chapter.exercises[0].answerAnalysis.provenance.provider, 'escalation');
  const manifest = JSON.parse(fs.readFileSync(
    path.join(root, '.reader-pipeline', 'test-book', 'production', `batch-${report.worker}-1-escalation-1.json`),
    'utf8'
  ));
  assert.match(manifest.tasks[0].proposedArtifactFile, /generator-1\.artifact\.json$/);
  assert.equal(fs.existsSync(manifest.tasks[0].proposedArtifactFile), true);
});

test('repeated semantic rejection becomes an explicit block without an infinite retry', async () => {
  const { root } = createHarness({ reviewerMode: 'reject' });
  const report = await runProduction('test-book', { root, maxBatches: 5 });
  assert.equal(report.batches, 1);
  assert.equal(report.integrated, 0);
  assert.equal(report.blocked, 1);
  const task = loadState(resolveProfile('test-book', root)).tasks[0];
  assert.equal(task.status, 'blocked');
  assert.equal(task.block.reason, 'production-quality-gate-failed');
});

test('a failed batch test stops the run before another batch can start', async () => {
  const { root } = createHarness({ testCommand: `${JSON.stringify(process.execPath)} -e "process.exit(7)"` });
  const report = await runProduction('test-book', { root, maxBatches: 5 });
  assert.equal(report.batches, 1);
  assert.equal(report.stoppedReason, 'batch-tests-failed-rolled-back');
  assert.equal(report.testRuns[0].ok, false);
});

test('bounded runs release transport failures without calling a paid escalation provider', async () => {
  const { root } = createHarness({ escalateTransportFailures: false });
  const configFile = path.join(root, 'config', 'reader-production.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  config.presets.test.generator.command = [process.execPath, path.join(root, 'missing-adapter.js')];
  writeJson(configFile, config);
  const report = await runProduction('test-book', { root, maxBatches: 1 });
  assert.equal(report.integrated, 0);
  assert.equal(report.blocked, 0);
  assert.equal(report.stoppedReason, 'batch-limit-or-no-claimable-work');
  const task = JSON.parse(fs.readFileSync(path.join(root, '.reader-pipeline', 'test-book', 'state.json'), 'utf8')).tasks[0];
  assert.equal(task.status, 'pending');
  const productionFiles = fs.readdirSync(path.join(root, '.reader-pipeline', 'test-book', 'production'));
  assert.equal(productionFiles.some((file) => file.includes('-escalation-')), false);
});

test('pipeline overlap generates the next batch while the previous batch is reviewed', async () => {
  const { root } = createHarness({ taskCount: 2, pipelineOverlap: true, escalationAttempts: 0, escalateTransportFailures: false, adapterDelayMs: 250 });
  const report = await runProduction('test-book', { root, limit: 1, maxBatches: 2, worker: 'overlap-test' });
  assert.equal(report.integrated, 2);
  assert.equal(report.batches, 2);
  const calls = fs.readFileSync(path.join(root, '.adapter-calls.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const firstReview = calls.find((call) => call.role === 'reviewer' && call.batchNumber === 1);
  const secondGeneration = calls.find((call) => call.role === 'generator' && call.batchNumber === 2);
  assert.ok(firstReview);
  assert.ok(secondGeneration);
  assert.ok(Math.abs(firstReview.startedAt - secondGeneration.startedAt) < 150);
});

test('pipeline overlap releases both batches when the earlier batch test fails', async () => {
  const failingTest = `${JSON.stringify(process.execPath)} -e "process.exit(7)"`;
  const { root } = createHarness({ taskCount: 2, pipelineOverlap: true, escalationAttempts: 0, escalateTransportFailures: false, testCommand: failingTest });
  const report = await runProduction('test-book', { root, limit: 1, maxBatches: 2, worker: 'overlap-failure-test' });
  assert.equal(report.stoppedReason, 'batch-tests-failed-rolled-back');
  const statuses = loadState(resolveProfile('test-book', root)).tasks.map((task) => task.status);
  assert.deepEqual(statuses, ['pending', 'pending']);
});

test('repair batches carry the previous review findings into the generator stage', () => {
  const findings = repairFindings({
    history: [{ event: 'unblocked', previousBlock: {
      reason: 'production-quality-gate-failed',
      details: 'UNNATURAL_RUSSIAN_EXAMPLE: 删除可疑例句 | MIXED_LANGUAGE: 改成普通中文'
    } }]
  });
  assert.deepEqual(findings, [
    { code: 'UNNATURAL_RUSSIAN_EXAMPLE', problem: '删除可疑例句' },
    { code: 'MIXED_LANGUAGE', problem: '改成普通中文' }
  ]);
});

test('provider commands have a bounded timeout, defaulting to fifteen minutes', () => {
  assert.equal(commandTimeoutMs(['node', 'adapter.js', '--timeout-ms', '45000']), 45000);
  assert.equal(commandTimeoutMs(['node', 'adapter.js']), 900000);
  assert.equal(commandTimeoutMs(['node', 'adapter.js', '--timeout-ms', '0']), 900000);
});

test('two zero-acceptance batches stop further paid calls and persist a report', async () => {
  const { root } = createHarness({ reviewerMode: 'reject', taskCount: 4, escalationAttempts: 0 });
  const configFile = path.join(root, 'config', 'reader-production.json');
  const config = readJson(configFile);
  config.presets.test.maxZeroAcceptedBatches = 2;
  writeJson(configFile, config);
  const report = await runProduction('test-book', { root });
  assert.equal(report.stoppedReason, 'quality-stalled');
  assert.equal(report.batches, 2);
  assert.equal(report.summary.statuses.pending, 2);
  assert.equal(readJson(path.join(root, '.reader-pipeline/test-book/production/last-run.json')).stoppedReason, 'quality-stalled');
});

test('pause marker leaves pending work unclaimed and makes no provider calls', async () => {
  const { root } = createHarness();
  writeJson(path.join(root, '.reader-pipeline/test-book/production.pause'), { requestedAt: 'test' });
  const report = await runProduction('test-book', { root });
  assert.equal(report.stoppedReason, 'paused-after-batch');
  assert.equal(report.batches, 0);
  assert.equal(report.summary.statuses.pending, 1);
  assert.equal(fs.existsSync(path.join(root, '.adapter-calls.jsonl')), false);
});

test('pause requested during a batch saves that batch before stopping', async () => {
  const { root } = createHarness({ taskCount: 2, adapterDelayMs: 250 });
  const running = runProduction('test-book', { root, worker: 'pause-mid-batch' });
  const timer = setTimeout(() => writeJson(path.join(root, '.reader-pipeline/test-book/production.pause'), { requestedAt: 'test' }), 100);
  try {
    const report = await running;
    assert.equal(report.stoppedReason, 'paused-after-batch');
    assert.equal(report.integrated, 1);
    assert.equal(report.summary.statuses.pending, 1);
    assert.equal(report.summary.statuses.claimed || 0, 0);
    const progress = readJson(path.join(root, '.reader-pipeline/test-book/production/progress.json'));
    assert.equal(progress.integrated, 1);
    assert.equal(progress.testsPassed, true);
  } finally {
    clearTimeout(timer);
  }
});

test('overlap repair run uses the prior artifact and marks the generator stage as repair', async () => {
  const { root } = createHarness({ reviewerMode: 'reject' });
  const first = await runProduction('test-book', { root, maxBatches: 1, worker: 'repair-seed' });
  assert.equal(first.blocked, 1);
  const profile = resolveProfile('test-book', root);
  unblockTask(profile, loadState(profile), 'ch0000:Q001');
  const configFile = path.join(root, 'config', 'reader-production.json');
  const config = readJson(configFile);
  config.presets.test.pipelineOverlap = true;
  config.presets.test.generatorAttempts = 1;
  config.presets.test.reviewerAttempts = 1;
  config.presets.test.escalationAttempts = 0;
  config.presets.test.escalateTransportFailures = false;
  config.presets.test.reviewer = { command: [process.execPath, path.join(root, 'fake-adapter.js'), 'accept', '0'] };
  writeJson(configFile, config);
  const second = await runProduction('test-book', { root, maxBatches: 1, worker: 'repair-run' });
  assert.equal(second.integrated, 1);
  const calls = fs.readFileSync(path.join(root, '.adapter-calls.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const repairCall = calls.find((call) => call.role === 'generator' && call.stage === 'repair');
  assert.ok(repairCall);
  assert.ok(repairCall.findings[0].length > 0);
  assert.match(repairCall.proposedArtifactFiles[0], /escalation-1\.artifact\.json$/);
});

test('parallel batches overlap model work and independently review every accepted task', async () => {
  const { root, source } = createHarness({ taskCount: 4, parallelBatches: 2, adapterDelayMs: 100 });
  const report = await runProduction('test-book', { root, limit: 2, maxBatches: 2 });
  assert.equal(report.integrated, 4);
  assert.equal(report.batchesFinished, 2);
  const calls = readCalls(root);
  assert.deepEqual(calls.slice(0, 2).map(x => x.role), ['generator', 'generator']);
  for (const number of [1, 2]) assert.deepEqual(calls.filter(x => x.batchNumber === number).map(x => x.role), ['generator', 'reviewer']);
  assert.equal(new Set(calls.filter(x => x.role === 'generator').flatMap(x => x.taskIds)).size, 4);
  assert.equal(readJson(path.join(source, 'ch0000.json')).exercises.filter(x => x.answerAnalysis).length, 4);
  assert.equal(report.summary.statuses.claimed || 0, 0);
  assert.ok(report.elapsedMs > 0);
});

test('a slow batch does not hold up later batches', async () => {
  const { root } = createHarness({ taskCount: 3, parallelBatches: 2, adapterDelayMs: 20 });
  writeJson(path.join(root, '.adapter-delays.json'), { 1: { reviewer: 700 } });
  const report = await runProduction('test-book', { root });
  assert.equal(report.integrated, 3);
  const tasks = loadState(resolveProfile('test-book', root)).tasks;
  const at = task => task.history.find(x => x.event === 'integrated').at;
  assert.ok(at(tasks[2]) < at(tasks[0]));
});

test('parallel batches retain the full repair and independent escalation review sequence', async () => {
  const { root } = createHarness({ taskCount: 2, parallelBatches: 2, reviewerMode: 'escalation-only' });
  const configFile = path.join(root, 'config/reader-production.json');
  const config = readJson(configFile);
  config.presets.test.generatorAttempts = 2;
  writeJson(configFile, config);
  const report = await runProduction('test-book', { root });
  assert.equal(report.integrated, 2);
  for (const number of [1, 2]) {
    assert.deepEqual(readCalls(root).filter(x => x.batchNumber === number).map(x => x.role),
      ['generator', 'reviewer', 'generator', 'reviewer', 'escalation', 'reviewer']);
  }
});

test('failed grammar integration tests restore the chapter without losing a previously accepted batch', async () => {
  const command = `${JSON.stringify(process.execPath)} -e "const d=require('./data/book/ch0000.json');process.exit(d.exercises[1].answerAnalysis?7:0)"`;
  const { root, source } = createHarness({ taskCount: 2, adapter: 'grammar', parallelBatches: 2, testCommand: command });
  writeJson(path.join(root, '.adapter-delays.json'), { 2: { generator: 600 } });
  const report = await runProduction('test-book', { root });
  assert.equal(report.integrated, 1);
  assert.equal(report.stoppedReason, 'batch-tests-failed-rolled-back');
  const chapter = readJson(path.join(source, 'ch0000.json'));
  assert.ok(chapter.exercises[0].answerAnalysis);
  assert.equal(chapter.exercises[1].answerAnalysis, undefined);
  assert.deepEqual(loadState(resolveProfile('test-book', root)).tasks.map(x => x.status), ['completed', 'pending']);
});

test('a shared failure drains the other paid call and prevents its review or another batch', async () => {
  const command = `${JSON.stringify(process.execPath)} -e "process.exit(7)"`;
  const { root, source } = createHarness({ taskCount: 4, parallelBatches: 2, testCommand: command });
  writeJson(path.join(root, '.adapter-delays.json'), { 2: { generator: 600 } });
  const report = await runProduction('test-book', { root });
  assert.equal(report.stoppedReason, 'batch-tests-failed-rolled-back');
  assert.equal(report.batches, 2);
  assert.deepEqual(readCalls(root).filter(x => x.batchNumber === 2).map(x => x.role), ['generator']);
  assert.equal(report.summary.statuses.pending, 4);
  assert.ok(readJson(path.join(source, 'ch0000.json')).exercises.every(x => !x.answerAnalysis));
});

test('transport failure retries tasks without stopping the unattended run', async () => {
  const { root } = createHarness({ taskCount: 4, parallelBatches: 2, escalateTransportFailures: false });
  const configFile = path.join(root, 'config/reader-production.json');
  const config = readJson(configFile);
  config.presets.test.generator.command[2] = 'fail-first-batch';
  writeJson(configFile, config);
  writeJson(path.join(root, '.adapter-delays.json'), { 2: { generator: 400 } });
  const report = await runProduction('test-book', { root });
  assert.equal(report.stoppedReason, 'complete-or-blocked');
  assert.equal(report.summary.statuses.completed, 4);
  assert.ok(report.transportRetries >= 1);
  assert.ok(readCalls(root).some(x => x.role === 'reviewer'));
});

test('pause drains the two active batches and claims no more work', async () => {
  const { root } = createHarness({ taskCount: 4, parallelBatches: 2, adapterDelayMs: 100 });
  const running = runProduction('test-book', { root });
  writeJson(path.join(root, '.reader-pipeline/test-book/production.pause'), { requestedAt: 'test' });
  const report = await running;
  assert.equal(report.stoppedReason, 'paused-after-batch');
  assert.equal(report.integrated, 2);
  assert.equal(report.batches, 2);
  assert.equal(report.summary.statuses.pending, 2);
});

test('quality stall stops further calls in parallel mode', async () => {
  const { root } = createHarness({ taskCount: 5, parallelBatches: 2, reviewerMode: 'reject', escalationAttempts: 0 });
  const configFile = path.join(root, 'config/reader-production.json');
  const config = readJson(configFile);
  config.presets.test.maxZeroAcceptedBatches = 2;
  writeJson(configFile, config);
  writeJson(path.join(root, '.adapter-delays.json'), { 2: { reviewer: 100 }, 3: { generator: 500 } });
  const report = await runProduction('test-book', { root });
  assert.equal(report.stoppedReason, 'quality-stalled');
  assert.equal(report.blocked, 2);
  assert.equal(report.summary.statuses.pending, 3);
  assert.ok(report.batches <= 3);
  assert.ok(!readCalls(root).some(x => x.batchNumber === 3 && x.role === 'reviewer'));
});

test('active slow tasks are not reclaimed when their lease expires', async () => {
  const { root } = createHarness({ taskCount: 4, parallelBatches: 2, adapterDelayMs: 50 });
  const profileFile = path.join(root, 'config/reader-book-pipeline/test-book.json');
  const profile = readJson(profileFile);
  profile.leaseMinutes = 0.001;
  writeJson(profileFile, profile);
  writeJson(path.join(root, '.adapter-delays.json'), { 1: { reviewer: 700 } });
  const report = await runProduction('test-book', { root });
  assert.equal(report.integrated, 4);
  const generated = readCalls(root).filter(x => x.role === 'generator').flatMap(x => x.taskIds);
  assert.equal(generated.length, 4);
  assert.equal(new Set(generated).size, 4);
});

function readCalls(root) {
  return fs.readFileSync(path.join(root, '.adapter-calls.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
}
