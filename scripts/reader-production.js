#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const {
  ARTIFACT_SCHEMA,
  blockTask,
  claimTasks,
  initialize,
  integrateTask,
  loadState,
  releaseTask,
  resolveProfile,
  submitArtifact,
  summarize,
  validateAnalysis,
  verifyState,
  writeJsonAtomic
} = require('./reader-book-pipeline');
const { normalizeArtifactFile } = require('./reader-book-worker');

const BATCH_SCHEMA = 'reader-production-batch-v1';
const REVIEW_SCHEMA = 'reader-production-review-v1';
const CONFIG_SCHEMA = 'reader-production-config-v1';

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
    if (next && !next.startsWith('--')) {
      flags[name] = next;
      index += 1;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolveConfig(root, configFile) {
  const file = path.resolve(root, configFile || 'config/reader-production.json');
  if (!fs.existsSync(file)) throw new Error(`Missing production config: ${file}`);
  const config = readJson(file);
  if (config.schema !== CONFIG_SCHEMA) throw new Error(`Config schema must be ${CONFIG_SCHEMA}`);
  return { file, config };
}

function roleCommand(role) {
  const command = Array.isArray(role) ? role : role?.command;
  if (!Array.isArray(command) || !command.length || command.some((part) => typeof part !== 'string' || !part)) {
    throw new Error('Each production role requires a non-empty command array');
  }
  return command;
}

function resolvePreset(root, configFile, presetName) {
  const { file, config } = resolveConfig(root, configFile);
  const name = presetName || config.defaultPreset;
  const preset = config.presets?.[name];
  if (!name || !preset) throw new Error(`Unknown production preset: ${name || '(none)'}`);
  const parallelBatches = Number(preset.parallelBatches ?? 1);
  if (!Number.isInteger(parallelBatches) || parallelBatches < 1 || parallelBatches > 4) throw new Error('parallelBatches must be an integer from 1 to 4');
  if (parallelBatches > 1 && preset.pipelineOverlap) throw new Error('Choose parallelBatches or pipelineOverlap, not both');
  const roles = {};
  for (const role of ['generator', 'reviewer', 'escalation']) roles[role] = roleCommand(preset[role]);
  return {
    name,
    file,
    roles,
    batchSize: Number(preset.batchSize || 0),
    parallelBatches,
    generatorAttempts: Math.max(1, Number(preset.generatorAttempts || 2)),
    reviewerAttempts: Math.max(1, Number(preset.reviewerAttempts || 2)),
    escalationAttempts: Math.max(0, Number(preset.escalationAttempts ?? 1)),
    escalateTransportFailures: preset.escalateTransportFailures !== false,
    transportMode: preset.transportMode || null,
    maxZeroAcceptedBatches: Math.max(0, Number(preset.maxZeroAcceptedBatches || 0)),
    qualityReferenceFile: preset.qualityReferenceFile || null,
    qualityReferenceTaskId: preset.qualityReferenceTaskId || null,
    pipelineOverlap: preset.pipelineOverlap === true
    ,dynamicParallel: preset.dynamicParallel === true
    ,minParallelBatches: Math.max(1, Math.min(4, Number(preset.minParallelBatches || parallelBatches)))
    ,maxParallelBatches: Math.max(1, Math.min(4, Number(preset.maxParallelBatches || parallelBatches)))
  };
}

function difficultyScore(task) {
  const text = JSON.stringify(task || {}).toLowerCase();
  let score = 0;
  if (/context|контекст|上下文/.test(text)) score += 2;
  if (/ambigu|неоднознач|歧义|спорн/.test(text)) score += 2;
  if (/fixed|устойчив|collocation|搭配|固定/.test(text)) score += 2;
  if (/distractor|干扰|вариант/.test(text)) score += 1;
  if (/review|reject|返工|failed|失败/.test(text)) score += 2;
  if (Array.isArray(task?.options) && task.options.length >= 5) score += 1;
  return score >= 4 ? 'hard' : score >= 2 ? 'medium' : 'normal';
}

function adaptiveParallelLimit(preset, report) {
  if (!preset.dynamicParallel) return preset.parallelBatches;
  const stable = report?.stableBatches || 0;
  if (stable >= 6) return preset.maxParallelBatches;
  if (stable >= 2) return Math.min(preset.maxParallelBatches, preset.minParallelBatches + 1);
  return preset.minParallelBatches;
}

function commandTimeoutMs(command) {
  const values = Array.isArray(command) ? command : [];
  const index = values.indexOf('--timeout-ms');
  const value = index >= 0 ? Number(values[index + 1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : 900000;
}

function runCommand(command, manifestFile, root) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timeoutMs = commandTimeoutMs(command);
    const child = spawn(command[0], [...command.slice(1), manifestFile], {
      cwd: root,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      finish({ status: null, stdout, stderr, error, elapsedMs: Date.now() - startedAt });
    });
    child.on('close', (status) => {
      finish({ status, stdout, stderr, elapsedMs: Date.now() - startedAt });
    });
    timer = setTimeout(() => {
      child.kill();
      finish({
        status: null,
        stdout,
        stderr: `${stderr}\nProvider command timed out after ${timeoutMs}ms.`,
        error: new Error(`Provider command timed out after ${timeoutMs}ms`),
        elapsedMs: Date.now() - startedAt
      });
    }, timeoutMs);
  });
}

function adapterUsage(result, role) {
  if (result.status !== 0) return null;
  try {
    const report = JSON.parse(String(result.stdout || '').trim());
    const totalTokens = Number(report.usage?.totalTokens);
    return Number.isFinite(totalTokens) && totalTokens >= 0
      ? { role, model: report.model || null, effort: report.effort || null, totalTokens, elapsedMs: result.elapsedMs }
      : null;
  } catch {
    return null;
  }
}

function recordInvocation(profile, worker, details, result) {
  let adapterReport = null;
  try { adapterReport = JSON.parse(String(result.stdout || '').trim()); } catch {}
  const record = {
    schema: 'reader-production-invocation-v1',
    finishedAt: new Date().toISOString(),
    worker,
    ...details,
    taskCount: details.taskIds.length,
    status: result.status,
    elapsedMs: result.elapsedMs,
    model: adapterReport?.model || null,
    effort: adapterReport?.effort || null,
    totalTokens: Number.isFinite(Number(adapterReport?.usage?.totalTokens))
      ? Number(adapterReport.usage.totalTokens)
      : null
  };
  const file = path.join(profile.statePath, 'production', `invocations-${safeName(worker)}.jsonl`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return file;
}

function commandFailure(role, result) {
  const raw = String(result.stderr || result.stdout || '').trim().replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted]');
  const compact = raw.length > 5000 ? `${raw.slice(0, 3500)}... [middle truncated] ...${raw.slice(-1500)}` : raw;
  return { code: `${role}-command-failed`, problem: `exit=${result.status}; ${compact}` };
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '_');
}

function latestArtifactFile(profile, taskId) {
  const directory = path.join(profile.statePath, 'production');
  if (!fs.existsSync(directory)) return null;
  const prefixes = ['generator', 'escalation'].map((role) => `${safeName(taskId)}-${role}-`);
  const candidates = fs.readdirSync(directory)
    .filter((file) => prefixes.some((prefix) => file.startsWith(prefix)) && file.endsWith('.artifact.json'))
    .map((file) => {
      const full = path.join(directory, file);
      return { full, mtimeMs: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.full || null;
}

function repairFindings(task) {
  const history = Array.isArray(task.history) ? task.history : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const event = history[index];
    const block = event.event === 'unblocked' ? event.previousBlock : event.event === 'blocked' ? event : null;
    if (!block || block.reason !== 'production-quality-gate-failed' || !block.details) continue;
    return String(block.details).split(' | ').filter(Boolean).map((entry) => {
      const separator = entry.indexOf(':');
      return separator > 0
        ? { code: entry.slice(0, separator).trim(), problem: entry.slice(separator + 1).trim() }
        : { code: 'previous-review-finding', problem: entry.trim() };
    });
  }
  return [];
}

function artifactErrors(profile, task, input, artifactFile) {
  if (!fs.existsSync(artifactFile)) return ['artifact file was not written'];
  try {
    normalizeArtifactFile(path.resolve(profile.repositoryRoot, task.inputFile), artifactFile);
    const artifact = readJson(artifactFile);
    const errors = [];
    if (artifact.schema !== ARTIFACT_SCHEMA) errors.push(`schema must be ${ARTIFACT_SCHEMA}`);
    if (artifact.taskId !== task.id) errors.push('artifact taskId mismatch');
    if (artifact.inputHash !== task.inputHash) errors.push('artifact inputHash mismatch');
    const analysis = input.taskType === 'knowledge-card' ? artifact.studyCard : artifact.answerAnalysis;
    errors.push(...validateAnalysis(input, analysis, profile));
    return errors;
  } catch (error) {
    return [`artifact could not be read: ${error.message}`];
  }
}

function readReview(task, reviewFile) {
  if (!fs.existsSync(reviewFile)) return { accepted: false, transportError: true, findings: [{ code: 'missing-review', problem: 'Reviewer did not write a review file.' }] };
  try {
    const review = readJson(reviewFile);
    const errors = [];
    if (review.schema !== REVIEW_SCHEMA) errors.push(`schema must be ${REVIEW_SCHEMA}`);
    if (review.taskId !== task.id) errors.push('review taskId mismatch');
    if (review.inputHash !== task.inputHash) errors.push('review inputHash mismatch');
    if (!['accept', 'reject'].includes(review.decision)) errors.push('decision must be accept or reject');
    if (errors.length) return { accepted: false, transportError: true, findings: errors.map((problem) => ({ code: 'invalid-review', problem })) };
    return { accepted: review.decision === 'accept', findings: Array.isArray(review.findings) ? review.findings : [] };
  } catch (error) {
    return { accepted: false, transportError: true, findings: [{ code: 'invalid-review-json', problem: error.message }] };
  }
}

function writeManifest(profile, preset, worker, batchNumber, role, stage, attempt, items) {
  const directory = path.join(profile.statePath, 'production');
  const manifestFile = path.join(directory, `batch-${safeName(worker)}-${batchNumber}-${role}-${attempt}.json`);
  writeJsonAtomic(manifestFile, {
    schema: BATCH_SCHEMA,
    bookId: profile.bookId,
    profile: profile.profilePath,
    requiredSkill: profile.requiredSkill,
    worker,
    role,
    stage,
    attempt,
    transportMode: preset.transportMode,
    qualityReferenceFile: preset.qualityReferenceFile,
    qualityReferenceTaskId: preset.qualityReferenceTaskId,
    tasks: items.map((item) => ({
      taskId: item.task.id,
      inputHash: item.task.inputHash,
      inputFile: path.resolve(profile.repositoryRoot, item.task.inputFile),
      artifactFile: item.artifactFile,
      reviewFile: item.reviewFile,
      proposedArtifactFile: item.proposedArtifactFile || null,
      findings: item.findings || []
    }))
  });
  return manifestFile;
}

async function invokeGeneration(profile, preset, worker, batchNumber, role, stage, attempt, items, usage) {
  for (const item of items) {
    item.transportFailed = false;
    item.proposedArtifactFile = item.artifactFile && fs.existsSync(item.artifactFile)
      ? item.artifactFile
      : null;
    item.artifactFile = path.join(profile.statePath, 'production', `${safeName(item.task.id)}-${role}-${attempt}.artifact.json`);
    item.reviewFile = path.join(profile.statePath, 'production', `${safeName(item.task.id)}-${role}-${attempt}.review.json`);
  }
  const manifest = writeManifest(profile, preset, worker, batchNumber, role, stage, attempt, items);
  const result = await runCommand(preset.roles[role], manifest, profile.repositoryRoot);
  recordInvocation(profile, worker, { batchNumber, role, stage, attempt, retry: 0, taskIds: items.map((item) => item.task.id) }, result);
  const measuredUsage = adapterUsage(result, role);
  if (measuredUsage) usage.push(measuredUsage);
  if (result.status !== 0) {
    for (const item of items) {
      item.findings = [commandFailure(role, result)];
      item.transportFailed = true;
    }
    return items;
  }
  for (const item of items) {
    const input = readJson(path.resolve(profile.repositoryRoot, item.task.inputFile));
    const errors = artifactErrors(profile, item.task, input, item.artifactFile);
    item.findings = errors.map((problem) => ({ code: 'deterministic-validation', problem }));
  }
  return items;
}

async function invokeReview(profile, preset, worker, batchNumber, attempt, items, usage, shouldStop = () => false) {
  const reviewable = items.filter((item) => !item.findings.length);
  if (!reviewable.length) return items;
  for (let retry = 0; retry < preset.reviewerAttempts; retry += 1) {
    if (shouldStop()) break;
    let retryTransport = false;
    const reviewAttempt = attempt + retry;
    const manifest = writeManifest(profile, preset, worker, batchNumber, 'reviewer', 'semantic-review', reviewAttempt, reviewable);
    const result = await runCommand(preset.roles.reviewer, manifest, profile.repositoryRoot);
    recordInvocation(profile, worker, { batchNumber, role: 'reviewer', stage: 'semantic-review', attempt: reviewAttempt, retry, taskIds: reviewable.map((item) => item.task.id) }, result);
    const measuredUsage = adapterUsage(result, 'reviewer');
    if (measuredUsage) usage.push(measuredUsage);
    if (result.status !== 0) {
      for (const item of reviewable) {
        item.findings = [commandFailure('reviewer', result)];
        item.transportFailed = true;
      }
      retryTransport = true;
    } else {
      for (const item of reviewable) {
        const review = readReview(item.task, item.reviewFile);
        item.accepted = review.accepted;
        item.reviewed = !review.transportError;
        item.findings = review.findings;
        item.transportFailed = Boolean(review.transportError);
        retryTransport = retryTransport || review.transportError;
      }
    }
    if (!retryTransport) break;
  }
  return items;
}

function removeTransportFailures(preset, remaining, transportFailed) {
  if (preset.escalateTransportFailures) return remaining;
  const failedNow = remaining.filter((item) => item.transportFailed);
  transportFailed.push(...failedNow);
  const failedIds = new Set(failedNow.map((item) => item.task.id));
  return remaining.filter((item) => !failedIds.has(item.task.id));
}

async function processBatch(profile, preset, worker, batchNumber, selected, shouldStop = () => false) {
  const batchItems = selected.map((task) => {
    const findings = repairFindings(task);
    return {
      task,
      findings,
      accepted: false,
      reviewed: false,
      artifactFile: findings.length ? latestArtifactFile(profile, task.id) : null
    };
  });
  let remaining = batchItems;
  const accepted = [];
  const usage = [];
  const transportFailed = [];
  for (let attempt = 1; attempt <= preset.generatorAttempts && remaining.length; attempt += 1) {
    if (shouldStop()) break;
    const stage = attempt === 1 && !remaining.some((item) => item.findings.length) ? 'draft' : 'repair';
    await invokeGeneration(profile, preset, worker, batchNumber, 'generator', stage, attempt, remaining, usage);
    remaining = removeTransportFailures(preset, remaining, transportFailed);
    if (!remaining.length) break;
    if (shouldStop()) break;
    await invokeReview(profile, preset, worker, batchNumber, attempt, remaining, usage, shouldStop);
    remaining = removeTransportFailures(preset, remaining, transportFailed);
    accepted.push(...remaining.filter((item) => item.accepted));
    remaining = remaining.filter((item) => !item.accepted);
  }
  for (let attempt = 1; attempt <= preset.escalationAttempts && remaining.length; attempt += 1) {
    if (shouldStop()) break;
    await invokeGeneration(profile, preset, worker, batchNumber, 'escalation', 'escalation', attempt, remaining, usage);
    remaining = removeTransportFailures(preset, remaining, transportFailed);
    if (!remaining.length) break;
    if (shouldStop()) break;
    await invokeReview(profile, preset, worker, batchNumber, preset.generatorAttempts + attempt, remaining, usage, shouldStop);
    remaining = removeTransportFailures(preset, remaining, transportFailed);
    accepted.push(...remaining.filter((item) => item.accepted));
    remaining = remaining.filter((item) => !item.accepted);
  }
  return { accepted, rejected: remaining, transportFailed, reviewed: batchItems.filter((item) => item.reviewed).length, usage };
}

async function generateOverlappedBatch(profile, preset, worker, batchNumber, selected) {
  const items = selected.map((task) => {
    const findings = repairFindings(task);
    return {
      task,
      findings,
      accepted: false,
      reviewed: false,
      artifactFile: findings.length ? latestArtifactFile(profile, task.id) : null
    };
  });
  const usage = [];
  const transportFailed = [];
  const stage = items.some((item) => item.findings.length) ? 'repair' : 'draft';
  await invokeGeneration(profile, preset, worker, batchNumber, 'generator', stage, 1, items, usage);
  const remaining = removeTransportFailures(preset, items, transportFailed);
  return { items, remaining, transportFailed, usage };
}

async function reviewOverlappedBatch(profile, preset, worker, batchNumber, generated) {
  let remaining = generated.remaining;
  if (remaining.length) {
    await invokeReview(profile, preset, worker, batchNumber, 1, remaining, generated.usage);
    remaining = removeTransportFailures(preset, remaining, generated.transportFailed);
  }
  const accepted = remaining.filter((item) => item.accepted);
  return {
    accepted,
    rejected: remaining.filter((item) => !item.accepted),
    transportFailed: generated.transportFailed,
    reviewed: generated.items.filter((item) => item.reviewed).length,
    usage: generated.usage
  };
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

function snapshotBatch(profile, selected) {
  const files = new Map();
  const stateFile = path.join(profile.statePath, 'state.json');
  files.set(stateFile, fs.readFileSync(stateFile, 'utf8'));
  for (const item of selected) {
    const targetFile = profile.adapter === 'grammar' ? (item.targetFile || item.sourceFile) : item.sourceFile;
    if (!targetFile) continue;
    const file = path.resolve(profile.repositoryRoot, targetFile);
    if (fs.existsSync(file) && !files.has(file)) files.set(file, fs.readFileSync(file, 'utf8'));
  }
  if (selected.some((item) => item.type === 'knowledge-card') && profile.cardIndexFile) {
    const indexFile = path.resolve(profile.repositoryRoot, profile.cardIndexFile);
    if (fs.existsSync(indexFile) && !files.has(indexFile)) files.set(indexFile, fs.readFileSync(indexFile, 'utf8'));
  }
  return files;
}

function restoreBatch(snapshot) {
  for (const [file, contents] of snapshot) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents, 'utf8');
  }
}

function acquireRunLock(profile, worker) {
  fs.mkdirSync(profile.statePath, { recursive: true });
  const lockFile = path.join(profile.statePath, 'production.lock');
  let handle;
  try {
    handle = fs.openSync(lockFile, 'wx');
    fs.writeFileSync(handle, `${JSON.stringify({ pid: process.pid, worker, startedAt: new Date().toISOString() })}\n`, 'utf8');
    return { lockFile, handle };
  } catch (error) {
    if (handle) fs.closeSync(handle);
    if (error.code === 'EEXIST') {
      let details = '';
      try { details = fs.readFileSync(lockFile, 'utf8').trim(); } catch {}
      try {
        const lock = JSON.parse(details);
        if (lock.pid && !processExists(lock.pid)) {
          fs.unlinkSync(lockFile);
          handle = fs.openSync(lockFile, 'wx');
          fs.writeFileSync(handle, `${JSON.stringify({ pid: process.pid, worker, startedAt: new Date().toISOString() })}\n`, 'utf8');
          return { lockFile, handle };
        }
      } catch {}
      throw new Error(`Another production run is already active for ${profile.bookId}${details ? ` (${details})` : ''}`);
    }
    throw error;
  }
}

function processExists(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try { process.kill(Number(pid), 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

function releaseRunLock(lock) {
  if (!lock) return;
  try { fs.closeSync(lock.handle); } catch {}
  try { fs.unlinkSync(lock.lockFile); } catch {}
}

function ensureState(profile) {
  try {
    return loadState(profile);
  } catch (error) {
    if (!/not initialized/.test(error.message)) throw error;
    return initialize(profile);
  }
}

function planProduction(profileName, options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const profile = resolveProfile(profileName, root);
  const preset = resolvePreset(root, options.config, options.preset);
  let state = null;
  try {
    state = loadState(profile);
  } catch (error) {
    if (!/not initialized/.test(error.message)) throw error;
  }
  return {
    mode: 'plan',
    profile: profile.bookId,
    preset: preset.name,
    roles: Object.fromEntries(Object.entries(preset.roles).map(([role, command]) => [role, command[0]])),
    batchSize: Number(options.limit || preset.batchSize || profile.defaultBatchSize || 1),
    parallelBatches: preset.parallelBatches,
    pipelineOverlap: preset.pipelineOverlap,
    tests: profile.tests || [],
    initialized: Boolean(state),
    summary: state ? summarize(state) : null
  };
}

function releaseSelected(profile, worker, selected) {
  for (const task of selected) {
    const live = loadState(profile).tasks.find((item) => item.id === task.id);
    if (live?.status === 'claimed' && live.lease?.worker === worker) {
      releaseTask(profile, loadState(profile), task.id, worker);
    }
  }
}

function collectBatchUsage(outcome, report) {
  report.usage.calls.push(...outcome.usage);
  report.usage.totalTokens += outcome.usage.reduce((sum, item) => sum + item.totalTokens, 0);
}

function saveProgress(profile, report) {
  writeJsonAtomic(path.join(profile.statePath, 'production', 'progress.json'), {
    worker: report.worker, startedAt: report.startedAt, updatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - Date.parse(report.startedAt),
    parallelBatches: report.parallelBatches,
    activeParallelLimit: report.activeParallelLimit || report.parallelBatches,
    stableBatches: report.stableBatches || 0,
    transportRetries: report.transportRetries || 0,
    batches: report.batches, batchesFinished: report.batchesFinished,
    integrated: report.integrated, blocked: report.blocked,
    totalTokens: report.usage.totalTokens,
    testsPassed: report.testRuns.length > 0 && report.testRuns.every((run) => run.ok),
    stoppedReason: report.stoppedReason,
    summary: summarize(loadState(profile))
  });
}

function finishBatch(profile, worker, selected, outcome, report) {
  collectBatchUsage(outcome, report);
  report.generated += selected.length;
  report.reviewed += outcome.reviewed;
  if (outcome.transportFailed.length) {
    report.stableBatches = 0;
    report.transportRetries = (report.transportRetries || 0) + outcome.transportFailed.length;
    report.transportFailure = outcome.transportFailed.map((item) => ({ taskId: item.task.id, findings: item.findings }));
    report.transportRetryCounts ||= {};
    for (const item of outcome.transportFailed) {
      const taskId = item.task.id;
      report.transportRetryCounts[taskId] = (report.transportRetryCounts[taskId] || 0) + 1;
      const live = loadState(profile).tasks.find((task) => task.id === taskId);
      if (report.transportRetryCounts[taskId] >= 3 && live?.status === 'claimed') {
        const details = item.findings.map((finding) => `${finding.code}: ${finding.problem || ''}`).join(' | ');
        blockTask(profile, loadState(profile), taskId, 'production-provider-retry-exhausted', details);
        report.blocked += 1;
      } else if (live?.status === 'claimed') {
        releaseTask(profile, loadState(profile), taskId, worker);
        report.singleTaskRetries = (report.singleTaskRetries || 0) + 1;
      }
    }
    // A partially successful provider response is not safe to integrate as a batch.
    // Release any other claimed items so the retry starts from a clean state.
    releaseSelected(profile, worker, selected);
    saveProgress(profile, report);
    return true;
  }
  const snapshot = snapshotBatch(profile, selected);
  try {
    for (const item of outcome.accepted) {
      submitArtifact(profile, loadState(profile), { taskId: item.task.id, artifactFile: item.artifactFile, worker });
    }
    for (const item of outcome.accepted) integrateTask(profile, loadState(profile), item.task.id);
    for (const item of outcome.rejected) {
      const details = item.findings.map((finding) => `${finding.code}: ${finding.problem || finding.requiredFix || ''}`).join(' | ');
      blockTask(profile, loadState(profile), item.task.id, 'production-quality-gate-failed', details);
    }
  } catch (error) {
    restoreBatch(snapshot);
    report.stoppedReason = 'batch-integration-failed-rolled-back';
    report.rollback = { reason: error.message, batch: report.batches };
    return false;
  }
  const testRun = runProfileTests(profile);
  report.testRuns.push(testRun);
  if (!testRun.ok) {
    restoreBatch(snapshot);
    report.stoppedReason = 'batch-tests-failed-rolled-back';
    report.rollback = { batch: report.batches };
    return false;
  }
  report.integrated += outcome.accepted.length;
  report.blocked += outcome.rejected.length;
  report.batchesFinished += 1;
  report.zeroAcceptedBatches = outcome.accepted.length ? 0 : report.zeroAcceptedBatches + 1;
  report.stableBatches = outcome.rejected.length ? 0 : (report.stableBatches || 0) + 1;
  saveProgress(profile, report);
  return true;
}

async function runParallelBatches(profile, preset, worker, batchSize, maxBatches, taskIds, report) {
  const active = new Map();
  let halted = false;
  let pauseRequested = false;
  const pauseFile = path.join(profile.statePath, 'production.pause');
  try {
    while (true) {
      pauseRequested ||= fs.existsSync(pauseFile);
      const parallelLimit = adaptiveParallelLimit(preset, report);
      report.activeParallelLimit = parallelLimit;
      while (!halted && !pauseRequested && active.size < parallelLimit && report.batches < maxBatches) {
        const state = loadState(profile);
        const activeIds = new Set([...active.values()].flatMap((batch) => batch.selected.map((task) => task.id)));
        // A slow batch must not be reclaimed when the other slot starts new work.
        for (const task of state.tasks) {
          if (activeIds.has(task.id) && task.status === 'claimed' && task.lease?.worker === worker) {
            task.lease.expiresAt = new Date(Date.now() + Number(profile.leaseMinutes || 30) * 60000).toISOString();
          }
        }
        const claimSize = report.singleTaskRetries > 0 ? 1 : batchSize;
        const selected = claimTasks(profile, state, { worker, limit: claimSize, taskIds, types: [] });
        if (selected.length && report.singleTaskRetries > 0) report.singleTaskRetries -= 1;
        selected.sort((a, b) => difficultyScore(a) === 'hard' ? -1 : difficultyScore(b) === 'hard' ? 1 : 0);
        if (!selected.length) break;
        const batchNumber = ++report.batches;
        const promise = processBatch(profile, preset, worker, batchNumber, selected, () => halted)
          .then((outcome) => ({ batchNumber, outcome }), (error) => ({ batchNumber, error }));
        active.set(batchNumber, { selected, promise });
      }
      if (!active.size) break;
      const result = await Promise.race([...active.values()].map((batch) => batch.promise));
      const batch = active.get(result.batchNumber);
      active.delete(result.batchNumber);
      if (result.error) {
        report.stoppedReason ||= 'batch-execution-failed-tasks-released';
        report.executionError = { batchNumber: result.batchNumber, message: result.error.message };
        halted = true;
        releaseSelected(profile, worker, batch.selected);
      } else if (halted) {
        collectBatchUsage(result.outcome, report);
        releaseSelected(profile, worker, batch.selected);
      } else {
        // Models only write separate drafts. This coordinator alone integrates
        // and tests each completed batch, including batches in the same chapter.
        try {
          if (!finishBatch(profile, worker, batch.selected, result.outcome, report)) {
            halted = true;
            releaseSelected(profile, worker, batch.selected);
          } else if (preset.maxZeroAcceptedBatches && report.zeroAcceptedBatches >= preset.maxZeroAcceptedBatches) {
            report.stoppedReason = 'quality-stalled';
            halted = true;
          }
        } catch (error) {
          halted = true;
          releaseSelected(profile, worker, batch.selected);
          throw error;
        }
      }
    }
    if (pauseRequested) report.stoppedReason ||= 'paused-after-batch';
  } finally {
    halted = true;
    // Finish the currently paid call, preserve its draft, and start no new calls
    // after a shared failure. Do not leave detached workers writing later.
    for (const batch of active.values()) {
      const result = await batch.promise;
      if (result.outcome) collectBatchUsage(result.outcome, report);
      releaseSelected(profile, worker, batch.selected);
    }
  }
}

async function runProduction(profileName, options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const profile = resolveProfile(profileName, root);
  const preset = resolvePreset(root, options.config, options.preset);
  let state = ensureState(profile);
  const verified = verifyState(profile, state);
  if (!verified.ok) throw new Error(`Pipeline verification failed:\n- ${verified.errors.join('\n- ')}`);
  const worker = String(options.worker || `production-${process.pid}`);
  const requestedSize = Number(options.limit || preset.batchSize || profile.defaultBatchSize || 1);
  const batchSize = Math.min(Math.max(1, requestedSize), Math.max(1, Number(profile.maxBatchSize || requestedSize)));
  const maxBatches = Math.max(1, Number(options.maxBatches || options['max-batches'] || Number.MAX_SAFE_INTEGER));
  const taskIds = options.tasks ? String(options.tasks).split(',') : [];
  const report = { mode: 'run', profile: profile.bookId, preset: preset.name, worker, startedAt: new Date().toISOString(), parallelBatches: preset.parallelBatches, activeParallelLimit: preset.minParallelBatches, stableBatches: 0, transportRetries: 0, batches: 0, batchesFinished: 0, generated: 0, reviewed: 0, integrated: 0, blocked: 0, zeroAcceptedBatches: 0, stoppedReason: null, testRuns: [], usage: { totalTokens: 0, calls: [] } };
  report.usage.logFile = path.join(profile.statePath, 'production', `invocations-${safeName(worker)}.jsonl`);
  const runLock = acquireRunLock(profile, worker);
  try {
   if (preset.parallelBatches > 1) {
    await runParallelBatches(profile, preset, worker, batchSize, maxBatches, taskIds, report);
   } else if (preset.pipelineOverlap) {
    if (preset.generatorAttempts !== 1 || preset.reviewerAttempts !== 1 || preset.escalationAttempts !== 0 || preset.escalateTransportFailures) {
      throw new Error('pipelineOverlap requires one generator attempt, one reviewer attempt, zero escalation attempts, and transport escalation disabled');
    }
    let held = null;
    while (report.batches < maxBatches) {
      if (fs.existsSync(path.join(profile.statePath, 'production.pause'))) {
        if (held) {
          const outcome = await reviewOverlappedBatch(profile, preset, worker, held.batchNumber, held.generated);
          finishBatch(profile, worker, held.selected, outcome, report);
          held = null;
        }
        report.stoppedReason ||= 'paused-after-batch';
        break;
      }
      state = loadState(profile);
      const selected = claimTasks(profile, state, { worker, limit: batchSize, taskIds, types: [] });
      if (!selected.length) break;
      report.batches += 1;
      const current = { batchNumber: report.batches, selected };
      if (!held) {
        current.generated = await generateOverlappedBatch(profile, preset, worker, current.batchNumber, selected);
        held = current;
        continue;
      }
      const [previousOutcome, currentGenerated] = await Promise.all([
        reviewOverlappedBatch(profile, preset, worker, held.batchNumber, held.generated),
        generateOverlappedBatch(profile, preset, worker, current.batchNumber, current.selected)
      ]);
      current.generated = currentGenerated;
      if (!finishBatch(profile, worker, held.selected, previousOutcome, report)) {
        releaseSelected(profile, worker, held.selected);
        releaseSelected(profile, worker, current.selected);
        held = null;
        break;
      }
      held = current;
    }
    if (held && !report.stoppedReason) {
      const outcome = await reviewOverlappedBatch(profile, preset, worker, held.batchNumber, held.generated);
      finishBatch(profile, worker, held.selected, outcome, report);
    }
   } else {
    while (report.batches < maxBatches) {
      if (fs.existsSync(path.join(profile.statePath, 'production.pause'))) {
        report.stoppedReason = 'paused-after-batch';
        break;
      }
      state = loadState(profile);
      const selected = claimTasks(profile, state, { worker, limit: batchSize, taskIds, types: [] });
      if (!selected.length) break;
      report.batches += 1;
      const outcome = await processBatch(profile, preset, worker, report.batches, selected);
      if (!finishBatch(profile, worker, selected, outcome, report)) {
        releaseSelected(profile, worker, selected);
        break;
      }
      if (preset.maxZeroAcceptedBatches && report.zeroAcceptedBatches >= preset.maxZeroAcceptedBatches) {
        report.stoppedReason = 'quality-stalled';
        break;
      }
    }
   }
   report.summary = summarize(loadState(profile));
   if (!report.stoppedReason) report.stoppedReason = report.summary.actionable ? 'batch-limit-or-no-claimable-work' : 'complete-or-blocked';
   report.finishedAt = new Date().toISOString();
   report.elapsedMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
   report.modelElapsedMs = report.usage.calls.reduce((sum, call) => sum + call.elapsedMs, 0);
   saveProgress(profile, report);
   writeJsonAtomic(path.join(profile.statePath, 'production', 'last-run.json'), report);
   return report;
  } finally {
   releaseRunLock(runLock);
  }
}

function usage() {
  return [
    'Usage: node scripts/reader-production.js <plan|run|pause|unpause> <profile> [options]',
    '',
    'Options:',
    '  --preset <name>       Production preset from config/reader-production.json',
    '  --config <file>       Alternative repository-relative config file',
    '  --worker <id>         Stable worker identifier',
    '  --limit <n>           Tasks per batch',
    '  --max-batches <n>     Stop after a bounded number of batches',
    '  --tasks <id,id>       Process only named tasks',
    '  A per-book lock prevents concurrent production runs.'
  ].join('\n');
}

async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const [command, profile] = positional;
  if (!command || !profile || !['plan', 'run', 'pause', 'unpause'].includes(command)) {
    process.stderr.write(`${usage()}\n`);
    return 1;
  }
  if (['pause', 'unpause'].includes(command)) {
    const resolved = resolveProfile(profile);
    const file = path.join(resolved.statePath, 'production.pause');
    if (command === 'pause') writeJsonAtomic(file, { requestedAt: new Date().toISOString() });
    else if (fs.existsSync(file)) fs.unlinkSync(file);
    process.stdout.write(`${JSON.stringify({ profile, paused: command === 'pause' })}\n`);
    return 0;
  }
  const options = {
    config: flags.config,
    preset: flags.preset,
    worker: flags.worker,
    limit: flags.limit,
    'max-batches': flags['max-batches'],
    tasks: flags.tasks
  };
  const result = command === 'plan' ? planProduction(profile, options) : await runProduction(profile, options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.stoppedReason?.startsWith('batch-tests-failed') ? 2 : 0;
}

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  BATCH_SCHEMA,
  CONFIG_SCHEMA,
  REVIEW_SCHEMA,
  commandTimeoutMs,
  latestArtifactFile,
  planProduction,
  readReview,
  repairFindings,
  resolvePreset,
  runProduction
};
