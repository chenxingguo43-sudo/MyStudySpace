#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  ARTIFACT_SCHEMA,
  claimTasks,
  integrateTask,
  loadState,
  releaseTask,
  resolveProfile,
  submitArtifact,
  summarize,
  unblockTask,
  validateAnalysis,
  verifyState,
  writeJsonAtomic
} = require('./reader-book-pipeline');
const { normalizeArtifactFile } = require('./reader-book-worker');

const MANIFEST_SCHEMA = 'reader-inhost-batch-v1';
const REVIEW_SCHEMA = 'reader-production-review-v1';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }
    const name = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) flags[name] = argv[++index];
    else flags[name] = true;
  }
  return { positional, flags };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '_');
}

function inside(root, file, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(file);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${label} is outside the pipeline directory`);
  return resolved;
}

function taskIds(value) {
  return value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function acceptedReferences(profile) {
  if (profile.bookId !== 'zlatoust-grammar') return [];
  return ['GL1-Q008', 'GL1-Q010', 'GL1-Q013']
    .map((id) => path.join(profile.statePath, 'artifacts', `ch0000_${id}.json`))
    .filter((file) => fs.existsSync(file));
}

function prepare(profileName, options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const profile = resolveProfile(profileName, root);
  let state = loadState(profile);
  const verified = verifyState(profile, state);
  if (!verified.ok) throw new Error(`Pipeline verification failed:\n- ${verified.errors.join('\n- ')}`);

  const requestedIds = taskIds(options.tasks);
  if (options.unblock && !requestedIds.length) throw new Error('--unblock requires an explicit --tasks list');
  if (options.unblock) {
    for (const id of requestedIds) {
      state = loadState(profile);
      const task = state.tasks.find((item) => item.id === id);
      if (!task) throw new Error(`Unknown task: ${id}`);
      if (task.status === 'blocked') unblockTask(profile, state, id);
    }
  }

  state = loadState(profile);
  const worker = String(options.worker || 'in-host-page');
  const requestedLimit = Number(options.limit || profile.defaultBatchSize || 1);
  const limit = Math.min(Math.max(1, requestedLimit), Math.max(1, Number(profile.maxBatchSize || requestedLimit)));
  const selected = claimTasks(profile, state, { worker, limit, taskIds: requestedIds, types: [] });
  if (!selected.length) return { mode: 'prepare', claimed: 0, manifest: null, summary: summarize(loadState(profile)) };

  const directory = path.join(profile.statePath, 'in-host');
  const batchId = `${safeName(worker)}-${loadState(profile).revision}`;
  const manifestFile = path.join(directory, `batch-${batchId}.json`);
  const references = acceptedReferences(profile).map((file) => path.resolve(file));
  const manifest = {
    schema: MANIFEST_SCHEMA,
    bookId: profile.bookId,
    profile: profile.profilePath,
    worker,
    requiredSkill: profile.requiredSkill,
    createdAt: new Date().toISOString(),
    tasks: selected.map((task) => ({
      taskId: task.id,
      inputHash: task.inputHash,
      inputFile: path.resolve(root, task.inputFile),
      artifactFile: path.resolve(directory, `${safeName(task.id)}.artifact.json`),
      reviewFile: path.resolve(directory, `${safeName(task.id)}.review.json`),
      acceptedReferences: references
    }))
  };
  writeJsonAtomic(manifestFile, manifest);
  return {
    mode: 'prepare',
    claimed: selected.length,
    taskIds: selected.map((task) => task.id),
    manifest: path.resolve(manifestFile),
    requiredSkill: profile.requiredSkill,
    summary: summarize(loadState(profile))
  };
}

function reviewErrors(task, reviewFile, worker) {
  if (!fs.existsSync(reviewFile)) return ['independent review file is missing'];
  let review;
  try {
    review = readJson(reviewFile);
  } catch (error) {
    return [`review JSON is invalid: ${error.message}`];
  }
  const errors = [];
  if (review.schema !== REVIEW_SCHEMA) errors.push(`review schema must be ${REVIEW_SCHEMA}`);
  if (review.taskId !== task.taskId) errors.push('review taskId mismatch');
  if (review.inputHash !== task.inputHash) errors.push('review inputHash mismatch');
  if (review.decision !== 'accept') errors.push(`independent reviewer did not accept the artifact${review.findings?.length ? `: ${review.findings.map((item) => item.problem || item.requiredFix || item.code).join(' | ')}` : ''}`);
  if (review.independent !== true) errors.push('review must declare independent: true');
  if (!String(review.reviewerContext || '').trim()) errors.push('reviewerContext is required');
  if (String(review.reviewerContext || '') === String(worker)) errors.push('reviewerContext must differ from the generating worker');
  return errors;
}

function artifactErrors(profile, task) {
  if (!fs.existsSync(task.artifactFile)) return ['artifact file is missing'];
  try {
    normalizeArtifactFile(task.inputFile, task.artifactFile);
    const input = readJson(task.inputFile);
    const artifact = readJson(task.artifactFile);
    const errors = [];
    if (artifact.schema !== ARTIFACT_SCHEMA) errors.push(`artifact schema must be ${ARTIFACT_SCHEMA}`);
    if (artifact.taskId !== task.taskId) errors.push('artifact taskId mismatch');
    if (artifact.inputHash !== task.inputHash) errors.push('artifact inputHash mismatch');
    errors.push(...validateAnalysis(input, input.taskType === 'knowledge-card' ? artifact.studyCard : artifact.answerAnalysis, profile));
    return errors;
  } catch (error) {
    return [`artifact could not be validated: ${error.message}`];
  }
}

function runProfileTests(profile) {
  const results = [];
  for (const command of profile.tests || []) {
    const result = spawnSync(String(command), {
      cwd: profile.repositoryRoot,
      shell: true,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    results.push({ command, status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' });
    if (result.status !== 0) break;
  }
  return { ok: results.every((item) => item.status === 0), results };
}

function snapshotFiles(profile, manifest) {
  const stateFile = path.join(profile.statePath, 'state.json');
  const files = new Map([[stateFile, fs.readFileSync(stateFile, 'utf8')]]);
  const liveState = loadState(profile);
  for (const item of manifest.tasks) {
    const live = liveState.tasks.find((task) => task.id === item.taskId);
    const targetFile = profile.adapter === 'grammar' ? live?.targetFile : live?.sourceFile;
    if (!targetFile) continue;
    const target = path.resolve(profile.repositoryRoot, targetFile);
    if (!files.has(target) && fs.existsSync(target)) files.set(target, fs.readFileSync(target, 'utf8'));
  }
  return files;
}

function restoreFiles(files) {
  for (const [file, contents] of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents, 'utf8');
  }
}

function finish(profileName, options = {}) {
  if (!options.manifest) throw new Error('finish requires --manifest <file>');
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const profile = resolveProfile(profileName, root);
  const manifestFile = inside(profile.statePath, options.manifest, 'Manifest');
  const manifest = readJson(manifestFile);
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.bookId !== profile.bookId || !Array.isArray(manifest.tasks)) {
    throw new Error('Invalid in-host batch manifest');
  }

  const failures = [];
  for (const task of manifest.tasks) {
    const review = reviewErrors(task, task.reviewFile, manifest.worker);
    const artifact = artifactErrors(profile, task);
    if (review.length || artifact.length) failures.push({ taskId: task.taskId, errors: [...review, ...artifact] });
  }
  if (failures.length) {
    return { mode: 'finish', ok: false, integrated: 0, failures, manifest: manifestFile, summary: summarize(loadState(profile)) };
  }

  const snapshot = snapshotFiles(profile, manifest);
  let tests;
  try {
    for (const task of manifest.tasks) {
      submitArtifact(profile, loadState(profile), {
        taskId: task.taskId,
        artifactFile: task.artifactFile,
        worker: manifest.worker
      });
    }
    for (const task of manifest.tasks) integrateTask(profile, loadState(profile), task.taskId);
    tests = runProfileTests(profile);
  } catch (error) {
    restoreFiles(snapshot);
    return {
      mode: 'finish',
      ok: false,
      integrated: 0,
      rolledBack: true,
      failures: [{ taskId: null, errors: [`integration failed and was rolled back: ${error.message}`] }],
      manifest: manifestFile,
      summary: summarize(loadState(profile))
    };
  }
  if (!tests.ok) {
    restoreFiles(snapshot);
    return {
      mode: 'finish',
      ok: false,
      integrated: 0,
      rolledBack: true,
      failures: [{ taskId: null, errors: ['batch tests failed after integration; changes were rolled back'] }],
      tests,
      stoppedReason: 'batch-tests-failed',
      manifest: manifestFile,
      summary: summarize(loadState(profile))
    };
  }
  return {
    mode: 'finish',
    ok: tests.ok,
    integrated: manifest.tasks.length,
    taskIds: manifest.tasks.map((task) => task.taskId),
    tests,
    stoppedReason: tests.ok ? null : 'batch-tests-failed',
    summary: summarize(loadState(profile))
  };
}

function release(profileName, options = {}) {
  if (!options.manifest) throw new Error('release requires --manifest <file>');
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const profile = resolveProfile(profileName, root);
  const manifestFile = inside(profile.statePath, options.manifest, 'Manifest');
  const manifest = readJson(manifestFile);
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.bookId !== profile.bookId) throw new Error('Invalid in-host batch manifest');
  const released = [];
  for (const task of manifest.tasks || []) {
    const state = loadState(profile);
    const live = state.tasks.find((item) => item.id === task.taskId);
    if (live?.status === 'claimed' && live.lease?.worker === manifest.worker) {
      releaseTask(profile, state, task.taskId, manifest.worker);
      released.push(task.taskId);
    }
  }
  return { mode: 'release', released: released.length, taskIds: released, summary: summarize(loadState(profile)) };
}

function usage() {
  return [
    'Usage: node scripts/reader-inhost-runner.js <prepare|finish|release> <profile> [options]',
    '',
    'prepare: --worker <id> [--limit N] [--tasks id,id] [--unblock]',
    'finish:  --manifest <file>',
    'release: --manifest <file>'
  ].join('\n');
}

function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const [command, profile] = positional;
  if (!command || !profile || !['prepare', 'finish', 'release'].includes(command)) {
    process.stderr.write(`${usage()}\n`);
    return 1;
  }
  const result = command === 'prepare'
    ? prepare(profile, flags)
    : command === 'finish'
      ? finish(profile, flags)
      : release(profile, flags);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.ok === false ? 2 : 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { MANIFEST_SCHEMA, finish, prepare, release, reviewErrors };
