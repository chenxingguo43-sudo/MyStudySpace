const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSpeakingModule, validateSpeakingUnit, publishSpeakingReaderModule } = require('../../scripts/russian-b2/build-speaking');
const root = path.resolve(__dirname, '..', '..');

test('speaking module preserves all six verified task families in printed order', () => {
  const { units } = buildSpeakingModule({ root, write: false });
  assert.deepEqual(units.map(unit => unit.id), [
    'negative-dialogue', 'attitude-dialogue', 'intonation', 'video-description', 'editorial-phone-call', 'examiner-discussion'
  ]);
  assert.deepEqual(units.map(unit => unit.sourcePages), [
    [113, 114],
    [114, 115],
    [115],
    [115, 116],
    [116, 117],
    [117]
  ]);
  for (const unit of units) {
    assert.deepEqual(validateSpeakingUnit(unit), []);
    assert.equal(unit.reviewStatus, 'source-verified');
    assert.ok(unit.sourcePages.length > 0);
    assert.ok(unit.task.prompt);
  }
});

test('speaking publisher provides stepwise practice and recording metadata without inventing original media', () => {
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'speaking');
  const { index } = publishSpeakingReaderModule({ root, outputDir });
  assert.equal(index.chapters, 6);
  const video = JSON.parse(fs.readFileSync(path.join(outputDir, 'ch0003.json'), 'utf8'));
  assert.equal(video.format, 'speaking-practice');
  assert.equal(video.media.provenance, 'missing-original-media');
  assert.equal(video.recording.storage, 'IndexedDB:russian_b2_recordings');
});
