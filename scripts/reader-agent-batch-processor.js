#!/usr/bin/env node
'use strict';

// Codex-backed batch processor. One model session shares the Skill and accepted
// reference context across several independently validated task artifacts.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const [manifestFile] = process.argv.slice(2);
if (!manifestFile) {
  process.stderr.write('Usage: node scripts/reader-agent-batch-processor.js <batch-manifest-json>\n');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestFile), 'utf8'));
if (manifest.schema !== 'reader-book-agent-batch-v1' || !Array.isArray(manifest.tasks) || !manifest.tasks.length) {
  throw new Error('Invalid or empty Reader Agent batch manifest');
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const skill = path.join(codexHome, 'skills', 'reader-question-explainer', 'SKILL.md');
const acceptedReferences = ['GL1-Q008', 'GL1-Q010', 'GL1-Q013']
  .map((id) => path.join(
    root,
    '.reader-pipeline',
    String(manifest.bookId || ''),
    'artifacts',
    `ch0000_${id}.json`
  ))
  .filter((file) => fs.existsSync(file));
const taskLines = manifest.tasks.map((task, index) => (
  `${index + 1}. ${task.taskId}\n   input: ${path.resolve(task.inputFile)}\n   artifact: ${path.resolve(task.artifactFile)}`
));
const prompt = [
  'You are the production content worker for a textbook Reader batch.',
  `Read the required Skill once at ${skill}, including only its grammar-choice protocol and quality audit references.`,
  acceptedReferences.length
    ? `Read these learner-accepted quality references once: ${acceptedReferences.join(', ')}. Match their teaching depth and natural Chinese, but never copy their task-specific claims.`
    : 'The required field list and teaching-density rules below are the complete quality authority; do not search for examples.',
  'Process every task below. Each input is the complete authority for that task and each artifact must be written to its exact path:',
  ...taskLines,
  'For each task, write one compact JSON object with schema "reader-book-pipeline-artifact-v1" and the exact taskId and inputHash. For question-explanation tasks write answerAnalysisPatch; for knowledge-card tasks write studyCard as a complete card object.',
  'Every answerAnalysisPatch must contain only: conclusion, decisionSteps, sentenceSkeleton.ru/zh, correctOptionAnalysis, distractors with every wrong live key and a specific reason, one mapping {source, option, reason}, evidenceRole, pitfall, memoryRule, and nextCheck.',
  'A studyCard must preserve id, partId, knowledgePointId, and exerciseIds exactly and include overview, decisionSteps, quickReference, lessons, rules, comparisons, examples (4-6), pitfalls, checks (3-5), and sources.',
  'decisionSteps must be an array. correctOptionAnalysis must be a plain string, never an object.',
  'Compact means compact transport, not short teaching. The host restores repetitive metadata, but every learner-facing field must be as explanatory as the accepted references.',
  'Treat existingAnalysis in an input only as a factual seed. Rewrite and deepen it; do not summarize its already-short wording.',
  'Teaching-density gate per task: conclusion >= 55 characters; combined decision-step text >= 75; correctOptionAnalysis >= 55; every distractor reason >= 75; pitfall >= 55; memoryRule >= 85; nextCheck >= 50; all learner-facing teaching text combined >= 550.',
  'Every distractor must explain why it is tempting, which exact condition fails here, and a narrow situation where that form could be valid when useful.',
  'memoryRule must include the rule boundary and a nearby contrast case. nextCheck must be an actionable decision procedure for the next similar question.',
  'Do not copy completeSentence, presentation, provenance, options, evidence quotations, locatorStatus, or _source into the patch. The host deterministically restores those protected and repetitive fields.',
  'The sentenceSkeleton must be a complete short sentence with the correct form filled in. Remove distracting titles or modifiers; do not leave blanks or ellipses.',
  'mapping.option must name the correct Russian option text, not merely its option key.',
  'Preserve every canonical answer, option key, source quotation, exercise ID, and source locator exactly. Never copy task-specific claims from the reference.',
  'Work task by task, but reuse the Skill and structural context already loaded. Do not rescan the Skill, reference, repository, pipeline directory, or production files between tasks.',
  'Do not run git status, git diff, tests, or repository-wide commands. Modify only the listed artifact files.',
  'After all files exist, run one compact validation command that reports only taskId, inputHash match, wrong-key coverage, required-field presence, and whether every teaching-density threshold passes.',
  'Do not read back or print full artifacts. Return a compact list of completed task IDs only.'
].join('\n');

let command = 'codex';
let prefix = [];
if (process.platform === 'win32') {
  const located = spawnSync('where.exe', ['codex.cmd'], { encoding: 'utf8' });
  const commandFile = String(located.stdout || '').split(/\r?\n/).find(Boolean);
  if (!commandFile) throw new Error('Codex CLI was not found on PATH');
  command = process.execPath;
  prefix = [path.join(path.dirname(commandFile), 'node_modules', '@openai', 'codex', 'bin', 'codex.js')];
}

const reasoningEffort = process.env.READER_AGENT_REASONING || 'medium';
const result = spawnSync(command, [
  ...prefix,
  'exec',
  '--ephemeral',
  '--cd', root,
  '--sandbox', 'workspace-write',
  '-c', `model_reasoning_effort="${reasoningEffort}"`,
  prompt
], {
  cwd: root,
  stdio: 'inherit',
  shell: false
});
if (result.error) process.stderr.write(`Codex batch processor failed to start: ${result.error.message}\n`);
process.exitCode = Number.isInteger(result.status) ? result.status : 1;
