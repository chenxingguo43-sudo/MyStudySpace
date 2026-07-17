const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildWritingModule,
  validateWritingUnit,
  publishWritingReaderModule
} = require('../../scripts/russian-b2/build-writing');

const root = path.resolve(__dirname, '..', '..');

test('writing module preserves all verified B2 task types with source pages', () => {
  const result = buildWritingModule({ root, write: false });
  assert.equal(result.units.length, 13);
  assert.deepEqual(result.units.map(unit => unit.id), [
    'recommendation-letter', 'application', 'invitation', 'autobiography', 'receipt',
    'certificate', 'thank-you-letter', 'congratulation-letter', 'announcement', 'complaint',
    'explanatory-note', 'internship-report', 'introduction-letter'
  ]);
  for (const unit of result.units) {
    assert.deepEqual(validateWritingUnit(unit), []);
    assert.ok(unit.sourcePages.length > 0);
    assert.equal(unit.reviewStatus, 'source-verified');
    assert.ok(unit.task.prompt);
    assert.ok(unit.format.requiredBlocks.length > 0);
  }
});

test('recommendation task reproduces book pages 90-92 with complete materials and model source', () => {
  const { units } = buildWritingModule({ root, write: false });
  const recommendation = units.find(unit => unit.id === 'recommendation-letter');
  assert.deepEqual(recommendation.source?.printedPages, [90, 91, 92]);
  assert.deepEqual(recommendation.source?.pdfPages, [94, 95, 96]);
  assert.ok((recommendation.task?.instructionsRu || '').length > 200);
  assert.ok(recommendation.materials?.length >= 3);
  assert.ok(recommendation.rubric?.length > 0);
  assert.ok(recommendation.model?.source?.pdfPages?.includes(96));
  assert.ok((recommendation.model?.text || '').length > 400);
});

test('writing module labels model texts as source material and keeps generated assistance separate', () => {
  const { units } = buildWritingModule({ root, write: false });
  const complaint = units.find(unit => unit.id === 'complaint');
  assert.equal(complaint.model.source.kind, 'b2-original');
  assert.match(complaint.model.text, /Довожу до вашего сведения/);
  assert.equal(complaint.studySupport.label, '学习辅助');
  assert.doesNotMatch(complaint.studySupport.label, /原书/);
});

test('writing publisher creates stable reader chapters without browser-held AI credentials', () => {
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'writing');
  const result = publishWritingReaderModule({ root, outputDir });
  assert.equal(result.index.chapters, 13);
  const first = JSON.parse(fs.readFileSync(path.join(outputDir, 'ch0000.json'), 'utf8'));
  assert.equal(first.format, 'writing-workbench');
  assert.equal(first.id, 'recommendation-letter');
  assert.equal(first.materials.length, 5);
  assert.deepEqual(first.source.pdfPages, [94, 95, 96]);
  assert.ok(first.rubric.length >= 5);
  assert.equal(first.ai.mode, 'server-or-copy-prompt');
  assert.equal(JSON.stringify(first), JSON.stringify(first).replace(/OPENAI_API_KEY/g, ''));
});
