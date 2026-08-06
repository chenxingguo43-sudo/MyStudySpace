#!/usr/bin/env node
'use strict';

// Applies only boundaries supported by the textbook text plus two independent
// local ASR passes. Unsupported source lines are retained in coverage metadata,
// not fabricated as playable timeline rows.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const REBUILD = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'rebuild');
const UNITS = path.join(REBUILD, 'units');
const CONFLICTS = path.join(REBUILD, 'conflicts');
const REPORT = path.join(REBUILD, 'reports', 'machine-boundary-resolution.json');

const SOURCE_FILES = [
  '俄语资料库/В мире людей 听力口语 Markdown版/章节/Тема 1.6 -- ТРКИ-2 电影对话（Художественные фильмы — Диалоги）.md',
  '俄语资料库/В мире людей 听力口语 Markdown版/翻译/Тема 1.6 -- ТРКИ-2 电影对话（Художественные фильмы — Диалоги） -- 中文对照.md'
];

const DECISIONS = {
  20: {
    mediaNumber: 21,
    times: {
      1: [5.11, 7.69], 2: [7.77, 9.85], 3: [11.15, 15.63], 4: [16.33, 20.49],
      5: [20.81, 21.87], 6: [22.21, 22.47], 8: [29.12, 32.70], 10: [49.38, 51.80],
      25: [105.41, 105.83], 26: [106.45, 108.33], 47: [193.52, 195.26]
    },
    omitted: [7, 11, 14, 15, 16, 17, 37, 38, 39, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
    questions: {
      'LS-LS-T1-6-D2-2-1-Q02': {
        status: 'playable', sourceIndexes: [8],
        reasoning: '“Поделим поровну и разбежимся”在绑定媒体 29.12-32.70 秒内由教材原文和两次本地 ASR 交叉定位，直接支持“平分黄金”的选项 В。'
      },
      'LS-LS-T1-6-D2-2-1-Q05': {
        status: 'not-in-bound-media', sourceIndexes: [],
        reasoning: '题目所需的“Ну, что стоишь? Уходи. Я умереть хочу, слышишь?”在绑定媒体的可验证摘录中未得到完整逐句覆盖；不建立伪造定位，也不计入当前媒体作答。'
      }
    }
  },
  21: {
    mediaNumber: 22,
    times: { 8: [30.34, 30.98], 17: [75.24, 76.46], 24: [133.68, 134.92] },
    omitted: [16, 18]
  },
  22: {
    mediaNumber: 23,
    times: {
      2: [16.72, 17.38], 5: [29.28, 30.28], 7: [39.78, 40.92], 10: [45.08, 45.72],
      11: [45.96, 46.82], 14: [72.02, 73.06], 28: [107.59, 108.33], 48: [211.24, 211.94]
    },
    omitted: [8, 12, 38, 53],
    questions: {
      'LS-LS-T1-6-D2-2-3-Q03': {
        status: 'playable', sourceIndexes: [14],
        reasoning: '“Коты любят куриное мясо”在绑定媒体 72.02-73.06 秒内被教材文本、词级时间戳和第二次 ASR 一致支持，直接对应正确选项 В。'
      }
    }
  },
  23: {
    mediaNumber: 24,
    times: { 3: [9.15, 9.93], 6: [19.43, 20.79], 7: [22.66, 24.82], 10: [31.52, 32.74], 22: [104.58, 105.08] },
    omitted: []
  }
};

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function unitPath(chapter) { return path.join(UNITS, `ch${String(chapter).padStart(4, '0')}.learning.json`); }
function segmentId(chapter, index) { return `ch${String(chapter).padStart(4, '0')}-s${String(index).padStart(3, '0')}`; }

function updateQuestion(question, patch, sourceIndexToId) {
  if (!question.evidence) throw new Error(`${question.id} is missing evidence`);
  const evidence = { ...question.evidence, status: patch.status, reasoning: patch.reasoning };
  const ids = (patch.sourceIndexes || []).map(index => sourceIndexToId.get(index)).filter(Boolean);
  evidence.segmentIds = ids;
  evidence.items = [{
    quote: evidence.quote,
    translation: evidence.translation,
    segmentIds: ids
  }];
  question.evidence = evidence;
}

function resolveChapter(chapter, decision) {
  const file = unitPath(chapter);
  const unit = readJson(file);
  const omitted = new Set(decision.omitted || []);
  const originalToNew = new Map();
  const rebuilt = [];

  unit.segments.forEach((segment, offset) => {
    const sourceIndex = offset + 1;
    if (omitted.has(sourceIndex)) return;
    const range = decision.times[sourceIndex];
    const next = { ...segment, sourceSentenceIndexes: [sourceIndex] };
    if (range) {
      next.startTime = range[0];
      next.endTime = range[1];
      next.timingStatus = 'aligned';
    }
    if (!(Number(next.endTime) > Number(next.startTime))) {
      throw new Error(`ch${String(chapter).padStart(4, '0')} source sentence ${sourceIndex} has no verified range and is not omitted`);
    }
    next.segmentId = segmentId(chapter, rebuilt.length + 1);
    originalToNew.set(sourceIndex, next.segmentId);
    rebuilt.push(next);
  });

  unit.segments = rebuilt;
  unit.questions.forEach(question => {
    if (decision.questions && decision.questions[question.id]) {
      updateQuestion(question, decision.questions[question.id], originalToNew);
      return;
    }
    if (!question.evidence) return;
    const oldIds = question.evidence.segmentIds || [];
    const remapped = oldIds.map(id => {
      const match = /-s(\d+)$/.exec(id);
      return match ? originalToNew.get(Number(match[1])) : null;
    }).filter(Boolean);
    question.evidence.segmentIds = remapped;
    question.evidence.items = (question.evidence.items || []).map(item => ({
      ...item,
      segmentIds: (item.segmentIds || []).map(id => {
        const match = /-s(\d+)$/.exec(id);
        return match ? originalToNew.get(Number(match[1])) : null;
      }).filter(Boolean)
    }));
  });

  unit.coverage = {
    kind: omitted.size ? 'excerpt' : 'complete',
    ...(omitted.size ? { omittedSourceSentenceIndexes: [...omitted].sort((a, b) => a - b) } : {}),
    reason: omitted.size
      ? '绑定媒体中这些教材短句未获得可复现的完整逐句边界，因此不显示为可播放精听句。'
      : '所有显示句段均取得可复现的逐句边界。',
    verifiedBy: [
      ...SOURCE_FILES,
      `tmp/world-people-v2-word-timestamps/${String(decision.mediaNumber).padStart(2, '0')}-base.json`,
      `tmp/faster-whisper-results/${String(decision.mediaNumber).padStart(2, '0')}-small.json`
    ],
    reviewMethod: 'textbook-source-plus-two-local-asr-candidates; no external native-speaker review claimed'
  };
  unit.conflicts = (unit.conflicts || []).map(conflict => ({
    ...conflict,
    status: 'resolved-machine-crosscheck',
    resolution: 'Resolved only where textbook text and local ASR candidates supplied a reproducible boundary; unsupported text is recorded as omitted coverage.'
  }));
  unit.status = 'conflicts_resolved';
  writeJson(file, unit);

  const conflictFile = path.join(CONFLICTS, `ch${String(chapter).padStart(4, '0')}.conflicts.json`);
  const conflict = readJson(conflictFile);
  conflict.status = 'resolved-machine-crosscheck';
  conflict.conflicts = (conflict.conflicts || []).map(item => ({
    ...item,
    status: 'resolved-machine-crosscheck',
    resolution: {
      method: 'textbook source plus base and small local ASR cross-check',
      externalNativeReview: false,
      omittedSourceSentenceIndexes: (item.sourceSentenceIndexes || []).filter(index => omitted.has(index))
    }
  }));
  writeJson(conflictFile, conflict);
  return { chapter: `ch${String(chapter).padStart(4, '0')}`, displayedSegments: rebuilt.length, omittedSourceSentenceIndexes: [...omitted] };
}

const results = Object.entries(DECISIONS).map(([chapter, decision]) => resolveChapter(Number(chapter), decision));
writeJson(REPORT, {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'machine-crosschecked-not-external-review',
  results,
  constraints: [
    'ASR is used only as a timing candidate and does not alter textbook Russian text.',
    'Unverified source sentences are excluded from the playable excerpt instead of assigned fabricated time ranges.',
    'No external native-speaker review is claimed.'
  ]
});
console.log(JSON.stringify(results, null, 2));
