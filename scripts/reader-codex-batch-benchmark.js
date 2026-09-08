#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { resolveProfile, validateAnalysis } = require('./reader-book-pipeline');
const { normalizeArtifactFile } = require('./reader-book-worker');
const { runAdapter } = require('./reader-codex-adapter');

const BATCH_SCHEMA = 'reader-production-batch-v1';
const REVIEW_SCHEMA = 'reader-production-review-v1';
const DEFAULT_TASKS = Array.from({ length: 8 }, (_, index) => `ch0000:GL1-Q${String(index + 85).padStart(3, '0')}`);
const DEFAULT_VARIANTS = [
  { name: 'terra-low', model: 'gpt-5.6-terra', effort: 'low' },
  { name: 'luna-medium', model: 'gpt-5.6-luna', effort: 'medium' }
];

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}
function safeName(value) { return String(value).replace(/[^A-Za-z0-9_.-]+/g, '_'); }
function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const next = argv[index + 1];
    flags[value.slice(2)] = next && !next.startsWith('--') ? argv[++index] : true;
  }
  return flags;
}
function extractQ008Reference(root) {
  const file = path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'theory', 'explanations', 'gl1', 'gl1-q001-q013.json');
  const group = readJson(file);
  const explanation = (group.explanations || []).find((item) => item.exerciseId === 'GL1-Q008');
  if (!explanation) throw new Error('Accepted GL1-Q008 reference was not found');
  const { _source, provenance, ...teaching } = explanation;
  return teaching;
}
function taskRecords(profile, taskIds, outputDir, variantName) {
  const state = readJson(path.join(profile.statePath, 'state.json'));
  return taskIds.map((taskId) => {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.status !== 'completed') throw new Error(`Benchmark task must already be completed: ${taskId}`);
    const inputFile = path.join(profile.statePath, 'inputs', `${safeName(taskId)}.json`);
    const input = readJson(inputFile);
    const base = safeName(taskId);
    return {
      taskId,
      inputHash: input.inputHash,
      inputFile,
      artifactFile: path.join(outputDir, variantName, `${base}.artifact.json`),
      reviewFile: path.join(outputDir, variantName, `${base}.review.json`),
      proposedArtifactFile: null,
      findings: []
    };
  });
}
function manifest(profile, worker, role, tasks, referenceFile) {
  return {
    schema: BATCH_SCHEMA,
    bookId: profile.bookId,
    profile: profile.profilePath,
    requiredSkill: profile.requiredSkill,
    worker,
    role,
    stage: role === 'reviewer' ? 'benchmark-review' : 'benchmark-generation',
    attempt: 1,
    transportMode: role === 'reviewer' ? undefined : 'compact-grammar-v1',
    qualityReferenceFile: path.relative(profile.repositoryRoot, referenceFile),
    tasks
  };
}
function structuralResults(profile, tasks) {
  return tasks.map((task) => {
    normalizeArtifactFile(task.inputFile, task.artifactFile);
    const input = readJson(task.inputFile);
    const artifact = readJson(task.artifactFile);
    return { taskId: task.taskId, errors: validateAnalysis(input, artifact.answerAnalysis, profile) };
  });
}
function reviewResults(tasks) {
  return tasks.map((task) => {
    const review = readJson(task.reviewFile);
    if (review.schema !== REVIEW_SCHEMA || review.taskId !== task.taskId || review.inputHash !== task.inputHash) {
      return { taskId: task.taskId, decision: 'reject', findings: [{ code: 'invalid-review', problem: 'Review identity did not match the task.' }] };
    }
    return { taskId: task.taskId, decision: review.decision, findings: review.findings || [] };
  });
}
function runVariant(profile, taskIds, outputDir, referenceFile, variant, reviewer) {
  const tasks = taskRecords(profile, taskIds, outputDir, variant.name);
  const generatorManifest = path.join(outputDir, variant.name, 'generator-manifest.json');
  writeJson(generatorManifest, manifest(profile, `benchmark-${variant.name}`, 'generator', tasks, referenceFile));
  const started = performance.now();
  const generation = runAdapter(generatorManifest, { model: variant.model, effort: variant.effort });
  const generationSeconds = (performance.now() - started) / 1000;
  const structure = structuralResults(profile, tasks);
  const structurallyValid = structure.filter((item) => !item.errors.length).map((item) => item.taskId);
  const reviewableTasks = tasks.filter((task) => structurallyValid.includes(task.taskId));
  let review = null;
  let reviews = [];
  let reviewSeconds = 0;
  if (reviewableTasks.length) {
    const reviewerManifest = path.join(outputDir, variant.name, 'reviewer-manifest.json');
    writeJson(reviewerManifest, manifest(profile, `benchmark-review-${variant.name}`, 'reviewer', reviewableTasks, referenceFile));
    const reviewStarted = performance.now();
    review = runAdapter(reviewerManifest, { model: reviewer.model, effort: reviewer.effort });
    reviewSeconds = (performance.now() - reviewStarted) / 1000;
    reviews = reviewResults(reviewableTasks);
  }
  return {
    variant,
    reviewer,
    taskCount: tasks.length,
    structurallyValid: structurallyValid.length,
    accepted: reviews.filter((item) => item.decision === 'accept').length,
    generationSeconds,
    reviewSeconds,
    totalSeconds: generationSeconds + reviewSeconds,
    usage: {
      generationTokens: generation.usage?.totalTokens || 0,
      reviewTokens: review?.usage?.totalTokens || 0,
      totalTokens: (generation.usage?.totalTokens || 0) + (review?.usage?.totalTokens || 0)
    },
    structure,
    reviews
  };
}
function prepareBenchmark(root, outputDir, taskIds) {
  const profile = resolveProfile('zlatoust-grammar', root);
  const referenceFile = path.join(outputDir, 'q008-quality-reference.json');
  writeJson(referenceFile, extractQ008Reference(root));
  for (const variant of DEFAULT_VARIANTS) {
    const tasks = taskRecords(profile, taskIds, outputDir, variant.name);
    writeJson(path.join(outputDir, variant.name, 'generator-manifest.json'), manifest(profile, `benchmark-${variant.name}`, 'generator', tasks, referenceFile));
  }
  return { profile, referenceFile };
}
function main(argv = process.argv.slice(2)) {
  const flags = parseArgs(argv);
  const root = path.resolve(__dirname, '..');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(flags.output || path.join(root, '.reader-pipeline', 'zlatoust-grammar', 'benchmarks', `codex-batch-${stamp}`));
  const taskIds = flags.tasks ? String(flags.tasks).split(',') : DEFAULT_TASKS;
  const { profile, referenceFile } = prepareBenchmark(root, outputDir, taskIds);
  if (flags['dry-run']) {
    process.stdout.write(`${JSON.stringify({ mode: 'dry-run', outputDir, taskIds }, null, 2)}\n`);
    return;
  }
  const reviewer = { model: flags['reviewer-model'] || 'gpt-5.6-sol', effort: flags['reviewer-effort'] || 'high' };
  const report = { schema: 'reader-codex-batch-benchmark-v1', outputDir, taskIds, startedAt: new Date().toISOString(), results: [] };
  writeJson(path.join(outputDir, 'summary.json'), report);
  for (const variant of DEFAULT_VARIANTS) {
    try {
      report.results.push(runVariant(profile, taskIds, outputDir, referenceFile, variant, reviewer));
    } catch (error) {
      report.results.push({ variant, error: error.message });
    }
    writeJson(path.join(outputDir, 'summary.json'), report);
  }
  report.finishedAt = new Date().toISOString();
  writeJson(path.join(outputDir, 'summary.json'), report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { DEFAULT_TASKS, DEFAULT_VARIANTS, extractQ008Reference, manifest, prepareBenchmark, taskRecords };
