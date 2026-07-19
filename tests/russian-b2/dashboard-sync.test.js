const test = require('node:test');
const assert = require('node:assert/strict');
const { ARCHIVE_KEYS, mergeArchive, createArchive, validateArchive } = require('../../js/russian-b2/dashboard');

test('archive merge keeps the newest stable-id record and reports equal-time conflicts', () => {
  const local = { records: { 'P2-Q055': { updatedAt: '2026-07-17T10:00:00Z', wrong: true }, draft: { updatedAt: '2026-07-17T12:00:00Z', value: '本地' } } };
  const remote = { records: { 'P2-Q055': { updatedAt: '2026-07-17T11:00:00Z', wrong: false }, draft: { updatedAt: '2026-07-17T12:00:00Z', value: '远端' } } };
  const result = mergeArchive(local, remote);
  assert.equal(result.merged.records['P2-Q055'].wrong, false);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.merged.records.draft.value, '本地');
});

test('archive export keeps only declared B2 records and validates its portable schema', () => {
  const archive = createArchive({
    'rr_b2_progress_v1': { P2: { 'P2-Q055': { updatedAt: '2026-07-17T10:00:00Z', wrong: true } } },
    'russian_b2_writing_drafts_v1': { task: { updatedAt: '2026-07-17T11:00:00Z', value: 'Черновик' } },
    unrelated: { secret: true }
  }, { now: '2026-07-17T12:00:00Z' });
  assert.equal(archive.schema, 'russian-b2-learning-archive/v1');
  assert.deepEqual(Object.keys(archive.records).sort(), ['rr_b2_progress_v1', 'russian_b2_writing_drafts_v1']);
  assert.deepEqual(validateArchive(archive), []);
});

test('archive validation rejects unrecognized keys and malformed import payloads', () => {
  assert.match(validateArchive({ schema: 'wrong', records: {} }).join('\n'), /schema/);
  assert.match(validateArchive({ schema: 'russian-b2-learning-archive/v1', records: { unrelated: {} } }).join('\n'), /unrecognized/);
});

test('archive declares all progress-completion records while accepting an older archive', () => {
  [
    'russian_b2_listening_progress_v1',
    'russian_b2_writing_completed_v1',
    'russian_b2_speaking_completed_v1',
    'russian_b2_exam_completed_v1'
  ].forEach(key => assert.ok(ARCHIVE_KEYS.includes(key)));
  assert.deepEqual(validateArchive({
    schema: 'russian-b2-learning-archive/v1',
    records: { rr_b2_progress_v1: { updatedAt: '2026-07-17T12:00:00Z', value: {} } }
  }), []);
});
