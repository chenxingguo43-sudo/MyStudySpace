'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { Rating } = require('ts-fsrs');
const Projection = require('../js/vocabulary-fsrs-projection');

let sequence = 0;

function uuid() {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function review(overrides) {
  const value = overrides || {};
  const occurredAt = value.occurredAt || '2026-01-01T00:00:00.000Z';
  return {
    schema: 'belye-nochi-learning-event',
    schemaVersion: 1,
    eventId: value.eventId || uuid(),
    learnerId: '11111111-1111-4111-8111-111111111111',
    deviceId: '22222222-2222-4222-8222-222222222222',
    eventType: 'review_attempt_completed',
    occurredAt,
    recordedAt: occurredAt,
    receivedAt: value.receivedAt || null,
    source: { module: 'vocabulary', contentId: 'word', location: {} },
    subject: {
      surfaceForm: 'мир',
      lexemeKey: 'ru:мир|noun',
      unresolvedLexemeId: null,
      senseId: 'sense-world',
      reviewUnitId: value.reviewUnitId || 'review-world'
    },
    context: {
      localDate: value.localDate || occurredAt.slice(0, 10),
      skill: value.skill || 'meaning_recognition'
    },
    evidence: value.evidence || { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      testMode: value.testMode || 'visual',
      questionSnapshot: {},
      answerSnapshot: {},
      rawResult: value.rawResult || 'known',
      answerRevealedBeforeResponse: Boolean(value.answerRevealedBeforeResponse),
      hintType: value.hintType || '',
      responseMs: 1000,
      sameDayAttemptIndex: value.sameDayAttemptIndex || 1,
      elapsedDays: value.elapsedDays || 0
    },
    correctsEventId: null
  };
}

function correction(target, overrides) {
  const value = overrides || {};
  const occurredAt = value.occurredAt || '2026-01-01T00:01:00.000Z';
  return {
    schema: 'belye-nochi-learning-event',
    schemaVersion: 1,
    eventId: uuid(),
    learnerId: target.learnerId,
    deviceId: target.deviceId,
    eventType: 'evidence_corrected',
    occurredAt,
    recordedAt: occurredAt,
    receivedAt: null,
    source: target.source,
    subject: target.subject,
    context: { localDate: occurredAt.slice(0, 10), action: 'undo' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      correctedFields: value.correctedFields || ['evidence.quality'],
      oldValueSummary: 'accepted',
      newValue: value.newValue === undefined ? 'excluded' : value.newValue,
      reason: 'test correction'
    },
    correctsEventId: target.eventId
  };
}

test('fixed FSRS-6 first-review examples match the accepted contract', () => {
  const cases = [
    ['unknown', false, '2026-01-02', 0.212],
    ['fuzzy', false, '2026-01-03', 1.2931],
    ['known', false, '2026-01-04', 2.3065]
  ];
  for (const [rawResult, revealed, nextReviewDate, stability] of cases) {
    const result = Projection.buildProjection([review({ rawResult, answerRevealedBeforeResponse: revealed })]);
    assert.equal(result.reviewUnitCount, 1);
    assert.equal(result.records[0].nextReviewDate, nextReviewDate);
    assert.equal(result.records[0].stabilityDays, stability);
  }
});

test('a revealed answer is a lapse even when the learner clicks known', () => {
  const event = review({ rawResult: 'known', answerRevealedBeforeResponse: true });
  assert.equal(Projection.ratingForReview(event), Rating.Again);
  const record = Projection.buildProjection([event]).records[0];
  assert.equal(record.lastRating, 'Again');
  assert.equal(record.nextReviewDate, '2026-01-02');
});

test('only the first active result per review unit and local day changes long-term memory', () => {
  const first = review({ rawResult: 'unknown', occurredAt: '2026-01-01T00:00:00.000Z', sameDayAttemptIndex: 1 });
  const retry = review({ rawResult: 'known', occurredAt: '2026-01-01T03:00:00.000Z', sameDayAttemptIndex: 2 });
  const record = Projection.buildProjection([retry, first]).records[0];
  assert.equal(record.effectiveReviewCount, 1);
  assert.equal(record.lastRating, 'Again');
  assert.deepEqual(record.sourceEventIds, [first.eventId]);
});

test('undo excludes the original rating and allows a later same-day result to become effective', () => {
  const first = review({ rawResult: 'unknown', occurredAt: '2026-01-01T00:00:00.000Z' });
  const undo = correction(first, { occurredAt: '2026-01-01T00:01:00.000Z' });
  const replacement = review({ rawResult: 'known', occurredAt: '2026-01-01T00:02:00.000Z', sameDayAttemptIndex: 2 });
  const record = Projection.buildProjection([first, undo, replacement]).records[0];
  assert.equal(record.effectiveReviewCount, 1);
  assert.equal(record.lastRating, 'Good');
  assert.deepEqual(record.sourceEventIds, [replacement.eventId]);
});

test('a due Good grows stability while a due Again lowers it', () => {
  const first = review({ rawResult: 'known', occurredAt: '2026-01-01T00:00:00.000Z' });
  const secondGood = review({ rawResult: 'known', occurredAt: '2026-01-04T00:00:00.000Z' });
  const goodRecord = Projection.buildProjection([first, secondGood]).records[0];
  assert.equal(goodRecord.nextReviewDate, '2026-01-18');
  assert.equal(Number(goodRecord.stabilityDays.toFixed(4)), 13.8269);

  const secondAgain = review({ rawResult: 'unknown', occurredAt: '2026-01-04T00:00:00.000Z' });
  const againRecord = Projection.buildProjection([first, secondAgain]).records[0];
  assert.equal(againRecord.nextReviewDate, '2026-01-05');
  assert.equal(Number(againRecord.stabilityDays.toFixed(4)), 0.6369);
});

test('mastery levels require both stability and evidence across different dates', () => {
  assert.equal(Projection.masteryLevel({ stability: 100 }, ['2026-01-01']), 'initial');
  assert.equal(Projection.masteryLevel({ stability: 100 }, ['2026-01-01', '2026-01-04']), 'forming');
  assert.equal(Projection.masteryLevel({ stability: 100 }, ['2026-01-01', '2026-01-04', '2026-01-08']), 'stable');
  assert.equal(Projection.masteryLevel({ stability: 100 }, ['2026-01-01', '2026-01-08', '2026-01-20', '2026-01-31']), 'solid');
});

test('source fingerprints ignore server receivedAt while state remains deterministic', () => {
  const event = review({ receivedAt: null });
  const browser = Projection.buildProjection([event]);
  const server = Projection.buildProjection([{ ...event, receivedAt: '2026-01-01T00:00:01.000Z' }]);
  assert.equal(browser.sourceCanonical, server.sourceCanonical);
  assert.equal(browser.stateCanonical, server.stateCanonical);
});
