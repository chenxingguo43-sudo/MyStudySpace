(function (root, factory) {
  const eventSchema = typeof module === 'object' && module.exports
    ? require('./learning-event-schema')
    : root.BelyeNochiLearningEventSchema;
  const api = factory(eventSchema);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiVocabularyFsrsTransition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (eventSchema) {
  'use strict';

  if (!eventSchema) throw new Error('learning event schema is required');

  const CHANNEL_KEY = 'vocabulary-scheduling-channel-v1';
  const PLAN_KEY = 'vocabulary-fsrs-transition-plan-v1';
  const LEGACY_CHANNEL = 'legacy';
  const FSRS_CHANNEL = 'fsrs-phase4';
  const PLAN_VERSION = 1;
  const DAY_MS = 86400000;
  const validatedPlans = new WeakMap();
  const planEntries = new WeakMap();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function dateKey(value) {
    const text = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
    const parsed = Date.parse(`${text}T00:00:00Z`);
    return Number.isNaN(parsed) ? '' : text;
  }

  function addDays(day, count) {
    return new Date(Date.parse(`${day}T00:00:00Z`) + Number(count) * DAY_MS).toISOString().slice(0, 10);
  }

  function dayDistance(from, to) {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
  }

  function stableHash(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function calibrationDate(wordId, record, asOfDate) {
    const asOf = dateKey(asOfDate);
    if (!asOf) throw new TypeError('asOfDate must be YYYY-MM-DD');
    const legacyDate = dateKey(record && record.nextReview);
    if (legacyDate) {
      const distance = dayDistance(asOf, legacyDate);
      if (distance >= 0 && distance <= 30) return legacyDate;
    }
    return addDays(asOf, stableHash(wordId) % 30 + 1);
  }

  function legacyFields(record) {
    const value = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
    return {
      mastery: Object.prototype.hasOwnProperty.call(value, 'mastery') ? clone(value.mastery) : null,
      interval: Object.prototype.hasOwnProperty.call(value, 'interval') ? clone(value.interval) : null,
      easeFactor: Object.prototype.hasOwnProperty.call(value, 'easeFactor') ? clone(value.easeFactor) : null,
      history: Array.isArray(value.history) ? clone(value.history) : [],
      nextReview: Object.prototype.hasOwnProperty.call(value, 'nextReview') ? clone(value.nextReview) : null,
      fullRecord: clone(value)
    };
  }

  function createPlan(records, options) {
    const settings = options || {};
    const asOfDate = dateKey(settings.asOfDate);
    if (!asOfDate) throw new TypeError('asOfDate must be YYYY-MM-DD');
    const source = records && typeof records === 'object' && !Array.isArray(records) ? records : {};
    const words = Object.keys(source).sort().map(function (wordId) {
      return {
        wordId,
        status: 'pending_first_real_review',
        calibrationDate: calibrationDate(wordId, source[wordId], asOfDate),
        legacy: legacyFields(source[wordId])
      };
    });
    const sourceCanonical = eventSchema.canonicalStringify(source);
    return {
      schema: 'belye-nochi-vocabulary-fsrs-transition',
      version: PLAN_VERSION,
      createdAt: String(settings.createdAt || `${asOfDate}T00:00:00.000Z`),
      asOfDate,
      legacyRecordCount: words.length,
      sourceCanonical,
      words
    };
  }

  function validatedPlan(input) {
    if (input && typeof input === 'object' && validatedPlans.has(input)) return validatedPlans.get(input);
    const plan = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
    if (!plan || plan.schema !== 'belye-nochi-vocabulary-fsrs-transition' || plan.version !== PLAN_VERSION) {
      throw new TypeError('invalid vocabulary FSRS transition plan');
    }
    if (!Array.isArray(plan.words) || !dateKey(plan.asOfDate)) throw new TypeError('invalid transition plan contents');
    const source = {};
    plan.words.forEach(function (item) {
      if (!item || typeof item.wordId !== 'string' || !item.wordId || !item.legacy || !dateKey(item.calibrationDate)) {
        throw new TypeError('invalid legacy transition record');
      }
      source[item.wordId] = clone(item.legacy.fullRecord);
    });
    if (eventSchema.canonicalStringify(source) !== plan.sourceCanonical) {
      throw new TypeError('legacy transition snapshot hash source does not match');
    }
    const value = clone(plan);
    const entries = new Map(value.words.map(function (item) { return [item.wordId, item]; }));
    validatedPlans.set(plan, value);
    validatedPlans.set(value, value);
    planEntries.set(plan, entries);
    planEntries.set(value, entries);
    return value;
  }

  function validatePlan(input) {
    return clone(validatedPlan(input));
  }

  function channel(storage) {
    try { return storage && storage.getItem(CHANNEL_KEY) === FSRS_CHANNEL ? FSRS_CHANNEL : LEGACY_CHANNEL; }
    catch (_error) { return LEGACY_CHANNEL; }
  }

  function savePlan(storage, plan) {
    if (!storage || typeof storage.setItem !== 'function') throw new TypeError('storage is required');
    const value = validatePlan(plan);
    storage.setItem(PLAN_KEY, JSON.stringify(value));
    return value;
  }

  function loadPlan(storage) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    try {
      const raw = storage.getItem(PLAN_KEY);
      return raw ? validatePlan(JSON.parse(raw)) : null;
    } catch (_error) {
      return null;
    }
  }

  function ensurePlan(storage, records, options) {
    return loadPlan(storage) || savePlan(storage, createPlan(records, options));
  }

  function transitionState(plan, wordId, fsrsRecord) {
    const validated = validatedPlan(plan);
    const legacy = planEntries.get(validated).get(wordId);
    if (!legacy) return fsrsRecord ? 'fsrs_new_entry' : 'new_unreviewed';
    return fsrsRecord && Number(fsrsRecord.effectiveReviewCount || 0) > 0
      ? 'fsrs_initialized_by_real_review'
      : 'legacy_pending_calibration';
  }

  function masteryNumber(level) {
    return { initial: 1, forming: 3, stable: 4, solid: 5 }[String(level || '')] || 0;
  }

  function activeRecord(plan, wordId, legacyRecord, fsrsRecord, selectedChannel) {
    if (selectedChannel !== FSRS_CHANNEL) return legacyRecord ? clone(legacyRecord) : null;
    const validated = validatedPlan(plan);
    const legacy = planEntries.get(validated).get(wordId);
    const state = !legacy ? (fsrsRecord ? 'fsrs_new_entry' : 'new_unreviewed')
      : fsrsRecord && Number(fsrsRecord.effectiveReviewCount || 0) > 0
        ? 'fsrs_initialized_by_real_review'
        : 'legacy_pending_calibration';
    if (fsrsRecord && Number(fsrsRecord.effectiveReviewCount || 0) > 0) {
      return {
        ...(legacyRecord ? clone(legacyRecord) : {}),
        mastery: masteryNumber(fsrsRecord.masteryLevel),
        nextReview: fsrsRecord.nextReviewDate,
        fsrs: clone(fsrsRecord),
        transitionStatus: state
      };
    }
    if (legacy) {
      return {
        ...clone(legacyRecord || legacy.legacy.fullRecord),
        mastery: 0,
        nextReview: legacy.calibrationDate,
        transitionStatus: state
      };
    }
    return null;
  }

  return {
    CHANNEL_KEY,
    FSRS_CHANNEL,
    LEGACY_CHANNEL,
    PLAN_KEY,
    PLAN_VERSION,
    activeRecord,
    calibrationDate,
    channel,
    createPlan,
    ensurePlan,
    legacyFields,
    loadPlan,
    masteryNumber,
    savePlan,
    stableHash,
    transitionState,
    validatePlan
  };
});
