(function (root, factory) {
  const eventSchema = typeof module === 'object' && module.exports
    ? require('./learning-event-schema')
    : root.BelyeNochiLearningEventSchema;
  const fsrsLibrary = typeof module === 'object' && module.exports
    ? require('ts-fsrs')
    : root.FSRS;
  const api = factory(eventSchema, fsrsLibrary);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiVocabularyFsrsProjection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (eventSchema, fsrsLibrary) {
  'use strict';

  if (!eventSchema) throw new Error('learning event schema is required');
  if (!fsrsLibrary || typeof fsrsLibrary.fsrs !== 'function') throw new Error('ts-fsrs is required');

  const PROJECTION_NAME = 'vocabulary-fsrs';
  const PROJECTION_TYPE = 'vocabularyFsrs';
  const PROJECTION_VERSION = 1;
  const PARAMETER_SET_ID = 'belye-nochi-fsrs6-default-v1';
  const LIBRARY_VERSION = '5.4.1';
  const TIME_ZONE = 'Asia/Shanghai';
  const DAY_MS = 86400000;
  const SKILLS_BY_MODE = Object.freeze({
    visual: 'meaning_recognition',
    audio: 'listening_recognition',
    output: 'form_recall'
  });
  const RATINGS = Object.freeze({
    again: fsrsLibrary.Rating.Again,
    hard: fsrsLibrary.Rating.Hard,
    good: fsrsLibrary.Rating.Good
  });
  const PARAMETERS = fsrsLibrary.generatorParameters({
    request_retention: 0.9,
    maximum_interval: 3650,
    enable_fuzz: false,
    enable_short_term: false
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function orderedEvents(events) {
    return (Array.isArray(events) ? events : []).slice().sort(function (left, right) {
      return String(left.occurredAt || '').localeCompare(String(right.occurredAt || ''))
        || String(left.recordedAt || '').localeCompare(String(right.recordedAt || ''))
        || String(left.eventId || '').localeCompare(String(right.eventId || ''));
    });
  }

  function sourceEvent(event) {
    const value = clone(event);
    delete value.receivedAt;
    return value;
  }

  function localDateKey(value, timeZone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('a valid review date is required');
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return `${values.year}-${values.month}-${values.day}`;
  }

  function setPath(target, path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return;
    let current = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      if (!current[parts[index]] || typeof current[parts[index]] !== 'object') current[parts[index]] = {};
      current = current[parts[index]];
    }
    current[parts[parts.length - 1]] = clone(value);
  }

  function applyCorrections(events) {
    const ordered = orderedEvents(events);
    const corrections = new Map();
    ordered.forEach(function (event) {
      if (event.eventType === 'evidence_corrected' && event.correctsEventId) {
        if (!corrections.has(event.correctsEventId)) corrections.set(event.correctsEventId, []);
        corrections.get(event.correctsEventId).push(event);
      }
    });
    return ordered.filter(function (event) { return event.eventType !== 'evidence_corrected'; }).map(function (event) {
      const result = clone(event);
      (corrections.get(event.eventId) || []).forEach(function (correction) {
        const fields = correction.payload && correction.payload.correctedFields || [];
        const newValue = correction.payload && correction.payload.newValue;
        if (fields.length === 1) {
          setPath(result, fields[0], newValue);
        } else if (newValue && typeof newValue === 'object' && !Array.isArray(newValue)) {
          fields.forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(newValue, field)) setPath(result, field, newValue[field]);
          });
        }
      });
      return result;
    });
  }

  function ratingForReview(event) {
    const payload = event.payload || {};
    const context = event.context || {};
    const rawResult = String(payload.rawResult || '');
    const hintType = String(payload.hintType || '');
    const skill = String(context.skill || SKILLS_BY_MODE[payload.testMode] || 'meaning_recognition');
    const revealed = payload.answerRevealedBeforeResponse === true;
    const audioReplay = hintType === 'audio_replay' && skill === 'listening_recognition';
    const leakingHint = Boolean(hintType) && !audioReplay;

    if (revealed || leakingHint || rawResult === 'unknown' || rawResult === 'wrong') return RATINGS.again;
    if (rawResult === 'fuzzy' || rawResult === 'partial' || audioReplay) return RATINGS.hard;
    if (rawResult === 'known' || rawResult === 'correct') return RATINGS.good;
    return null;
  }

  function qualifyingReviews(events, timeZone) {
    const firstByUnitAndDay = new Set();
    return applyCorrections(events).filter(function (event) {
      if (event.eventType !== 'review_attempt_completed') return false;
      if (!event.subject || !event.subject.lexemeKey || !event.subject.senseId || !event.subject.reviewUnitId) return false;
      if (!event.evidence || event.evidence.quality !== 'accepted' || event.evidence.kind === 'ai_unverified') return false;
      const rating = ratingForReview(event);
      if (!rating) return false;
      const day = event.context && event.context.localDate || localDateKey(event.occurredAt, timeZone);
      const key = `${event.subject.reviewUnitId}|${day}`;
      if (firstByUnitAndDay.has(key)) return false;
      firstByUnitAndDay.add(key);
      event.__fsrsRating = rating;
      event.__localDate = day;
      return true;
    });
  }

  function serializeCard(card) {
    return {
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? card.last_review.toISOString() : null
    };
  }

  function cardInput(value) {
    return {
      ...value,
      due: new Date(value.due),
      last_review: value.last_review ? new Date(value.last_review) : undefined
    };
  }

  function masteryLevel(card, successfulDates) {
    const dates = (successfulDates || []).slice().sort();
    const spanDays = dates.length > 1
      ? Math.round((Date.parse(`${dates[dates.length - 1]}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / DAY_MS)
      : 0;
    if (card.stability >= 90 && dates.length >= 4 && spanDays >= 30) return 'solid';
    if (card.stability >= 21 && dates.length >= 3 && spanDays >= 7) return 'stable';
    if (card.stability >= 3 && dates.length >= 2) return 'forming';
    return 'initial';
  }

  function projectReviewUnit(reviewUnitId, reviews, settings) {
    const scheduler = fsrsLibrary.fsrs(PARAMETERS);
    let card = fsrsLibrary.createEmptyCard(new Date(reviews[0].occurredAt));
    let successfulDates = [];
    const sourceEventIds = [];
    let lastRating = null;
    reviews.forEach(function (event) {
      const reviewedAt = new Date(event.occurredAt);
      const rating = event.__fsrsRating;
      const next = scheduler.next(card, reviewedAt, rating);
      card = next.card;
      sourceEventIds.push(event.eventId);
      lastRating = rating === RATINGS.again ? 'Again' : rating === RATINGS.hard ? 'Hard' : 'Good';
      if (rating === RATINGS.again) successfulDates = [];
      else if (!successfulDates.includes(event.__localDate)) successfulDates.push(event.__localDate);
    });
    const last = reviews[reviews.length - 1];
    const skill = String(last.context && last.context.skill || SKILLS_BY_MODE[last.payload && last.payload.testMode] || 'meaning_recognition');
    return {
      projectionKey: `vocabularyFsrs:${reviewUnitId}`,
      projectionType: PROJECTION_TYPE,
      projectionVersion: PROJECTION_VERSION,
      reviewUnitId,
      lexemeKey: last.subject.lexemeKey,
      senseId: last.subject.senseId,
      skill,
      algorithm: 'FSRS-6',
      algorithmVersion: String(fsrsLibrary.FSRSVersion || 'FSRS-6'),
      library: 'ts-fsrs',
      libraryVersion: LIBRARY_VERSION,
      parameterSetId: PARAMETER_SET_ID,
      parameters: clone(PARAMETERS),
      card: serializeCard(card),
      difficulty: card.difficulty,
      stabilityDays: card.stability,
      nextReviewDate: localDateKey(card.due, settings.timeZone),
      masteryLevel: masteryLevel(card, successfulDates),
      successfulDatesSinceLapse: successfulDates.slice(),
      effectiveReviewCount: reviews.length,
      lastRating,
      lastReviewedAt: last.occurredAt,
      sourceEventIds
    };
  }

  function stateValue(records) {
    return records.slice().sort(function (left, right) {
      return left.projectionKey.localeCompare(right.projectionKey);
    });
  }

  function buildProjection(events, options) {
    const settings = { timeZone: TIME_ZONE, ...(options || {}) };
    const source = orderedEvents(events).map(sourceEvent);
    const reviews = qualifyingReviews(source, settings.timeZone);
    const byReviewUnit = new Map();
    reviews.forEach(function (event) {
      const reviewUnitId = event.subject.reviewUnitId;
      if (!byReviewUnit.has(reviewUnitId)) byReviewUnit.set(reviewUnitId, []);
      byReviewUnit.get(reviewUnitId).push(event);
    });
    const records = Array.from(byReviewUnit.entries()).map(function (entry) {
      return projectReviewUnit(entry[0], entry[1], settings);
    });
    return {
      projectionName: PROJECTION_NAME,
      projectionType: PROJECTION_TYPE,
      projectionVersion: PROJECTION_VERSION,
      parameterSetId: PARAMETER_SET_ID,
      parameters: clone(PARAMETERS),
      timeZone: settings.timeZone,
      sourceEventCount: source.length,
      effectiveReviewCount: reviews.length,
      reviewUnitCount: records.length,
      sourceCanonical: eventSchema.canonicalStringify(source),
      stateCanonical: eventSchema.canonicalStringify(stateValue(records)),
      records: stateValue(records)
    };
  }

  function atTime(record, value) {
    const scheduler = fsrsLibrary.fsrs(PARAMETERS);
    const at = value instanceof Date ? value : new Date(value || Date.now());
    const retrievability = scheduler.get_retrievability(cardInput(record.card), at, false);
    return {
      ...clone(record),
      retrievability,
      due: at.getTime() >= Date.parse(record.card.due)
    };
  }

  return {
    LIBRARY_VERSION,
    PARAMETERS,
    PARAMETER_SET_ID,
    PROJECTION_NAME,
    PROJECTION_TYPE,
    PROJECTION_VERSION,
    RATINGS,
    TIME_ZONE,
    applyCorrections,
    atTime,
    buildProjection,
    localDateKey,
    masteryLevel,
    qualifyingReviews,
    ratingForReview
  };
});
