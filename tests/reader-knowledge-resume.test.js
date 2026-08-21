const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'js', 'russian-b2', 'dashboard.js'), 'utf8');
const archive = fs.readFileSync(path.join(root, 'js', 'app-archive.js'), 'utf8');

test('Reader knowledge cards expose resume tracking and a manual bookmark control', () => {
  assert.match(reader, /rr_knowledge_card_resume_v1/);
  assert.match(reader, /function beginKnowledgeCardTracking\(/);
  assert.match(reader, /function continueKnowledgeCard\(/);
  assert.match(reader, /data-knowledge-resume-section/);
  assert.match(reader, /记住这里/);
});

test('knowledge resume is included in both B2 and shared learning archives', () => {
  assert.match(dashboard, /'rr_knowledge_card_resume_v1'/);
  assert.match(archive, /'rr_knowledge_card_resume_v1'/);
});
