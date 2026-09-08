'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  blockTask,
  initialize,
  loadState,
  resolveProfile
} = require('../scripts/reader-book-pipeline');
const { finish, prepare, release } = require('../scripts/reader-inhost-runner');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function exercise(num) {
  return {
    id: `Q00${num}`,
    type: 'choice',
    num,
    question: `Вопрос ${num}?`,
    options: [{ key: 'а', text: 'верно' }, { key: 'б', text: 'неверно' }],
    answer: 'а',
    answerSource: 'test',
    sourceAnchor: { paragraphIndex: 0, quote: 'Источник ответа.' }
  };
}

function harness() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-inhost-'));
  writeJson(path.join(root, 'data', 'book', 'ch0000.json'), {
    title: 'Test chapter',
    original: [`Источник ответа. ${'Дополнительный исходный текст. '.repeat(25)}`],
    translated: ['答案来源。'],
    exercises: [exercise(1), exercise(2)]
  });
  writeJson(path.join(root, 'config', 'reader-book-pipeline', 'test-book.json'), {
    schemaVersion: 1,
    bookId: 'test-book',
    title: 'Test book',
    adapter: 'reading-speaking',
    sourceDir: 'data/book',
    stateDir: '.reader-pipeline/test-book',
    chapterPattern: '^ch\\d{4}\\.json$',
    requiredSkill: 'reader-question-explainer',
    outputField: 'answerAnalysis',
    acceptedPresentationMode: 'two-layer',
    defaultBatchSize: 1,
    maxBatchSize: 2,
    maxAttempts: 3,
    tests: []
  });
  const profile = resolveProfile('test-book', root);
  initialize(profile);
  return { root, profile };
}

function artifact(task) {
  return {
    schema: 'reader-book-pipeline-artifact-v1',
    taskId: task.taskId,
    inputHash: task.inputHash,
    answerAnalysis: {
      version: 'reading-evidence-v2',
      presentation: { mode: 'two-layer', status: 'production' },
      provenance: { kind: 'ai-generated', provider: 'visible-agent', reviewStatus: 'draft' },
      conclusion: '正确答案与原文直接陈述一致，人物、动作和范围都没有发生改变。',
      correctReason: '原文中的答案来源直接支持正确选项。',
      evidenceItems: [{ paragraphIndex: 0, quoteRu: 'Источник ответа.' }],
      mappings: [{ source: 'Источник ответа.', option: 'а', reason: '直接对应' }],
      options: [
        { key: 'а', status: 'correct', reason: '与原文事实一致。' },
        { key: 'б', status: 'wrong', reason: '改变了原文已经明确给出的事实。' }
      ],
      pitfall: '不要只按相似词形选择，要回到原文核对完整关系。',
      nextCheck: '重新核对人物、动作、时间和范围，再逐项排除。',
      locatorStatus: 'exact'
    }
  };
}

function review(task, decision = 'accept', independent = true) {
  return {
    schema: 'reader-production-review-v1',
    taskId: task.taskId,
    inputHash: task.inputHash,
    decision,
    findings: decision === 'accept' ? [] : [{ code: 'too-thin', problem: '解析不够完整。' }],
    independent,
    reviewerContext: 'fresh-review-agent'
  };
}

test('prepare unblocks only explicitly named pilot work', () => {
  const { root, profile } = harness();
  let state = loadState(profile);
  blockTask(profile, state, 'ch0000:Q001', 'previous-provider-failed', 'captcha');

  const result = prepare('test-book', {
    root,
    worker: 'zcode-page',
    limit: 2,
    tasks: 'ch0000:Q001',
    unblock: true
  });

  assert.equal(result.claimed, 1);
  assert.deepEqual(result.taskIds, ['ch0000:Q001']);
  state = loadState(profile);
  assert.equal(state.tasks.find((item) => item.id === 'ch0000:Q001').status, 'claimed');
  assert.equal(state.tasks.find((item) => item.id === 'ch0000:Q002').status, 'pending');
});

test('finish refuses missing or non-independent review without integrating', () => {
  const { root, profile } = harness();
  const prepared = prepare('test-book', { root, worker: 'zcode-page', limit: 1 });
  const manifest = JSON.parse(fs.readFileSync(prepared.manifest, 'utf8'));
  const task = manifest.tasks[0];
  writeJson(task.artifactFile, artifact(task));
  writeJson(task.reviewFile, review(task, 'accept', false));

  const result = finish('test-book', { root, manifest: prepared.manifest });

  assert.equal(result.ok, false);
  assert.match(result.failures[0].errors.join(' '), /independent/);
  assert.equal(loadState(profile).tasks.find((item) => item.id === task.taskId).status, 'claimed');
});

test('accepted independent review validates and integrates the batch', () => {
  const { root, profile } = harness();
  const prepared = prepare('test-book', { root, worker: 'zcode-page', limit: 1 });
  const manifest = JSON.parse(fs.readFileSync(prepared.manifest, 'utf8'));
  const task = manifest.tasks[0];
  writeJson(task.artifactFile, artifact(task));
  writeJson(task.reviewFile, review(task));

  const result = finish('test-book', { root, manifest: prepared.manifest });

  assert.equal(result.ok, true);
  assert.equal(result.integrated, 1);
  assert.equal(loadState(profile).tasks.find((item) => item.id === task.taskId).status, 'completed');
  const chapter = JSON.parse(fs.readFileSync(path.join(root, 'data', 'book', 'ch0000.json'), 'utf8'));
  assert.equal(chapter.exercises[0].answer, 'а');
  assert.equal(chapter.exercises[0].answerAnalysis.presentation.mode, 'two-layer');
});

test('release returns only this manifest claimed work to pending', () => {
  const { root, profile } = harness();
  const prepared = prepare('test-book', { root, worker: 'zcode-page', limit: 1 });
  const result = release('test-book', { root, manifest: prepared.manifest });

  assert.equal(result.released, 1);
  assert.equal(loadState(profile).tasks.find((item) => item.id === prepared.taskIds[0]).status, 'pending');
});

test('failed post-integration tests roll back source and task state', () => {
  const { root, profile } = harness();
  const profileFile = path.join(root, 'config', 'reader-book-pipeline', 'test-book.json');
  const profileDocument = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
  profileDocument.tests = [`${JSON.stringify(process.execPath)} -e process.exit(9)`];
  writeJson(profileFile, profileDocument);
  const prepared = prepare('test-book', { root, worker: 'zcode-page', limit: 1 });
  const manifest = JSON.parse(fs.readFileSync(prepared.manifest, 'utf8'));
  const task = manifest.tasks[0];
  writeJson(task.artifactFile, artifact(task));
  writeJson(task.reviewFile, review(task));

  const result = finish('test-book', { root, manifest: prepared.manifest });

  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.equal(loadState(profile).tasks.find((item) => item.id === task.taskId).status, 'claimed');
  const chapter = JSON.parse(fs.readFileSync(path.join(root, 'data', 'book', 'ch0000.json'), 'utf8'));
  assert.equal(chapter.exercises[0].answerAnalysis, undefined);
});
