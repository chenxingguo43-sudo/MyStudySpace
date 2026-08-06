#!/usr/bin/env node
'use strict';

// Applies a reviewed, sentence-level translation map to one isolated rebuild unit.
// The map includes the expected Russian text so short repeated dialogue turns
// cannot be accidentally imported from a different source unit.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNITS_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'rebuild', 'units');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const chapter = String(process.argv[2] || '').padStart(4, '0');
  const mapArg = process.argv[3];
  if (!/^\d{4}$/.test(chapter) || !mapArg) {
    throw new Error('Usage: stage-reviewed-translations.js <chapter> <translation-map.json>');
  }
  const mapPath = path.resolve(ROOT, mapArg);
  const map = readJson(mapPath);
  if (!map.sourceFile || !Array.isArray(map.entries)) throw new Error('translation map needs sourceFile and entries');

  const byId = new Map(map.entries.map(entry => [entry.segmentId, entry]));
  if (byId.size !== map.entries.length) throw new Error('translation map has duplicate segmentId values');
  const unitPath = path.join(UNITS_DIR, `ch${chapter}.learning.json`);
  const unit = readJson(unitPath);
  const errors = [];
  const staged = unit.segments.map(segment => {
    const entry = byId.get(segment.segmentId);
    if (!entry) {
      errors.push(`${segment.segmentId} is missing from the translation map`);
      return segment;
    }
    if (entry.text !== segment.text) errors.push(`${segment.segmentId} Russian text differs from the translation map`);
    if (!String(entry.translation || '').trim()) errors.push(`${segment.segmentId} has an empty translation`);
    return { ...segment, translation: String(entry.translation || '').trim() };
  });
  for (const id of byId.keys()) {
    if (!unit.segments.some(segment => segment.segmentId === id)) errors.push(`${id} is not a segment in ch${chapter}`);
  }
  if (errors.length) throw new Error(JSON.stringify(errors, null, 2));

  unit.segments = staged;
  unit.learningSupport = {
    status: 'source-checked',
    sourceFile: map.sourceFile,
    translationSourceStatus: map.translationSourceStatus || 'needs_review',
    verification: '逐句按教材俄文与本地中文对照交叉核对；短句重复项按 segmentId 和完整俄文文本锁定。'
  };
  fs.writeFileSync(unitPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ chapter: `ch${chapter}`, translated: staged.length, sourceFile: map.sourceFile }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('ERROR: ' + error.message);
  process.exitCode = 1;
}
