'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const EventStore = require('../js/learning-event-store');
const Projection = require('../js/vocabulary-fsrs-projection');
const ProjectionClient = require('../js/learning-projection-client');
const Schema = require('../js/learning-event-schema');
const Transition = require('../js/vocabulary-fsrs-transition');
const { createLearningStore } = require('../server/learning-store');

const DAY_MS = 86400000;

function addDays(day, count) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}

function shanghaiTime(day, hour, minute) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + (hour - 8) * 3600000 + minute * 60000).toISOString();
}

function reviewInput(identity, localDate, rawResult, occurredAt) {
  return {
    eventType: 'review_attempt_completed',
    occurredAt,
    source: { module: 'vocabulary', contentId: identity.wordId, location: { simulation: true } },
    subject: {
      surfaceForm: identity.surfaceForm,
      lexemeKey: identity.lexemeKey,
      unresolvedLexemeId: null,
      senseId: identity.senseId,
      reviewUnitId: identity.reviewUnitId
    },
    context: { localDate, skill: 'meaning_recognition', virtualTime: true },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      testMode: 'visual', questionSnapshot: {}, answerSnapshot: {}, rawResult,
      answerRevealedBeforeResponse: false, hintType: '', responseMs: 900,
      sameDayAttemptIndex: 1, elapsedDays: 0
    }
  };
}

function correctionInput(target, localDate, occurredAt, fields, newValue, action) {
  return {
    eventType: 'evidence_corrected',
    occurredAt,
    source: target.source,
    subject: target.subject,
    context: { localDate, action },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: {
      correctedFields: fields,
      oldValueSummary: 'simulation correction',
      newValue,
      reason: action
    },
    correctsEventId: target.eventId
  };
}

function recordState(records) {
  return records.map(record => ({
    projectionKey: record.projectionKey,
    effectiveReviewCount: record.effectiveReviewCount,
    stabilityDays: record.stabilityDays,
    difficulty: record.difficulty,
    nextReviewDate: record.nextReviewDate,
    lastRating: record.lastRating
  })).sort((left, right) => left.projectionKey.localeCompare(right.projectionKey));
}

test('365 virtual days keep isolated browser and SQLite FSRS projections identical', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'belye-nochi-fsrs-365-'));
  const databasePath = path.join(directory, '365.sqlite3');
  const replayPath = path.join(directory, 'replay.sqlite3');
  const clock = { value: '2023-03-02T04:00:00.000Z' };
  const browserStore = EventStore.createLearningEventStore({
    adapter: EventStore.createMemoryAdapter(),
    crypto,
    now: () => new Date(clock.value)
  });
  const browserProjection = ProjectionClient.createProjectionClient({
    store: browserStore,
    crypto: crypto.webcrypto,
    now: () => new Date(clock.value)
  });
  let sqlite = createLearningStore({ databasePath, now: () => new Date(clock.value), busyTimeoutMs: 50 });
  let replay = null;
  t.after(() => {
    if (replay) replay.close();
    sqlite.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const identityRows = [];
  for (const [wordId, surfaceForm, lexemeKey] of [
    ['legacy-one', 'мир', 'ru:мир|noun'],
    ['legacy-two', 'дом', 'ru:дом|noun'],
    ['new-one', 'окно', 'ru:окно|noun'],
    ['new-two', 'книга', 'ru:книга|noun']
  ]) {
    const identity = await browserStore.ensureReviewIdentity(lexemeKey, 'meaning_recognition');
    identityRows.push({ wordId, surfaceForm, lexemeKey, ...identity });
  }
  const legacyPlan = Transition.createPlan({
    'legacy-one': { mastery: 5, interval: 90, easeFactor: 2.8, history: [{ date: '2023-01-01', rating: 5 }], nextReview: '2023-03-06' },
    'legacy-two': { mastery: 2, interval: 3, easeFactor: 2.1, history: [], nextReview: '2022-12-01' }
  }, { asOfDate: '2023-03-02', createdAt: clock.value });
  sqlite.saveLegacyVocabularySnapshot(legacyPlan);

  const ratingsSeen = new Set();
  const coverage = { early: 0, overdue: 0, sameDay: 0, undo: 0, correction: 0, boundary: 0 };
  let previousRecords = new Map();

  for (let dayIndex = 0; dayIndex < 365; dayIndex += 1) {
    const localDate = addDays('2023-03-02', dayIndex);
    clock.value = shanghaiTime(localDate, 12, 0);
    const identity = identityRows[dayIndex % identityRows.length];
    const rating = ['unknown', 'fuzzy', 'known', 'known', 'known'][dayIndex % 5];
    ratingsSeen.add(rating);
    const previous = previousRecords.get(identity.reviewUnitId);
    if (previous && localDate < previous.nextReviewDate) coverage.early += 1;
    if (previous && localDate > previous.nextReviewDate) coverage.overdue += 1;

    const occurredAt = dayIndex % 73 === 0 ? shanghaiTime(localDate, 0, 1) : clock.value;
    const original = await browserStore.recordEvent(reviewInput(identity, localDate, rating, occurredAt));
    const dailyEvents = [original];

    if (dayIndex % 17 === 0) {
      coverage.sameDay += 1;
      dailyEvents.push(await browserStore.recordEvent({
        ...reviewInput(identity, localDate, 'known', shanghaiTime(localDate, 23, 59)),
        payload: { ...reviewInput(identity, localDate, 'known', shanghaiTime(localDate, 23, 59)).payload, sameDayAttemptIndex: 2 }
      }));
      coverage.boundary += 1;
    }
    if (dayIndex % 41 === 7) {
      coverage.undo += 1;
      const undo = await browserStore.recordEvent(correctionInput(
        original, localDate, shanghaiTime(localDate, 12, 1), ['evidence.quality'], 'excluded', 'undo'
      ));
      const replacement = await browserStore.recordEvent({
        ...reviewInput(identity, localDate, 'known', shanghaiTime(localDate, 12, 2)),
        payload: { ...reviewInput(identity, localDate, 'known', shanghaiTime(localDate, 12, 2)).payload, sameDayAttemptIndex: 3 }
      });
      dailyEvents.push(undo, replacement);
    } else if (dayIndex % 53 === 11) {
      coverage.correction += 1;
      dailyEvents.push(await browserStore.recordEvent(correctionInput(
        original, localDate, shanghaiTime(localDate, 12, 1), ['payload.rawResult'], 'known', 'rating_correction'
      )));
    }

    const browserResult = await browserProjection.rebuild();
    const browserIdentity = await browserStore.identity();
    const committed = sqlite.ingestBatch({
      schema: Schema.BATCH_SCHEMA,
      schemaVersion: Schema.BATCH_SCHEMA_VERSION,
      batchId: crypto.randomUUID(),
      deviceId: browserIdentity.deviceId,
      events: dailyEvents
    });
    const sqliteResult = sqlite.fsrsProjection(clock.value);
    assert.equal(committed.projectionCheckpoint.sourceEventCount, browserResult.checkpoint.sourceEventCount, `event count on ${localDate}`);
    assert.equal(committed.projectionCheckpoint.sourceHash, browserResult.checkpoint.sourceHash, `source hash on ${localDate}`);
    assert.equal(committed.projectionCheckpoint.stateHash, browserResult.checkpoint.stateHash, `state hash on ${localDate}`);
    assert.deepEqual(recordState(sqliteResult.records), recordState(browserResult.records), `FSRS state on ${localDate}`);
    previousRecords = new Map(browserResult.records.map(record => [record.reviewUnitId, record]));

    if (dayIndex === 181) {
      const beforeRestart = sqlite.health();
      sqlite.close();
      sqlite = createLearningStore({ databasePath, now: () => new Date(clock.value), busyTimeoutMs: 50 });
      assert.equal(sqlite.health().eventCount, beforeRestart.eventCount);
      assert.equal(sqlite.fsrsProjection().checkpoint.stateHash, browserResult.checkpoint.stateHash);
    }
  }

  assert.deepEqual([...ratingsSeen].sort(), ['fuzzy', 'known', 'unknown']);
  Object.entries(coverage).forEach(([name, count]) => assert.ok(count > 0, `${name} coverage`));
  assert.equal(addDays('2023-03-02', 364), '2024-02-29');

  const refreshedProjection = ProjectionClient.createProjectionClient({
    store: browserStore,
    crypto: crypto.webcrypto,
    now: () => new Date(clock.value)
  });
  const refreshed = await refreshedProjection.rebuild();
  assert.equal(refreshed.checkpoint.stateHash, sqlite.fsrsProjection().checkpoint.stateHash);

  const archive = sqlite.exportArchiveV2();
  replay = createLearningStore({ databasePath: replayPath, now: () => new Date(clock.value), busyTimeoutMs: 50 });
  replay.importArchiveV2(archive);
  assert.equal(replay.countEvents(), archive.events.length);
  assert.equal(replay.fsrsProjection().checkpoint.sourceHash, refreshed.checkpoint.sourceHash);
  assert.equal(replay.fsrsProjection().checkpoint.stateHash, refreshed.checkpoint.stateHash);
  assert.deepEqual(recordState(replay.fsrsProjection(clock.value).records), recordState(refreshed.records));
});
