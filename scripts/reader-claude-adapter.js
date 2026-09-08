#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BATCH_SCHEMA = 'reader-production-batch-v1';
const ARTIFACT_SCHEMA = 'reader-book-pipeline-artifact-v1';
const REVIEW_SCHEMA = 'reader-production-review-v1';

function parseArgs(argv) {
  const flags = {};
  const positional = [];
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
  return { flags, positional };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

function locateClaude() {
  if (process.env.READER_CLAUDE_COMMAND) return process.env.READER_CLAUDE_COMMAND;
  if (process.platform !== 'win32') return 'claude';
  const located = spawnSync('where.exe', ['claude.cmd'], { encoding: 'utf8' });
  const wrapper = String(located.stdout || '').split(/\r?\n/).find(Boolean);
  if (!wrapper) throw new Error('Claude Code was not found on PATH');
  const native = path.join(path.dirname(wrapper), 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  if (!fs.existsSync(native)) throw new Error(`Claude Code native executable was not found: ${native}`);
  return native;
}

function outputSchema(role, grammar) {
  const common = {
    type: 'object',
    properties: {
      taskId: { type: 'string' },
      inputHash: { type: 'string' }
    },
    required: ['taskId', 'inputHash'],
    additionalProperties: false
  };
  const item = role === 'reviewer'
    ? {
        ...common,
        properties: {
          ...common.properties,
          decision: { type: 'string', enum: ['accept', 'reject'] },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                code: { type: 'string' },
                problem: { type: 'string' },
                requiredFix: { type: 'string' }
              },
              required: ['code', 'problem'],
              additionalProperties: false
            }
          }
        },
        required: [...common.required, 'decision', 'findings']
      }
    : {
        ...common,
        properties: {
          ...common.properties,
          [grammar ? 'answerAnalysisPatch' : 'answerAnalysis']: { type: 'object' }
        },
        required: [...common.required, grammar ? 'answerAnalysisPatch' : 'answerAnalysis']
      };
  return {
    type: 'object',
    properties: {
      results: { type: 'array', items: item }
    },
    required: ['results'],
    additionalProperties: false
  };
}

function buildBundle(manifest, profile) {
  return manifest.tasks.map((task) => ({
    taskId: task.taskId,
    inputHash: task.inputHash,
    findings: task.findings || [],
    input: compactTaskInput(readJson(task.inputFile)),
    proposedArtifact: manifest.role === 'reviewer'
      ? readJson(task.artifactFile)
      : task.proposedArtifactFile
        ? readJson(task.proposedArtifactFile)
        : undefined
  }));
}

function compactTaskInput(input) {
  const source = input.source || {};
  const point = source.knowledgePoint || {};
  const question = input.question || {};
  const existing = question.existingAnalysis || {};
  const teachingAnalysis = typeof existing === 'string'
    ? existing
    : Object.fromEntries(Object.entries(existing).filter(([key]) => key !== '_source'));
  return {
    schema: input.schema,
    bookId: input.bookId,
    taskId: input.taskId,
    taskType: input.taskType,
    requiredSkill: input.requiredSkill,
    source: {
      chapterTitle: source.chapterTitle,
      original: source.original,
      translated: source.translated,
      sourcePages: source.sourcePages,
      sourceBook: source.sourceBook,
      knowledgePoint: {
        id: point.id,
        title: point.title,
        rule: point.rule,
        pitfalls: point.pitfalls,
        // The pipeline owns this contract at the source level. Keep a copy
        // beside the point for older adapters while exposing the canonical
        // source field below.
        conceptContract: source.conceptContract || point.conceptContract
      },
      conceptContract: source.conceptContract,
      exercises: input.taskType === 'knowledge-card' ? (source.exercises || []) : undefined
    },
    question: {
      type: question.type,
      id: question.id,
      question: question.question,
      zhQuestion: question.zhQuestion,
      options: question.options,
      zhOptions: question.zhOptions,
      canonicalAnswer: question.canonicalAnswer,
      answerSource: question.answerSource,
      answerNotice: question.answerNotice
    },
    existingAnalysis: teachingAnalysis,
    existingCard: input.taskType === 'knowledge-card' ? input.existingCard : undefined,
    // Version-2 production preserves this card on the host and generates
    // only the new teaching layer. Sending the full legacy card back to the
    // model needlessly makes the response both slower and less reliable.
    legacyCard: input.taskType === 'knowledge-card' && input.outputContract?.teachingNarrativeVersion !== 2
      ? input.legacyCard
      : undefined,
    outputContract: input.outputContract
  };
}

function buildPrompt(manifest, profile, bundle) {
  const grammar = profile.adapter === 'grammar';
  const reading = profile.adapter === 'b2-reading';
  const hasCards = bundle.some((item) => item.input?.taskType === 'knowledge-card');
  const roleInstruction = manifest.role === 'reviewer'
    ? [
        'Act as an independent semantic reviewer. You did not author the proposed artifact.',
        'For each task, compare the canonical answer, exact source, options, required teaching contract, and proposed artifact.',
        'Accept only when the explanation is factually correct, teaches the real decision, diagnoses every distractor specifically, and is genuinely understandable to the learner.',
        'Reject shallow but structurally valid text. Each rejection finding must state the concrete defect and required correction.',
        hasCards ? 'For knowledge-card tasks, also verify exact knowledgePointId and exerciseIds, reviewStatus, required lesson/rule/example/check/source arrays, source labels, and that the card teaches a reusable decision rather than merely summarizing answers.' : ''
      ]
    : [
        `Act as the ${manifest.role} for stage ${manifest.stage}.`,
        `Use the ${manifest.requiredSkill} Skill available in this project as the teaching authority.`,
        manifest.stage === 'repair' || manifest.stage === 'escalation'
          ? 'Repair every supplied finding in proposedArtifact explicitly. Preserve all already-correct fields and return a complete replacement patch; do not fall back to the older input analysis or regenerate blindly.'
          : 'Produce the first complete teaching draft for every task.',
        hasCards
          ? 'For knowledge-card tasks, follow the input outputContract and reader-knowledge-teacher rules. When teachingNarrativeVersion is 2, return only the complete teachingNarrative layer; the host preserves and merges the existing evidence-backed card. For other knowledge cards, return a complete studyCard object. For question-explanation tasks in the same batch, return answerAnalysisPatch as usual.'
        : grammar
          ? 'Return answerAnalysisPatch for each task. Follow the input outputContract exactly; compact transport must still meet every teaching-depth threshold.'
          : reading
            ? 'Return a complete answerAnalysis for each task. Read the full source.original article before deciding. Follow reading-evidence-discovery and reading-evidence-protocol: use exact evidenceItems with paragraphIndex, a compact source-to-option mapping, every live option with one correct status and specific wrong-option reasons, conditional pitfall, nextCheck, locatorStatus, provenance, and presentation.mode="two-layer".'
            : 'Return a complete answerAnalysis for each task. Follow the input outputContract exactly.'
      ];
  return [
    'You are one isolated role in a provider-neutral Reader textbook production pipeline.',
    ...roleInstruction,
    'Preserve every taskId, inputHash, canonical answer, option key/text, quotation, locator, exercise ID, and protected source fact exactly.',
    'Do not modify files. Do not return prose outside the requested structured output.',
    `Return exactly ${bundle.length} results in the same task order.`,
    'TASK_BUNDLE_JSON_START',
    JSON.stringify(bundle),
    'TASK_BUNDLE_JSON_END'
  ].join('\n');
}

function parseClaudeOutput(stdout) {
  const envelope = JSON.parse(String(stdout || '').trim());
  if (envelope.structured_output && typeof envelope.structured_output === 'object') return envelope.structured_output;
  if (envelope.result && typeof envelope.result === 'object') return envelope.result;
  if (typeof envelope.result === 'string') return JSON.parse(envelope.result);
  if (Array.isArray(envelope.results)) return envelope;
  throw new Error('Claude Code output did not contain structured_output');
}

function validateResults(manifest, output) {
  if (!Array.isArray(output.results)) throw new Error('Structured output is missing results');
  if (output.results.length !== manifest.tasks.length) {
    throw new Error(`Expected ${manifest.tasks.length} results, received ${output.results.length}`);
  }
  const byId = new Map();
  for (const result of output.results) {
    if (byId.has(result.taskId)) throw new Error(`Duplicate provider result: ${result.taskId}`);
    byId.set(result.taskId, result);
  }
  for (const task of manifest.tasks) {
    const result = byId.get(task.taskId);
    if (!result) throw new Error(`Provider result missing task: ${task.taskId}`);
    if (result.inputHash !== task.inputHash) throw new Error(`Provider inputHash mismatch: ${task.taskId}`);
  }
  return byId;
}

function runAdapter(manifestFile, options = {}) {
  const root = path.resolve(__dirname, '..');
  const manifest = readJson(path.resolve(manifestFile));
  if (manifest.schema !== BATCH_SCHEMA || !Array.isArray(manifest.tasks) || !manifest.tasks.length) {
    throw new Error('Invalid or empty Reader production manifest');
  }
  if (!['generator', 'reviewer', 'escalation'].includes(manifest.role)) throw new Error(`Unsupported role: ${manifest.role}`);
  const profileFile = path.resolve(root, manifest.profile);
  const profile = readJson(profileFile);
  const grammar = profile.adapter === 'grammar';
  const bundle = buildBundle(manifest, profile);
  const model = options.model || process.env.READER_CLAUDE_MODEL || 'opus';
  const effort = options.effort || process.env.READER_CLAUDE_EFFORT || 'high';
  const command = options.command || locateClaude();
  const prefix = options.commandArgs || [];
  const result = spawnSync(command, [
    ...prefix,
    '-p', buildPrompt(manifest, profile, bundle),
    '--model', model,
    '--effort', effort,
    '--permission-mode', 'dontAsk',
    '--tools', 'Read',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(outputSchema(manifest.role, grammar)),
    '--no-session-persistence'
  ], {
    cwd: root,
    shell: false,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Claude Code failed (exit ${result.status}): ${String(result.stderr || '').trim()}`);
  const output = parseClaudeOutput(result.stdout);
  const byId = validateResults(manifest, output);
  for (const task of manifest.tasks) {
    const item = byId.get(task.taskId);
    if (manifest.role === 'reviewer') {
      writeJson(task.reviewFile, {
        schema: REVIEW_SCHEMA,
        taskId: task.taskId,
        inputHash: task.inputHash,
        decision: item.decision,
        findings: item.findings
      });
    } else {
      const artifact = {
        schema: ARTIFACT_SCHEMA,
        taskId: task.taskId,
        inputHash: task.inputHash,
        provenance: { provider: 'Claude Code', model, role: manifest.role }
      };
      if (grammar) artifact.answerAnalysisPatch = item.answerAnalysisPatch;
      else artifact.answerAnalysis = item.answerAnalysis;
      writeJson(task.artifactFile, artifact);
    }
  }
  return { role: manifest.role, model, written: manifest.tasks.length };
}

function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv);
  const [manifestFile] = positional;
  if (!manifestFile) {
    process.stderr.write('Usage: node scripts/reader-claude-adapter.js [--model opus] [--effort high] <manifest-json>\n');
    return 2;
  }
  const report = runAdapter(manifestFile, { model: flags.model, effort: flags.effort });
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildBundle, buildPrompt, compactTaskInput, locateClaude, outputSchema, parseClaudeOutput, runAdapter, validateResults };
