#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PROFILE_DIR = path.join(ROOT, '.reader-pipeline', 'zlatoust-grammar');
const INPUT_DIR = path.join(PROFILE_DIR, 'inputs');
const BENCHMARK_FILE = path.join(ROOT, 'data', 'textbook', 'zlatoust_grammar', 'theory', 'explanations', 'gl1', 'gl1-q001-q013.json');
const DEFAULT_TASKS = [
  'ch0000:GL1-Q008', 'ch0000:GL1-Q085', 'ch0000:GL1-Q086', 'ch0000:GL1-Q087', 'ch0000:GL1-Q088',
  'ch0000:GL1-Q089', 'ch0000:GL1-Q090', 'ch0000:GL1-Q091', 'ch0000:GL1-Q092', 'ch0000:GL1-Q093'
];
const AGENTCHAT = 'C:/Users/梅子/.codex/skills/AgentChat-OneWeb/index.js';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}
function safeId(taskId) { return taskId.replace(/[^A-Za-z0-9_.-]+/g, '_'); }
function taskFile(taskId) { return path.join(INPUT_DIR, `${safeId(taskId)}.json`); }
function timestamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const match = value.slice(2).match(/^([^=]+)=(.*)$/s);
    if (match) { flags[match[1]] = match[2]; continue; }
    const name = value.slice(2);
    const next = argv[index + 1];
    flags[name] = next && !next.startsWith('--') ? argv[++index] : true;
  }
  return flags;
}

function benchmarkAnalysis() {
  const analysis = (readJson(BENCHMARK_FILE).explanations || []).find((item) => item.exerciseId === 'GL1-Q008');
  if (!analysis) throw new Error('找不到 GL1-Q008 标准版');
  return analysis;
}

function compactInput(input) {
  return {
    taskId: input.taskId,
    question: {
      id: input.question.id,
      type: input.question.type,
      text: input.question.question,
      options: input.question.options,
      canonicalAnswer: input.question.canonicalAnswer
    },
    textbook: {
      title: input.source?.knowledgePoint?.title || '',
      rule: input.source?.knowledgePoint?.rule || '',
      pitfalls: input.source?.knowledgePoint?.pitfalls || '',
      currentSource: input.question.existingAnalysis?._source || null
    },
    existingAnalysis: input.question.existingAnalysis || null
  };
}

function outputShape() {
  return {
    completeSentence: { ru: '', zh: '' }, conclusion: '',
    decisionSteps: [{ step: 1, text: '' }],
    sentenceSkeleton: { ru: '', zh: '' },
    correctOption: { key: '', analysis: '' },
    distractors: [{ key: '', reason: '' }],
    pitfall: '', memoryRule: '', nextCheck: '',
    _source: {
      question: { printedPage: 0, pdfPage: 0 }, answer: { printedPage: 0, pdfPage: 0 },
      rulePages: { printed: [], pdf: [] }, rules: [{ sectionId: '', ruleId: '' }]
    }
  };
}

function buildPrompt(input, benchmark) {
  return [
    '你是面向中文初学者的俄语老师。请为一道 Reader 选择题写最终候选解析。',
    'Q008 是已经由真人认可的讲解标准。学习它的讲法和完整程度，但不要照抄它的题目内容。',
    '',
    '必须做到：',
    '1. 开头用普通中文直接说答案和关键原因，学生只读这一段也能复述为什么。',
    '2. 给完整句和自然中文；再给一个真正能去掉干扰的最小句子骨架。',
    '   句子骨架必须仍是完整、自然的俄语句子，不能留下省略号、断裂的连接词或不完整残句。',
    '3. 判断步骤每一步都必须带来新信息，不能把结论换句话重复。',
    '4. 逐个解释所有错误选项：它为什么在本题不成立，什么情况下可能成立。',
    '   不得把未完成体简单等同于“习惯”；它也可能是一般请求、建议、命令或禁止，须按教材语境说明。',
    '5. 记忆规则必须写清适用范围，不能把一个提示词写成万能公式。',
    '   若教材同一节列出多个并列分支，不得把它们混成一个理由。未来警告不等于“如果当初”的过去反事实。',
    '6. nextCheck 必须是下次能实际执行的判断动作。',
    '7. 教材答案、选项文字和出处只允许原样保留，不得猜测或修改。',
    '8. 避免“固定、看到就锁定、一律、必须”等过度绝对的说法；避免同一理由反复出现。',
    '   conclusion、步骤、正确项、误区和口诀各有不同作用，不能五次重复同一条因果关系。',
    '9. 只返回 JSON，不要 Markdown，不要开场白。',
    '',
    '返回对象必须完全采用下面这些字段：',
    JSON.stringify({ taskId: input.taskId, answerAnalysis: outputShape() }),
    '<q008_standard>', JSON.stringify(benchmark), '</q008_standard>',
    '<reader_input>', JSON.stringify(compactInput(input)), '</reader_input>'
  ].join('\n');
}

function buildReviewPrompt(input, benchmark, draft) {
  return [
    '你是第二位俄语老师。请独立检查一份网页 AI 初稿是否达到 Q008 标准，并直接修好所有问题。',
    '不要因为字段齐全就判定通过。重点检查：初读是否容易懂、关键判断是否在前、句子骨架是否真的去掉干扰、',
    '每个错误项是否解释到真实区别、规则边界是否准确、下次判断方法是否可执行、是否重复、是否说得过满。',
    '句子骨架必须是完整自然的最小俄语句子；若初稿删成残句，必须补成完整结构。',
    '错误项若是未完成体，不得只说成“习惯性动作”；还要考虑一般请求、建议、命令或禁止。',
    '删除结论、步骤、正确项、误区、口诀之间的重复，让每个字段只承担自己的作用。',
    '教材答案、选项和出处不得改变。材料不足以支持某个说法时，应缩小说法或写明待核对，不能编造。',
    '特别检查是否混淆并列规则分支：普通未来警告不能说成反事实条件；只有题目本身回看过去、',
    '能改写为 если бы + 过去时的结构，才允许称为反事实条件。',
    '只返回 JSON，不要 Markdown。返回格式：',
    JSON.stringify({
      taskId: input.taskId, verdict: 'PASS 或 REVISED', score: 0,
      issues: [{ severity: 'high/medium/low', field: '', problem: '', fix: '' }],
      answerAnalysis: outputShape()
    }),
    '<q008_standard>', JSON.stringify(benchmark), '</q008_standard>',
    '<reader_input>', JSON.stringify(compactInput(input)), '</reader_input>',
    '<draft_to_review>', JSON.stringify(draft), '</draft_to_review>'
  ].join('\n');
}

function parseReceipt(stderr) {
  const line = String(stderr || '').split(/\r?\n/).find((item) => item.includes('[receipt] AGENTCHAT_RUN'));
  if (!line) return null;
  const start = line.indexOf('{');
  if (start < 0) return { raw: line };
  try { return { raw: line, ...JSON.parse(line.slice(start)) }; } catch { return { raw: line }; }
}

// Kept for the earlier pilot tests. The two-pass workflow uses
// validateAnalysis below for the stricter production-shaped check.
function validateResponse(input, response, receipt) {
  const text = String(response || '').trim();
  const compactText = text.replace(/[\s*_`]+/g, '');
  const answer = String(input.question.canonicalAnswer || '').trim();
  const answerText = (input.question.options || []).find((item) => item.key === answer)?.text || '';
  const checks = {
    nonEmpty: Boolean(text),
    hasCompleteSentence: text.includes('完整句子'),
    hasConclusion: text.includes('一句话结论'),
    hasReason: text.includes('为什么选这个'),
    hasSteps: text.includes('逐步判断'),
    hasOptionComparison: text.includes('选项对比'),
    hasMemoryMethod: text.includes('记忆方法'),
    hasPitfall: text.includes('容易误判'),
    answerMentioned: Boolean(answer && new RegExp(`(?:答案(?:是|选|为|：|:)?|选择)${answer}`).test(compactText)),
    optionTextMentioned: Boolean(answerText && text.includes(answerText)),
    receiptPresent: Boolean(receipt)
  };
  const failures = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  return { ok: failures.length === 0, checks, failures };
}

function parseJsonResponse(raw) {
  const text = String(raw || '').trim();
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, index + 1)); } catch { break; }
      }
    }
  }
  throw new Error('网页 AI 返回内容中没有可读取的 JSON');
}

function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function validateAnalysis(input, analysis) {
  const question = input.question;
  const expectedWrongKeys = (question.options || []).filter((item) => item.key !== question.canonicalAnswer).map((item) => item.key).sort();
  const actualWrongKeys = Array.isArray(analysis?.distractors) ? analysis.distractors.map((item) => item.key).sort() : [];
  const source = question.existingAnalysis?._source || null;
  const sourceRuleIds = (source?.rules || []).map((item) => item.ruleId);
  const teachingText = JSON.stringify({
    conclusion: analysis?.conclusion,
    decisionSteps: analysis?.decisionSteps,
    correctOption: analysis?.correctOption,
    distractors: analysis?.distractors,
    pitfall: analysis?.pitfall,
    memoryRule: analysis?.memoryRule,
    nextCheck: analysis?.nextCheck
  });
  const counterfactualAllowed = sourceRuleIds.some((id) => /counterfactual/i.test(id));
  const requiredTexts = [analysis?.completeSentence?.ru, analysis?.completeSentence?.zh, analysis?.conclusion,
    analysis?.sentenceSkeleton?.ru, analysis?.sentenceSkeleton?.zh, analysis?.correctOption?.analysis,
    analysis?.pitfall, analysis?.memoryRule, analysis?.nextCheck];
  const checks = {
    objectPresent: Boolean(analysis && typeof analysis === 'object'),
    requiredTextsPresent: requiredTexts.every((value) => typeof value === 'string' && value.trim()),
    stepsPresent: Array.isArray(analysis?.decisionSteps) && analysis.decisionSteps.length >= 2 && analysis.decisionSteps.length <= 4,
    correctKeyPreserved: analysis?.correctOption?.key === question.canonicalAnswer,
    distractorKeysPreserved: sameJson(actualWrongKeys, expectedWrongKeys),
    eachDistractorExplained: Array.isArray(analysis?.distractors) && analysis.distractors.every((item) => String(item.reason || '').trim().length >= 20),
    sourcePreserved: Boolean(source && sameJson(analysis?._source, source)),
    ruleBranchPreserved: counterfactualAllowed || !/反事实|если бы/i.test(teachingText),
    noProcessLeak: !/(本地文件|程序|JSON|作为\s*AI|我无法访问)/i.test(JSON.stringify(analysis || {}))
  };
  const failures = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  return { ok: failures.length === 0, checks, failures };
}

function runWeb(prompt, provider, timeoutMs) {
  const args = [AGENTCHAT, `--timeout=${timeoutMs}`, '--no-download-images'];
  if (provider && !/^auto$/i.test(provider)) args.push(`--from=${provider}`);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT, shell: false, encoding: 'utf8', input: prompt,
    timeout: Number(timeoutMs) + 60000, maxBuffer: 32 * 1024 * 1024, windowsHide: true
  });
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '');
  return {
    stdout, stderr, receipt: parseReceipt(stderr), exitCode: result.status,
    error: result.error ? result.error.message : null, durationMs: Date.now() - startedAt
  };
}

function writeWebFiles(outputDir, id, stage, prompt, call) {
  fs.writeFileSync(path.join(outputDir, `${id}.${stage}.prompt.txt`), prompt, 'utf8');
  fs.writeFileSync(path.join(outputDir, `${id}.${stage}.response.txt`), call.stdout, 'utf8');
  fs.writeFileSync(path.join(outputDir, `${id}.${stage}.stderr.txt`), call.stderr, 'utf8');
}

function runTask(taskId, outputDir, options, benchmark) {
  const input = readJson(taskFile(taskId));
  const id = safeId(taskId);
  writeJson(path.join(outputDir, `${id}.input.json`), input);
  const generationPrompt = buildPrompt(input, benchmark);
  let generation;
  if (options.resume) {
    const resumeDir = path.resolve(ROOT, options.resume);
    const stdout = fs.readFileSync(path.join(resumeDir, `${id}.generation.response.txt`), 'utf8').trim();
    const stderr = fs.readFileSync(path.join(resumeDir, `${id}.generation.stderr.txt`), 'utf8');
    generation = {
      stdout, stderr, receipt: parseReceipt(stderr), exitCode: 0,
      error: null, durationMs: 0, resumedFrom: path.relative(ROOT, resumeDir).replace(/\\/g, '/')
    };
    writeWebFiles(outputDir, id, 'generation', generationPrompt, generation);
  } else {
    generation = runWeb(generationPrompt, options.generator, options.timeout);
    writeWebFiles(outputDir, id, 'generation', generationPrompt, generation);
  }
  let draft = null;
  let draftError = generation.error;
  if (generation.exitCode === 0) {
    try { draft = parseJsonResponse(generation.stdout); } catch (error) { draftError = error.message; }
  }
  const draftAnalysis = draft?.answerAnalysis || null;
  const draftValidation = validateAnalysis(input, draftAnalysis);
  let review = null;
  let reviewError = null;
  let reviewCall = null;
  if (draftAnalysis && draftValidation.ok) {
    const reviewPrompt = buildReviewPrompt(input, benchmark, draftAnalysis);
    reviewCall = runWeb(reviewPrompt, options.reviewer, options.timeout);
    writeWebFiles(outputDir, id, 'review', reviewPrompt, reviewCall);
    if (reviewCall.exitCode === 0) {
      try { review = parseJsonResponse(reviewCall.stdout); } catch (error) { reviewError = error.message; }
    } else reviewError = reviewCall.error || `网页复核退出码 ${reviewCall.exitCode}`;
  } else reviewError = '初稿未通过固定检查，未发送复核';
  const candidate = review?.answerAnalysis || null;
  const finalValidation = validateAnalysis(input, candidate);
  const reviewVerdict = String(review?.verdict || '').toUpperCase();
  const status = reviewCall?.exitCode === 0 && ['PASS', 'REVISED'].includes(reviewVerdict) && finalValidation.ok
    ? 'candidate-ready-for-human-review' : 'needs-review';
  if (candidate) {
    writeJson(path.join(outputDir, `${id}.candidate.json`), {
      schema: 'reader-agentchat-reviewed-candidate-v1', taskId, inputHash: input.inputHash, status,
      answerAnalysis: candidate,
      review: { verdict: review?.verdict || null, score: review?.score || null, issues: review?.issues || [] }
    });
  }
  const record = {
    schema: 'reader-agentchat-two-pass-result-v1', taskId, questionId: input.question.id, status,
    generation: {
      requestedProvider: options.generator, provider: generation.receipt?.provider_used || null,
      runId: generation.receipt?.run_id || null, receipt: generation.receipt?.raw || null,
      exitCode: generation.exitCode, durationMs: generation.durationMs,
      resumedFrom: generation.resumedFrom || null, error: draftError, validation: draftValidation
    },
    review: {
      requestedProvider: options.reviewer, provider: reviewCall?.receipt?.provider_used || null,
      runId: reviewCall?.receipt?.run_id || null, receipt: reviewCall?.receipt?.raw || null,
      exitCode: reviewCall?.exitCode ?? null, durationMs: reviewCall?.durationMs ?? null,
      verdict: review?.verdict || null, score: review?.score || null,
      issueCount: Array.isArray(review?.issues) ? review.issues.length : null,
      error: reviewError, validation: finalValidation
    }
  };
  writeJson(path.join(outputDir, `${id}.result.json`), record);
  return record;
}

function buildSummary(outputDir, taskIds, results, options) {
  return {
    schema: 'reader-agentchat-two-pass-pilot-v1', outputDir: path.relative(ROOT, outputDir).replace(/\\/g, '/'),
    generator: options.generator, reviewer: options.reviewer, taskIds,
    completedGenerationCalls: results.filter((item) => item.generation.runId).length,
    completedReviewCalls: results.filter((item) => item.review.runId).length,
    candidateReady: results.filter((item) => item.status === 'candidate-ready-for-human-review').length,
    needsReview: results.filter((item) => item.status === 'needs-review').length, results
  };
}

function main(argv = process.argv.slice(2)) {
  const flags = parseArgs(argv);
  const taskIds = String(flags.tasks || DEFAULT_TASKS.join(',')).split(',').map((value) => value.trim()).filter(Boolean);
  if (!taskIds.length || taskIds.length > 10) throw new Error('试跑只允许 1 到 10 道题');
  for (const taskId of taskIds) if (!fs.existsSync(taskFile(taskId))) throw new Error(`找不到题目输入：${taskId}`);
  const options = {
    generator: String(flags.generator || flags.from || 'auto'),
    reviewer: String(flags.reviewer || 'auto'),
    timeout: String(flags.timeout || '600000'),
    resume: flags.resume ? String(flags.resume) : null
  };
  const outputDir = flags.output ? path.resolve(ROOT, flags.output) : path.join(PROFILE_DIR, 'agentchat-two-pass-pilot', timestamp());
  fs.mkdirSync(outputDir, { recursive: true });
  const benchmark = benchmarkAnalysis();
  const results = [];
  for (const taskId of taskIds) {
    process.stderr.write(`[two-pass-pilot] ${taskId}: generation -> review\n`);
    const result = runTask(taskId, outputDir, options, benchmark);
    results.push(result);
    process.stderr.write(`[two-pass-pilot] ${taskId}: ${result.status}\n`);
    writeJson(path.join(outputDir, 'summary.json'), buildSummary(outputDir, taskIds, results, options));
  }
  const summary = buildSummary(outputDir, taskIds, results, options);
  writeJson(path.join(outputDir, 'summary.json'), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  return summary.needsReview ? 2 : 0;
}

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = {
  buildPrompt, buildReviewPrompt, compactInput, parseArgs, parseJsonResponse,
  parseReceipt, validateAnalysis, validateResponse
};
