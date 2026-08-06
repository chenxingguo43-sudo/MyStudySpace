#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const BOOK_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking');
const REBUILD_DIR = path.join(BOOK_DIR, 'rebuild');
const UNIT_DIR = path.join(REBUILD_DIR, 'units');
const MANIFEST_PATH = path.join(REBUILD_DIR, 'manifest.json');
const RELEASE_DIR = path.join(REBUILD_DIR, 'releases');
const TRANSLATION_DIR = path.join(ROOT, '俄语资料库', 'В мире людей 听力口语 Markdown版', '翻译');
const TRANSLATION_AUDIT_PATH = path.join(REBUILD_DIR, 'audits', 'translation-candidates.json');
const RELEASE_CANDIDATE_REPORT_PATH = path.join(REBUILD_DIR, 'reports', 'release-candidate.json');
const TARGET_CHAPTER_COUNT = 35;
const STATES = new Set([
  'inventory_locked', 'media_verified', 'coverage_resolved', 'timeline_complete',
  'translation_complete', 'evidence_complete', 'conflicts_resolved', 'data_validated',
  'browser_validated', 'release_ready', 'published', 'baseline_template'
]);
const RELEASE_STATES = new Set(['release_ready', 'published']);
const EVIDENCE_STATES = new Set(['playable', 'not-in-bound-media']);

function chapterFile(index) {
  return 'ch' + String(index).padStart(4, '0') + '.json';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function copyFileWithRetry(sourcePath, targetPath, attempts = 5) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.copyFileSync(sourcePath, targetPath);
      return;
    } catch (error) {
      lastError = error;
      const transient = ['UNKNOWN', 'EPERM', 'EBUSY'].includes(error.code);
      if (!transient || attempt === attempts - 1) throw error;
      const delayMs = 25 * (attempt + 1);
      const wait = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(wait, 0, 0, delayMs);
    }
  }
  throw lastError;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function mediaFiles(chapter) {
  const media = chapter.media || {};
  if (Array.isArray(media.playlist) && media.playlist.length) return media.playlist.map(item => item.file).filter(Boolean);
  return media.file ? [media.file] : [];
}

function segmentId(index, segmentIndex) {
  return 'ch' + String(index).padStart(4, '0') + '-s' + String(segmentIndex + 1).padStart(3, '0');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function findEvidenceSegmentIds(segments, quote) {
  const target = normalizeText(quote);
  if (!target) return [];
  return segments
    .filter(segment => {
      const text = normalizeText(segment.text);
      return text && (text.includes(target) || target.includes(text));
    })
    .map(segment => segment.segmentId);
}

function normalizeEvidence(evidence, segments) {
  if (!evidence) return null;
  const status = evidence.status === 'not-in-bound-media' ? 'not-in-bound-media' : 'playable';
  const items = Array.isArray(evidence.items) && evidence.items.length ? evidence.items : [{
    quote: evidence.quote,
    translation: evidence.translation
  }];
  const normalizedItems = items.map(item => ({
    quote: item.quote || '',
    translation: item.translation || evidence.translation || '',
    segmentIds: findEvidenceSegmentIds(segments, item.quote || evidence.quote)
  }));
  const segmentIds = [...new Set(normalizedItems.flatMap(item => item.segmentIds))];
  return {
    status,
    quote: evidence.quote || normalizedItems[0].quote,
    translation: evidence.translation || normalizedItems[0].translation,
    reasoning: evidence.reasoning || '',
    pages: evidence.pages || [],
    items: normalizedItems,
    ...(status === 'playable' ? { segmentIds } : {})
  };
}

function translationSourceFile(index) {
  const topic = index < 5 ? 'Тема 1.2 -- ТРКИ-2 对话（Разговоры. Беседы） -- 中文对照.md'
    : index < 10 ? 'Тема 1.3 -- ТРКИ-2 公告（Объявления） -- 中文对照.md'
      : index < 15 ? 'Тема 1.4 -- ТРКИ-2 广告（Рекламные объявления） -- 中文对照.md'
        : index < 20 ? 'Тема 1.5 -- ТРКИ-2 电影独白（Художественные фильмы — Монологи） -- 中文对照.md'
          : index < 25 ? 'Тема 1.6 -- ТРКИ-2 电影对话（Художественные фильмы — Диалоги） -- 中文对照.md'
            : index < 30 ? 'Тема 1.7 -- ТРКИ-2 采访（Интервью） -- 中文对照.md'
              : 'Тема 1.8 -- ТРКИ-2 新闻（Новости） -- 中文对照.md';
  return path.join(TRANSLATION_DIR, topic);
}

function translationPairs(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const pairs = [];
  const pattern = /\*\*俄语原文：\*\*\s*([\s\S]*?)\s*\*\*中文翻译：\*\*\s*([\s\S]*?)(?=\n---|\n###|\n####|\n\*\*俄语原文：\*\*|$)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const russian = match[1].trim();
    const chinese = match[2].trim();
    if (russian && chinese) pairs.push({ russian, chinese });
  }
  return pairs;
}

function translationCandidates(index, segments) {
  const filePath = translationSourceFile(index);
  const pairs = translationPairs(filePath);
  return {
    sourceFile: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    sourcePairCount: pairs.length,
    segments: segments.map((segment, segmentIndex) => {
      const target = normalizeText(segment.text);
      const candidates = pairs.filter(pair => normalizeText(pair.russian).includes(target)).map(pair => ({
        russian: pair.russian,
        chinese: pair.chinese,
        exactRussianBlock: normalizeText(pair.russian) === target
      }));
      return { segmentId: segmentId(index, segmentIndex), candidateCount: candidates.length, candidates };
    })
  };
}

function auditTranslations() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error('missing rebuild manifest; run init first');
  const manifest = readJson(MANIFEST_PATH);
  const units = manifest.units.map(entry => {
    const index = Number(entry.chapterFile.slice(2, 6));
    const unit = readJson(path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json')));
    return { chapterFile: entry.chapterFile, ...translationCandidates(index, unit.segments) };
  });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    policy: 'candidate-only: a containing translation block is never auto-published as a sentence translation',
    units
  };
  writeJson(TRANSLATION_AUDIT_PATH, report);
  return report;
}

function unitSeed(index, chapter) {
  const segments = chapter.transcriptSegments || [];
  const questions = chapter.questions || [];
  const hasTemplateData = chapter.learningSupport && chapter.learningSupport.status === 'source-checked';
  return {
    schemaVersion: 1,
    chapterFile: chapterFile(index),
    unitId: chapter.id,
    status: hasTemplateData ? 'baseline_template' : 'inventory_locked',
    source: {
      chapterSha256: sha256(path.join(BOOK_DIR, chapterFile(index))),
      timelineFile: fs.existsSync(path.join(BOOK_DIR, 'timelines', chapterFile(index))) ? 'timelines/' + chapterFile(index) : null,
      sourcePages: chapter.sourcePages || [],
      mediaFiles: mediaFiles(chapter)
    },
    coverage: chapter.transcriptCoverage || { kind: 'unresolved' },
    segments: segments.map((segment, segmentIndex) => ({
      segmentId: segmentId(index, segmentIndex),
      text: segment.text || '',
      translation: segment.translation || '',
      playlistIndex: Number(segment.playlistIndex) || 0,
      startTime: Number(segment.startTime) || 0,
      endTime: Number(segment.endTime) || 0,
      timingStatus: segment.timingStatus || 'unresolved',
      sourceSentenceIndexes: segment.sourceSentenceIndexes || []
    })),
    questions: questions.map(question => ({
      id: question.id,
      answer: question.answer,
      evidence: normalizeEvidence(question.evidence, segments.map((segment, segmentIndex) => ({
        ...segment,
        segmentId: segmentId(index, segmentIndex)
      })))
    })),
    learningSupport: chapter.learningSupport || null,
    conflicts: []
  };
}

function manifestEntry(index, chapter, unit) {
  return {
    chapterFile: chapterFile(index),
    unitId: chapter.id,
    title: chapter.title,
    status: unit.status,
    source: unit.source,
    metrics: {
      segments: unit.segments.length,
      timedSegments: unit.segments.filter(segment => segment.endTime > segment.startTime).length,
      translatedSegments: unit.segments.filter(segment => segment.translation).length,
      questions: unit.questions.length,
      evidencedQuestions: unit.questions.filter(question => question.evidence).length
    }
  };
}

function buildManifest() {
  const entries = [];
  for (let index = 0; index < TARGET_CHAPTER_COUNT; index += 1) {
    const chapter = readJson(path.join(BOOK_DIR, chapterFile(index)));
    if (!chapter.media || chapter.media.status !== 'verified') throw new Error(chapterFile(index) + ' is not bound to verified media');
    const unit = unitSeed(index, chapter);
    entries.push({ unit, manifest: manifestEntry(index, chapter, unit) });
  }
  return {
    manifest: {
      schemaVersion: 1,
      scope: 'В мире людей. Выпуск 2 · 35 verified-media listening units',
      targetChapterCount: TARGET_CHAPTER_COUNT,
      releasePolicy: 'atomic-35-unit-release',
      unavailablePolicy: 'no-tts-no-substitute-media',
      units: entries.map(entry => entry.manifest)
    },
    units: entries.map(entry => entry.unit)
  };
}

function validateUnit(unit, manifestUnit) {
  const errors = [];
  if (!unit || unit.schemaVersion !== 1) errors.push('unit schemaVersion must be 1');
  if (!unit || unit.chapterFile !== manifestUnit.chapterFile) errors.push('chapterFile does not match manifest');
  if (!unit || unit.unitId !== manifestUnit.unitId) errors.push('unitId does not match manifest');
  if (!unit || !STATES.has(unit.status)) errors.push('invalid unit status');
  const segmentIds = new Set();
  (unit && unit.segments || []).forEach(segment => {
    if (!segment.segmentId || segmentIds.has(segment.segmentId)) errors.push('segmentId must be unique');
    segmentIds.add(segment.segmentId);
  });
  const questions = unit && unit.questions || [];
  const questionIds = new Set();
  questions.forEach(question => {
    if (!question.id || questionIds.has(question.id)) errors.push('question id must be unique');
    questionIds.add(question.id);
  });
  if (RELEASE_STATES.has(unit && unit.status)) {
    if (!unit.learningSupport || unit.learningSupport.status !== 'source-checked' || !unit.learningSupport.sourceFile) {
      errors.push('release unit needs a source-checked learningSupport sourceFile');
    }
    const previousByPlaylist = new Map();
    (unit.segments || []).forEach(segment => {
      if (!(segment.endTime > segment.startTime)) errors.push(segment.segmentId + ' needs a valid time range');
      if (!segment.translation) errors.push(segment.segmentId + ' needs a translation');
      const previous = previousByPlaylist.get(segment.playlistIndex);
      if (previous && segment.startTime < previous.endTime) errors.push(segment.segmentId + ' overlaps a previous segment');
      previousByPlaylist.set(segment.playlistIndex, segment);
    });
    questions.forEach(question => {
      const evidence = question.evidence;
      if (!evidence || !evidence.status) errors.push(question.id + ' needs evidence status');
      if (evidence && evidence.status === 'playable') {
        const refs = evidence.segmentIds || [];
        if (!refs.length || refs.some(id => !segmentIds.has(id))) errors.push(question.id + ' references missing segmentIds');
      }
      if (evidence && !EVIDENCE_STATES.has(evidence.status)) errors.push(question.id + ' has invalid evidence status');
      if (evidence && (!evidence.quote || !evidence.translation)) errors.push(question.id + ' needs Russian and Chinese evidence text');
      if (evidence && !evidence.reasoning) errors.push(question.id + ' needs answer reasoning');
      if (evidence && (!Array.isArray(evidence.pages) || !evidence.pages.length)) errors.push(question.id + ' needs source pages');
      if (evidence && !Array.isArray(evidence.items)) errors.push(question.id + ' needs evidence items');
      (evidence && evidence.items || []).forEach((item, itemIndex) => {
        if (!item.quote || !item.translation) errors.push(question.id + ' evidence item ' + (itemIndex + 1) + ' needs Russian and Chinese text');
        if (evidence.status === 'playable' && (!Array.isArray(item.segmentIds) || !item.segmentIds.length || item.segmentIds.some(id => !segmentIds.has(id)))) {
          errors.push(question.id + ' evidence item ' + (itemIndex + 1) + ' references missing segmentIds');
        }
      });
    });
    if ((unit.conflicts || []).some(conflict => conflict.status === 'pending')) errors.push('unit has pending conflicts');
  }
  return errors;
}

function validateRebuild(options) {
  const releaseCheck = Boolean(options && options.releaseCheck);
  if (!fs.existsSync(MANIFEST_PATH)) return ['missing rebuild manifest'];
  const manifest = readJson(MANIFEST_PATH);
  const errors = [];
  if (manifest.schemaVersion !== 1) errors.push('manifest schemaVersion must be 1');
  if (manifest.targetChapterCount !== TARGET_CHAPTER_COUNT) errors.push('manifest targetChapterCount must be 35');
  if (!Array.isArray(manifest.units) || manifest.units.length !== TARGET_CHAPTER_COUNT) errors.push('manifest must contain 35 units');
  const seen = new Set();
  (manifest.units || []).forEach(entry => {
    if (!entry.chapterFile || seen.has(entry.chapterFile)) errors.push('manifest chapterFile must be unique');
    seen.add(entry.chapterFile);
    const unitPath = path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json'));
    if (!fs.existsSync(unitPath)) { errors.push(entry.chapterFile + ' is missing a learning unit'); return; }
    if (entry.status !== 'published' && entry.source && entry.source.chapterSha256) {
      const sourcePath = path.join(BOOK_DIR, entry.chapterFile);
      if (!fs.existsSync(sourcePath) || sha256(sourcePath) !== entry.source.chapterSha256) errors.push(entry.chapterFile + ': formal chapter changed since inventory lock');
    }
    validateUnit(readJson(unitPath), entry).forEach(error => errors.push(entry.chapterFile + ': ' + error));
  });
  if (releaseCheck && (manifest.units || []).some(entry => !RELEASE_STATES.has(entry.status))) errors.push('all manifest units must be release_ready or published');
  return errors;
}

function releaseCandidateReport() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error('missing rebuild manifest; run init first');
  const manifest = readJson(MANIFEST_PATH);
  const units = manifest.units.map(entry => {
    const unitPath = path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json'));
    const unit = readJson(unitPath);
    const candidate = { ...unit, status: 'release_ready' };
    const errors = validateUnit(candidate, entry);
    const formalPath = path.join(BOOK_DIR, entry.chapterFile);
    if (entry.status !== 'published' && (!entry.source || !entry.source.chapterSha256 || !fs.existsSync(formalPath) || sha256(formalPath) !== entry.source.chapterSha256)) {
      errors.push('formal chapter changed since inventory lock');
    }
    return {
      chapterFile: entry.chapterFile,
      candidateStatus: errors.length ? 'blocked' : 'ready',
      errors
    };
  });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    releasePolicy: 'atomic-35-unit-release',
    readyCount: units.filter(unit => unit.candidateStatus === 'ready').length,
    blockedCount: units.filter(unit => unit.candidateStatus === 'blocked').length,
    units
  };
  writeJson(RELEASE_CANDIDATE_REPORT_PATH, report);
  return report;
}

function promoteReleaseReady() {
  const candidate = releaseCandidateReport();
  if (candidate.blockedCount) throw new Error('release promotion blocked:\n' + candidate.units
    .filter(unit => unit.candidateStatus === 'blocked')
    .map(unit => unit.chapterFile + ': ' + unit.errors.join('; ')).join('\n'));
  const manifest = readJson(MANIFEST_PATH);
  manifest.units.forEach(entry => {
    const unitPath = path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json'));
    const unit = readJson(unitPath);
    unit.status = 'release_ready';
    writeJson(unitPath, unit);
    entry.status = 'release_ready';
    entry.metrics = {
      segments: unit.segments.length,
      timedSegments: unit.segments.filter(segment => segment.endTime > segment.startTime).length,
      translatedSegments: unit.segments.filter(segment => segment.translation).length,
      questions: unit.questions.length,
      evidencedQuestions: unit.questions.filter(question => question.evidence).length
    };
  });
  manifest.releaseReadyAt = new Date().toISOString();
  manifest.updatedAt = manifest.releaseReadyAt;
  writeJson(MANIFEST_PATH, manifest);
  const errors = validateRebuild({ releaseCheck: true });
  if (errors.length) throw new Error('release promotion validation failed:\n' + errors.join('\n'));
  return { count: manifest.units.length, releaseReadyAt: manifest.releaseReadyAt };
}

function releasePreflight() {
  const errors = validateRebuild({ releaseCheck: true });
  if (errors.length) throw new Error('release preflight blocked:\n' + errors.join('\n'));
  const manifest = readJson(MANIFEST_PATH);
  const preflightPath = path.join(RELEASE_DIR, 'preflight-' + releaseId());
  const backupPath = path.join(preflightPath, 'before');
  const restoreCheckPath = path.join(preflightPath, 'restore-check');
  const files = manifest.units.map(entry => entry.chapterFile);
  fs.mkdirSync(backupPath, { recursive: true });
  fs.mkdirSync(restoreCheckPath, { recursive: true });
  const checks = files.map(file => {
    const formalPath = path.join(BOOK_DIR, file);
    const backupFile = path.join(backupPath, file);
    const restoredFile = path.join(restoreCheckPath, file);
    copyFileWithRetry(formalPath, backupFile);
    copyFileWithRetry(backupFile, restoredFile);
    return {
      chapterFile: file,
      originalSha256: sha256(formalPath),
      backupSha256: sha256(backupFile),
      restoredSha256: sha256(restoredFile)
    };
  });
  const failed = checks.filter(check => check.originalSha256 !== check.backupSha256 || check.backupSha256 !== check.restoredSha256);
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    activeFilesModified: false,
    backupPath: path.relative(REBUILD_DIR, backupPath).replace(/\\/g, '/'),
    restoreCheckPath: path.relative(REBUILD_DIR, restoreCheckPath).replace(/\\/g, '/'),
    count: checks.length,
    passed: failed.length === 0,
    failed,
    checks
  };
  writeJson(path.join(preflightPath, 'report.json'), report);
  if (failed.length) throw new Error('backup restore preflight failed for ' + failed.map(check => check.chapterFile).join(', '));
  return report;
}

function init(force) {
  if (fs.existsSync(MANIFEST_PATH) && !force) throw new Error('rebuild manifest already exists; use --force only after preserving staged work');
  const output = buildManifest();
  writeJson(MANIFEST_PATH, output.manifest);
  output.units.forEach(unit => writeJson(path.join(UNIT_DIR, unit.chapterFile.replace(/\.json$/, '.learning.json')), unit));
  return output.manifest;
}

function normalizeTemplateEvidence() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error('missing rebuild manifest; run init first');
  const manifest = readJson(MANIFEST_PATH);
  let updated = 0;
  manifest.units.forEach(entry => {
    if (entry.status !== 'baseline_template') return;
    const unitPath = path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json'));
    const unit = readJson(unitPath);
    unit.questions = unit.questions.map(question => ({
      ...question,
      evidence: normalizeEvidence(question.evidence, unit.segments)
    }));
    writeJson(unitPath, unit);
    updated += 1;
  });
  return updated;
}

function normalizeLearningSupportStatus() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error('missing rebuild manifest; run init first');
  const manifest = readJson(MANIFEST_PATH);
  let updated = 0;
  manifest.units.forEach(entry => {
    const unitPath = path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json'));
    const unit = readJson(unitPath);
    const support = unit.learningSupport;
    if (!support || support.status !== 'source-cross-checked') return;
    if (!support.sourceFile) throw new Error(entry.chapterFile + ' has source-cross-checked status without sourceFile');
    unit.learningSupport = { ...support, status: 'source-checked', migratedFromStatus: 'source-cross-checked' };
    writeJson(unitPath, unit);
    updated += 1;
  });
  return updated;
}

function syncManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error('missing rebuild manifest; run init first');
  const manifest = readJson(MANIFEST_PATH);
  manifest.units.forEach(entry => {
    const unit = readJson(path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json')));
    // Keep the manifest's terminal publish state; learning units remain release_ready
    // so they can still be audited and reused for a later atomic release.
    entry.status = entry.status === 'published' || manifest.publishedAt ? 'published' : unit.status;
    entry.metrics = {
      segments: unit.segments.length,
      timedSegments: unit.segments.filter(segment => segment.endTime > segment.startTime).length,
      translatedSegments: unit.segments.filter(segment => segment.translation).length,
      questions: unit.questions.length,
      evidencedQuestions: unit.questions.filter(question => question.evidence).length
    };
  });
  manifest.updatedAt = new Date().toISOString();
  writeJson(MANIFEST_PATH, manifest);
  return manifest;
}

function releaseId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function mergeLearningUnit(chapter, unit) {
  const segmentsById = new Map((unit.segments || []).map(segment => [segment.segmentId, segment]));
  const formalSegments = chapter.transcriptSegments || [];
  const expectedSegmentCount = formalSegments.length;
  const rebuiltSegmentCount = (unit.segments || []).length;
  const isSourceReconstruction = rebuiltSegmentCount !== expectedSegmentCount;

  if (isSourceReconstruction) {
    const verifiedBy = unit.coverage && unit.coverage.verifiedBy;
    const coverageKind = unit.coverage && unit.coverage.kind;
    const isVerifiedExcerpt = coverageKind === 'excerpt'
      && Array.isArray(unit.coverage.omittedSourceSentenceIndexes)
      && unit.coverage.omittedSourceSentenceIndexes.length;
    if (!unit.coverage || (coverageKind !== 'complete' && !isVerifiedExcerpt) || !Array.isArray(verifiedBy) || !verifiedBy.length) {
      throw new Error(unit.chapterFile + ' changes the locked transcript shape without complete or excerpt source reconstruction provenance');
    }
    if ((unit.segments || []).some((segment, index) => (
      segment.segmentId !== segmentId(Number(unit.chapterFile.slice(2, 6)), index)
      || !segment.text
      || !Array.isArray(segment.sourceSentenceIndexes)
      || !segment.sourceSentenceIndexes.length
    ))) {
      throw new Error(unit.chapterFile + ' reconstructed segments need sequential IDs, text, and source sentence references');
    }
    chapter.transcriptSegments = unit.segments.map(segment => ({
      text: segment.text,
      playlistIndex: segment.playlistIndex,
      translation: segment.translation,
      startTime: segment.startTime,
      endTime: segment.endTime,
      timingStatus: segment.timingStatus,
      sourceSentenceIndexes: segment.sourceSentenceIndexes
    }));
    chapter.transcriptCoverage = unit.coverage;
  } else {
    chapter.transcriptSegments = formalSegments.map((segment, index) => {
    const learningSegment = segmentsById.get(segmentId(Number(unit.chapterFile.slice(2, 6)), index));
    if (!learningSegment) throw new Error(unit.chapterFile + ' is missing segment ' + (index + 1));
    if (learningSegment.text !== (segment.text || '')) throw new Error(unit.chapterFile + ' attempts to change locked Russian source text');
    return {
      ...segment,
      translation: learningSegment.translation,
      playlistIndex: learningSegment.playlistIndex,
      startTime: learningSegment.startTime,
      endTime: learningSegment.endTime,
      timingStatus: learningSegment.timingStatus,
      sourceSentenceIndexes: learningSegment.sourceSentenceIndexes
    };
    });
  }
  const evidenceByQuestion = new Map((unit.questions || []).map(question => [question.id, question.evidence]));
  chapter.questions = (chapter.questions || []).map(question => ({
    ...question,
    answer: (() => {
      const learningQuestion = (unit.questions || []).find(item => item.id === question.id);
      if (!learningQuestion || !learningQuestion.answer) return question.answer;
      if (!(question.options || []).some(option => option.key === learningQuestion.answer)) {
        throw new Error(unit.chapterFile + ' has an answer outside the original option set for ' + question.id);
      }
      return learningQuestion.answer;
    })(),
    evidence: evidenceByQuestion.get(question.id) || null
  }));
  chapter.learningSupport = unit.learningSupport;
  return chapter;
}

function publish() {
  const errors = validateRebuild({ releaseCheck: true });
  if (errors.length) throw new Error('release blocked:\n' + errors.join('\n'));
  const manifest = readJson(MANIFEST_PATH);
  const releasePath = path.join(RELEASE_DIR, releaseId());
  const backupDir = path.join(releasePath, 'before');
  const candidates = [];
  manifest.units.forEach(entry => {
    const formalPath = path.join(BOOK_DIR, entry.chapterFile);
    const unit = readJson(path.join(UNIT_DIR, entry.chapterFile.replace(/\.json$/, '.learning.json')));
    candidates.push({ formalPath, chapterFile: entry.chapterFile, data: mergeLearningUnit(readJson(formalPath), unit) });
  });
  fs.mkdirSync(backupDir, { recursive: true });
  candidates.forEach(candidate => copyFileWithRetry(candidate.formalPath, path.join(backupDir, candidate.chapterFile)));
  try {
    candidates.forEach(candidate => writeJson(candidate.formalPath, candidate.data));
  } catch (error) {
    const rollbackErrors = [];
    candidates.forEach(candidate => {
      const backup = path.join(backupDir, candidate.chapterFile);
      if (!fs.existsSync(backup)) return;
      try {
        copyFileWithRetry(backup, candidate.formalPath);
      } catch (rollbackError) {
        rollbackErrors.push(candidate.chapterFile + ': ' + rollbackError.message);
      }
    });
    if (rollbackErrors.length) {
      error.message += '\nRollback errors:\n' + rollbackErrors.join('\n');
    }
    throw error;
  }
  manifest.units.forEach(entry => { entry.status = 'published'; });
  manifest.publishedAt = new Date().toISOString();
  manifest.releaseBackup = path.relative(REBUILD_DIR, backupDir).replace(/\\/g, '/');
  writeJson(MANIFEST_PATH, manifest);
  return { releasePath, count: candidates.length };
}

function runCli() {
  const command = process.argv[2] || 'check';
  if (command === 'init') {
    const manifest = init(process.argv.includes('--force'));
    console.log('Initialized ' + manifest.units.length + ' listening rebuild units.');
    return;
  }
  if (command === 'normalize-template-evidence') {
    console.log('Normalized evidence for ' + normalizeTemplateEvidence() + ' template units.');
    return;
  }
  if (command === 'normalize-learning-support') {
    console.log('Normalized learningSupport status for ' + normalizeLearningSupportStatus() + ' units.');
    return;
  }
  if (command === 'publish') {
    const result = publish();
    console.log('Published ' + result.count + ' units with backup at ' + result.releasePath);
    return;
  }
  if (command === 'translation-audit') {
    const report = auditTranslations();
    console.log('Wrote translation candidates for ' + report.units.length + ' units.');
    return;
  }
  if (command === 'release-candidate') {
    const report = releaseCandidateReport();
    console.log(`Release candidates: ${report.readyCount} ready, ${report.blockedCount} blocked.`);
    return;
  }
  if (command === 'promote-release') {
    const result = promoteReleaseReady();
    console.log('Promoted ' + result.count + ' units to release_ready at ' + result.releaseReadyAt);
    return;
  }
  if (command === 'release-preflight') {
    const result = releasePreflight();
    console.log('Backup and restore preflight passed for ' + result.count + ' units.');
    return;
  }
  if (command === 'sync-manifest') {
    console.log('Synchronized ' + syncManifest().units.length + ' manifest entries.');
    return;
  }
  if (command !== 'check' && command !== 'release-check') throw new Error('Usage: listening-rebuild.js <init|check|release-check|release-candidate|promote-release|release-preflight|normalize-template-evidence|normalize-learning-support|translation-audit|sync-manifest|publish> [--force]');
  const errors = validateRebuild({ releaseCheck: command === 'release-check' });
  if (errors.length) {
    errors.forEach(error => console.error('ERROR: ' + error));
    process.exitCode = 1;
  } else {
    console.log(command + ' passed.');
  }
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error('ERROR: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildManifest, validateRebuild, validateUnit, segmentId, normalizeEvidence, findEvidenceSegmentIds, translationCandidates, auditTranslations, syncManifest, mergeLearningUnit, normalizeLearningSupportStatus, releaseCandidateReport, promoteReleaseReady, releasePreflight, publish, TARGET_CHAPTER_COUNT };
