#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNITS_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'rebuild', 'units');

function parseIndexes(value) {
  const indexes = String(value || '').split(',').map(item => Number(item.trim())).filter(Number.isInteger);
  if (!indexes.length || indexes.some(index => index < 1)) throw new Error('omitted source sentence indexes must be positive integers');
  return new Set(indexes);
}

function main() {
  const chapter = String(process.argv[2] || '').padStart(4, '0');
  const omitted = parseIndexes(process.argv[3]);
  const reason = process.argv.slice(4).join(' ').trim();
  if (!/^\d{4}$/.test(chapter) || !reason) {
    throw new Error('Usage: reconstruct-verified-excerpt.js <chapter> <omitted-indexes> <reason>');
  }
  const unitPath = path.join(UNITS_DIR, `ch${chapter}.learning.json`);
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const originalSegments = unit.segments || [];
  if (omitted.size !== [...omitted].filter(index => index <= originalSegments.length).length) {
    throw new Error('an omitted index is outside the staged transcript');
  }
  unit.segments = originalSegments
    .map((segment, sourceIndex) => ({ segment, sourceIndex: sourceIndex + 1 }))
    .filter(item => !omitted.has(item.sourceIndex))
    .map((item, segmentIndex) => ({
      ...item.segment,
      segmentId: `ch${chapter}-s${String(segmentIndex + 1).padStart(3, '0')}`,
      sourceSentenceIndexes: [item.sourceIndex]
    }));
  unit.coverage = {
    kind: 'excerpt',
    omittedSourceSentenceIndexes: [...omitted].sort((a, b) => a - b),
    reason,
    verifiedBy: [
      '俄语资料库/В мире людей 听力口语 Markdown版/章节/Тема 1.7 -- ТРКИ-2 采访（Интервью）.md',
      '俄语资料库/В мире людей 听力口语 Markdown版/翻译/Тема 1.7 -- ТРКИ-2 采访（Интервью） -- 中文对照.md',
      `tmp/listening-rebuild-asr/ch${chapter}/ch${chapter}.json`,
      `tmp/world-people-v2-word-timestamps/${String(Number(chapter) + 1).padStart(2, '0')}-base.json`
    ]
  };
  fs.writeFileSync(unitPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ chapter: `ch${chapter}`, segments: unit.segments.length, omitted: unit.coverage.omittedSourceSentenceIndexes }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('ERROR: ' + error.message);
  process.exitCode = 1;
}
