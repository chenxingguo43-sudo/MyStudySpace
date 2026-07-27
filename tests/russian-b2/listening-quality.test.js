const test = require('node:test');
const assert = require('node:assert/strict');
const Quality = require('../../js/russian-b2/listening-quality');

function details(overrides) {
  return Object.assign({
    bookId: 'listening_speaking', chapterId: 'ls-t1.2-d1.1.1', segmentIndex: 0,
    text: '\u0412\u0441\u0451 \u0431\u0443\u0434\u0435\u0442 \u0445\u043e\u0440\u043e\u0448\u043e.', mediaFile: 'media/01.mp4', playlistIndex: 0,
    startTime: 3, endTime: 5, source: 'feature'
  }, overrides || {});
}

test('stable quality IDs use permanent book/chapter content rather than the segment array index', () => {
  assert.equal(Quality.makeSegmentId(details({ segmentIndex: 0 })), Quality.makeSegmentId(details({ segmentIndex: 12 })));
});

test('dictation comparison tolerates case, punctuation, whitespace, and yo/e', () => {
  const result = Quality.compareDictation('\u0412\u0441\u0451, \u0431\u0443\u0434\u0435\u0442 \u0445\u043e\u0440\u043e\u0448\u043e!', '  \u0432\u0441\u0435 \u0431\u0443\u0434\u0435\u0442   \u0445\u043e\u0440\u043e\u0448\u043e  ');
  assert.equal(result.score, 100);
  assert.equal(result.completed, true);
  assert.deepEqual(result.missingWords, []);
  assert.deepEqual(result.extraWords, []);
});

test('dictation records retain input, score, attempts and completion without treating opening as completion', () => {
  const outcome = Quality.recordDictation({}, details(), '\u0432\u0441\u0435 \u0431\u0443\u0434\u0435\u0442', '2026-07-26T00:00:00.000Z');
  const record = outcome.records[Quality.makeSegmentId(details())];
  assert.equal(record.dictation.lastInput, '\u0432\u0441\u0435 \u0431\u0443\u0434\u0435\u0442');
  assert.equal(record.dictation.attempts, 1);
  assert.equal(record.dictation.completed, false);
  assert.ok(record.dictation.lastScore < 100);
});

test('difficult marker toggles without deleting a stored dictation history', () => {
  const initial = Quality.recordDictation({}, details(), '\u0432\u0441\u0435', '2026-07-26T00:00:00.000Z').records;
  const marked = Quality.markDifficult(initial, details(), '2026-07-26T01:00:00.000Z');
  const unmarked = Quality.markDifficult(marked, details(), '2026-07-26T02:00:00.000Z');
  const record = unmarked[Quality.makeSegmentId(details())];
  assert.equal(record.status, 'unmarked');
  assert.equal(record.dictation.attempts, 1);
});

test('review queue prioritizes unreviewed difficult sentences, then weak dictation, then due reviews', () => {
  const fresh = Quality.makeRecord(details({ text: 'fresh' }), null, '2026-07-26T00:00:00.000Z');
  fresh.status = 'difficult';
  const weak = Quality.makeRecord(details({ text: 'weak' }), null, '2026-07-20T00:00:00.000Z');
  weak.dictation = { lastInput: 'x', lastScore: 30, attempts: 1, completed: false, lastAttemptAt: '2026-07-20T00:00:00.000Z', missingWords: ['weak'], extraWords: ['x'] };
  const due = Quality.makeRecord(details({ text: 'due' }), null, '2026-07-01T00:00:00.000Z');
  due.status = 'difficult'; due.reviewCount = 1; due.lastReviewedAt = '2026-07-01T00:00:00.000Z';
  const queue = Quality.getReviewQueue({ [fresh.id]: fresh, [weak.id]: weak, [due.id]: due }, '2026-07-26T00:00:00.000Z');
  assert.deepEqual(queue.map(item => item.priority), [1, 2, 3]);
});

test('feature and appended-media records remain separate even for identical text', () => {
  assert.notEqual(Quality.makeSegmentId(details({ source: 'feature' })), Quality.makeSegmentId(details({ source: 'media-exercise' })));
});

test('quality records round-trip through the explicit localStorage adapter', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const records = Quality.markDifficult({}, details());
  Quality.write(records, storage);
  assert.deepEqual(Quality.read(storage), records);
});
