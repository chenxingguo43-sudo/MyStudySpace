'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Transition = require('../js/vocabulary-fsrs-transition');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('legacy snapshots preserve scheduling fields and the complete original record', () => {
  const records = {
    old: {
      mastery: 5,
      interval: 45,
      easeFactor: 2.7,
      history: [{ date: '2026-01-01', rating: 5 }],
      nextReview: '2026-08-20',
      count: 9,
      custom: { keep: true }
    }
  };
  const plan = Transition.createPlan(records, { asOfDate: '2026-08-17' });
  assert.equal(plan.words[0].calibrationDate, '2026-08-20');
  assert.deepEqual(plan.words[0].legacy.fullRecord, records.old);
  assert.equal(plan.words[0].legacy.mastery, 5);
  assert.equal(plan.words[0].status, 'pending_first_real_review');
  assert.equal(records.old.custom.keep, true);
});

test('expired, missing, and distant dates spread repeatably across the next 30 days', () => {
  const records = {
    expired: { nextReview: '2026-08-01' },
    missing: {},
    distant: { nextReview: '2026-10-01' }
  };
  const first = Transition.createPlan(records, { asOfDate: '2026-08-17' });
  const second = Transition.createPlan(records, { asOfDate: '2026-08-17' });
  assert.deepEqual(first.words.map(item => item.calibrationDate), second.words.map(item => item.calibrationDate));
  first.words.forEach(item => {
    assert.ok(item.calibrationDate >= '2026-08-18');
    assert.ok(item.calibrationDate <= '2026-09-16');
  });
});

test('a legacy mastery 5 remains pending until a real FSRS review exists', () => {
  const plan = Transition.createPlan({ old: { mastery: 5 } }, { asOfDate: '2026-08-17' });
  assert.equal(Transition.transitionState(plan, 'old', null), 'legacy_pending_calibration');
  assert.equal(Transition.transitionState(plan, 'old', { effectiveReviewCount: 1, lastRating: 'Again' }), 'fsrs_initialized_by_real_review');
  assert.equal(Transition.transitionState(plan, 'new', { effectiveReviewCount: 1, lastRating: 'Good' }), 'fsrs_new_entry');
});

test('the production scheduling channel defaults to legacy and the first snapshot is immutable', () => {
  const storage = memoryStorage();
  const first = Transition.ensurePlan(storage, { old: { mastery: 5 } }, { asOfDate: '2026-08-17' });
  const second = Transition.ensurePlan(storage, { old: { mastery: 1 }, newer: {} }, { asOfDate: '2026-08-18' });
  assert.equal(Transition.channel(storage), Transition.LEGACY_CHANNEL);
  assert.deepEqual(second, first);
  storage.setItem(Transition.CHANNEL_KEY, Transition.FSRS_CHANNEL);
  assert.equal(Transition.channel(storage), Transition.FSRS_CHANNEL);
  storage.removeItem(Transition.CHANNEL_KEY);
  assert.equal(Transition.channel(storage), Transition.LEGACY_CHANNEL);
});

test('the dormant Phase 4 route uses only real FSRS reviews and remains reversible', () => {
  const legacy = { mastery: 5, nextReview: '2026-08-01', interval: 30 };
  const plan = Transition.createPlan({ old: legacy }, { asOfDate: '2026-08-17' });
  const pending = Transition.activeRecord(plan, 'old', legacy, null, Transition.FSRS_CHANNEL);
  assert.equal(pending.mastery, 0);
  assert.equal(pending.nextReview, plan.words[0].calibrationDate);
  assert.equal(pending.transitionStatus, 'legacy_pending_calibration');

  const projected = Transition.activeRecord(plan, 'old', legacy, {
    effectiveReviewCount: 1,
    masteryLevel: 'forming',
    nextReviewDate: '2026-08-25',
    lastRating: 'Again'
  }, Transition.FSRS_CHANNEL);
  assert.equal(projected.mastery, 3);
  assert.equal(projected.nextReview, '2026-08-25');
  assert.equal(projected.fsrs.lastRating, 'Again');
  assert.deepEqual(Transition.activeRecord(plan, 'old', legacy, projected.fsrs, Transition.LEGACY_CHANNEL), legacy);
});
