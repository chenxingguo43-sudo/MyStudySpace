#!/usr/bin/env node
'use strict';

// Creates handoff-ready clips for unresolved timing conflicts. It never changes
// a conflict status: resolving Russian dialogue boundaries remains a reviewer task.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BOOK_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking');
const CONFLICTS_DIR = path.join(BOOK_DIR, 'rebuild', 'conflicts');
const OUTPUT_DIR = path.join(BOOK_DIR, 'rebuild', 'review-packages');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function main() {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const padding = Number(process.env.CONFLICT_CLIP_PADDING_SECONDS || 1);
  if (!(Number.isFinite(padding) && padding >= 0 && padding <= 5)) {
    throw new Error('CONFLICT_CLIP_PADDING_SECONDS must be a number from 0 to 5');
  }
  const files = fs.readdirSync(CONFLICTS_DIR).filter(file => file.endsWith('.json')).sort();
  const reviewItems = [];
  for (const file of files) {
    const conflictFile = path.join(CONFLICTS_DIR, file);
    const payload = readJson(conflictFile);
    const mediaPath = path.join(BOOK_DIR, payload.mediaFile || '');
    if (!payload.mediaFile || !fs.existsSync(mediaPath)) {
      throw new Error(`${file} does not point to an existing bound media file`);
    }
    const pending = (payload.conflicts || []).filter(conflict => conflict.status === 'pending');
    for (const conflict of pending) {
      const [rangeStart, rangeEnd] = conflict.audioRange || [];
      if (!(Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && rangeEnd > rangeStart)) {
        throw new Error(`${file}:${conflict.id} has an invalid audioRange`);
      }
      const start = Math.max(0, rangeStart - padding);
      const duration = rangeEnd - start + padding;
      const chapterDir = path.join(OUTPUT_DIR, payload.chapterFile.replace(/\.json$/, ''));
      const clipPath = path.join(chapterDir, `${conflict.id}.mp3`);
      fs.mkdirSync(chapterDir, { recursive: true });
      const result = spawnSync(ffmpeg, [
        '-y', '-ss', start.toFixed(3), '-i', mediaPath, '-t', duration.toFixed(3),
        '-vn', '-ac', '1', '-ar', '16000', '-codec:a', 'libmp3lame', '-q:a', '4', clipPath
      ], { encoding: 'utf8' });
      if (result.status !== 0 || !fs.existsSync(clipPath) || fs.statSync(clipPath).size === 0) {
        throw new Error(`ffmpeg failed for ${conflict.id}: ${result.stderr || result.error || 'unknown error'}`);
      }
      reviewItems.push({
        chapterFile: payload.chapterFile,
        unitId: payload.unitId,
        conflictId: conflict.id,
        type: conflict.type,
        boundMediaFile: payload.mediaFile,
        sourceAudioRange: conflict.audioRange,
        clipAudioRange: [Number(start.toFixed(3)), Number((start + duration).toFixed(3))],
        clipFile: relative(clipPath),
        sourceSentenceIndexes: conflict.sourceSentenceIndexes || [],
        textbookText: conflict.textbookText || [],
        asrCandidate: conflict.asrCandidate || '',
        problem: conflict.problem || '',
        neededDecision: conflict.neededDecision || '',
        questionIds: conflict.questionIds || []
      });
    }
  }
  const manifestPath = path.join(OUTPUT_DIR, 'pending-conflicts-review-manifest.json');
  const readmePath = path.join(OUTPUT_DIR, 'README.md');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'pending-external-boundary-review',
    clipPaddingSeconds: padding,
    itemCount: reviewItems.length,
    items: reviewItems
  }, null, 2) + '\n', 'utf8');
  const readme = [
    '# Pending Russian Boundary Review',
    '',
    'Each item pairs a clip from the verified bound media with canonical textbook text. Do not rewrite the textbook text. For each item, decide whether every listed source turn is audible and, when possible, give independently playable start/end times. If a turn is omitted, say so explicitly.',
    '',
    'Return one structured decision per conflict: `conflictId`, `decision` (`aligned` | `omitted` | `still-ambiguous`), `ranges` (one per source sentence where possible), and a short Russian-language note.',
    '',
    ...reviewItems.flatMap(item => [
      `## ${item.conflictId}`,
      `- Clip: \`${item.clipFile}\``,
      `- Bound-media range: ${item.sourceAudioRange[0]}-${item.sourceAudioRange[1]} s`,
      `- Textbook turns: ${item.textbookText.join(' / ')}`,
      `- ASR candidate: ${item.asrCandidate || '(none)'}`,
      `- Decision needed: ${item.neededDecision}`,
      ...(item.questionIds.length ? [`- Blocked questions: ${item.questionIds.join(', ')}`] : []),
      ''
    ])
  ].join('\n');
  fs.writeFileSync(readmePath, readme + '\n', 'utf8');
  console.log(JSON.stringify({ itemCount: reviewItems.length, manifest: relative(manifestPath), readme: relative(readmePath) }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('ERROR: ' + error.message);
  process.exitCode = 1;
}
