(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiLearningEventSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EVENT_SCHEMA = 'belye-nochi-learning-event';
  const EVENT_SCHEMA_VERSION = 1;
  const BATCH_SCHEMA = 'belye-nochi-event-batch';
  const BATCH_SCHEMA_VERSION = 1;
  const MAX_EVENT_BYTES = 64 * 1024;
  const MAX_BATCH_EVENTS = 200;
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const EVENT_TYPES = new Set([
    'dictionary_lookup_succeeded',
    'dictionary_lookup_missed',
    'vocabulary_entry_added',
    'vocabulary_entry_pending_resolution',
    'review_attempt_completed',
    'evidence_corrected'
  ]);
  const SOURCE_MODULES = new Set(['reader', 'vocabulary', 'writing', 'speaking', 'migration', 'b2']);
  const EVIDENCE_KINDS = new Set(['objective', 'learner_confirmed', 'algorithm_derived', 'ai_unverified']);
  const EVIDENCE_QUALITIES = new Set(['accepted', 'disputed', 'corrected', 'excluded']);
  const REVIEW_RESULTS = new Set(['unknown', 'fuzzy', 'known', 'wrong', 'partial', 'correct']);

  function schemaError(code, message, field) {
    const error = new TypeError(message);
    error.code = code;
    error.field = field || '';
    return error;
  }

  function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function requireObject(value, field) {
    if (!isPlainObject(value)) throw schemaError('INVALID_OBJECT', `${field} must be an object`, field);
    return value;
  }

  function requiredString(value, field, maxLength) {
    if (typeof value !== 'string' || !value.trim()) throw schemaError('INVALID_STRING', `${field} is required`, field);
    const result = value.trim();
    if (result.length > maxLength) throw schemaError('STRING_TOO_LONG', `${field} is too long`, field);
    return result;
  }

  function optionalString(value, field, maxLength) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value !== 'string') throw schemaError('INVALID_STRING', `${field} must be a string`, field);
    const result = value.trim();
    if (result.length > maxLength) throw schemaError('STRING_TOO_LONG', `${field} is too long`, field);
    return result;
  }

  function uuid(value, field) {
    const result = requiredString(value, field, 36);
    if (!UUID_V4.test(result)) throw schemaError('INVALID_UUID', `${field} must be a UUIDv4`, field);
    return result.toLowerCase();
  }

  function timestamp(value, field, nullable) {
    if (nullable && (value === null || value === undefined || value === '')) return null;
    const result = requiredString(value, field, 40);
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(result) || Number.isNaN(Date.parse(result))) {
      throw schemaError('INVALID_TIMESTAMP', `${field} must be an ISO 8601 timestamp with timezone`, field);
    }
    return result;
  }

  function nonNegativeNumber(value, field, integerOnly) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integerOnly && !Number.isInteger(value))) {
      throw schemaError('INVALID_NUMBER', `${field} must be a non-negative${integerOnly ? ' integer' : ''}`, field);
    }
    return value;
  }

  function jsonClone(value, field) {
    try {
      const encoded = JSON.stringify(value);
      if (encoded === undefined) throw new Error('not JSON serializable');
      return JSON.parse(encoded);
    } catch (_error) {
      throw schemaError('INVALID_JSON_VALUE', `${field} must contain JSON-safe values`, field);
    }
  }

  function canonicalStringify(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw schemaError('INVALID_JSON_VALUE', 'numbers must be finite');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
    if (isPlainObject(value)) {
      return '{' + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ':' + canonicalStringify(value[key]);
      }).join(',') + '}';
    }
    throw schemaError('INVALID_JSON_VALUE', 'value must be JSON-safe');
  }

  function normalizeSource(input) {
    const source = requireObject(input, 'source');
    const moduleName = requiredString(source.module, 'source.module', 40);
    if (!SOURCE_MODULES.has(moduleName)) throw schemaError('UNSUPPORTED_SOURCE_MODULE', `unsupported source.module: ${moduleName}`, 'source.module');
    return {
      module: moduleName,
      contentId: optionalString(source.contentId, 'source.contentId', 240),
      location: jsonClone(source.location || {}, 'source.location')
    };
  }

  function normalizeSubject(input) {
    const subject = requireObject(input, 'subject');
    const lexemeKey = optionalString(subject.lexemeKey, 'subject.lexemeKey', 240);
    const unresolvedLexemeId = optionalString(subject.unresolvedLexemeId, 'subject.unresolvedLexemeId', 128);
    if (!lexemeKey && !unresolvedLexemeId) {
      throw schemaError('SUBJECT_REQUIRED', 'subject must identify a lexeme or unresolved form', 'subject');
    }
    if (lexemeKey && unresolvedLexemeId) {
      throw schemaError('SUBJECT_AMBIGUOUS', 'subject cannot contain both lexemeKey and unresolvedLexemeId', 'subject');
    }
    return {
      surfaceForm: optionalString(subject.surfaceForm, 'subject.surfaceForm', 120),
      lexemeKey: lexemeKey || null,
      unresolvedLexemeId: unresolvedLexemeId || null,
      senseId: optionalString(subject.senseId, 'subject.senseId', 128) || null,
      reviewUnitId: optionalString(subject.reviewUnitId, 'subject.reviewUnitId', 128) || null
    };
  }

  function normalizeEvidence(input) {
    const evidence = requireObject(input, 'evidence');
    const kind = requiredString(evidence.kind, 'evidence.kind', 40);
    const quality = requiredString(evidence.quality, 'evidence.quality', 40);
    if (!EVIDENCE_KINDS.has(kind)) throw schemaError('UNSUPPORTED_EVIDENCE_KIND', `unsupported evidence.kind: ${kind}`, 'evidence.kind');
    if (!EVIDENCE_QUALITIES.has(quality)) throw schemaError('UNSUPPORTED_EVIDENCE_QUALITY', `unsupported evidence.quality: ${quality}`, 'evidence.quality');
    return {
      kind,
      strength: requiredString(evidence.strength, 'evidence.strength', 40),
      quality
    };
  }

  function normalizeVocabularyAddedPayload(input, subject) {
    const payload = requireObject(input, 'payload');
    const initialSenseId = requiredString(payload.initialSenseId, 'payload.initialSenseId', 128);
    if (!subject.lexemeKey || subject.senseId !== initialSenseId) {
      throw schemaError('VOCABULARY_SUBJECT_MISMATCH', 'vocabulary entry must target the same formal sense as its subject', 'payload.initialSenseId');
    }
    return {
      addMethod: requiredString(payload.addMethod, 'payload.addMethod', 80),
      initialSenseId,
      lookupEventId: payload.lookupEventId ? uuid(payload.lookupEventId, 'payload.lookupEventId') : null
    };
  }

  function normalizeLookupPayload(input, succeeded) {
    const payload = requireObject(input, 'payload');
    const queryForm = requiredString(payload.queryForm, 'payload.queryForm', 120);
    if (succeeded) {
      if (typeof payload.guessFirstMode !== 'boolean') {
        throw schemaError('INVALID_BOOLEAN', 'payload.guessFirstMode must be boolean', 'payload.guessFirstMode');
      }
      return {
        queryForm,
        matchMethod: requiredString(payload.matchMethod, 'payload.matchMethod', 80),
        displayedMeaning: requiredString(payload.displayedMeaning, 'payload.displayedMeaning', 2000),
        guessFirstMode: payload.guessFirstMode
      };
    }
    if (!Array.isArray(payload.lemmaCandidates) || payload.lemmaCandidates.length > 20) {
      throw schemaError('INVALID_LEMMA_CANDIDATES', 'payload.lemmaCandidates must be an array with at most 20 items', 'payload.lemmaCandidates');
    }
    return {
      queryForm,
      failureCategory: requiredString(payload.failureCategory, 'payload.failureCategory', 80),
      lemmaCandidates: payload.lemmaCandidates.map(function (value, index) {
        return requiredString(value, `payload.lemmaCandidates[${index}]`, 120);
      })
    };
  }

  function normalizePendingVocabularyPayload(input, subject) {
    const payload = requireObject(input, 'payload');
    if (!subject.unresolvedLexemeId || subject.lexemeKey || subject.senseId || subject.reviewUnitId) {
      throw schemaError('PENDING_VOCABULARY_SUBJECT_MISMATCH', 'pending vocabulary entry must target one unresolved lexeme', 'subject.unresolvedLexemeId');
    }
    if (!Array.isArray(payload.lemmaCandidates) || payload.lemmaCandidates.length > 20) {
      throw schemaError('INVALID_LEMMA_CANDIDATES', 'payload.lemmaCandidates must be an array with at most 20 items', 'payload.lemmaCandidates');
    }
    return {
      addMethod: requiredString(payload.addMethod, 'payload.addMethod', 80),
      lookupEventId: payload.lookupEventId ? uuid(payload.lookupEventId, 'payload.lookupEventId') : null,
      lemmaCandidates: payload.lemmaCandidates.map(function (value, index) {
        return requiredString(value, `payload.lemmaCandidates[${index}]`, 120);
      })
    };
  }

  function normalizeReviewPayload(input, subject) {
    const payload = requireObject(input, 'payload');
    if (!subject.lexemeKey || !subject.senseId || !subject.reviewUnitId) {
      throw schemaError('REVIEW_UNIT_REQUIRED', 'review event requires lexemeKey, senseId and reviewUnitId', 'subject.reviewUnitId');
    }
    const rawResult = requiredString(payload.rawResult, 'payload.rawResult', 24);
    if (!REVIEW_RESULTS.has(rawResult)) throw schemaError('UNSUPPORTED_REVIEW_RESULT', `unsupported payload.rawResult: ${rawResult}`, 'payload.rawResult');
    if (typeof payload.answerRevealedBeforeResponse !== 'boolean') {
      throw schemaError('INVALID_BOOLEAN', 'payload.answerRevealedBeforeResponse must be boolean', 'payload.answerRevealedBeforeResponse');
    }
    return {
      testMode: requiredString(payload.testMode, 'payload.testMode', 80),
      questionSnapshot: jsonClone(payload.questionSnapshot, 'payload.questionSnapshot'),
      answerSnapshot: jsonClone(payload.answerSnapshot, 'payload.answerSnapshot'),
      rawResult,
      answerRevealedBeforeResponse: payload.answerRevealedBeforeResponse,
      hintType: optionalString(payload.hintType, 'payload.hintType', 80),
      responseMs: nonNegativeNumber(payload.responseMs, 'payload.responseMs', true),
      sameDayAttemptIndex: (function () {
        const value = nonNegativeNumber(payload.sameDayAttemptIndex, 'payload.sameDayAttemptIndex', true);
        if (value < 1) {
          throw schemaError('INVALID_ATTEMPT_INDEX', 'payload.sameDayAttemptIndex must be at least 1', 'payload.sameDayAttemptIndex');
        }
        return value;
      })(),
      elapsedDays: nonNegativeNumber(payload.elapsedDays, 'payload.elapsedDays', false)
    };
  }

  function normalizeCorrectionPayload(input, correctsEventId) {
    const payload = requireObject(input, 'payload');
    if (!correctsEventId) {
      throw schemaError('CORRECTION_TARGET_REQUIRED', 'evidence correction requires correctsEventId', 'correctsEventId');
    }
    if (!Array.isArray(payload.correctedFields) || payload.correctedFields.length < 1 || payload.correctedFields.length > 20) {
      throw schemaError('INVALID_CORRECTED_FIELDS', 'payload.correctedFields must contain 1-20 fields', 'payload.correctedFields');
    }
    return {
      correctedFields: payload.correctedFields.map(function (value, index) {
        return requiredString(value, `payload.correctedFields[${index}]`, 120);
      }),
      oldValueSummary: jsonClone(payload.oldValueSummary, 'payload.oldValueSummary'),
      newValue: jsonClone(payload.newValue, 'payload.newValue'),
      reason: requiredString(payload.reason, 'payload.reason', 240)
    };
  }

  function normalizeLearningEvent(input) {
    const event = requireObject(input, 'event');
    if (event.schema !== EVENT_SCHEMA) throw schemaError('UNSUPPORTED_SCHEMA', `event.schema must be ${EVENT_SCHEMA}`, 'schema');
    if (event.schemaVersion !== EVENT_SCHEMA_VERSION) throw schemaError('UNSUPPORTED_SCHEMA_VERSION', 'unsupported event.schemaVersion', 'schemaVersion');
    const eventType = requiredString(event.eventType, 'eventType', 80);
    if (!EVENT_TYPES.has(eventType)) throw schemaError('UNSUPPORTED_EVENT_TYPE', `unsupported eventType in the current schema: ${eventType}`, 'eventType');
    const subject = normalizeSubject(event.subject);
    const correctsEventId = event.correctsEventId ? uuid(event.correctsEventId, 'correctsEventId') : null;
    const normalized = {
      schema: EVENT_SCHEMA,
      schemaVersion: EVENT_SCHEMA_VERSION,
      eventId: uuid(event.eventId, 'eventId'),
      learnerId: uuid(event.learnerId, 'learnerId'),
      deviceId: uuid(event.deviceId, 'deviceId'),
      eventType,
      occurredAt: timestamp(event.occurredAt, 'occurredAt'),
      recordedAt: timestamp(event.recordedAt, 'recordedAt'),
      receivedAt: timestamp(event.receivedAt, 'receivedAt', true),
      source: normalizeSource(event.source),
      subject,
      context: jsonClone(event.context || {}, 'context'),
      evidence: normalizeEvidence(event.evidence),
      payload: eventType === 'dictionary_lookup_succeeded'
        ? normalizeLookupPayload(event.payload, true)
        : eventType === 'dictionary_lookup_missed'
          ? normalizeLookupPayload(event.payload, false)
          : eventType === 'vocabulary_entry_added'
            ? normalizeVocabularyAddedPayload(event.payload, subject)
            : eventType === 'vocabulary_entry_pending_resolution'
              ? normalizePendingVocabularyPayload(event.payload, subject)
              : eventType === 'review_attempt_completed'
                ? normalizeReviewPayload(event.payload, subject)
                : normalizeCorrectionPayload(event.payload, correctsEventId),
      correctsEventId
    };
    const byteLength = typeof TextEncoder === 'function'
      ? new TextEncoder().encode(canonicalStringify(normalized)).byteLength
      : unescape(encodeURIComponent(canonicalStringify(normalized))).length;
    if (byteLength > MAX_EVENT_BYTES) throw schemaError('EVENT_TOO_LARGE', `event exceeds ${MAX_EVENT_BYTES} bytes`);
    return normalized;
  }

  function normalizeEventBatch(input) {
    const batch = requireObject(input, 'batch');
    if (batch.schema !== BATCH_SCHEMA) throw schemaError('UNSUPPORTED_BATCH_SCHEMA', `batch.schema must be ${BATCH_SCHEMA}`, 'schema');
    if (batch.schemaVersion !== BATCH_SCHEMA_VERSION) throw schemaError('UNSUPPORTED_BATCH_VERSION', 'unsupported batch.schemaVersion', 'schemaVersion');
    const deviceId = uuid(batch.deviceId, 'deviceId');
    if (!Array.isArray(batch.events) || batch.events.length < 1 || batch.events.length > MAX_BATCH_EVENTS) {
      throw schemaError('INVALID_BATCH_SIZE', `batch.events must contain 1-${MAX_BATCH_EVENTS} events`, 'events');
    }
    const seen = new Set();
    const events = batch.events.map(function (value) {
      const event = normalizeLearningEvent(value);
      if (event.deviceId !== deviceId) throw schemaError('BATCH_DEVICE_MISMATCH', 'every event.deviceId must match batch.deviceId', 'deviceId');
      if (seen.has(event.eventId)) throw schemaError('DUPLICATE_EVENT_IN_BATCH', `duplicate eventId in batch: ${event.eventId}`, 'events');
      seen.add(event.eventId);
      return event;
    });
    return {
      schema: BATCH_SCHEMA,
      schemaVersion: BATCH_SCHEMA_VERSION,
      batchId: uuid(batch.batchId, 'batchId'),
      deviceId,
      events
    };
  }

  return {
    BATCH_SCHEMA,
    BATCH_SCHEMA_VERSION,
    EVENT_SCHEMA,
    EVENT_SCHEMA_VERSION,
    EVENT_TYPES,
    MAX_BATCH_EVENTS,
    MAX_EVENT_BYTES,
    UUID_V4,
    canonicalStringify,
    normalizeEventBatch,
    normalizeLearningEvent,
    schemaError
  };
});
