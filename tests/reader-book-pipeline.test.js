'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  ARTIFACT_SCHEMA,
  claimTasks,
  initialize,
  integrateTask,
  loadState,
  saveState,
  submitArtifact,
  summarize,
  verifyState
} = require('../scripts/reader-book-pipeline');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sourceParagraph() {
  return `Источник ответа. ${'Дополнительный текст для проверки полноты источника. '.repeat(14)}`;
}

function exercise(num, accepted = false) {
  const value = {
    type: 'choice',
    num,
    question: `Вопрос ${num}`,
    options: ['а) правильный ответ', 'б) неверный ответ'],
    answer: 'а',
    answerSource: 'test key',
    sourceAnchor: { paragraphIndex: 0, quote: 'Источник ответа.' }
  };
  if (accepted) {
    value.answerAnalysis = {
      presentation: { mode: 'two-layer' },
      conclusion: '已有双层解析',
      evidenceItems: [{ paragraphIndex: 0, quoteRu: 'Источник ответа.' }],
      options: [
        { key: 'а', status: 'correct', reason: '与原文一致' },
        { key: 'б', status: 'wrong', reason: '改变原文事实' }
      ],
      pitfall: '核对原文。',
      nextCheck: '再次核对人物和动作。',
      locatorStatus: 'exact'
    };
  }
  return value;
}

function createHarness() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-book-pipeline-'));
  const sourcePath = path.join(root, 'data', 'textbook', 'reading_speaking');
  const statePath = path.join(root, '.reader-pipeline', 'book');
  writeJson(path.join(sourcePath, 'ch0000.json'), {
    title: 'Ready chapter',
    original: [sourceParagraph()],
    translated: ['中文翻译'],
    exercises: [exercise(1), exercise(2, true)]
  });
  writeJson(path.join(sourcePath, 'ch0001.json'), {
    title: 'Blocked chapter',
    original: ['太短'],
    translated: [],
    exercises: [exercise(1)]
  });
  return {
    root,
    profile: {
      schemaVersion: 1,
      bookId: 'book',
      title: 'Test book',
      adapter: 'reading-speaking',
      sourceDir: 'data/textbook/reading_speaking',
      stateDir: '.reader-pipeline/book',
      chapterPattern: '^ch\\d{4}\\.json$',
      requiredSkill: 'reader-question-explainer',
      outputField: 'answerAnalysis',
      acceptedPresentationMode: 'two-layer',
      leaseMinutes: 30,
      profilePath: 'config/test.json',
      repositoryRoot: root,
      sourcePath,
      statePath
    }
  };
}

function validArtifact(task, input) {
  return {
    schema: ARTIFACT_SCHEMA,
    taskId: task.id,
    inputHash: task.inputHash,
    answerAnalysis: {
      version: 'reading-evidence-v2',
      presentation: { mode: 'two-layer', status: 'generated' },
      provenance: { kind: 'ai-generated', reviewStatus: 'pipeline-validated' },
      conclusion: '正确答案是 а，因为原文直接给出了答案。',
      correctReason: 'Источник ответа 对应正确选项。',
      evidenceItems: [{ paragraphIndex: 0, quoteRu: 'Источник ответа.' }],
      mappings: [{ source: 'Источник ответа', option: 'правильный ответ', reason: '同义对应' }],
      options: [
        { key: 'а', status: 'correct', reason: '与原文一致' },
        { key: 'б', status: 'wrong', reason: '改变了原文事实' }
      ],
      pitfall: '不要只按词形匹配。',
      nextCheck: '核对人物、动作和范围。',
      review: '自动流水线生成，等待抽样复核。',
      locatorStatus: 'exact'
    }
  };
}

test('initialization inventories ready, accepted, and blocked work without overwriting state', () => {
  const { profile } = createHarness();
  const state = initialize(profile);
  assert.deepEqual(summarize(state).statuses, { pending: 1, completed: 1, blocked: 1 });
  assert.throws(() => initialize(profile), /already exists/);
  assert.equal(verifyState(profile, state).ok, true);
});

test('claim, validate, and integrate preserve canonical source fields', () => {
  const { profile, root } = createHarness();
  let state = initialize(profile);
  const [task] = claimTasks(profile, state, { worker: 'agent-a', limit: 1, types: [] });
  assert.equal(task.id, 'ch0000:q1');
  const input = JSON.parse(fs.readFileSync(path.join(root, task.inputFile), 'utf8'));
  const artifactFile = path.join(root, 'artifact.json');
  writeJson(artifactFile, validArtifact(task, input));

  state = loadState(profile);
  submitArtifact(profile, state, { taskId: task.id, artifactFile, worker: 'agent-a' });
  state = loadState(profile);
  integrateTask(profile, state, task.id);

  const chapter = JSON.parse(fs.readFileSync(path.join(profile.sourcePath, 'ch0000.json'), 'utf8'));
  assert.equal(chapter.exercises[0].answer, 'а');
  assert.deepEqual(chapter.exercises[0].options, ['а) правильный ответ', 'б) неверный ответ']);
  assert.equal(chapter.exercises[0].answerAnalysis.presentation.mode, 'two-layer');
  assert.equal(loadState(profile).tasks.find((item) => item.id === task.id).status, 'completed');
});

test('integration stops when a protected answer or option changed after generation', () => {
  const { profile, root } = createHarness();
  let state = initialize(profile);
  const [task] = claimTasks(profile, state, { worker: 'agent-a', limit: 1, types: [] });
  const input = JSON.parse(fs.readFileSync(path.join(root, task.inputFile), 'utf8'));
  const artifactFile = path.join(root, 'artifact.json');
  writeJson(artifactFile, validArtifact(task, input));
  state = loadState(profile);
  submitArtifact(profile, state, { taskId: task.id, artifactFile, worker: 'agent-a' });

  const chapterFile = path.join(profile.sourcePath, 'ch0000.json');
  const chapter = JSON.parse(fs.readFileSync(chapterFile, 'utf8'));
  chapter.exercises[0].answer = 'б';
  writeJson(chapterFile, chapter);

  state = loadState(profile);
  assert.throws(() => integrateTask(profile, state, task.id), /Protected source changed/);
  assert.equal(loadState(profile).tasks.find((item) => item.id === task.id).status, 'validated');
});

test('expired claims return to the queue and can be resumed by another agent', () => {
  const { profile } = createHarness();
  let state = initialize(profile);
  const [first] = claimTasks(profile, state, { worker: 'agent-a', limit: 1, types: [] });
  state = loadState(profile);
  const claimed = state.tasks.find((item) => item.id === first.id);
  claimed.lease.expiresAt = '2000-01-01T00:00:00.000Z';
  saveState(profile, state);

  state = loadState(profile);
  const [resumed] = claimTasks(profile, state, { worker: 'agent-b', limit: 1, types: [] });
  assert.equal(resumed.id, first.id);
  assert.equal(resumed.lease.worker, 'agent-b');
  assert.equal(resumed.attempts, 2);
  assert.ok(resumed.history.some((entry) => entry.event === 'lease-expired'));
});

test('refresh automatically reopens source-blocked work after source recovery', () => {
  const { profile } = createHarness();
  initialize(profile);
  const blockedFile = path.join(profile.sourcePath, 'ch0001.json');
  const chapter = JSON.parse(fs.readFileSync(blockedFile, 'utf8'));
  chapter.original = [sourceParagraph()];
  chapter.translated = ['已恢复翻译'];
  writeJson(blockedFile, chapter);

  const refreshed = initialize(profile, { refresh: true });
  const task = refreshed.tasks.find((item) => item.id === 'ch0001:q1');
  assert.equal(task.status, 'pending');
  assert.equal(task.block, null);
  assert.ok(task.history.some((entry) => entry.event === 'source-unblocked'));
});

test('submission rejects stale hashes and incomplete two-layer explanations', () => {
  const { profile, root } = createHarness();
  let state = initialize(profile);
  const [task] = claimTasks(profile, state, { worker: 'agent-a', limit: 1, types: [] });
  const input = JSON.parse(fs.readFileSync(path.join(root, task.inputFile), 'utf8'));
  const artifact = validArtifact(task, input);
  artifact.inputHash = 'stale';
  artifact.answerAnalysis.nextCheck = '';
  const artifactFile = path.join(root, 'bad-artifact.json');
  writeJson(artifactFile, artifact);

  state = loadState(profile);
  assert.throws(
    () => submitArtifact(profile, state, { taskId: task.id, artifactFile, worker: 'agent-a' }),
    /inputHash mismatch[\s\S]*nextCheck is required/
  );
  assert.equal(loadState(profile).tasks.find((item) => item.id === task.id).status, 'claimed');
});

test('max attempts block runaway retries and explicit unblock resets the allowance', () => {
  const { profile } = createHarness();
  profile.maxAttempts = 1;
  let state = initialize(profile);
  const [task] = claimTasks(profile, state, { worker: 'agent-a', limit: 1, types: [] });
  state = loadState(profile);
  const claimed = state.tasks.find((item) => item.id === task.id);
  claimed.status = 'pending';
  claimed.lease = null;
  saveState(profile, state);

  state = loadState(profile);
  const selected = claimTasks(profile, state, { worker: 'agent-b', limit: 1, types: [] });
  assert.equal(selected.length, 0);
  const blocked = loadState(profile).tasks.find((item) => item.id === task.id);
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.block.reason, 'max-attempts-exceeded');

  const { unblockTask } = require('../scripts/reader-book-pipeline');
  state = loadState(profile);
  unblockTask(profile, state, task.id);
  const reopened = loadState(profile).tasks.find((item) => item.id === task.id);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.attempts, 0);
});
