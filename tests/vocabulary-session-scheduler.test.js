const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BrushSession,
  ReviewSession,
  getLocalDateKey,
  normalizeExtras,
  normalizePartOfSpeech,
  recordSkillAttempt,
  scheduleLongTerm
} = require('../js/vocabulary-session-scheduler.js');

function ids(count) {
  return Array.from({ length: count }, (_, index) => `word-${index + 1}`);
}

test('brush: confirming a first-look answer graduates a word exactly once', () => {
  const session = new BrushSession(['one']);
  assert.equal(session.next(), 'one');
  assert.equal(session.rate('one', 'known').graduated, true);
  assert.equal(session.stats().known, 1);
  assert.equal(session.stats().onePass, 1);
  assert.equal(session.done(), true);
});

test('brush: an important unknown word returns after eight intervening cards', () => {
  const session = new BrushSession(ids(12), { priorityIds: ['word-1'] });
  assert.equal(session.next(), 'word-1');
  const outcome = session.rate('word-1', 'unknown');
  assert.equal(outcome.graduated, false);
  assert.equal(outcome.retryAfterSeen, 9);

  const intervening = [];
  for (let index = 0; index < 8; index += 1) {
    const id = session.next();
    intervening.push(id);
    session.rate(id, 'known');
  }
  assert.deepEqual(intervening, ids(12).slice(1, 9));
  assert.equal(session.next(), 'word-1');
});

test('brush: repeated unknown answers keep returning until confirmation', () => {
  const session = new BrushSession(['one', 'two'], { normalRetryDelays: [2, 2], maxFailures: 4 });
  assert.equal(session.next(), 'one');
  session.rate('one', 'unknown');
  assert.equal(session.next(), 'two');
  session.rate('two', 'known');
  assert.equal(session.next(), 'one');
  session.rate('one', 'unknown');
  assert.equal(session.next(), 'one');
  assert.equal(session.rate('one', 'known').graduated, true);
  assert.equal(session.stats().known, 2);
  assert.equal(session.stats().afterRetry, 1);
  assert.equal(session.stats().totalRetries, 2);
  assert.equal(session.done(), true);
});

test('brush: all unknown cards cannot produce a completed or 100% session', () => {
  const session = new BrushSession(['one', 'two', 'three'], { maxFailures: 4 });
  for (let index = 0; index < 3; index += 1) {
    const id = session.next();
    session.rate(id, 'unknown');
  }
  const stats = session.stats();
  assert.equal(session.done(), false);
  assert.equal(stats.known, 0);
  assert.equal(stats.progress, 0);
  assert.equal(stats.queued, 3);
});

test('brush: a third failure defers the word instead of creating an infinite session', () => {
  const session = new BrushSession(['one'], { normalRetryDelays: [2, 2], maxFailures: 3 });
  session.next();
  session.rate('one', 'unknown');
  session.next();
  session.rate('one', 'unknown');
  session.next();
  const outcome = session.rate('one', 'unknown');
  assert.equal(outcome.deferred, true);
  assert.equal(session.stats().difficult, 1);
  assert.equal(session.stats().known, 0);
  assert.equal(session.done(), true);
});

test('skill profiles require successful recalls across at least seven days to become stable', () => {
  let profile = recordSkillAttempt(null, 'known', { today: '2026-07-01', reviewedAt: '2026-07-01T10:00:00+08:00', responseMs: 1800 });
  profile = recordSkillAttempt(profile, 'known', { today: '2026-07-03', reviewedAt: '2026-07-03T10:00:00+08:00', responseMs: 2200 });
  assert.equal(profile.stable, false);
  profile = recordSkillAttempt(profile, 'known', { today: '2026-07-08', reviewedAt: '2026-07-08T10:00:00+08:00', responseMs: 1900 });
  assert.equal(profile.stable, true);
  assert.equal(profile.successfulDates.length, 3);
});

test('replayed audio success is stored as fuzzy and remains due tomorrow', () => {
  const profile = recordSkillAttempt(null, 'fuzzy', { today: '2026-07-26', replayed: true, responseMs: 3500 });
  assert.equal(profile.successes, 1);
  assert.equal(profile.replayed, true);
  assert.equal(profile.nextDue, '2026-07-27');
});

test('brush: undo restores card, retry queue, counters and known state', () => {
  const session = new BrushSession(['one', 'two']);
  assert.equal(session.next(), 'one');
  const snapshot = session.snapshot();
  session.rate('one', 'unknown');
  assert.equal(session.stats().totalRetries, 1);
  session.restore(snapshot);
  assert.equal(session.currentId, 'one');
  assert.equal(session.stats().totalRetries, 0);
  assert.equal(session.stats().known, 0);
  assert.equal(session.stats().queued, 0);
});

test('review: prior failure keeps the word in relearning instead of expanding its interval', () => {
  const session = new ReviewSession(['one', 'two', 'three']);
  assert.equal(session.next(), 'one');
  session.rate('one', 'unknown');
  session.rate(session.next(), 'known');
  session.rate(session.next(), 'known');
  assert.equal(session.next(), 'one');
  const outcome = session.rate('one', 'known');
  assert.equal(outcome.graduated, false);
  assert.equal(outcome.requeued, true);
  assert.equal(outcome.reason, 'confirmation');
});

test('review: difficult cards are not counted as passed in the same session category', () => {
  const session = new ReviewSession(['one']);
  session.next();
  session.rate('one', 'unknown');
  session.next();
  session.rate('one', 'unknown');
  session.next();
  session.rate('one', 'unknown');
  const stats = session.stats();
  assert.equal(stats.passed, 0);
  assert.equal(stats.difficult, 1);
});

test('long-term scheduling uses relearning after an in-session lapse', () => {
  const previous = { interval: 12, easeFactor: 2.5, reps: 5, lapses: 0 };
  const updated = scheduleLongTerm(previous, 'known', { hadFailure: true, today: '2026-07-26' });
  assert.equal(updated.state, 'relearning');
  assert.equal(updated.interval, 1);
  assert.equal(updated.nextReview, '2026-07-27');
});

test('Asia/Shanghai date keys never use the prior UTC date around midnight', () => {
  assert.equal(getLocalDateKey(new Date('2026-07-25T16:30:00.000Z')), '2026-07-26');
  assert.equal(getLocalDateKey(new Date('2026-07-26T15:59:59.000Z')), '2026-07-26');
});

test('legacy extras and filter aliases normalize safely', () => {
  assert.deepEqual(normalizeExtras({ fav: ['x'] }), { fav: ['x'], skip: [], report: [] });
  assert.equal(normalizePartOfSpeech('adj'), 'adjective');
  assert.equal(normalizePartOfSpeech('adv'), 'adverb');
  assert.equal(normalizePartOfSpeech('function'), 'function');
});
