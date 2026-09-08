const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
const dictionaryRuntime = fs.readFileSync(path.join(root, 'js', 'russian-dictionary', 'runtime.js'), 'utf8');
const listeningSourceDir = path.join(root, '俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '听力');

function listeningRenderer(name, nextName) {
  const start = reader.indexOf(`function ${name}`);
  const end = reader.indexOf(`function ${nextName}`, start + 1);
  return reader.slice(start, end >= 0 ? end : reader.length);
}

test('B2 listening source provides Chinese support for every transcript segment and answer evidence', () => {
  const index = JSON.parse(fs.readFileSync(path.join(listeningSourceDir, 'index.json'), 'utf8'));
  for (const fileName of index.units) {
    const unit = JSON.parse(fs.readFileSync(path.join(listeningSourceDir, fileName), 'utf8'));
    assert.ok(unit.transcriptSegments.every(segment => String(segment.translation || '').trim()), `${unit.id}: every transcript segment needs a Chinese translation`);
    assert.ok(unit.questions.every(question => String(question.evidence && question.evidence.translation || '').trim()), `${unit.id}: every answer evidence needs a Chinese translation`);
    assert.ok(unit.questions.every(question => String(question.evidence && question.evidence.reasoning || '').trim()), `${unit.id}: every question needs a learner-facing explanation`);
  }
});

test('listening review expands each missed question into a complete answer comparison', () => {
  const helper = reader.slice(reader.indexOf('function renderListeningReviewOptions'), reader.indexOf('function renderListeningReview(data)'));
  const review = listeningRenderer('renderListeningReview(data)', 'renderListeningQualityReview()');
  assert.match(helper, /function renderListeningReviewOptions\(question, answer\)/);
  assert.match(helper, /完整题干/);
  assert.match(helper, /你的选择/);
  assert.match(helper, /正确答案/);
  assert.match(review, /renderListeningReviewOptions\(question, answer\)/);
  assert.match(review, /evidence\.translation/);
  assert.match(review, /evidence\.reasoning/);
  assert.match(review, /为什么选这个/);
});

test('closing the mobile dictionary keeps the sheet lock until its exit transition finishes', () => {
  assert.match(dictionaryRuntime, /let sheetLockReleaseTimer = null/);
  assert.match(dictionaryRuntime, /function releaseSheetLockAfterExit\(\)/);
  assert.match(dictionaryRuntime, /setTimeout\(release, 180\)/);
  assert.match(dictionaryRuntime, /sheetLockReleaseTimer/);
});

test('long listening transcripts expose their Chinese translation before the full Russian text', () => {
  const transcript = listeningRenderer('renderListeningTranscript(data)', 'renderListeningEvidenceList(data)');
  assert.match(transcript, /var isLongTranscript = String\(segment\.text \|\| ''\)\.length > 700/);
  assert.match(transcript, /查看完整中文译文/);
  assert.ok(transcript.indexOf("'<div class=\"lw-transcript-copy\">' + translation") < transcript.indexOf("'<span class=\"lw-transcript-speaker\">'"));
});
