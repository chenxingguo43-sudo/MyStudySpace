#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const PROFILE_ROOT = path.join(REPOSITORY_ROOT, 'config', 'reader-book-pipeline');
const STATE_SCHEMA = 'reader-book-pipeline-state-v1';
const ARTIFACT_SCHEMA = 'reader-book-pipeline-artifact-v1';
const TASK_TYPES = new Set(['question-explanation', 'knowledge-card']);
const TERMINAL_STATUSES = new Set(['completed', 'blocked']);

function normalizePath(value) {
  return String(value).split(path.sep).join('/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.renameSync(temporary, file);
      return;
    } catch (error) {
      // Windows may briefly hold the destination open. Keep the old file
      // intact and retry the atomic replacement, never truncate it in place.
      if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 5) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * (2 ** attempt));
    }
  }
}

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function stableHash(value) {
  return sha256(JSON.stringify(value));
}

function now() {
  return new Date().toISOString();
}

function assertInside(root, target, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes repository root: ${target}`);
  }
  return resolvedTarget;
}

function resolveProfile(profileName, root = REPOSITORY_ROOT) {
  const candidate = profileName.endsWith('.json')
    ? assertInside(root, path.resolve(root, profileName), 'Profile')
    : path.join(root, 'config', 'reader-book-pipeline', `${profileName}.json`);
  if (!fs.existsSync(candidate)) throw new Error(`Unknown pipeline profile: ${profileName}`);
  const profile = readJson(candidate);
  for (const field of ['bookId', 'title', 'adapter', 'sourceDir', 'stateDir', 'requiredSkill']) {
    if (!profile[field]) throw new Error(`Profile is missing ${field}: ${candidate}`);
  }
  if (!['reading-speaking', 'b2-reading', 'grammar'].includes(profile.adapter)) {
    throw new Error(`Unsupported adapter: ${profile.adapter}`);
  }
  profile.profilePath = normalizePath(path.relative(root, candidate));
  profile.repositoryRoot = root;
  profile.sourcePath = assertInside(root, path.join(root, profile.sourceDir), 'Source directory');
  profile.statePath = assertInside(root, path.join(root, profile.stateDir), 'State directory');
  return profile;
}

function stateFile(profile) {
  return path.join(profile.statePath, 'state.json');
}

function loadState(profile) {
  const file = stateFile(profile);
  if (!fs.existsSync(file)) {
    throw new Error(`Pipeline is not initialized. Run init ${profile.bookId}.`);
  }
  const state = readJson(file);
  if (state.schema !== STATE_SCHEMA || state.bookId !== profile.bookId) {
    throw new Error(`Invalid pipeline state: ${file}`);
  }
  return state;
}

function optionKey(option) {
  if (option && typeof option === 'object') return String(option.key || option.label || '').trim();
  const match = String(option || '').match(/^\s*([^\s.)]+)\s*[.)]/);
  return match ? match[1].trim() : '';
}

function normalizeEvidenceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ё/gi, 'е')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim()
    .toLowerCase();
}

function chapterCoverage(chapter) {
  const warnings = [];
  const blockers = [];
  const original = Array.isArray(chapter.original) ? chapter.original : [];
  const translated = Array.isArray(chapter.translated)
    ? chapter.translated
    : (Array.isArray(chapter.translations) ? chapter.translations : []);
  if (!original.join('').trim()) blockers.push('missing-original');
  if (!translated.join('').trim()) warnings.push('missing-translation');
  if (original.join('\n').length < 500) blockers.push('source-too-short');
  const sourceText = original.join('\n');
  if (/\b(?:needs_review|needs-review|source-exercise-only)\b/.test(sourceText)) {
    blockers.push('source-contaminated-with-review-metadata');
  }
  return { ready: blockers.length === 0, warnings, blockers };
}

function grammarCoverage(chapter) {
  const blockers = [];
  const warnings = [];
  if (!Array.isArray(chapter.exercises) || !chapter.exercises.length) blockers.push('missing-exercises');
  if (!Array.isArray(chapter.knowledgePoints) || !chapter.knowledgePoints.length) warnings.push('missing-knowledge-points');
  return { ready: blockers.length === 0, warnings, blockers };
}

function taskId(chapterFile, exercise) {
  const local = exercise.id || `q${exercise.num}`;
  return `${path.basename(chapterFile, '.json')}:${local}`;
}

function chapterQuestions(profile, chapter) {
  return profile.adapter === 'b2-reading'
    ? (Array.isArray(chapter.questions) ? chapter.questions : [])
    : (Array.isArray(chapter.exercises) ? chapter.exercises : []);
}

function questionText(profile, exercise) {
  return String(profile.adapter === 'b2-reading' ? exercise.prompt || '' : exercise.question || '');
}

function protectedSnapshot(exercise, profile = { adapter: 'reading-speaking' }) {
  return {
    answer: String(exercise.answer || ''),
    question: questionText(profile, exercise),
    optionKeys: (exercise.options || []).map(optionKey),
    optionTexts: (exercise.options || []).map((item) => typeof item === 'string' ? item : item.text),
    sourceAnchor: exercise.sourceAnchor || null
  };
}

function acceptedAnalysis(exercise, profile) {
  const analysis = exercise && (exercise.answerAnalysis || exercise);
  return analysis
    && analysis.presentation
    && analysis.presentation.mode === profile.acceptedPresentationMode;
}

function grammarContractErrors(analysis, profile = {}) {
  const errors = [];
  if (!analysis?.completeSentence?.ru || !analysis?.completeSentence?.zh) errors.push('completeSentence ru/zh required');
  if (!Array.isArray(analysis?.decisionSteps) || !analysis.decisionSteps.length) errors.push('decisionSteps required');
  if (!analysis?.sentenceSkeleton?.ru || !analysis?.sentenceSkeleton?.zh) errors.push('sentenceSkeleton ru/zh required');
  if (!analysis?.correctOption?.key || typeof analysis.correctOption.analysis !== 'string' || !analysis.correctOption.analysis.trim()) {
    errors.push('correctOption with string analysis required');
  }
  if (!Array.isArray(analysis?.distractors)) errors.push('distractors required');
  if (!String(analysis?.memoryRule || '').trim()) errors.push('memoryRule required');
  if (profile.grammarTeachingMode === 'content-v1') {
    for (const field of ['conclusion', 'pitfall', 'nextCheck']) {
      if (typeof analysis?.[field] !== 'string' || !analysis[field].trim()) errors.push(`${field} required`);
    }
    if (analysis?.decisionSteps?.some((step) => typeof step?.text !== 'string' || !step.text.trim())) {
      errors.push('every decision step needs a concrete explanation');
    }
    if (analysis?.distractors?.some((item) => typeof item?.reason !== 'string' || !item.reason.trim())) {
      errors.push('every distractor needs its own explanation');
    }
    // Content depth and correctness are assessed by the independent reviewer.
    // Per-field length quotas encourage padding in otherwise complete lessons.
    return errors;
  }
  const conclusion = String(analysis?.conclusion || '');
  const stepText = Array.isArray(analysis?.decisionSteps)
    ? analysis.decisionSteps.map((item) => String(item?.text || '')).join('')
    : '';
  const correctText = typeof analysis?.correctOption?.analysis === 'string' ? analysis.correctOption.analysis : '';
  const distractorTexts = Array.isArray(analysis?.distractors)
    ? analysis.distractors.map((item) => String(item?.reason || ''))
    : [];
  const pitfall = String(analysis?.pitfall || '');
  const memoryRule = String(analysis?.memoryRule || '');
  const nextCheck = String(analysis?.nextCheck || '');
  const teachingLength = [conclusion, stepText, correctText, ...distractorTexts, pitfall, memoryRule, nextCheck]
    .join('').length;
  if (conclusion.length < 55) errors.push('conclusion teaching depth must be at least 55 characters');
  if (stepText.length < 75) errors.push('decisionSteps teaching depth must be at least 75 characters');
  if (correctText.length < 55) errors.push('correctOption analysis teaching depth must be at least 55 characters');
  if (distractorTexts.some((text) => text.length < 75)) errors.push('each distractor reason teaching depth must be at least 75 characters');
  if (pitfall.length < 55) errors.push('pitfall teaching depth must be at least 55 characters');
  if (memoryRule.length < 85) errors.push('memoryRule teaching depth must be at least 85 characters');
  if (nextCheck.length < 50) errors.push('nextCheck teaching depth must be at least 50 characters');
  if (teachingLength < 550) errors.push('combined learner-facing teaching depth must be at least 550 characters');
  return errors;
}

function readingContractErrors(input, analysis) {
  const errors = [];
  if (!Array.isArray(analysis?.evidenceItems) || !analysis.evidenceItems.length) errors.push('evidenceItems required');
  if (!Array.isArray(analysis?.mappings) || !analysis.mappings.length) errors.push('mappings required');
  if (!Array.isArray(analysis?.options) || !analysis.options.length) errors.push('options mapping required');
  if (!String(analysis?.locatorStatus || '').trim()) errors.push('locatorStatus required');
  const liveKeys = (input.question.options || []).map(optionKey).filter(Boolean);
  const mapped = Array.isArray(analysis?.options) ? analysis.options : [];
  const mappedKeys = mapped.map((item) => String(item.key || '').trim());
  if (mappedKeys.length !== liveKeys.length || liveKeys.some((key) => !mappedKeys.includes(key))) {
    errors.push('reading analysis option keys must exactly match live option keys');
  }
  if (mapped.filter((item) => item.status === 'correct').length !== 1) errors.push('reading analysis needs exactly one correct option');
  if (mapped.some((item) => item.status !== 'correct' && !String(item.reason || '').trim())) errors.push('every reading distractor needs a reason');
  if (!String(analysis?.pitfall || '').trim()) errors.push('expanded-layer pitfall is required');
  if (!String(analysis?.nextCheck || '').trim()) errors.push('expanded-layer nextCheck is required');
  return errors;
}

function grammarExplanationIndex(profile) {
  const root = path.join(profile.sourcePath, 'theory', 'explanations');
  const index = new Map();
  if (!fs.existsSync(root)) return index;
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        const document = readJson(absolute);
        (document.explanations || []).forEach((explanation) => {
          if (explanation.exerciseId) index.set(explanation.exerciseId, {
            file: normalizePath(path.relative(profile.repositoryRoot, absolute)),
            explanation
          });
        });
      }
    }
  };
  visit(root);
  return index;
}

function loadB2CardIndex(profile) {
  if (!profile.cardIndexFile) return new Map();
  const file = assertInside(profile.repositoryRoot || REPOSITORY_ROOT, path.join(profile.repositoryRoot || REPOSITORY_ROOT, profile.cardIndexFile), 'Card index');
  if (!fs.existsSync(file)) return new Map();
  const index = readJson(file);
  return new Map((index.cards || []).map((entry) => [entry.knowledgePointId || entry.id, entry]));
}

function b2CardFile(profile, entry) {
  if (!profile.cardDirectory) return null;
  const source = entry?.source || `cards/${entry?.knowledgePointId || entry?.id}.json`;
  return normalizePath(path.relative(profile.repositoryRoot || REPOSITORY_ROOT, path.join(profile.repositoryRoot || REPOSITORY_ROOT, profile.cardDirectory, source)));
}

function b2CardIsAccepted(profile, point, cardIndex) {
  const entry = cardIndex.get(point.id);
  if (!entry) return false;
  const file = b2CardFile(profile, entry);
  if (!file || !fs.existsSync(path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, file))) return false;
  try {
    const card = readJson(path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, file));
    const baseAccepted = card.id === point.id && card.knowledgePointId === point.id && card.reviewStatus === 'approved'
      && Array.isArray(card.exerciseIds) && JSON.stringify(card.exerciseIds) === JSON.stringify(point.exerciseIds || [])
      && Array.isArray(card.examples) && card.examples.length >= 4
      && card.examples.every((item) => item?.source?.kind)
      && Array.isArray(card.lessons) && card.lessons.length > 0
      && card.lessons.every((lesson) => lesson?.id && Array.isArray(lesson.conditions) && lesson.conditions.length && Array.isArray(lesson.caseChanges) && lesson.caseChanges.length && Array.isArray(lesson.instantChecks) && lesson.instantChecks.length)
      && (!Array.isArray(card.comparisons) || card.comparisons.every((item) => item?.source?.kind))
      && (!Array.isArray(card.sources) || card.sources.every((item) => item?.kind));
    if (!baseAccepted) return false;
    if (profile.knowledgeCardVersion === 2) {
      const { validateTeachingNarrativeV2 } = require('./russian-b2/lib/study-cards');
      return validateTeachingNarrativeV2(card).length === 0;
    }
    return true;
  } catch { return false; }
}

function buildInventory(profile, previousState = null) {
  const repositoryRoot = profile.repositoryRoot || REPOSITORY_ROOT;
  if (!fs.existsSync(profile.sourcePath)) throw new Error(`Missing source directory: ${profile.sourcePath}`);
  const matcher = new RegExp(profile.chapterPattern || '^ch\\d{4}\\.json$');
  const chapterFiles = fs.readdirSync(profile.sourcePath)
    .filter((name) => matcher.test(name))
    .sort();
  const previous = new Map((previousState && previousState.tasks || []).map((task) => [task.id, task]));
  const grammarExplanations = profile.adapter === 'grammar' ? grammarExplanationIndex(profile) : new Map();
  const cardIndex = profile.knowledgeCards ? loadB2CardIndex(profile) : new Map();
  const tasks = [];
  const chapters = [];

  for (const fileName of chapterFiles) {
    const absoluteFile = path.join(profile.sourcePath, fileName);
    const relativeFile = normalizePath(path.relative(repositoryRoot, absoluteFile));
    const chapter = readJson(absoluteFile);
    const coverage = profile.adapter === 'grammar' ? grammarCoverage(chapter) : chapterCoverage(chapter);
    const exercises = chapterQuestions(profile, chapter);
    chapters.push({
      file: relativeFile,
      title: chapter.title || fileName,
      exerciseCount: exercises.length,
      sourceReady: coverage.ready,
      warnings: coverage.warnings,
      blockers: coverage.blockers,
      sourceHash: sha256(fs.readFileSync(absoluteFile))
    });

    if (!profile.knowledgeCardsOnly) exercises.forEach((exercise, exerciseIndex) => {
      const id = taskId(fileName, exercise);
      const snapshot = protectedSnapshot(exercise, profile);
      const grammarExplanation = grammarExplanations.get(exercise.id) || null;
      const rule = profile.adapter === 'grammar'
        ? (chapter.knowledgePoints || []).find((item) => (item.exerciseIds || []).includes(exercise.id)) || null
        : null;
      const input = {
        schema: 'reader-book-pipeline-input-v1',
        bookId: profile.bookId,
        taskId: id,
        taskType: 'question-explanation',
        requiredSkill: profile.requiredSkill,
        source: {
          chapterFile: relativeFile,
          chapterTitle: chapter.title || fileName,
          exerciseIndex,
          original: profile.adapter === 'grammar' ? [exercise.question || ''] : (chapter.original || []),
          translated: profile.adapter === 'grammar' ? [] : (chapter.translated || chapter.translations || []),
          knowledgePoint: rule,
          sourcePages: chapter.sourcePages || null,
          sourceBook: chapter.sourceBook || null
        },
        question: {
          type: exercise.type,
          num: exercise.num || exercise.printedNumber,
          id: exercise.id || null,
          question: questionText(profile, exercise),
          zhQuestion: exercise.zhQuestion || '',
          options: exercise.options || [],
          zhOptions: exercise.zhOptions || [],
          canonicalAnswer: exercise.answer,
          answerSource: exercise.answerSource || '',
          sourceAnchor: exercise.sourceAnchor || null,
          existingAnalysis: grammarExplanation?.explanation || exercise.answerAnalysis || exercise.sourceExplanation || null,
          reviewStatus: exercise.reviewStatus || null,
          questionPages: exercise.questionPages || [],
          answerPages: exercise.answerPages || [],
          answerNotice: exercise.answerNotice || ''
        },
        outputContract: {
          schema: ARTIFACT_SCHEMA,
          requiredFields: ['taskId', 'inputHash', 'answerAnalysis'],
          canonicalAnswerMustRemain: snapshot.answer,
          optionKeysMustRemain: snapshot.optionKeys,
          presentationMode: profile.acceptedPresentationMode
        }
      };
      const inputHash = stableHash(input);
      input.inputHash = inputHash;
      const old = previous.get(id);
      let status = acceptedAnalysis(grammarExplanation?.explanation || exercise, profile) ? 'completed' : 'pending';
      let history = [];
      let attempts = 0;
      let artifact = null;
      let block = null;
      if (old && old.inputHash !== inputHash) {
        history = [...(old.history || []), { event: 'input-changed', at: now(), previousInputHash: old.inputHash }];
        attempts = old.attempts || 0;
        if (old.block?.reason === 'source-incomplete' && coverage.ready) {
          history.push({ event: 'source-unblocked', at: now() });
        }
      }
      if (old && old.inputHash === inputHash) {
        status = old.status;
        history = old.history || [];
        attempts = old.attempts || 0;
        artifact = old.artifact || null;
        block = old.block || null;
        if (status === 'blocked' && block?.reason === 'source-incomplete' && coverage.ready) {
          history.push({ event: 'source-unblocked', at: now() });
          status = 'pending';
          block = null;
        }
      } else if (!coverage.ready) {
        status = 'blocked';
        block = { reason: 'source-incomplete', details: coverage.blockers, at: now() };
      }
      if (profile.adapter === 'b2-reading' && exercise.answerNotice) {
        status = 'blocked';
        block = { reason: 'canonical-answer-conflict', details: exercise.answerNotice, at: now() };
      }
      const accepted = acceptedAnalysis(grammarExplanation?.explanation || exercise, profile)
        && (profile.adapter !== 'grammar' || grammarContractErrors(grammarExplanation?.explanation || exercise.answerAnalysis, profile).length === 0)
        && (profile.adapter !== 'b2-reading' || validateAnalysis({ source: { original: chapter.original || [] }, question: { options: exercise.options || [], canonicalAnswer: exercise.answer } }, exercise.answerAnalysis, profile).length === 0);
      if (accepted) {
        status = 'completed';
        block = null;
      } else if (['grammar', 'b2-reading'].includes(profile.adapter) && status === 'completed') {
        status = 'pending';
        artifact = null;
        history = [...history, { event: 'quality-contract-invalidated', at: now() }];
      }
      tasks.push({
        id,
        type: 'question-explanation',
        requiredSkill: profile.requiredSkill,
        sourceFile: relativeFile,
        targetFile: grammarExplanation?.file || null,
        exerciseIndex,
        inputHash,
        protectedHash: stableHash(snapshot),
        status,
        attempts,
        lease: null,
        artifact,
        block,
        history
      });
      const inputPath = path.join(profile.statePath, 'inputs', `${id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
      writeJsonAtomic(inputPath, input);
    });

    if (profile.knowledgeCards && Array.isArray(chapter.knowledgePoints)) {
      for (const point of chapter.knowledgePoints) {
        if (Array.isArray(profile.targetParts) && !profile.targetParts.includes(String(point.id).split('-')[0])) continue;
        const id = `${fileName.replace(/\.json$/, '')}:knowledge-card:${point.id}`;
        const pointExercises = exercises.filter((exercise) => (point.exerciseIds || []).includes(exercise.id));
        const entry = cardIndex.get(point.id) || null;
        const targetFile = b2CardFile(profile, entry || { id: point.id, knowledgePointId: point.id });
        const existingCard = targetFile && fs.existsSync(path.resolve(repositoryRoot, targetFile))
          ? readJson(path.resolve(repositoryRoot, targetFile))
          : null;
        const legacyCard = targetFile && fs.existsSync(path.resolve(repositoryRoot, targetFile))
          ? readJson(path.resolve(repositoryRoot, targetFile))
          : null;
        const input = {
          schema: 'reader-book-pipeline-input-v1',
          bookId: profile.bookId,
          taskId: id,
          taskType: 'knowledge-card',
          requiredSkill: 'reader-knowledge-teacher',
          source: {
            chapterFile: relativeFile,
            chapterTitle: chapter.title || fileName,
            knowledgePoint: point,
            exercises: pointExercises.map((exercise) => ({
              id: exercise.id,
              printedNumber: exercise.printedNumber,
              question: exercise.question,
              options: exercise.options,
              answer: exercise.answer,
              sourceExplanation: exercise.sourceExplanation,
              questionPages: exercise.questionPages,
              answerPages: exercise.answerPages
            })),
            sourcePages: chapter.sourcePages || null,
            sourceBook: chapter.sourceBook || null,
            conceptContract: {
              coreIdea: point.rule || '',
              necessaryBranches: (legacyCard?.lessons || []).map((lesson) => lesson.title).filter(Boolean),
              limits: (legacyCard?.lessons || []).flatMap((lesson) => lesson.boundaries || []).filter(Boolean),
              repairOrProductionUse: (legacyCard?.relatedExtensions || []).map((item) => item.title).filter(Boolean),
              // Make the module boundary visible so a card is defined by the
              // concept, rather than merely by its current exercise range.
              neighborHandoffs: (chapter.knowledgePoints || [])
                .filter((candidate) => candidate.id !== point.id)
                .map((candidate) => ({
                  knowledgePointId: candidate.id,
                  title: candidate.title || candidate.id,
                  rule: candidate.rule || ''
                })),
              unresolvedRisks: point.pitfalls ? [point.pitfalls] : []
            }
          },
          existingCard: b2CardIsAccepted(profile, point, cardIndex) ? existingCard : null,
          legacyCard: profile.knowledgeCardVersion === 2 ? legacyCard : undefined,
          outputContract: {
            schema: ARTIFACT_SCHEMA,
            requiredFields: ['taskId', 'inputHash', 'studyCard'],
            knowledgePointId: point.id,
            exerciseIds: point.exerciseIds || [],
            teachingNarrativeVersion: profile.knowledgeCardVersion || null,
            requiredConceptFields: ['coreIdea', 'necessaryBranches', 'limits', 'repairOrProductionUse', 'neighborHandoffs', 'unresolvedRisks']
          }
        };
        const inputHash = stableHash(input);
        input.inputHash = inputHash;
        const old = previous.get(id);
        let status = b2CardIsAccepted(profile, point, cardIndex) ? 'completed' : 'pending';
        let history = [];
        let attempts = 0;
        let artifact = null;
        let block = null;
        if (old && old.inputHash === inputHash) {
          status = old.status;
          history = old.history || [];
          attempts = old.attempts || 0;
          artifact = old.artifact || null;
          block = old.block || null;
          if (!b2CardIsAccepted(profile, point, cardIndex) && status !== 'blocked') {
            status = 'pending';
            artifact = null;
            attempts = 0;
            block = null;
            history = [...history, { event: 'card-output-missing-or-invalidated', at: now() }];
          }
        } else if (old) {
          history = [...(old.history || []), { event: 'input-changed', at: now(), previousInputHash: old.inputHash }];
          attempts = old.attempts || 0;
        }
        if (b2CardIsAccepted(profile, point, cardIndex)) { status = 'completed'; block = null; }
        tasks.push({
          id,
          type: 'knowledge-card',
          requiredSkill: 'reader-knowledge-teacher',
          sourceFile: relativeFile,
          targetFile,
          exerciseIndex: -1,
          inputHash,
          protectedHash: stableHash({ id: point.id, exerciseIds: point.exerciseIds || [] }),
          status,
          attempts,
          lease: null,
          artifact,
          block,
          history
        });
        const inputPath = path.join(profile.statePath, 'inputs', `${id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
        writeJsonAtomic(inputPath, input);
      }
    }
  }
  return { chapters, tasks };
}

function createState(profile, previousState = null) {
  const inventory = buildInventory(profile, previousState);
  const createdAt = previousState ? previousState.createdAt : now();
  return {
    schema: STATE_SCHEMA,
    bookId: profile.bookId,
    title: profile.title,
    profile: profile.profilePath,
    createdAt,
    updatedAt: now(),
    revision: previousState ? previousState.revision + 1 : 1,
    chapters: inventory.chapters,
    tasks: inventory.tasks
  };
}

function saveState(profile, state) {
  state.updatedAt = now();
  writeJsonAtomic(stateFile(profile), state);
}

function initialize(profile, { refresh = false } = {}) {
  const file = stateFile(profile);
  if (fs.existsSync(file) && !refresh) {
    throw new Error(`Pipeline already exists: ${file}. Use refresh instead of overwriting it.`);
  }
  const previous = fs.existsSync(file) ? loadState(profile) : null;
  const state = createState(profile, previous);
  saveState(profile, state);
  return state;
}

function leaseExpired(lease, currentTime = Date.now()) {
  return lease && Date.parse(lease.expiresAt) <= currentTime;
}

function releaseExpiredLeases(state) {
  let released = 0;
  for (const task of state.tasks) {
    if (task.status === 'claimed' && leaseExpired(task.lease)) {
      task.history.push({ event: 'lease-expired', at: now(), worker: task.lease.worker });
      task.status = 'pending';
      task.lease = null;
      released += 1;
    }
  }
  return released;
}

function claimTasks(profile, state, { worker, limit = 1, types = [], taskIds = [] }) {
  const repositoryRoot = profile.repositoryRoot || REPOSITORY_ROOT;
  if (!worker) throw new Error('claim requires --worker <id>');
  releaseExpiredLeases(state);
  const allowed = new Set(types.length ? types : TASK_TYPES);
  const requestedIds = new Set(taskIds);
  const leaseMs = Number(profile.leaseMinutes || 30) * 60 * 1000;
  const selected = [];
  for (const task of state.tasks) {
    if (selected.length >= limit) break;
    if (task.status !== 'pending' || !allowed.has(task.type)) continue;
    if (requestedIds.size && !requestedIds.has(task.id)) continue;
    if (task.attempts >= Number(profile.maxAttempts || 3)) {
      task.status = 'blocked';
      task.block = { reason: 'max-attempts-exceeded', details: `attempts=${task.attempts}`, at: now() };
      task.history.push({ event: 'blocked', ...task.block });
      continue;
    }
    task.status = 'claimed';
    task.attempts += 1;
    task.lease = {
      worker,
      claimedAt: now(),
      expiresAt: new Date(Date.now() + leaseMs).toISOString()
    };
    task.history.push({ event: 'claimed', at: task.lease.claimedAt, worker, attempt: task.attempts });
    selected.push({
      ...task,
      inputFile: normalizePath(path.relative(repositoryRoot, path.join(
        profile.statePath,
        'inputs',
        `${task.id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`
      )))
    });
  }
  state.revision += 1;
  saveState(profile, state);
  return selected;
}

function findTask(state, id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) throw new Error(`Unknown task: ${id}`);
  return task;
}

function validateAnalysis(input, analysis, profile) {
  if (input.taskType === 'knowledge-card') {
    const card = analysis;
    const point = input.source?.knowledgePoint || {};
    const errors = [];
    if (!card || typeof card !== 'object' || Array.isArray(card)) return ['studyCard must be an object'];
    if (card.id !== point.id || card.knowledgePointId !== point.id) errors.push('studyCard id and knowledgePointId must match the task knowledge point');
    if (card.partId && card.partId !== String(point.id).split('-')[0]) errors.push('studyCard partId does not match knowledge point');
    if (JSON.stringify(card.exerciseIds || []) !== JSON.stringify(point.exerciseIds || [])) errors.push('studyCard exerciseIds must exactly match the knowledge point');
    if (card.reviewStatus !== 'approved') errors.push('studyCard reviewStatus must be approved');
    if (!String(card.overview || '').trim()) errors.push('studyCard overview is required');
    if (!Array.isArray(card.rules) || !card.rules.length) errors.push('studyCard rules are required');
    if (!Array.isArray(card.examples) || card.examples.length < 4 || card.examples.length > 6) errors.push('studyCard requires four to six examples');
    if (!Array.isArray(card.checks) || card.checks.length < 3 || card.checks.length > 5) errors.push('studyCard requires three to five checks');
    if (!Array.isArray(card.lessons) || !card.lessons.length) errors.push('studyCard lessons are required');
    if (profile.knowledgeCardVersion === 2) {
      const { validateTeachingNarrativeV2 } = require('./russian-b2/lib/study-cards');
      errors.push(...validateTeachingNarrativeV2(card));
    }
    return errors;
  }
  const errors = [];
  if (!analysis || typeof analysis !== 'object') return ['answerAnalysis must be an object'];
  if (analysis.presentation?.mode !== profile.acceptedPresentationMode) {
    errors.push(`presentation.mode must be ${profile.acceptedPresentationMode}`);
  }
  if (!String(analysis.conclusion || analysis.correctReason || '').trim()) {
    errors.push('default-layer conclusion or correctReason is required');
  }
  const evidenceItems = Array.isArray(analysis.evidenceItems) ? analysis.evidenceItems : [];
  const evidence = analysis.evidence && analysis.evidence.ru
    ? [{ quoteRu: analysis.evidence.ru, paragraphIndex: null }]
    : [];
  const source = (input.source.original || []).map(normalizeEvidenceText);
  for (const item of evidenceItems.length ? evidenceItems : evidence) {
    const quote = normalizeEvidenceText(item.quoteRu || item.quote);
    const paragraph = Number.isInteger(item.paragraphIndex) ? source[item.paragraphIndex] : null;
    if (profile.adapter === 'b2-reading' && analysis.locatorStatus === 'exact' && Number.isInteger(item.paragraphIndex) && !paragraph) {
      errors.push(`exact evidence paragraph does not exist: ${item.paragraphIndex}`);
      continue;
    }
    const matches = paragraph ? paragraph.includes(quote) : source.some((value) => value.includes(quote));
    if (!quote || (analysis.locatorStatus === 'exact' && !matches)) {
      errors.push(`exact evidence does not resolve at paragraph ${item.paragraphIndex}`);
    }
  }
  const liveKeys = input.question.options.map(optionKey).filter(Boolean);
  const mapped = Array.isArray(analysis.options) && analysis.options.length
    ? analysis.options
    : [
        analysis.correctOption && { key: analysis.correctOption.key, status: 'correct' },
        ...(analysis.distractors || []).map((item) => ({ key: item.key, status: 'wrong' }))
      ].filter(Boolean);
  const mappedKeys = mapped.map((item) => String(item.key || '').trim());
  const correct = mapped
    .filter((item) => item.status === 'correct')
    .map((item) => String(item.key || '').trim());
  if (liveKeys.length) {
    if (mappedKeys.length !== liveKeys.length || liveKeys.some((key) => !mappedKeys.includes(key))) {
      errors.push('analysis option keys must exactly match live option keys');
    }
    if (correct.length !== 1 || correct[0] !== String(input.question.canonicalAnswer)) {
      errors.push('analysis correct option must equal the canonical answer');
    }
  }
  if (!String(analysis.pitfall || '').trim()) errors.push('expanded-layer pitfall is required');
  if (!String(analysis.nextCheck || '').trim()) errors.push('expanded-layer nextCheck is required');
  if (profile.adapter === 'grammar') errors.push(...grammarContractErrors(analysis, profile));
  if (profile.adapter === 'b2-reading') errors.push(...readingContractErrors(input, analysis));
  return errors;
}

function submitArtifact(profile, state, { taskId: id, artifactFile, worker }) {
  const repositoryRoot = profile.repositoryRoot || REPOSITORY_ROOT;
  if (!id || !artifactFile) throw new Error('submit requires --task <id> --artifact <file>');
  const task = findTask(state, id);
  if (task.status !== 'claimed') throw new Error(`Task ${id} is not claimed`);
  if (worker && task.lease?.worker !== worker) throw new Error(`Task ${id} is leased by another worker`);
  const absoluteArtifact = path.resolve(repositoryRoot, artifactFile);
  if (!fs.existsSync(absoluteArtifact)) throw new Error(`Missing artifact: ${absoluteArtifact}`);
  const artifact = readJson(absoluteArtifact);
  const inputFile = path.join(profile.statePath, 'inputs', `${id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
  const input = readJson(inputFile);
  const errors = [];
  if (artifact.schema !== ARTIFACT_SCHEMA) errors.push(`schema must be ${ARTIFACT_SCHEMA}`);
  if (artifact.taskId !== id) errors.push('artifact taskId mismatch');
  if (artifact.inputHash !== task.inputHash) errors.push('artifact inputHash mismatch');
  errors.push(...validateAnalysis(input, input.taskType === 'knowledge-card' ? artifact.studyCard : artifact.answerAnalysis, profile));
  if (errors.length) {
    task.history.push({ event: 'submission-rejected', at: now(), worker: task.lease?.worker, errors });
    state.revision += 1;
    saveState(profile, state);
    throw new Error(`Artifact rejected:\n- ${errors.join('\n- ')}`);
  }
  const destination = path.join(profile.statePath, 'artifacts', `${id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
  writeJsonAtomic(destination, artifact);
  task.status = 'validated';
  task.artifact = {
    file: normalizePath(path.relative(repositoryRoot, destination)),
    hash: sha256(fs.readFileSync(destination)),
    validatedAt: now()
  };
  task.history.push({ event: 'validated', at: task.artifact.validatedAt, worker: task.lease?.worker });
  task.lease = null;
  state.revision += 1;
  saveState(profile, state);
  return task;
}

function verifyProtectedSource(profile, task, input, chapter) {
  const exercise = profile.adapter === 'b2-reading'
    ? chapter.questions && chapter.questions[task.exerciseIndex]
    : chapter.exercises && chapter.exercises[task.exerciseIndex];
  if (!exercise) throw new Error(`Exercise disappeared for ${task.id}`);
  const currentHash = stableHash(protectedSnapshot(exercise, profile));
  if (currentHash !== task.protectedHash) {
    throw new Error(`Protected source changed for ${task.id}; refresh and regenerate before integration.`);
  }
  if (String(exercise.answer || '') !== String(input.question.canonicalAnswer || '')) {
    throw new Error(`Canonical answer changed for ${task.id}`);
  }
  return exercise;
}

function integrateTask(profile, state, id) {
  const repositoryRoot = profile.repositoryRoot || REPOSITORY_ROOT;
  const task = findTask(state, id);
  if (task.status !== 'validated') throw new Error(`Task ${id} is not validated`);
  const inputFile = path.join(profile.statePath, 'inputs', `${id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
  const input = readJson(inputFile);
  const artifact = readJson(path.resolve(repositoryRoot, task.artifact.file));
  const sourceFile = path.resolve(repositoryRoot, task.sourceFile);
  const chapter = readJson(sourceFile);
  if (task.type === 'knowledge-card') {
    if (!task.targetFile) throw new Error(`Missing knowledge card target for ${id}`);
    const targetFile = path.resolve(repositoryRoot, task.targetFile);
    writeJsonAtomic(targetFile, artifact.studyCard);
    if (profile.cardIndexFile) {
      const indexFile = path.resolve(repositoryRoot, profile.cardIndexFile);
      const index = fs.existsSync(indexFile) ? readJson(indexFile) : { cards: [] };
      index.cards = Array.isArray(index.cards) ? index.cards : [];
      const pointId = input.source?.knowledgePoint?.id;
      const relativeCard = normalizePath(path.relative(path.resolve(repositoryRoot, profile.cardDirectory), targetFile));
      const existing = index.cards.find((entry) => (entry.knowledgePointId || entry.id) === pointId);
      if (existing) {
        existing.source = relativeCard;
        existing.status = 'approved';
        existing.id = existing.id || pointId;
        existing.partId = existing.partId || String(pointId).split('-')[0];
        existing.knowledgePointId = pointId;
      } else {
        index.cards.push({ id: pointId, partId: String(pointId).split('-')[0], knowledgePointId: pointId, source: relativeCard, status: 'approved' });
      }
      writeJsonAtomic(indexFile, index);
      try {
        const { buildStudyCards } = require('./russian-b2/lib/study-cards');
        buildStudyCards({ root: repositoryRoot, write: true });
      } catch (error) {
        throw new Error(`Knowledge card validation/build failed: ${error.message}`);
      }
    }
    task.status = 'completed';
    task.history.push({ event: 'integrated', at: now(), artifactHash: task.artifact.hash });
    state.revision += 1;
    saveState(profile, state);
    return task;
  }
  const exercise = verifyProtectedSource(profile, task, input, chapter);
  if (profile.adapter === 'grammar') {
    if (task.targetFile) {
      const targetFile = path.resolve(repositoryRoot, task.targetFile);
      const document = readJson(targetFile);
      const targetIndex = (document.explanations || []).findIndex((item) => item.exerciseId === input.question.id);
      if (targetIndex < 0) throw new Error(`Grammar explanation target disappeared for ${id}`);
      document.explanations[targetIndex] = { exerciseId: input.question.id, ...artifact.answerAnalysis };
      writeJsonAtomic(targetFile, document);
    } else {
      exercise[profile.outputField || 'answerAnalysis'] = artifact.answerAnalysis;
      writeJsonAtomic(sourceFile, chapter);
    }
  } else {
    exercise[profile.outputField || 'answerAnalysis'] = artifact.answerAnalysis;
    writeJsonAtomic(sourceFile, chapter);
  }
  task.status = 'completed';
  task.history.push({ event: 'integrated', at: now(), artifactHash: task.artifact.hash });
  state.revision += 1;
  saveState(profile, state);
  return task;
}

function releaseTask(profile, state, id, worker) {
  const task = findTask(state, id);
  if (task.status !== 'claimed') throw new Error(`Task ${id} is not claimed`);
  if (worker && task.lease?.worker !== worker) throw new Error(`Task ${id} is leased by another worker`);
  task.history.push({ event: 'released', at: now(), worker: task.lease?.worker });
  task.status = 'pending';
  task.lease = null;
  state.revision += 1;
  saveState(profile, state);
  return task;
}

function blockTask(profile, state, id, reason, details) {
  if (!reason) throw new Error('block requires --reason <code>');
  const task = findTask(state, id);
  if (TERMINAL_STATUSES.has(task.status)) throw new Error(`Task ${id} is already ${task.status}`);
  task.status = 'blocked';
  task.block = { reason, details: details || '', at: now() };
  task.history.push({ event: 'blocked', ...task.block });
  task.lease = null;
  state.revision += 1;
  saveState(profile, state);
  return task;
}

function unblockTask(profile, state, id) {
  const task = findTask(state, id);
  if (task.status !== 'blocked') throw new Error(`Task ${id} is not blocked`);
  task.history.push({ event: 'unblocked', at: now(), previousBlock: task.block, previousAttempts: task.attempts });
  task.status = 'pending';
  task.attempts = 0;
  task.block = null;
  task.lease = null;
  state.revision += 1;
  saveState(profile, state);
  return task;
}

function verifyState(profile, state) {
  const errors = [];
  const ids = new Set();
  for (const task of state.tasks) {
    if (ids.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
    ids.add(task.id);
    if (!TASK_TYPES.has(task.type)) errors.push(`unknown task type: ${task.type}`);
    if (task.status === 'claimed' && !task.lease) errors.push(`claimed task has no lease: ${task.id}`);
    if (task.status === 'blocked' && !task.block?.reason) errors.push(`blocked task has no reason: ${task.id}`);
    if (task.status === 'validated' || task.status === 'completed') {
      if (!task.artifact && task.status === 'validated') errors.push(`validated task has no artifact: ${task.id}`);
    }
    const inputFile = path.join(profile.statePath, 'inputs', `${task.id.replace(/[^A-Za-z0-9_.-]+/g, '_')}.json`);
    if (!fs.existsSync(inputFile)) errors.push(`missing input: ${task.id}`);
    if (fs.existsSync(inputFile) && task.status === 'completed') {
      const input = readJson(inputFile);
      if (task.type === 'knowledge-card') {
        if (!task.targetFile || !fs.existsSync(path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, task.targetFile))) {
          errors.push(`missing integrated knowledge card: ${task.id}`);
        } else {
          try {
            const card = readJson(path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, task.targetFile));
            errors.push(...validateAnalysis(input, card, profile).map((message) => `${task.id}: ${message}`));
          } catch (error) {
            errors.push(`${task.id}: invalid integrated knowledge card: ${error.message}`);
          }
        }
        continue;
      }
      const sourceFile = path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, task.sourceFile);
      if (!fs.existsSync(sourceFile)) {
        errors.push(`missing source for completed task: ${task.id}`);
      } else {
        const chapter = readJson(sourceFile);
        const exercise = chapterQuestions(profile, chapter)[task.exerciseIndex];
        let integrated = exercise && exercise[profile.outputField || 'answerAnalysis'];
        if (profile.adapter === 'grammar' && task.targetFile) {
          const document = readJson(path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, task.targetFile));
          integrated = (document.explanations || []).find((item) => item.exerciseId === input.question.id);
        }
        const analysisErrors = validateAnalysis(input, integrated, profile);
        errors.push(...analysisErrors.map((message) => `${task.id}: ${message}`));
      }
    }
    if (task.status === 'validated' && task.artifact) {
      const artifactFile = path.resolve(profile.repositoryRoot || REPOSITORY_ROOT, task.artifact.file);
      if (!fs.existsSync(artifactFile)) errors.push(`missing validated artifact: ${task.id}`);
      else if (sha256(fs.readFileSync(artifactFile)) !== task.artifact.hash) errors.push(`validated artifact hash changed: ${task.id}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function summarize(state) {
  const statuses = {};
  for (const task of state.tasks) statuses[task.status] = (statuses[task.status] || 0) + 1;
  const total = state.tasks.length;
  const completed = statuses.completed || 0;
  return {
    bookId: state.bookId,
    title: state.title,
    revision: state.revision,
    chapters: state.chapters.length,
    tasks: total,
    statuses,
    progress: total ? Number((completed / total).toFixed(4)) : 1,
    actionable: (statuses.pending || 0) + (statuses.claimed || 0) + (statuses.validated || 0),
    stopped: total > 0 && (statuses.completed || 0) + (statuses.blocked || 0) === total,
    updatedAt: state.updatedAt
  };
}

function nextAction(summary) {
  if (summary.statuses.validated) return 'integrate-ready';
  if (summary.statuses.pending) return 'claim';
  if (summary.statuses.claimed) return 'wait-or-resume-after-lease';
  if (summary.statuses.blocked) return 'review-blocked-items';
  return 'complete';
}

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

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return [
    'Usage: node scripts/reader-book-pipeline.js <command> <profile> [options]',
    '',
    'Commands:',
    '  init <profile>',
    '  refresh <profile>',
    '  resume <profile>',
    '  status <profile>',
    '  claim <profile> --worker <id> [--limit N] [--types question-explanation,knowledge-card]',
    '  submit <profile> --task <id> --artifact <file> [--worker <id>]',
    '  integrate <profile> --task <id>',
    '  integrate-ready <profile> [--limit N]',
    '  release <profile> --task <id> [--worker <id>]',
    '  block <profile> --task <id> --reason <code> [--details text]',
    '  unblock <profile> --task <id>',
    '  verify <profile>'
  ].join('\n');
}

function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const [command, profileName] = positional;
  if (!command || !profileName) {
    process.stderr.write(`${usage()}\n`);
    return 1;
  }
  const profile = resolveProfile(profileName);
  let state;
  if (command === 'init') {
    state = initialize(profile);
    print(summarize(state));
    return 0;
  }
  if (command === 'refresh') {
    state = initialize(profile, { refresh: true });
    print(summarize(state));
    return 0;
  }
  state = loadState(profile);
  if (command === 'status') {
    const summary = summarize(state);
    print({ ...summary, nextAction: nextAction(summary) });
    return 0;
  }
  if (command === 'resume') {
    const released = releaseExpiredLeases(state);
    if (released) {
      state.revision += 1;
      saveState(profile, state);
    }
    const summary = summarize(state);
    print({ releasedExpiredLeases: released, ...summary, nextAction: nextAction(summary) });
    return 0;
  }
  if (command === 'claim') {
    const requestedLimit = Number(flags.limit || profile.defaultBatchSize || 1);
    const limit = Math.min(
      Math.max(1, requestedLimit),
      Math.max(1, Number(profile.maxBatchSize || requestedLimit))
    );
    const selected = claimTasks(profile, state, {
      worker: flags.worker,
      limit,
      types: flags.types ? String(flags.types).split(',') : [],
      taskIds: flags.tasks ? String(flags.tasks).split(',') : []
    });
    print({ claimed: selected.length, tasks: selected });
    return 0;
  }
  if (command === 'submit') {
    print(submitArtifact(profile, state, {
      taskId: flags.task,
      artifactFile: flags.artifact,
      worker: flags.worker
    }));
    return 0;
  }
  if (command === 'integrate') {
    print(integrateTask(profile, state, flags.task));
    return 0;
  }
  if (command === 'integrate-ready') {
    const limit = Math.max(1, Number(flags.limit || Number.MAX_SAFE_INTEGER));
    const ready = state.tasks.filter((task) => task.status === 'validated').slice(0, limit);
    const integrated = ready.map((task) => integrateTask(profile, state, task.id).id);
    print({ integrated: integrated.length, taskIds: integrated, summary: summarize(state) });
    return 0;
  }
  if (command === 'release') {
    print(releaseTask(profile, state, flags.task, flags.worker));
    return 0;
  }
  if (command === 'block') {
    print(blockTask(profile, state, flags.task, flags.reason, flags.details));
    return 0;
  }
  if (command === 'unblock') {
    print(unblockTask(profile, state, flags.task));
    return 0;
  }
  if (command === 'verify') {
    const result = verifyState(profile, state);
    print({ ...result, summary: summarize(state), tests: profile.tests || [] });
    return result.ok ? 0 : 1;
  }
  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  ARTIFACT_SCHEMA,
  STATE_SCHEMA,
  buildInventory,
  blockTask,
  chapterCoverage,
  claimTasks,
  createState,
  initialize,
  integrateTask,
  loadState,
  nextAction,
  normalizeEvidenceText,
  optionKey,
  protectedSnapshot,
  releaseTask,
  releaseExpiredLeases,
  resolveProfile,
  saveState,
  stableHash,
  submitArtifact,
  summarize,
  validateAnalysis,
  grammarContractErrors,
  unblockTask,
  verifyState,
  writeJsonAtomic
};
