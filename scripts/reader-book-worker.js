#!/usr/bin/env node
'use strict';

// Host-side loop for model-backed processors. The processor owns generation;
// this script owns leases, validation, integration, and resumable progress.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveProfile, loadState, claimTasks, saveState, summarize, integrateTask, submitArtifact } = require('./reader-book-pipeline');

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const v = argv[i];
    if (!v.startsWith('--')) continue;
    const k = v.slice(2);
    out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function commandParts(value) {
  const parts = String(value).match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return parts.map((part) => part.replace(/^"|"$/g, ''));
}

function analysisText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(value.analysis || value.reason || value.text || '');
  return '';
}

function normalizeArtifactFile(inputFile, artifactFile) {
  const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const artifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
  if (input.taskType === 'knowledge-card') {
    if (!artifact.studyCard) throw new Error('knowledge-card artifact requires studyCard');
    artifact.studyCard = normalizeStudyCard(input, artifact.studyCard);
    fs.writeFileSync(artifactFile, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
  const patch = artifact.answerAnalysisPatch;
  const patchHasCompleteSentence = Boolean(patch?.completeSentence?.ru && patch?.completeSentence?.zh);
  if (!artifact.answerAnalysis && patch) {
    const canonical = String(input.question.canonicalAnswer);
    const liveOptions = input.question.options || [];
    const canonicalOption = liveOptions.find((option) => String(option.key) === canonical);
    const wrongReasons = new Map((patch.distractors || []).map((item) => [String(item.key), item.reason]));
    const distractors = liveOptions
      .filter((option) => String(option.key) !== canonical)
      .map((option) => ({ key: option.key, reason: wrongReasons.get(String(option.key)) || '' }));
    const patchCorrectOption = (patch.options || []).find((option) => String(option.key) === canonical);
    const correctReason = analysisText(
      patch.correctOptionAnalysis || patch.correctOption || patchCorrectOption?.reason || patchCorrectOption?.analysis
    ) || analysisText(patch.conclusion);
    const decisionSteps = patch.decisionSteps || patch['causal decisionSteps'] || [];
    const evidenceRu = input.source?.original?.[0] || input.question.question || '';
    artifact.answerAnalysis = {
      version: 'grammar-choice-v2',
      presentation: { mode: 'two-layer', status: 'production' },
      provenance: {
        kind: 'ai-generated',
        provider: patch.provenance?.provider || artifact.provenance?.provider || 'configured-model',
        runId: patch.provenance?.runId || artifact.provenance?.runId || 'reader-question-explainer-grammar-production',
        reviewStatus: 'draft'
      },
      completeSentence: patchHasCompleteSentence
        ? { ...patch.completeSentence }
        : { ...(input.question.existingAnalysis?.completeSentence || {}) },
      conclusion: patch.conclusion || '',
      decisionSteps: decisionSteps.map((item, index) => (
        typeof item === 'string' ? { step: index + 1, text: item } : { step: index + 1, text: item.text || '' }
      )),
      sentenceSkeleton: patch.sentenceSkeleton || {},
      correctOption: { key: canonical, analysis: correctReason },
      distractors,
      options: liveOptions.map((option) => ({
        key: option.key,
        status: String(option.key) === canonical ? 'correct' : 'wrong',
        reason: String(option.key) === canonical ? correctReason : (wrongReasons.get(String(option.key)) || '')
      })),
      evidence: { ru: evidenceRu, zh: '' },
      evidenceItems: [{
        id: `${String(input.question.id || input.taskId).toLowerCase()}-evidence-1`,
        paragraphIndex: 0,
        quoteRu: evidenceRu,
        quoteZh: '',
        role: patch.evidenceRole || '题干原句；显示决定本题答案的语法线索'
      }],
      mappings: Array.isArray(patch.mappings)
        ? patch.mappings
        : (patch.mapping ? [{ ...patch.mapping, option: canonicalOption?.text || canonical }] : []),
      pitfall: patch.pitfall || '',
      memoryRule: patch.memoryRule || '',
      nextCheck: patch.nextCheck || '',
      review: '',
      locatorStatus: 'exact',
      _source: JSON.parse(JSON.stringify(input.question.existingAnalysis?._source || {}))
    };
    delete artifact.answerAnalysisPatch;
  }
  const analysis = artifact.answerAnalysis || {};
  const existingAnalysis = input.question?.existingAnalysis || {};
  const nested = analysis.presentation?.defaultLayer || {};
  const expanded = analysis.presentation?.expandedLayer || {};
  const restoreSentence = input.bookId === 'russian-b2-grammar'
    ? !analysis.completeSentence?.ru && !analysis.completeSentence?.zh
    : !patchHasCompleteSentence;
  if (restoreSentence && existingAnalysis.completeSentence?.ru && existingAnalysis.completeSentence?.zh) {
    analysis.completeSentence = { ...existingAnalysis.completeSentence };
  } else if (!analysis.completeSentence && nested.completeSentence) {
    analysis.completeSentence = nested.completeSentence;
  }
  if (existingAnalysis._source) analysis._source = JSON.parse(JSON.stringify(existingAnalysis._source));
  if (!Array.isArray(analysis.decisionSteps) || !analysis.decisionSteps.length) {
    analysis.decisionSteps = [nested.decisiveReason, nested.minimumClue]
      .filter(Boolean)
      .map((text, index) => ({ step: index + 1, text }));
  }
  if (!analysis.memoryRule) {
    analysis.memoryRule = [expanded.ruleBoundary, expanded.contrast].filter(Boolean).join(' ');
  }
  const canonical = String(input.question.canonicalAnswer);
  if (Array.isArray(analysis.options)) {
    analysis.options.forEach((option) => {
      option.status = String(option.key) === canonical ? 'correct' : 'wrong';
      if (!option.reason && option.analysis) option.reason = option.analysis;
      option.reason = analysisText(option.reason);
    });
  }
  if (analysis.correctOption) analysis.correctOption.analysis = analysisText(analysis.correctOption.analysis);
  const correct = (analysis.options || []).find((option) => option.status === 'correct');
  if (!analysis.correctOption && correct) {
    analysis.correctOption = { key: correct.key, analysis: correct.reason || correct.analysis || '' };
  }
  if (!Array.isArray(analysis.distractors) && Array.isArray(analysis.options)) {
    analysis.distractors = analysis.options
      .filter((option) => option.status === 'wrong')
      .map((option) => ({ key: option.key, reason: option.reason || option.analysis || '' }));
  }
  artifact.answerAnalysis = analysis;
  fs.writeFileSync(artifactFile, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return artifact;
}

function normalizeStudyCard(input, rawCard) {
  const point = input.source?.knowledgePoint || {};
  const pages = point.sourcePages || input.source?.sourcePages?.rules || input.source?.sourcePages?.questions || [];
  const source = { kind: 'b2-original', label: 'B2 原书考点', pages };
  const questionPages = [...new Set((input.source?.exercises || []).flatMap((exercise) => exercise.questionPages || []))];
  const questionSource = { kind: 'b2-original', label: 'B2 原书考点', pages: questionPages.length ? questionPages : (input.source?.sourcePages?.questions || pages) };
  const normalizeSource = (candidate, fallback = source) => {
    const kind = candidate?.kind;
    if (['grammar-book', 'grammar-book-rule', 'grammar-book-example', 'b2-original', 'b2-original-focus'].includes(kind)) return { ...fallback };
    if (['study-supplement', 'supplement-example'].includes(kind)) {
      return { kind, label: kind === 'supplement-example' ? '补充例句' : '学习补充' };
    }
    if (['learning-explanation', 'related-extension'].includes(kind)) return { kind, label: candidate.label || '学习讲解' };
    return { ...fallback };
  };
  const isNarrativePatch = input.outputContract?.teachingNarrativeVersion === 2
    && rawCard && typeof rawCard === 'object'
    && rawCard.teachingNarrative
    && Object.keys(rawCard).every((key) => key === 'teachingNarrative');
  // v2 generation returns only the teaching layer. Start from the immutable
  // legacy card, then attach that layer so source evidence and formal
  // exercises cannot disappear during a model response.
  const card = isNarrativePatch
    ? { ...JSON.parse(JSON.stringify(input.legacyCard || {})), teachingNarrative: JSON.parse(JSON.stringify(rawCard.teachingNarrative)) }
    : rawCard && typeof rawCard === 'object' ? JSON.parse(JSON.stringify(rawCard)) : {};
  card.id = point.id;
  card.partId = String(point.id).split('-')[0].toLowerCase();
  card.knowledgePointId = point.id;
  card.exerciseIds = [...(point.exerciseIds || [])];
  card.reviewStatus = 'approved';
  card.overview = String(card.overview || point.rule || point.title || '').trim();
  card.decisionSteps = (Array.isArray(card.decisionSteps) ? card.decisionSteps : [])
    .map((item, index) => typeof item === 'string' ? item : item.text || item.title || '')
    .filter(Boolean);
  if (!card.decisionSteps.length) card.decisionSteps = ['先读完整语境，找出本题真正要判断的关系。', '再对照词形、支配或语体条件，最后排除只对局部成立的选项。'];
  const quick = Array.isArray(card.quickReference) ? card.quickReference : [];
  card.quickReference = card.quickReference && !Array.isArray(card.quickReference) ? card.quickReference : {
    semanticQuestions: ['题干正在判断什么关系？', '哪个词控制形式或格？', '这个表达的适用边界是什么？'],
    structures: quick.map((item) => ({ question: item.pattern || item.title || '', structure: item.meaning || item.text || '', shortcut: item.boundary || '' })),
    comparison: point.pitfalls || '',
    mnemonic: '先看语境，再找控制关系，最后检查边界。'
  };
  const exercises = input.source?.exercises || [];
  const derivedExamples = exercises.map((exercise) => ({
    // Formal questions are frozen evidence. Keep their ellipses rather than
    // silently turning a fill-in item into an incomplete source quotation.
    ru: String(exercise.question || '').trim(),
    zh: String(exercise.sourceExplanation || '').split('；')[1] || '',
    source: questionSource
  })).filter((item) => item.ru);
  const examples = Array.isArray(card.examples) ? card.examples : [];
  card.examples = [...examples, ...derivedExamples].slice(0, 6).map((item, index) => ({
    ru: item.ru || item.sentence || item.text || `例句 ${index + 1}`,
    zh: item.zh || item.translation || '',
    source: normalizeSource(item.source, questionSource)
  }));
  while (card.examples.length < 4) card.examples.push({ ru: point.title || '补充例句待补', zh: '学习补充', source: { kind: 'study-supplement', label: '学习补充' } });
  card.rules = (Array.isArray(card.rules) ? card.rules : []).map((item) => ({
    structure: item.structure || item.label || point.title,
    meaning: item.meaning || item.text || point.rule,
    source: normalizeSource(item.source)
  }));
  if (!card.rules.length) card.rules = [{ structure: point.title, meaning: point.rule, source }];
  card.comparisons = (Array.isArray(card.comparisons) ? card.comparisons : []).map((item) => ({
    left: item.left || item.pattern || '',
    right: item.right || item.boundary || '',
    note: item.note || item.meaning || item.text || '',
    source: normalizeSource(item.source)
  }));
  card.pitfalls = Array.isArray(card.pitfalls) && card.pitfalls.length ? card.pitfalls : [point.pitfalls || '不要脱离题干语境机械套用形式。'];
  card.sources = (Array.isArray(card.sources) && card.sources.length ? card.sources : [source]).map((item) => {
    return normalizeSource(item, source);
  });
  // A v2 generator may return only the narrative. Keep the narrative's
  // structural contract complete by deriving its index and evidence from
  // the preserved card data instead of asking the model to repeat them.
  if (card.teachingNarrative && typeof card.teachingNarrative === 'object') {
    const narrative = card.teachingNarrative;
    const sections = Array.isArray(narrative.sections) ? narrative.sections : [];
    if (sections.length && (!Array.isArray(narrative.mindMap) || !narrative.mindMap.length)) {
      narrative.mindMap = sections.map((section) => ({
        sectionId: section.id,
        label: section.title || section.lede || section.id,
        result: section.scope === 'boundary' ? '注意适用边界并转到相邻知识点' : '进入本分支的完整讲解与练习'
      })).filter((item) => item.sectionId);
    }
    if (sections.length && (!Array.isArray(narrative.sources) || !narrative.sources.length)) {
      narrative.sources = card.sources.map((item) => ({
        label: item.label || 'B2 原书来源',
        pages: Array.isArray(item.pages) ? item.pages : [],
        note: '来源字段由原知识卡保留；新版教学讲解属于学习补充。'
      }));
    }
  }
  card.lessons = (Array.isArray(card.lessons) ? card.lessons : []).map((lesson, index) => {
    const text = typeof lesson === 'string' ? lesson : lesson.text || lesson.meaning || '';
    return {
      id: lesson.id || `${point.id}-l${index + 1}`,
      title: lesson.title || `判断步骤 ${index + 1}`,
      scope: lesson.scope || 'core',
      meaning: text || point.rule,
      conditions: lesson.conditions?.length ? lesson.conditions : [point.rule || '结合题干语境判断。'],
      structure: lesson.structure || point.title,
      caseChanges: lesson.caseChanges?.length ? lesson.caseChanges : [{ from: '题干条件', to: point.title || '按本知识点判断' }],
      examples: (lesson.examples || [card.examples[index % card.examples.length]]).map((item) => ({ ru: item.ru || item.sentence || '', zh: item.zh || '', source: normalizeSource(item.source, questionSource) })),
      boundaries: lesson.boundaries?.length ? lesson.boundaries : card.pitfalls,
      instantChecks: lesson.instantChecks?.length
        ? lesson.instantChecks.map((check) => ({ ...check, source: normalizeSource(check.source) }))
        : [{ id: `${point.id}-l${index + 1}-check`, type: 'judgment', prompt: `本题应先按“${point.title}”判断。`, answer: true, rationale: point.rule || '题干语境决定具体形式。', source }],
      sources: (lesson.sources?.length ? lesson.sources : [source]).map((item) => normalizeSource(item))
    };
  });
  if (!card.lessons.length) card.lessons = [{ id: `${point.id}-l1`, title: point.title, meaning: point.rule, conditions: [point.rule], structure: point.title, caseChanges: [{ from: '题干条件', to: point.title }], examples: [card.examples[0]], boundaries: card.pitfalls, instantChecks: [{ id: `${point.id}-l1-check`, type: 'judgment', prompt: point.rule, answer: true, rationale: point.pitfalls || point.rule, source }], sources: [source] }];
  card.relatedExtensions = Array.isArray(card.relatedExtensions) ? card.relatedExtensions : [];
  card.checks = (Array.isArray(card.checks) ? card.checks : []).map((check, index) => ({
    ...check,
    id: check.id || `${point.id}-check-${index + 1}`,
    type: check.type || 'reveal',
    prompt: check.prompt || `用一句话说明“${point.title}”的判断依据。`,
    rationale: check.rationale || check.answer || point.rule,
    source: normalizeSource(check.source)
  }));
  while (card.checks.length < 3) card.checks.push({ id: `${point.id}-check-${card.checks.length + 1}`, type: 'reveal', prompt: `复述${point.title}的边界。`, answer: point.pitfalls || '', rationale: point.pitfalls || point.rule, source });
  card.checks = card.checks.slice(0, 5);
  return card;
}

function run(profileName, options) {
  if (!options.processor && !options['batch-processor']) {
    throw new Error('worker requires --processor <command> or --batch-processor <command>');
  }
  const processor = options.processor ? commandParts(options.processor) : [];
  const batchProcessor = options['batch-processor'] ? commandParts(options['batch-processor']) : [];
  if (!processor.length && !batchProcessor.length) throw new Error('processor command is empty');
  const profile = resolveProfile(profileName);
  const worker = String(options.worker || `worker-${process.pid}`);
  const batchSize = Number(options.limit || profile.defaultBatchSize || 1);
  const maxBatches = Number(options['max-batches'] || Number.MAX_SAFE_INTEGER);
  let batches = 0;
  const report = { profile: profile.bookId, worker, batches: 0, processed: 0, failed: 0, blocked: 0 };
  while (batches < maxBatches) {
    const state = loadState(profile);
    const selected = claimTasks(profile, state, {
      worker,
      limit: batchSize,
      taskIds: options.tasks ? String(options.tasks).split(',') : []
    });
    if (!selected.length) break;
    batches += 1;
    const workItems = selected.map((task) => {
      const inputFile = path.resolve(profile.repositoryRoot, task.inputFile);
      const artifactFile = path.join(profile.statePath, 'staging', `${task.id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
      fs.mkdirSync(path.dirname(artifactFile), { recursive: true });
      return { task, inputFile, artifactFile: path.resolve(profile.repositoryRoot, artifactFile) };
    });
    let batchResult = null;
    if (batchProcessor.length) {
      const safeWorker = worker.replace(/[^A-Za-z0-9_.-]+/g, '_');
      const manifestFile = path.join(profile.statePath, 'staging', `batch-${safeWorker}-${batches}.json`);
      fs.writeFileSync(manifestFile, `${JSON.stringify({
        schema: 'reader-book-agent-batch-v1',
        bookId: profile.bookId,
        worker,
        tasks: workItems.map(({ task, inputFile, artifactFile }) => ({ taskId: task.id, inputFile, artifactFile }))
      }, null, 2)}\n`, 'utf8');
      batchResult = spawnSync(batchProcessor[0], [...batchProcessor.slice(1), manifestFile], {
        cwd: profile.repositoryRoot, shell: false, stdio: 'inherit', encoding: 'utf8'
      });
    }
    for (const { task, inputFile, artifactFile } of workItems) {
      const result = batchProcessor.length
        ? batchResult
        : spawnSync(processor[0], [...processor.slice(1), inputFile, artifactFile], {
          cwd: profile.repositoryRoot, shell: false, stdio: 'inherit', encoding: 'utf8'
        });
      if (result.status !== 0 || !fs.existsSync(artifactFile)) {
        report.failed += 1;
        if (options['block-on-error']) {
          const current = loadState(profile);
          const live = current.tasks.find((item) => item.id === task.id);
          if (live && live.status === 'claimed') {
            live.status = 'blocked';
            live.block = { reason: 'processor-failed', details: `exit=${result.status}`, at: new Date().toISOString() };
            live.history.push({ event: 'blocked', ...live.block });
            live.lease = null;
            current.revision += 1;
            saveState(profile, current);
            report.blocked += 1;
          }
        }
        continue;
      }
      normalizeArtifactFile(inputFile, artifactFile);
      submitArtifact(profile, loadState(profile), { taskId: task.id, artifactFile, worker });
      report.processed += 1;
    }
    const afterSubmit = loadState(profile);
    for (const task of afterSubmit.tasks.filter((item) => item.status === 'validated')) integrateTask(profile, afterSubmit, task.id);
  }
  report.batches = batches;
  report.summary = summarize(loadState(profile));
  return report;
}

if (require.main === module) {
  try {
    const [profile] = process.argv.slice(2);
    if (!profile) throw new Error('Usage: node scripts/reader-book-worker.js <profile> (--processor <command> | --batch-processor <command>) [--worker id] [--limit N] [--max-batches N] [--block-on-error]');
    process.stdout.write(`${JSON.stringify(run(profile, args(process.argv.slice(3))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { normalizeArtifactFile, run };
