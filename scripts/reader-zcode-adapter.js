#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
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
    if (next && !next.startsWith('--')) flags[name] = argv[++index];
    else flags[name] = true;
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

function locateZCodeScript() {
  if (process.env.READER_ZCODE_SCRIPT) return process.env.READER_ZCODE_SCRIPT;
  if (process.platform === 'win32') {
    const located = spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      "(Get-CimInstance Win32_Process -Filter \"Name='ZCode.exe'\" | Where-Object { $_.ExecutablePath } | Select-Object -First 1 -ExpandProperty ExecutablePath)"
    ], { encoding: 'utf8' });
    const executable = String(located.stdout || '').trim();
    if (executable) {
      const candidate = path.join(path.dirname(executable), 'resources', 'glm', 'zcode.cjs');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  throw new Error('Z Code CLI script was not found. Start Z Code or set READER_ZCODE_SCRIPT.');
}

function configuredModel(configFile = path.join(os.homedir(), '.zcode', 'cli', 'config.json')) {
  if (!fs.existsSync(configFile)) throw new Error(`Missing Z Code CLI config: ${configFile}`);
  const config = readJson(configFile);
  if (typeof config.model === 'string') return config.model.split('/').at(-1);
  if (typeof config.model?.main === 'string') return config.model.main.split('/').at(-1);
  throw new Error('Z Code CLI config has no explicit main model');
}

function configuredProvider(configFile = path.join(os.homedir(), '.zcode', 'cli', 'config.json')) {
  const config = readJson(configFile);
  const selected = typeof config.model === 'string' ? config.model : config.model?.main;
  if (typeof selected !== 'string' || !selected.includes('/')) throw new Error('Z Code CLI config has no explicit provider');
  return selected.slice(0, selected.lastIndexOf('/'));
}

function assertConfiguredModel(expected, configFile, expectedProvider = null) {
  const actual = configuredModel(configFile);
  if (actual.toLowerCase() !== String(expected).toLowerCase()) {
    throw new Error(`Z Code model mismatch: expected ${expected}, configured ${actual}`);
  }
  const provider = configuredProvider(configFile);
  if (expectedProvider && provider !== expectedProvider) {
    throw new Error(`Z Code provider mismatch: expected ${expectedProvider}, configured ${provider}`);
  }
  return actual;
}

function buildBundle(manifest) {
  return manifest.tasks.map((task) => ({
    taskId: task.taskId,
    inputHash: task.inputHash,
    findings: task.findings || [],
    input: readJson(task.inputFile),
    proposedArtifact: manifest.role === 'reviewer'
      ? readJson(task.artifactFile)
      : task.proposedArtifactFile
        ? readJson(task.proposedArtifactFile)
        : undefined
  }));
}

function buildPrompt(manifest, profile, bundle) {
  const grammar = profile.adapter === 'grammar';
  const roleInstructions = manifest.role === 'reviewer'
    ? [
        '你是独立语义审查者，没有参与草稿生成。',
        '逐题核对标准答案、俄语原句、选项、教学合同和 proposedArtifact。',
        '只有语法事实正确、推理真正解释选择依据、每个干扰项有针对性且中文让学习者容易理解时才能 accept。',
        '结构完整但内容空泛也必须 reject；findings 要写明具体问题和必须怎样改。'
      ]
    : [
        `你是 ${manifest.role}，当前阶段是 ${manifest.stage}。`,
        manifest.stage === 'repair' || manifest.stage === 'escalation'
          ? '必须在 proposedArtifact 上逐条修复 findings，保留其中已经正确且完整的字段，并返回完整替换补丁；不得退回 input 里的旧解析，也不能忽略意见后重新随意生成。'
          : '为每道题生成完整、可教学的第一版解析。',
        grammar
          ? '每题返回 answerAnalysisPatch，严格满足 input.outputContract；传输格式可以紧凑，但教学内容不能缩短。'
          : '每题返回完整 answerAnalysis，严格满足 input.outputContract。'
      ];
  const outputContract = manifest.role === 'reviewer'
    ? '{"results":[{"taskId":"...","inputHash":"...","decision":"accept或reject","findings":[{"field":"...","code":"...","problem":"...","requiredFix":"..."}]}]}'
    : grammar
      ? '{"results":[{"taskId":"...","inputHash":"...","answerAnalysisPatch":{...}}]}'
      : '{"results":[{"taskId":"...","inputHash":"...","answerAnalysis":{...}}]}';
  return [
    `/skill ${manifest.requiredSkill}`,
    '你正在执行 Reader 教材生产流水线中的一个隔离角色。',
    ...roleInstructions,
    '完整保留 taskId、inputHash、标准答案、选项键和选项文字、原文引句、定位信息、练习 ID 与受保护事实。',
    '不要修改任何文件，不要调用写入或命令工具。',
    `只返回严格 JSON，不要 Markdown、代码围栏或解释文字。格式为：${outputContract}`,
    `results 必须恰好有 ${bundle.length} 项，并保持任务顺序。`,
    'TASK_BUNDLE_JSON_START',
    JSON.stringify(bundle),
    'TASK_BUNDLE_JSON_END'
  ].join('\n');
}

function parseZCodeOutput(stdout) {
  const envelope = JSON.parse(String(stdout || '').trim());
  const response = typeof envelope.response === 'string' ? envelope.response.trim() : envelope.response;
  if (response && typeof response === 'object') return { output: response, usage: envelope.usage || null };
  if (typeof response !== 'string' || !response) throw new Error('Z Code output did not contain a response');
  try {
    return { output: JSON.parse(response), usage: envelope.usage || null };
  } catch (error) {
    throw new Error(`Z Code response was not strict JSON: ${error.message}`);
  }
}

function validateResults(manifest, output) {
  if (!Array.isArray(output.results)) throw new Error('Structured output is missing results');
  if (output.results.length !== manifest.tasks.length) {
    throw new Error(`Expected ${manifest.tasks.length} results, received ${output.results.length}`);
  }
  const byId = new Map();
  for (const item of output.results) {
    if (!item || typeof item !== 'object') throw new Error('Z Code result must be an object');
    if (byId.has(item.taskId)) throw new Error(`Duplicate Z Code result: ${item.taskId}`);
    byId.set(item.taskId, item);
  }
  for (const task of manifest.tasks) {
    const item = byId.get(task.taskId);
    if (!item) throw new Error(`Z Code result missing task: ${task.taskId}`);
    if (item.inputHash !== task.inputHash) throw new Error(`Z Code inputHash mismatch: ${task.taskId}`);
    if (manifest.role === 'reviewer') {
      if (!['accept', 'reject'].includes(item.decision) || !Array.isArray(item.findings)) {
        throw new Error(`Invalid Z Code review result: ${task.taskId}`);
      }
    } else if (!item.answerAnalysisPatch && !item.answerAnalysis) {
      throw new Error(`Z Code generation result has no analysis: ${task.taskId}`);
    }
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
  const profile = readJson(path.resolve(root, manifest.profile));
  const expectedModel = options.model || process.env.READER_ZCODE_MODEL || 'glm-5.3-flash';
  const expectedProvider = options.provider || process.env.READER_ZCODE_PROVIDER || null;
  if (!options.skipModelCheck) assertConfiguredModel(expectedModel, options.configFile, expectedProvider);
  const bundle = buildBundle(manifest);
  const prompt = buildPrompt(manifest, profile, bundle);
  const command = options.command || process.execPath;
  const prefix = options.commandArgs || [options.cliScript || locateZCodeScript()];
  const result = spawnSync(command, [
    ...prefix,
    '--disallowed-tools', 'Write', 'Edit', 'Bash', 'PowerShell',
    '--cwd', root,
    '--mode', 'plan',
    '--output-format', 'json',
    '--no-color',
    '--prompt', prompt
  ], {
    cwd: root,
    shell: false,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Z Code failed (exit ${result.status}): ${String(result.stderr || result.stdout || '').trim()}`);
  const parsed = parseZCodeOutput(result.stdout);
  const byId = validateResults(manifest, parsed.output);
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
      continue;
    }
    const artifact = {
      schema: ARTIFACT_SCHEMA,
      taskId: task.taskId,
      inputHash: task.inputHash,
      provenance: { provider: 'Z Code', model: expectedModel, role: manifest.role }
    };
    if (profile.adapter === 'grammar') artifact.answerAnalysisPatch = item.answerAnalysisPatch;
    else artifact.answerAnalysis = item.answerAnalysis;
    writeJson(task.artifactFile, artifact);
  }
  return { role: manifest.role, model: expectedModel, written: manifest.tasks.length, usage: parsed.usage };
}

function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv);
  const [manifestFile] = positional;
  if (!manifestFile) {
    process.stderr.write('Usage: node scripts/reader-zcode-adapter.js [--model glm-5.3-flash] [--cli-script path] <manifest-json>\n');
    return 2;
  }
  const report = runAdapter(manifestFile, { model: flags.model, provider: flags.provider, cliScript: flags['cli-script'] });
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

module.exports = { assertConfiguredModel, buildBundle, buildPrompt, configuredModel, configuredProvider, locateZCodeScript, parseZCodeOutput, runAdapter, validateResults };
