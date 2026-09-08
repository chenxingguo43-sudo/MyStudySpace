#!/usr/bin/env node
'use strict';

// AgentChat is used only as a transport/generation provider. The host pipeline
// remains responsible for validation, provenance, and writing production data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildBundle, buildPrompt } = require('./reader-claude-adapter');

const ROOT = path.resolve(__dirname, '..');
const AGENTCHAT = 'C:/Users/梅子/.codex/skills/AgentChat-OneWeb/index.js';
const ARTIFACT_SCHEMA = 'reader-book-pipeline-artifact-v1';
const BATCH_SCHEMA = 'reader-production-batch-v1';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function parseArgs(argv) {
  const flags = {}; const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) { positional.push(value); continue; }
    const key = value.slice(2); const next = argv[i + 1];
    flags[key] = next && !next.startsWith('--') ? argv[++i] : true;
  }
  return { flags, positional };
}
function parseJsonResponse(raw) {
  const text = String(raw || '').trim();
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const starts = [];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '{') starts.push(i);
  for (let i = starts.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(text.slice(starts[i])); } catch {}
  }
  throw new Error('AgentChat response did not contain readable JSON');
}
function providerName(value) {
  const key = String(value || '').toLowerCase();
  return ({ gemini: 'Gemini', doubao: 'Doubao', kimi: 'Kimi', qwen: 'Qwen', chatglm: 'ChatGLM' })[key] || String(value || 'Gemini');
}
function run() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const manifestFile = positional[0];
  if (!manifestFile) throw new Error('Usage: node scripts/reader-agentchat-adapter.js <manifest-json> [--provider gemini]');
  const manifest = readJson(path.resolve(manifestFile));
  if (manifest.schema !== BATCH_SCHEMA || !Array.isArray(manifest.tasks) || manifest.tasks.length !== 1) {
    throw new Error('AgentChat adapter requires one valid production task');
  }
  const profile = readJson(path.resolve(ROOT, manifest.profile));
  const task = manifest.tasks[0];
  const bundle = buildBundle(manifest, profile);
  const prompt = [
    buildPrompt(manifest, profile, bundle),
    '',
    'This is a web-AI generation task. Return only the requested JSON object.',
    'Do not use markdown fences. Do not add commentary before or after the JSON.',
    'The local host will verify every quotation and paragraph index before writing.'
  ].join('\n');
  const provider = providerName(flags.provider || process.env.READER_AGENTCHAT_PROVIDER || 'gemini');
  const timeout = String(flags.timeout || process.env.READER_AGENTCHAT_TIMEOUT || '900000');
  const result = spawnSync(process.execPath, [AGENTCHAT, `--only=${provider}`, `--timeout=${timeout}`, prompt], {
    cwd: ROOT, shell: false, encoding: 'utf8', timeout: Number(timeout) + 30000,
    maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
  });
  const raw = String(result.stdout || '');
  const receipt = String(result.stderr || '').split(/\r?\n/).find((line) => line.includes('[receipt] AGENTCHAT_RUN')) || '';
  const rawFile = path.join(path.dirname(task.artifactFile), `${path.basename(task.artifactFile, '.json')}.agentchat.raw.txt`);
  fs.writeFileSync(rawFile, `${raw}\n${receipt}\n`, 'utf8');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`AgentChat ${provider} failed (exit ${result.status}): ${String(result.stderr || raw).trim()}`);
  const output = parseJsonResponse(raw);
  if (!output.taskId && output.results?.length === 1) Object.assign(output, output.results[0]);
  if (output.taskId !== task.taskId) throw new Error(`AgentChat taskId mismatch: ${output.taskId || '(missing)'}`);
  if (output.inputHash !== task.inputHash) throw new Error(`AgentChat inputHash mismatch for ${task.taskId}`);
  const analysis = output.answerAnalysis || output.answerAnalysisPatch;
  if (!analysis) throw new Error('AgentChat response is missing answerAnalysis');
  writeJson(task.artifactFile, {
    schema: ARTIFACT_SCHEMA,
    taskId: task.taskId,
    inputHash: task.inputHash,
    provenance: { provider: `AgentChat/${provider}`, role: manifest.role, receipt },
    ...(output.answerAnalysis ? { answerAnalysis: output.answerAnalysis } : { answerAnalysisPatch: output.answerAnalysisPatch })
  });
  process.stdout.write(`${JSON.stringify({ role: manifest.role, provider, written: 1, receipt })}\n`);
}
try { run(); } catch (error) { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; }
