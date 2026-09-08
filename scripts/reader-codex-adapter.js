#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildBundle, buildPrompt, outputSchema, validateResults } = require('./reader-claude-adapter');

const BATCH_SCHEMA = 'reader-production-batch-v1';
const ARTIFACT_SCHEMA = 'reader-book-pipeline-artifact-v1';
const REVIEW_SCHEMA = 'reader-production-review-v1';
const MAX_BATCH_TASKS = 8;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}
function locateCodex() {
  if (process.env.READER_CODEX_COMMAND) return process.env.READER_CODEX_COMMAND;
  if (process.platform !== 'win32') return 'codex';
  const found = spawnSync('where.exe', ['codex.cmd'], { encoding: 'utf8' });
  const wrapper = String(found.stdout || '').split(/\r?\n/).find(Boolean);
  if (!wrapper) throw new Error('Codex CLI was not found on PATH');
  const candidate = path.join(path.dirname(wrapper), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  if (!fs.existsSync(candidate)) throw new Error(`Codex CLI script was not found: ${candidate}`);
  return process.execPath;
}
function locatePrefix(command) {
  if (command === process.execPath && process.platform === 'win32') {
    const found = spawnSync('where.exe', ['codex.cmd'], { encoding: 'utf8' });
    const wrapper = String(found.stdout || '').split(/\r?\n/).find(Boolean);
    return wrapper ? [path.join(path.dirname(wrapper), 'node_modules', '@openai', 'codex', 'bin', 'codex.js')] : [];
  }
  return [];
}
function parseOutput(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  try { return JSON.parse(raw); } catch {}
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(lines[index]); } catch {}
  }
  throw new Error('Codex output was not strict JSON');
}
function codexIsolationArgs(options = {}) {
  if (options.ignoreUserConfig === true) return ['--ignore-user-config'];
  return [
    '--disable', 'plugins',
    '--disable', 'remote_plugin',
    '--disable', 'browser_use',
    '--disable', 'computer_use',
    '-c', 'mcp_servers.node_repl.enabled=false'
  ];
}
function parseTokenUsage(output) {
  const matches = [...String(output || '').matchAll(/tokens used\s*\r?\n?\s*([\d,]+)/gi)];
  if (!matches.length) return null;
  return Number(matches[matches.length - 1][1].replace(/,/g, ''));
}
function strictSchema(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const result = { ...value };
  if (result.type === 'object' && result.properties) result.additionalProperties = false;
  if (result.properties && typeof result.properties === 'object') {
    result.properties = Object.fromEntries(Object.entries(result.properties).map(([key, child]) => [key, strictSchema(child)]));
  }
  if (result.items) result.items = strictSchema(result.items);
  return result;
}
function grammarPatchSchema(options = {}) {
  const text = { type: 'string' };
  const sentence = { type: 'object', properties: { ru: text, zh: text }, required: ['ru', 'zh'], additionalProperties: false };
  const step = { type: 'object', properties: { step: { anyOf: [{ type: 'integer' }, { type: 'string' }] }, text }, required: ['step', 'text'], additionalProperties: false };
  const correctOption = { type: 'object', properties: { key: text, analysis: text }, required: ['key', 'analysis'], additionalProperties: false };
  const distractor = { type: 'object', properties: { key: text, reason: text }, required: ['key', 'reason'], additionalProperties: false };
  const properties = {
    completeSentence: sentence, conclusion: text, decisionSteps: { type: 'array', items: step }, sentenceSkeleton: sentence,
    correctOption, distractors: { type: 'array', items: distractor }, memoryRule: text, pitfall: text, nextCheck: text,
    contrast: text, learnerSummary: text
  };
  if (options.contentBased) {
    delete properties.contrast;
    delete properties.learnerSummary;
  }
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
function compactGrammarPatchSchema(options = {}) {
  const includeCompleteSentence = options.includeCompleteSentence === true;
  const text = { type: 'string' };
  const step = { type: 'object', properties: { step: { anyOf: [{ type: 'integer' }, { type: 'string' }] }, text }, required: ['step', 'text'], additionalProperties: false };
  const distractor = { type: 'object', properties: { key: text, reason: text }, required: ['key', 'reason'], additionalProperties: false };
  const mapping = { type: 'object', properties: { source: text, option: text, reason: text }, required: ['source', 'option', 'reason'], additionalProperties: false };
  const sentence = { type: 'object', properties: { ru: text, zh: text }, required: ['ru', 'zh'], additionalProperties: false };
  const properties = {
    conclusion: text,
    decisionSteps: { type: 'array', items: step },
    sentenceSkeleton: sentence,
    correctOptionAnalysis: text,
    distractors: { type: 'array', items: distractor },
    mapping,
    evidenceRole: text,
    pitfall: text,
    memoryRule: text,
    nextCheck: text
  };
  if (includeCompleteSentence) properties.completeSentence = sentence;
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

function requiresCompleteSentenceRepair(findings = []) {
  const text = findings.map((finding) => `${finding?.code || ''} ${finding?.problem || ''}`).join(' ');
  return /(complete.?sentence|translat|译文|翻译|中文翻译|zh[-_]?mismatch)/i.test(text);
}

function carryForwardCompleteSentence(task, patch) {
  if (patch.completeSentence?.ru && patch.completeSentence?.zh) return patch;
  if (!task.proposedArtifactFile || !fs.existsSync(task.proposedArtifactFile)) return patch;
  const proposed = readJson(task.proposedArtifactFile);
  const sentence = proposed.answerAnalysis?.completeSentence || proposed.answerAnalysisPatch?.completeSentence;
  if (sentence?.ru && sentence?.zh) patch.completeSentence = JSON.parse(JSON.stringify(sentence));
  return patch;
}
function readingAnalysisSchema() {
  const text = { type: 'string' };
  const clue = { type: 'object', properties: { ru: text, zh: text }, required: ['ru', 'zh'], additionalProperties: false };
  const step = { type: 'object', properties: { label: text, text }, required: ['label', 'text'], additionalProperties: false };
  const evidenceItem = {
    type: 'object',
    properties: { id: text, paragraphIndex: { type: 'integer' }, quoteRu: text, quoteZh: text, role: text },
    required: ['id', 'paragraphIndex', 'quoteRu', 'quoteZh', 'role'],
    additionalProperties: false
  };
  const mapping = { type: 'object', properties: { source: text, option: text, reason: text }, required: ['source', 'option', 'reason'], additionalProperties: false };
  const option = {
    type: 'object',
    properties: { key: text, status: { type: 'string', enum: ['correct', 'wrong'] }, terms: { type: 'array', items: text }, reason: text },
    required: ['key', 'status', 'terms', 'reason'],
    additionalProperties: false
  };
  const properties = {
    version: text,
    presentation: { type: 'object', properties: { mode: text, status: text }, required: ['mode', 'status'], additionalProperties: false },
    provenance: { type: 'object', properties: { kind: text, provider: text, runId: text, reviewStatus: text }, required: ['kind', 'provider', 'runId', 'reviewStatus'], additionalProperties: false },
    conclusion: text,
    questionFocus: text,
    keyClues: { type: 'array', items: clue },
    reasoningSteps: { type: 'array', items: step },
    correctReason: text,
    evidence: { type: 'object', properties: { ru: text, zh: text }, required: ['ru', 'zh'], additionalProperties: false },
    evidenceItems: { type: 'array', items: evidenceItem },
    contextEvidence: {
      type: 'object',
      properties: { paragraphIndex: { type: 'integer' }, quote: text, quoteZh: text, explanation: text, role: text },
      required: ['paragraphIndex', 'quote', 'quoteZh', 'explanation', 'role'],
      additionalProperties: false
    },
    mappings: { type: 'array', items: mapping },
    options: { type: 'array', items: option },
    pitfall: text,
    nextCheck: text,
    locatorStatus: { type: 'string', enum: ['exact', 'paragraph', 'unavailable'] }
  };
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
function reviewerResponseSchema() {
  const finding = { type: 'object', properties: { code: { type: 'string' }, problem: { type: 'string' } }, required: ['code', 'problem'], additionalProperties: false };
  const item = { type: 'object', properties: { taskId: { type: 'string' }, inputHash: { type: 'string' }, decision: { type: 'string', enum: ['accept', 'reject'] }, findings: { type: 'array', items: finding } }, required: ['taskId', 'inputHash', 'decision', 'findings'], additionalProperties: false };
  return { type: 'object', properties: { results: { type: 'array', items: item } }, required: ['results'], additionalProperties: false };
}

function compactBundleForCodex(manifest, profile, bundle) {
  if (manifest.compactPromptInput !== true || profile.adapter !== 'grammar' || manifest.transportMode !== 'compact-grammar-v1') return bundle;
  return bundle.map((item) => {
    const existing = item.input.existingAnalysis || {};
    const compactInput = {
      ...item.input,
      existingAnalysis: {
        completeSentence: existing.completeSentence,
        conclusion: existing.conclusion
      }
    };
    if (manifest.role !== 'reviewer' || !item.proposedArtifact?.answerAnalysis) {
      return { ...item, input: compactInput };
    }
    const analysis = item.proposedArtifact.answerAnalysis;
    return {
      ...item,
      input: compactInput,
      proposedArtifact: {
        schema: item.proposedArtifact.schema,
        taskId: item.proposedArtifact.taskId,
        inputHash: item.proposedArtifact.inputHash,
        answerAnalysis: {
          completeSentence: analysis.completeSentence,
          conclusion: analysis.conclusion,
          decisionSteps: analysis.decisionSteps,
          sentenceSkeleton: analysis.sentenceSkeleton,
          correctOption: analysis.correctOption,
          distractors: analysis.distractors,
          mappings: analysis.mappings,
          pitfall: analysis.pitfall,
          memoryRule: analysis.memoryRule,
          nextCheck: analysis.nextCheck,
          _source: analysis._source
        }
      }
    };
  });
}

function studyCardSchema() {
  // Strict response schemas used by the proxy cannot contain an open-ended
  // object. Carry the rich card as JSON text, then parse it in the host.
  return { type: 'string' };
}
function teachingNarrativeSchema() {
  // Like studyCardSchema, accept JSON text so the provider strict schema does
  // not have to enumerate an evolving teaching-narrative object.
  return { type: 'string' };
}
function validateManifest(manifest) {
  if (manifest.schema !== BATCH_SCHEMA || !Array.isArray(manifest.tasks) || !manifest.tasks.length) {
    throw new Error('Invalid or empty Reader production manifest');
  }
  if (manifest.tasks.length > MAX_BATCH_TASKS) {
    throw new Error(`Codex adapter supports at most ${MAX_BATCH_TASKS} tasks per invocation`);
  }
  const taskIds = manifest.tasks.map((task) => String(task.taskId || ''));
  if (taskIds.some((taskId) => !taskId) || new Set(taskIds).size !== taskIds.length) {
    throw new Error('Codex adapter requires unique non-empty task IDs');
  }
}
function normalizeProviderHashes(manifest, output) {
  if (!Array.isArray(output.results) || output.results.length !== manifest.tasks.length) return false;
  const expected = new Map(manifest.tasks.map((task) => [task.taskId, task.inputHash]));
  const seen = new Set();
  for (const result of output.results) {
    if (!expected.has(result.taskId) || seen.has(result.taskId)) return false;
    seen.add(result.taskId);
  }
  for (const result of output.results) result.inputHash = expected.get(result.taskId);
  return seen.size === expected.size;
}
function compactGrammarInstructions(options = {}) {
  const restoredFields = ['presentation', 'provenance', 'options', 'source metadata', 'contrast', 'learnerSummary'];
  if (!options.includeCompleteSentence) restoredFields.unshift('completeSentence');
  const instructions = [
    'Use compact grammar transport. The host restores protected and repetitive fields.',
    `Do not return ${restoredFields.join(', ')}.`,
    'Teaching minimums per task: conclusion 55 characters; combined decisionSteps 75; correctOptionAnalysis 55; every distractor reason 75; pitfall 55; memoryRule 85; nextCheck 50; all learner-facing teaching text combined 550.',
    'Each distractor must name why it is tempting, the exact condition that fails here, and a narrow valid contrast when useful.',
    'memoryRule must include the rule boundary and a nearby contrast. nextCheck must be an actionable procedure.',
    'mapping.option must contain the correct Russian option text, not only its key.'
  ];
  if (options.includeCompleteSentence) {
    instructions.push('This repair includes a complete-sentence translation defect. Return completeSentence with the exact protected Russian sentence and a faithful Chinese translation; do not preserve the old Chinese translation.');
  }
  return instructions.join('\n');
}

function grammarDraftQualityInstructions(options = {}) {
  return [
    options.contentBased
      ? grammarContentInstructions()
      : 'Every returned grammar draft must satisfy all minimum lengths: conclusion at least 55 Chinese characters; combined decisionSteps at least 75 characters; correctOption analysis at least 55 characters; every distractor reason at least 75 characters; pitfall at least 55 characters; memoryRule at least 85 characters; nextCheck at least 50 characters; combined learner-facing teaching text at least 550 characters.',
    'Always return completeSentence.ru and completeSentence.zh, using the exact completed Russian sentence and a faithful Chinese translation, even when no existing analysis is supplied.',
    'Before returning each grammar draft, audit every Russian phrase or contrast example for natural grammar, word choice, collocation, and intended meaning.',
    'Use only high-confidence, conventional Russian examples. If a contrast example is uncertain or unnecessary, explain the governing case or preposition directly instead of inventing a sentence.',
    'Keep Chinese teaching prose in natural Chinese. Do not insert Russian meta-words such as смысл or здесь where Chinese wording is clearer.',
    'When contrasting another construction, describe its meaning and boundary accurately; do not narrow a common verb meaning into a misleading special meaning merely to separate options.',
    'Do not add examples just to increase length. Every example must help distinguish a live option in this exact question.'
  ].join('\n');
}

function grammarContentInstructions() {
  return [
    'Apply the Reader question-explainer two-layer standard by teaching content, not character counts. There are no per-field length quotas. Shorter is acceptable only when the reasoning is complete.',
    'conclusion: answer and one decisive causal link. decisionSteps: one to three actions that each add a new clue or eliminate an alternative; never repeat the conclusion as steps.',
    'completeSentence: completed Russian and faithful Chinese. sentenceSkeleton: the smallest sufficient grammatical clue. correctOption.analysis: explain the connection from that clue to the form, without restating every step.',
    'distractors: explain every live alternative specifically. Say what makes it tempting and what condition differs in this sentence. Never replace reasoning with "wrong form", "context", or an unexplained grammar label.',
    'pitfall: one plausible error path. memoryRule: the narrow rule boundary, with a reliable nearby contrast when useful. nextCheck: one actionable check, not another summary.',
    'Keep the canonical textbook answer. When another option is natural under a different reading or context, acknowledge that boundary; do not invent missing context or falsely claim only the keyed form can ever be grammatical.',
    'A missing time word does not rule out past tense. Textbook answer, source rule, and inferred reading must be distinguished. If the supplied source cannot support a unique reading, state the uncertainty instead of forcing an elimination.',
    'For repair, correct every supplied defect, keep already-correct reasoning, and remove padding. Do not add repeated sections merely to satisfy an old word-count finding.'
  ].join('\n');
}

function deduplicateGrammarBundle(bundle) {
  return bundle.map((item) => {
    const artifact = item.proposedArtifact;
    const original = artifact?.answerAnalysis;
    if (!original) return item;
    const analysis = { ...original };
    const expected = [
      ...(original.correctOption ? [{ key: original.correctOption.key, status: 'correct', reason: original.correctOption.analysis }] : []),
      ...(original.distractors || []).map((x) => ({ key: x.key, status: 'wrong', reason: x.reason }))
    ];
    // Remove only exact compatibility copies. Conflicting or extra fields must
    // remain visible to the reviewer, along with all source evidence.
    if (Array.isArray(original.options) && original.options.length === expected.length
      && new Set(original.options.map((x) => x.key)).size === expected.length
      && original.options.every((x) => Object.keys(x).every((k) => ['key', 'status', 'reason'].includes(k))
        && expected.some((y) => x.key === y.key && x.status === y.status && x.reason === y.reason))) {
      delete analysis.options;
    }
    return { ...item, proposedArtifact: { ...artifact, answerAnalysis: analysis } };
  });
}
function qualityReferenceInstructions(manifest, root) {
  if (!manifest.qualityReferenceFile) return '';
  const file = path.resolve(root, manifest.qualityReferenceFile);
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Quality reference must stay inside the repository');
  const source = readJson(file);
  const taskId = manifest.qualityReferenceTaskId;
  const reference = taskId && Array.isArray(source.explanations)
    ? source.explanations.find((item) => item.exerciseId === taskId)
    : source;
  if (!reference) throw new Error(`Quality reference task was not found: ${taskId}`);
  const { presentation, provenance, _source, ...teachingReference } = reference;
  return [
    'Use this learner-accepted example only as a quality and teaching-depth reference. Do not copy its task-specific claims.',
    'QUALITY_REFERENCE_JSON_START',
    JSON.stringify(teachingReference),
    'QUALITY_REFERENCE_JSON_END'
  ].join('\n');
}

function reviewerQualityInstructions() {
  return [
    'Audit every Russian sentence and contrast example for natural grammar, word choice, collocation, and meaning.',
    'Reject invented Russian examples that sound unnatural or doubtful, even when the canonical answer itself is correct. Prefer source-bound explanation over uncertain invented examples.',
    'Reject avoidable repetition when the conclusion, steps, option analysis, pitfall, and memory rule merely restate the same reason instead of adding a new decision aid.',
    'Reject Chinese teaching prose that contains unnecessary Russian meta-words where ordinary Chinese is clearer.',
    'Audit every claimed contrast meaning for false absolutes or misleading narrowing. A distractor explanation must say why it fails with this verb, not falsely claim that the form has only one meaning everywhere.',
    'For teachingNarrative v2, reject any section whose check lacks both diagnostic feedback and a changed-context retry with an answer or judging basis. Reject narratives that omit intro, alter protected textbook quotations/options/forms, cite sources or page numbers absent from the input, or use invented statistics/absolute aspect rules.',
    'For every formal exercise, inspect every live distractor rather than accepting a generic “wrong/context” explanation. Require the tempting reading, the missing or contradicted condition here, and a narrow valid context when one exists.'
  ].join('\n');
}
function runAdapter(manifestFile, options = {}) {
  const root = path.resolve(__dirname, '..');
  const manifest = readJson(path.resolve(manifestFile));
  validateManifest(manifest);
  const profile = readJson(path.resolve(root, manifest.profile));
  const contentBased = profile.adapter === 'grammar' && profile.grammarTeachingMode === 'content-v1';
  const model = options.model || process.env.READER_CODEX_MODEL || 'gpt-5.6-terra';
  const effort = options.effort || process.env.READER_CODEX_EFFORT || (manifest.role === 'generator' ? 'medium' : 'high');
  const outputFile = path.join(os.tmpdir(), `reader-codex-${process.pid}-${Date.now()}.json`);
  const schemaFile = path.join(os.tmpdir(), `reader-codex-${process.pid}-${Date.now()}.schema.json`);
  const completeSentenceRepair = manifest.role !== 'reviewer'
    && manifest.transportMode === 'compact-grammar-v1'
    && manifest.tasks.some((task) => requiresCompleteSentenceRepair(task.findings));
  const hasCardTasks = manifest.tasks.some((task) => {
    try { return readJson(task.inputFile).taskType === 'knowledge-card'; } catch { return false; }
  });
  const hasV2CardTasks = manifest.tasks.some((task) => {
    try { return readJson(task.inputFile).outputContract?.teachingNarrativeVersion === 2; } catch { return false; }
  });
  const cardResultSchemas = [
    { type: 'object', properties: { taskId: { type: 'string' }, inputHash: { type: 'string' }, studyCard: studyCardSchema() }, required: ['taskId', 'inputHash', 'studyCard'], additionalProperties: false },
    { type: 'object', properties: { taskId: { type: 'string' }, inputHash: { type: 'string' }, answerAnalysisPatch: compactGrammarPatchSchema() }, required: ['taskId', 'inputHash', 'answerAnalysisPatch'], additionalProperties: false }
  ];
  if (hasV2CardTasks) {
    cardResultSchemas.unshift({
      type: 'object',
      properties: { taskId: { type: 'string' }, inputHash: { type: 'string' }, teachingNarrative: teachingNarrativeSchema() },
      required: ['taskId', 'inputHash', 'teachingNarrative'],
      additionalProperties: false
    });
  }
  const responseSchema = manifest.role === 'reviewer'
    ? reviewerResponseSchema()
    : hasCardTasks
      ? { type: 'object', properties: { results: { type: 'array', items: { anyOf: cardResultSchemas } } }, required: ['results'], additionalProperties: false }
    : profile.adapter === 'grammar'
      ? { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { taskId: { type: 'string' }, inputHash: { type: 'string' }, answerAnalysisPatch: manifest.transportMode === 'compact-grammar-v1' ? compactGrammarPatchSchema({ includeCompleteSentence: completeSentenceRepair }) : grammarPatchSchema({ contentBased }) }, required: ['taskId', 'inputHash', 'answerAnalysisPatch'], additionalProperties: false } } }, required: ['results'], additionalProperties: false }
      : profile.adapter === 'b2-reading'
        ? { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { taskId: { type: 'string' }, inputHash: { type: 'string' }, answerAnalysis: readingAnalysisSchema() }, required: ['taskId', 'inputHash', 'answerAnalysis'], additionalProperties: false } } }, required: ['results'], additionalProperties: false }
        : outputSchema(manifest.role, false);
  fs.writeFileSync(schemaFile, `${JSON.stringify(strictSchema(responseSchema))}\n`, 'utf8');
  const command = options.command || locateCodex();
  const prefix = options.commandArgs || locatePrefix(command);
  let bundle = compactBundleForCodex(manifest, profile, buildBundle(manifest, profile));
  if (contentBased) bundle = deduplicateGrammarBundle(bundle);
  const promptParts = [buildPrompt(manifest, profile, bundle)];
  if (profile.adapter === 'grammar' && manifest.transportMode === 'compact-grammar-v1') {
    promptParts.push(compactGrammarInstructions({ includeCompleteSentence: completeSentenceRepair }));
  }
  if (hasCardTasks) {
    promptParts.push([
      'This batch may contain two task types. For every task whose input.taskType is knowledge-card, return the required JSON-encoded teaching object, not answerAnalysisPatch. The host will parse the string.',
      'For outputContract.teachingNarrativeVersion=2, return teachingNarrative only, as a JSON-encoded string. The host preserves every other evidence-backed field from legacyCard. It must have version=2, progressKey=teachingV2, status=accepted, a non-empty intro, concept-first sections (at least four), one primary mapping for every exerciseId, neighboringScope.covered plus a nonempty handOff, transferTasks, and section-level feedback and changed-context retry. Every section.check must contain learner-diagnostic feedback (name the mistaken step or condition) and a changed-context retry with answer or judging basis. Do not make sections mirror question IDs; teach the complete concept even when formal exercises are hidden.',
      'Treat all textbook question text, options, canonical answers, exercise IDs, quotations, sourceBook values, and page locators as protected evidence. Preserve them exactly in the merged card. Never silently complete ellipses, change formal/informal or singular/plural forms, repair spelling inside a source quotation, or substitute a different option. Any rewritten or invented example must be labeled as 学习补充 and must not carry a textbook source locator.',
      'Use only source files, quotations, pages, and locators present in the task input. Do not invent filenames, books, chapters, page numbers, or statistics. If a claim cannot be supported by supplied evidence, state it as a bounded teaching inference or label it 学习补充 without a fabricated citation.',
      'For every formal exercise and every live distractor option, include a specific diagnosis: why the option is tempting, which condition is missing or contradicted in this sentence, and the narrow context where it could work if applicable. Do not replace this with “wrong”, “看语境”, or a bare grammar label.',
      'Avoid absolute aspect rules and unsupported exam percentages. State boundaries explicitly: imperfective may describe an experience without guaranteeing completion; perfective does not automatically guarantee a lasting result; process, repetition, and one-time result depend on context. Keep Russian words intact (for example, use “успеть + 不定式”, never split the word).',
      'For knowledge cards without teachingNarrativeVersion=2, return studyCard as a JSON-encoded complete card object. Preserve the knowledge point ID and exercise IDs exactly; use reviewStatus="approved" only when all required teaching and source fields are present.',
      'Keep textbook evidence labeled as source evidence and label model-written teaching additions as learning supplements. Do not omit required arrays merely to shorten output.'
    ].join('\n'));
  }
  if (profile.adapter === 'grammar' && manifest.role !== 'reviewer') {
    promptParts.push(grammarDraftQualityInstructions({ contentBased }));
  }
  if (contentBased && manifest.role === 'reviewer') {
    promptParts.push(grammarContentInstructions());
    promptParts.push('Evaluate the learner-facing causal explanation and every distractor. Host-generated compatibility copies are omitted when exactly equal. Do not require their presence. Flag harmful repetition within the remaining teaching text, not mere reuse of necessary Russian terms. Report concrete defects and a concise correction; do not invent stylistic requirements or word quotas.');
  }
  if (manifest.role === 'reviewer') promptParts.push(reviewerQualityInstructions());
  const qualityReference = qualityReferenceInstructions(manifest, root);
  if (qualityReference) promptParts.push(qualityReference);
  promptParts.push('Return only the requested JSON object. Do not narrate your work.');
  const prompt = `${promptParts.join('\n\n')}\n`;
  const ignoreUserConfig = options.ignoreUserConfig === true || process.env.READER_CODEX_IGNORE_USER_CONFIG === '1';
  const timeoutMs = Number(options.timeoutMs || process.env.READER_CODEX_TIMEOUT_MS || 900000);
  const result = spawnSync(command, [
    ...prefix, 'exec', '--ephemeral', ...codexIsolationArgs({ ignoreUserConfig }), '--cd', root, '--sandbox', 'workspace-write',
    '--model', model, '-c', `model_reasoning_effort="${effort}"`,
    '--output-schema', schemaFile, '--output-last-message', outputFile, '-'
  ], { cwd: root, shell: false, encoding: 'utf8', input: prompt, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  try {
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Codex CLI failed (exit ${result.status}): ${String(result.stderr || result.stdout || '').trim()}`);
    const output = parseOutput(outputFile);
    let byId;
    try {
      byId = validateResults(manifest, output);
    } catch (error) {
      // Some proxies rewrite long hashes. Restore only that transport field when
      // every protected task ID still forms an exact one-to-one batch match.
      if (!/inputHash mismatch/.test(error.message) || !normalizeProviderHashes(manifest, output)) throw error;
      byId = validateResults(manifest, output);
    }
    for (const task of manifest.tasks) {
      const item = byId.get(task.taskId);
      if (manifest.role === 'reviewer') {
        writeJson(task.reviewFile, { schema: REVIEW_SCHEMA, taskId: task.taskId, inputHash: task.inputHash, decision: item.decision, findings: item.findings });
      } else {
        const taskInput = readJson(task.inputFile);
        if (taskInput.taskType === 'knowledge-card') {
          if (taskInput.outputContract?.teachingNarrativeVersion === 2) {
            let teachingNarrative = item.teachingNarrative;
            if (typeof teachingNarrative === 'string') {
              try { teachingNarrative = JSON.parse(teachingNarrative); } catch (error) { throw new Error(`Invalid teachingNarrative JSON for ${task.taskId}: ${error.message}`); }
            }
            writeJson(task.artifactFile, {
              schema: ARTIFACT_SCHEMA,
              taskId: task.taskId,
              inputHash: task.inputHash,
              provenance: { provider: 'Codex CLI', model, role: manifest.role },
              studyCard: { teachingNarrative }
            });
            continue;
          }
          let studyCard = item.studyCard;
          if (typeof studyCard === 'string') {
            try { studyCard = JSON.parse(studyCard); } catch (error) { throw new Error(`Invalid studyCard JSON for ${task.taskId}: ${error.message}`); }
          }
          if (studyCard && typeof studyCard.partId === 'string' && /^P[1-6]$/.test(studyCard.partId)) studyCard.partId = studyCard.partId.toLowerCase();
          writeJson(task.artifactFile, { schema: ARTIFACT_SCHEMA, taskId: task.taskId, inputHash: task.inputHash, provenance: { provider: 'Codex CLI', model, role: manifest.role }, studyCard });
          continue;
        }
        const answerAnalysisPatch = profile.adapter === 'grammar' && manifest.transportMode === 'compact-grammar-v1'
          ? carryForwardCompleteSentence(task, item.answerAnalysisPatch)
          : item.answerAnalysisPatch;
        writeJson(task.artifactFile, { schema: ARTIFACT_SCHEMA, taskId: task.taskId, inputHash: task.inputHash, provenance: { provider: 'Codex CLI', model, role: manifest.role }, ...(profile.adapter === 'grammar' ? { answerAnalysisPatch } : { answerAnalysis: item.answerAnalysis }) });
      }
    }
    const totalTokens = parseTokenUsage(`${result.stdout || ''}\n${result.stderr || ''}`);
    return { role: manifest.role, model, effort, ignoreUserConfig, written: manifest.tasks.length, usage: totalTokens == null ? null : { totalTokens } };
  } finally {
    try { fs.unlinkSync(outputFile); } catch {}
    try { fs.unlinkSync(schemaFile); } catch {}
  }
}
function parseArgs(argv) {
  const flags = {}; const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) { positional.push(value); continue; }
    const name = value.slice(2); const next = argv[index + 1];
    if (next && !next.startsWith('--')) flags[name] = argv[++index]; else flags[name] = true;
  }
  return { flags, positional };
}
if (require.main === module) {
  try {
    const { flags, positional } = parseArgs(process.argv.slice(2));
    if (!positional[0]) throw new Error('Usage: node scripts/reader-codex-adapter.js [--model gpt-5.6-terra] [--effort medium] [--timeout-ms 900000] <manifest-json>');
    process.stdout.write(`${JSON.stringify(runAdapter(positional[0], { model: flags.model, effort: flags.effort, timeoutMs: flags['timeout-ms'], ignoreUserConfig: flags['ignore-user-config'] === true }))}\n`);
  } catch (error) { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; }
}
module.exports = { MAX_BATCH_TASKS, carryForwardCompleteSentence, codexIsolationArgs, compactBundleForCodex, compactGrammarPatchSchema, deduplicateGrammarBundle, grammarContentInstructions, grammarDraftQualityInstructions, grammarPatchSchema, locateCodex, normalizeProviderHashes, parseOutput, parseTokenUsage, requiresCompleteSentenceRepair, runAdapter, strictSchema, studyCardSchema, teachingNarrativeSchema, validateManifest };
