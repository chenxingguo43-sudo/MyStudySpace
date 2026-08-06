#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const file = path.join(root, 'data', 'textbook', 'listening_speaking', 'rebuild', 'units', 'ch0024.learning.json');
const unit = JSON.parse(fs.readFileSync(file, 'utf8'));
const idMap = new Map();

unit.segments = unit.segments.map((segment, index) => {
  const nextId = `ch0024-s${String(index + 1).padStart(3, '0')}`;
  idMap.set(segment.segmentId, nextId);
  return { ...segment, segmentId: nextId };
});
unit.questions = (unit.questions || []).map(question => ({
  ...question,
  evidence: question.evidence ? {
    ...question.evidence,
    segmentIds: (question.evidence.segmentIds || []).map(id => idMap.get(id) || id),
    items: (question.evidence.items || []).map(item => ({
      ...item,
      segmentIds: (item.segmentIds || []).map(id => idMap.get(id) || id)
    }))
  } : question.evidence
}));
fs.writeFileSync(file, JSON.stringify(unit, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ chapter: 'ch0024', segments: unit.segments.length, remapped: idMap.size }, null, 2));
