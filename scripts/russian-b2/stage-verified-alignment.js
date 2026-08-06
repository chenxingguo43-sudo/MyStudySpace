#!/usr/bin/env node
'use strict';

// Copies only accepted ASR timings into a rebuild unit. Unmatched rows stay unresolved.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNITS_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'rebuild', 'units');

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2013\u2014-]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function main() {
  const chapter = String(process.argv[2] || '').padStart(4, '0');
  const candidateArg = process.argv[3];
  const dryRun = process.argv.includes('--dry-run');
  if (!/^\d{4}$/.test(chapter) || !candidateArg) {
    throw new Error('Usage: stage-verified-alignment.js <chapter> <candidate-json> [--dry-run]');
  }

  const unitPath = path.join(UNITS_DIR, `ch${chapter}.learning.json`);
  const candidatePath = path.resolve(ROOT, candidateArg);
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  if (!Array.isArray(unit.segments) || unit.segments.length !== candidate.segments.length) {
    throw new Error('staged and candidate segment counts differ');
  }

  const mismatched = [];
  const staged = unit.segments.map((segment, index) => {
    const source = candidate.segments[index];
    if (normalize(segment.text) !== normalize(source.text)) {
      mismatched.push({ index: index + 1, segmentId: segment.segmentId });
      return segment;
    }
    const base = { ...segment, sourceSentenceIndexes: [index + 1] };
    if (source.timingStatus !== 'aligned') return base;
    if (!(Number.isFinite(source.startTime) && Number.isFinite(source.endTime) && source.endTime > source.startTime)) {
      throw new Error(`candidate ${index + 1} claims aligned but has an invalid range`);
    }
    return {
      ...base,
      playlistIndex: source.playlistIndex,
      startTime: source.startTime,
      endTime: source.endTime,
      timingStatus: 'aligned'
    };
  });
  if (mismatched.length) throw new Error(JSON.stringify({ mismatched }, null, 2));

  const timed = staged.filter(segment => segment.timingStatus === 'aligned').length;
  if (!dryRun) {
    unit.segments = staged;
    fs.writeFileSync(unitPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify({ chapter: `ch${chapter}`, total: staged.length, timed, dryRun }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('ERROR: ' + error.message);
  process.exitCode = 1;
}
