const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const rebuild = require('../../scripts/russian-b2/listening-rebuild');
const rebuildDir = path.join(root, 'data', 'textbook', 'listening_speaking', 'rebuild');

test('listening rebuild manifest inventories exactly the 35 published units with verified media', () => {
  const output = rebuild.buildManifest();
  assert.equal(output.manifest.targetChapterCount, 35);
  assert.equal(output.manifest.units.length, 35);
  assert.deepEqual(output.manifest.units.map(unit => unit.chapterFile), Array.from({ length: 35 }, (_, index) => 'ch' + String(index).padStart(4, '0') + '.json'));
  assert.equal(output.manifest.units.filter(unit => unit.status === 'baseline_template').length, 35);
});

test('rebuild unit seeds use stable segment IDs and retain the approved templates', () => {
  const output = rebuild.buildManifest();
  const cdl = output.units[14];
  const rabbit = output.units[15];
  assert.equal(cdl.segments[0].segmentId, 'ch0014-s001');
  assert.equal(rabbit.segments[24].segmentId, 'ch0015-s025');
  assert.equal(cdl.status, 'baseline_template');
  assert.equal(rabbit.questions.filter(question => question.evidence).length, 5);
});

test('published rebuild files pass the release gate', () => {
  assert.ok(fs.existsSync(path.join(rebuildDir, 'manifest.json')));
  assert.deepEqual(rebuild.validateRebuild(), []);
  assert.deepEqual(rebuild.validateRebuild({ releaseCheck: true }), []);
});

test('template evidence is normalized to independently playable stable segment references', () => {
  const cdl = JSON.parse(fs.readFileSync(path.join(rebuildDir, 'units', 'ch0014.learning.json'), 'utf8'));
  const rabbit = JSON.parse(fs.readFileSync(path.join(rebuildDir, 'units', 'ch0015.learning.json'), 'utf8'));
  cdl.questions.forEach(question => {
    assert.equal(question.evidence.status, 'playable');
    assert.ok(question.evidence.segmentIds.length > 0, question.id);
    assert.ok(question.evidence.items.every(item => item.segmentIds.length > 0), question.id);
  });
  assert.equal(rabbit.questions[3].evidence.status, 'not-in-bound-media');
  assert.equal(rabbit.questions[3].evidence.segmentIds, undefined);
});

test('a release-ready template must meet timing, translation, source, and evidence contracts', () => {
  const output = rebuild.buildManifest();
  const unit = output.units[14];
  unit.status = 'release_ready';
  unit.questions.forEach(question => { question.evidence.reasoning = 'Template evidence is linked to the original answer key.'; });
  assert.deepEqual(rebuild.validateUnit(unit, output.manifest.units[14]), []);
  unit.questions[0].evidence.items[0].segmentIds = ['missing-segment'];
  assert.match(rebuild.validateUnit(unit, output.manifest.units[14]).join('\n'), /references missing segmentIds/);
});

test('translation audit records source candidates without auto-promoting paragraph translations', () => {
  const report = rebuild.auditTranslations();
  assert.equal(report.units.length, 35);
  assert.ok(report.units[0].segments.some(segment => segment.candidateCount > 0));
  assert.match(report.policy, /never auto-published/);
});

test('rebuild can reconcile a formal answer letter only through source-traceable staged evidence', () => {
  const unit = JSON.parse(fs.readFileSync(path.join(rebuildDir, 'units', 'ch0000.learning.json'), 'utf8'));
  assert.equal(unit.questions[0].answer, 'А');
  assert.equal(unit.questions[2].answer, 'В');
  assert.ok(unit.conflicts.some(conflict => conflict.status === 'resolved'));
  const formal = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'listening_speaking', 'ch0000.json'), 'utf8'));
  const merged = rebuild.mergeLearningUnit(formal, unit);
  assert.equal(merged.questions[0].answer, 'А');
  assert.equal(merged.questions[2].answer, 'В');
});

test('source-complete reconstruction may atomically replace an incomplete formal transcript', () => {
  const formal = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'listening_speaking', 'ch0008.json'), 'utf8'));
  const unit = JSON.parse(fs.readFileSync(path.join(rebuildDir, 'units', 'ch0008.learning.json'), 'utf8'));
  const incompleteFormal = { ...formal, transcriptSegments: formal.transcriptSegments.slice(0, 2) };
  const formalSegmentCount = incompleteFormal.transcriptSegments.length;
  const merged = rebuild.mergeLearningUnit(incompleteFormal, unit);
  assert.equal(formalSegmentCount, 2);
  assert.equal(merged.transcriptSegments.length, 5);
  assert.deepEqual(merged.transcriptCoverage, unit.coverage);
  assert.ok(merged.transcriptSegments.every(segment => segment.sourceSentenceIndexes.length > 0));
});

test('ch0009 rebuild restores the full announcement with independently playable answer evidence', () => {
  const formal = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'listening_speaking', 'ch0009.json'), 'utf8'));
  const unit = JSON.parse(fs.readFileSync(path.join(rebuildDir, 'units', 'ch0009.learning.json'), 'utf8'));
  assert.equal(unit.segments.length, 8);
  assert.ok(unit.segments.every(segment => segment.endTime > segment.startTime && segment.translation));
  unit.questions.forEach(question => {
    assert.equal(question.evidence.status, 'playable');
    assert.ok(question.evidence.items.every(item => item.segmentIds.length > 0));
  });
  const merged = rebuild.mergeLearningUnit(formal, unit);
  assert.equal(merged.transcriptSegments.length, 8);
  assert.equal(merged.questions[2].answer, 'Б');
});

test('manifest synchronization reflects the actual staged learning-unit coverage', () => {
  const manifest = rebuild.syncManifest();
  assert.equal(manifest.units[0].status, 'published');
  assert.equal(manifest.units[0].metrics.translatedSegments, 10);
  assert.equal(manifest.units[5].metrics.evidencedQuestions, 5);
});
