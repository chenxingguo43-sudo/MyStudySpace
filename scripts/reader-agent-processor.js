#!/usr/bin/env node
'use strict';

// Optional Codex-backed processor. It is deliberately separate from the state
// runner so credentials, model choice, and approval policy stay with the host.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const [inputFile, artifactFile] = process.argv.slice(2);
if (!inputFile || !artifactFile) {
  process.stderr.write('Usage: node scripts/reader-agent-processor.js <input-json> <artifact-json>\n');
  process.exit(2);
}
const root = path.resolve(__dirname, '..');
const input = JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf8'));
const skill = process.env.CODEX_HOME
  ? path.join(process.env.CODEX_HOME, 'skills', 'reader-question-explainer', 'SKILL.md')
  : null;
const acceptedReference = path.join(
  root,
  '.reader-pipeline',
  String(input.bookId || ''),
  'artifacts',
  'ch0000_GL1-Q007.json'
);
const prompt = [
  'You are the production content worker for a textbook Reader.',
  `Read the complete task input at ${path.resolve(inputFile)}.`,
  skill ? `Read the required skill instructions at ${skill}.` : 'Load the reader-question-explainer skill available in your environment.',
  `Generate exactly one learner-facing two-layer answerAnalysis for this task and write a JSON artifact to ${path.resolve(artifactFile)}.`,
  'The artifact must contain schema "reader-book-pipeline-artifact-v1", the exact taskId and inputHash from input, and answerAnalysis satisfying outputContract.',
  'For grammar tasks, match the accepted Q007/Q008 Reader structure exactly: presentation.mode, completeSentence.ru/zh, concise conclusion, causal decisionSteps, sentenceSkeleton.ru/zh, correctOption, every distractor, options with every live key and literal correct/wrong statuses, pitfall, memoryRule, nextCheck, and source metadata.',
  fs.existsSync(acceptedReference)
    ? `For field placement only, the accepted reference artifact is ${acceptedReference}. Do not search for any other example or scan the pipeline directory.`
    : 'Do not search for example artifacts; the required field list above is the complete structure authority.',
  'sentenceSkeleton is mandatory teaching content: remove distracting titles/modifiers so the agreement or form choice becomes obvious. Do not replace it with nested defaultLayer/expandedLayer fields.',
  'Use the task input and required Skill as the authority. Do not scan the whole repository or modify any file except the requested artifact.',
  'The host already owns repository safety checks. Do not run git status, git diff, or any repository-wide command from this single-task worker.',
  'Preserve the canonical answer, option keys, and exact source evidence. Do not modify any production source file. Return only after the artifact file exists.',
  'After writing, validate with a compact field check. Do not read back, print, or include the full artifact or a full diff in the final response.'
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
const result = spawnSync(command, [...prefix, 'exec', '--ephemeral', '--cd', root, '--sandbox', 'workspace-write', prompt], {
  cwd: root, stdio: 'inherit', shell: false
});
if (result.error) process.stderr.write(`Codex processor failed to start: ${result.error.message}\n`);
process.exitCode = Number.isInteger(result.status) ? result.status : 1;
