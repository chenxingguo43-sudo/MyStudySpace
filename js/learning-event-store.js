(function (root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('./learning-event-schema')
    : root.BelyeNochiLearningEventSchema;
  const api = factory(schema, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiLearningEventStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (schema, environment) {
  'use strict';

  if (!schema) throw new Error('BelyeNochiLearningEventSchema is required');

  const DB_NAME = 'belye_nochi_learning';
  const DB_VERSION = 2;
  const STORES = Object.freeze({
    events: 'events',
    outbox: 'outbox',
    receipts: 'syncReceipts',
    projections: 'projections',
    checkpoints: 'projectionCheckpoints',
    snapshots: 'migrationSnapshots',
    meta: 'meta'
  });

  function nowIso(now) {
    const value = now ? now() : new Date();
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid date');
    return date.toISOString();
  }

  function createUuid(cryptoImpl) {
    if (!cryptoImpl || typeof cryptoImpl.randomUUID !== 'function') {
      const error = new Error('crypto.randomUUID is required for learning event identity');
      error.code = 'UUID_UNAVAILABLE';
      throw error;
    }
    return cryptoImpl.randomUUID().toLowerCase();
  }

  function conflictError(eventId) {
    const error = new Error(`eventId already exists with different content: ${eventId}`);
    error.code = 'EVENT_ID_CONFLICT';
    return error;
  }

  function sameEvent(left, right) {
    return schema.canonicalStringify(left) === schema.canonicalStringify(right);
  }

  function createMemoryAdapter() {
    const state = {
      events: new Map(),
      outbox: new Map(),
      receipts: new Map(),
      projections: new Map(),
      checkpoints: new Map(),
      meta: new Map()
    };
    return {
      async ensureIdentity(generate) {
        if (!state.meta.has('learnerId')) state.meta.set('learnerId', generate());
        if (!state.meta.has('deviceId')) state.meta.set('deviceId', generate());
        return { learnerId: state.meta.get('learnerId'), deviceId: state.meta.get('deviceId') };
      },
      async ensureReviewIdentity(identityKey, skill, generate, preferredIdentity) {
        const projectionKey = `vocabularyIdentity:${identityKey}`;
        if (!state.projections.has(projectionKey)) {
          const preferred = preferredIdentity || {};
          state.projections.set(projectionKey, {
            projectionKey,
            projectionType: 'vocabularyIdentity',
            projectionVersion: 1,
            identityKey,
            senseId: preferred.senseId || generate(),
            reviewUnits: preferred.skill === skill && preferred.reviewUnitId
              ? { [skill]: preferred.reviewUnitId }
              : {}
          });
        }
        const identity = state.projections.get(projectionKey);
        assertPreferredIdentity(identity, skill, preferredIdentity);
        if (!identity.reviewUnits) identity.reviewUnits = {};
        if (!identity.reviewUnits[skill]) {
          identity.reviewUnits[skill] = preferredIdentity && preferredIdentity.skill === skill && preferredIdentity.reviewUnitId
            ? preferredIdentity.reviewUnitId
            : generate();
        }
        return { ...identity, reviewUnitId: identity.reviewUnits[skill], reviewUnits: { ...identity.reviewUnits } };
      },
      async ensureUnresolvedIdentity(identityKey, generate) {
        const projectionKey = `unresolvedLexemeIdentity:${identityKey}`;
        if (!state.projections.has(projectionKey)) {
          state.projections.set(projectionKey, {
            projectionKey,
            projectionType: 'unresolvedLexemeIdentity',
            projectionVersion: 1,
            identityKey,
            unresolvedLexemeId: generate()
          });
        }
        return { ...state.projections.get(projectionKey) };
      },
      async appendEventsAndQueue(events, queuedAt) {
        events.forEach(event => {
          const previous = state.events.get(event.eventId);
          if (previous && !sameEvent(previous, event)) throw conflictError(event.eventId);
        });
        events.forEach(event => {
          const previous = state.events.get(event.eventId);
          if (!previous) state.events.set(event.eventId, event);
          if (!state.receipts.has(event.eventId) && !state.outbox.has(event.eventId)) {
            state.outbox.set(event.eventId, {
              eventId: event.eventId,
              queuedAt,
              attemptCount: 0,
              nextAttemptAt: queuedAt,
              lastErrorCode: ''
            });
          }
        });
        return events;
      },
      async appendEventAndQueue(event, queuedAt) {
        await this.appendEventsAndQueue([event], queuedAt);
        return event;
      },
      async pending(limit, at) {
        return Array.from(state.outbox.values())
          .filter(item => !at || item.nextAttemptAt <= at)
          .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
          .slice(0, limit)
          .map(item => ({ event: state.events.get(item.eventId), delivery: { ...item } }));
      },
      async acknowledge(eventIds, receipt) {
        eventIds.forEach(eventId => {
          if (!state.events.has(eventId)) throw new Error(`cannot acknowledge unknown event: ${eventId}`);
          state.receipts.set(eventId, { eventId, ...receipt });
          state.outbox.delete(eventId);
        });
      },
      async fail(eventIds, failure) {
        eventIds.forEach(eventId => {
          const item = state.outbox.get(eventId);
          if (!item) return;
          state.outbox.set(eventId, {
            ...item,
            attemptCount: item.attemptCount + 1,
            nextAttemptAt: failure.nextAttemptAt,
            lastErrorCode: failure.errorCode || 'SYNC_FAILED'
          });
        });
      },
      async stats() {
        return { events: state.events.size, pending: state.outbox.size, acknowledged: state.receipts.size };
      },
      async nextPendingAt() {
        return Array.from(state.outbox.values()).reduce(function (earliest, item) {
          return !earliest || item.nextAttemptAt < earliest ? item.nextAttemptAt : earliest;
        }, null);
      },
      async reviewAttempts(reviewUnitId, localDate) {
        return Array.from(state.events.values()).filter(event =>
          event.eventType === 'review_attempt_completed'
          && event.subject.reviewUnitId === reviewUnitId
          && (!localDate || event.context.localDate === localDate)
        ).sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
      },
      async vocabularyAdditionActive(senseId) {
        const values = Array.from(state.events.values());
        const excluded = new Set(values.filter(event =>
          event.eventType === 'evidence_corrected'
          && event.payload && event.payload.newValue === 'excluded'
        ).map(event => event.correctsEventId));
        return values.some(event =>
          event.eventType === 'vocabulary_entry_added'
          && event.subject.senseId === senseId
          && !excluded.has(event.eventId)
        );
      },
      async getEvent(eventId) { return state.events.get(eventId) || null; },
      async allEvents() {
        return Array.from(state.events.values()).sort(function (left, right) {
          return left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId);
        });
      },
      async replaceProjections(projectionType, records, checkpoint) {
        Array.from(state.projections.entries()).forEach(function (entry) {
          if (entry[1] && entry[1].projectionType === projectionType) state.projections.delete(entry[0]);
        });
        (records || []).forEach(function (record) { state.projections.set(record.projectionKey, cloneRecord(record)); });
        if (checkpoint) state.checkpoints.set(checkpoint.projectionName, cloneRecord(checkpoint));
      },
      async projectionsByType(projectionType) {
        return Array.from(state.projections.values()).filter(function (record) {
          return record && record.projectionType === projectionType;
        }).map(cloneRecord);
      },
      async projectionCheckpoint(projectionName) {
        const value = state.checkpoints.get(projectionName);
        return value ? cloneRecord(value) : null;
      },
      async allOutbox() { return Array.from(state.outbox.values()); },
      async allReceipts() { return Array.from(state.receipts.values()); }
    };
  }

  function cloneRecord(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function requestResult(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB request failed')); };
    });
  }

  function identityConflict(field) {
    const error = new Error(`saved learning identity conflicts with the shared ${field}`);
    error.code = 'LEARNING_IDENTITY_CONFLICT';
    error.field = field;
    return error;
  }

  function assertPreferredIdentity(identity, skill, preferredIdentity) {
    const preferred = preferredIdentity || {};
    if (preferred.senseId && identity.senseId !== preferred.senseId) throw identityConflict('senseId');
    const reviewUnits = identity.reviewUnits || {};
    if (preferred.skill === skill && preferred.reviewUnitId && reviewUnits[skill] && reviewUnits[skill] !== preferred.reviewUnitId) {
      throw identityConflict('reviewUnitId');
    }
  }

  function transactionResult(transaction, result) {
    return new Promise(function (resolve, reject) {
      transaction.oncomplete = function () { resolve(result()); };
      transaction.onerror = function () { reject(transaction.error || new Error('IndexedDB transaction failed')); };
      transaction.onabort = function () { reject(transaction.error || new Error('IndexedDB transaction aborted')); };
    });
  }

  function createIndexedDbAdapter(indexedDb) {
    if (!indexedDb || typeof indexedDb.open !== 'function') throw new TypeError('indexedDB is required');
    let databasePromise;

    function database() {
      if (databasePromise) return databasePromise;
      databasePromise = new Promise(function (resolve, reject) {
        const request = indexedDb.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function () {
          const db = request.result;
          const events = db.objectStoreNames.contains(STORES.events)
            ? request.transaction.objectStore(STORES.events)
            : db.createObjectStore(STORES.events, { keyPath: 'eventId' });
          if (!events.indexNames.contains('occurredAt')) events.createIndex('occurredAt', 'occurredAt', { unique: false });
          if (!events.indexNames.contains('eventType')) events.createIndex('eventType', 'eventType', { unique: false });
          if (!events.indexNames.contains('reviewUnitId')) events.createIndex('reviewUnitId', 'subject.reviewUnitId', { unique: false });
          if (!events.indexNames.contains('senseId')) events.createIndex('senseId', 'subject.senseId', { unique: false });
          if (!db.objectStoreNames.contains(STORES.outbox)) {
            const outbox = db.createObjectStore(STORES.outbox, { keyPath: 'eventId' });
            outbox.createIndex('nextAttemptAt', 'nextAttemptAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORES.receipts)) db.createObjectStore(STORES.receipts, { keyPath: 'eventId' });
          if (!db.objectStoreNames.contains(STORES.projections)) db.createObjectStore(STORES.projections, { keyPath: 'projectionKey' });
          if (!db.objectStoreNames.contains(STORES.checkpoints)) db.createObjectStore(STORES.checkpoints, { keyPath: 'projectionName' });
          if (!db.objectStoreNames.contains(STORES.snapshots)) db.createObjectStore(STORES.snapshots, { keyPath: 'snapshotId' });
          if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: 'key' });
        };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error || new Error('learning event database unavailable')); };
      });
      return databasePromise;
    }

    return {
      async ensureIdentity(generate) {
        const db = await database();
        const transaction = db.transaction(STORES.meta, 'readwrite');
        const store = transaction.objectStore(STORES.meta);
        let identity;
        const learnerRequest = store.get('learnerId');
        learnerRequest.onsuccess = function () {
          const learnerId = learnerRequest.result && learnerRequest.result.value || generate();
          if (!learnerRequest.result) store.put({ key: 'learnerId', value: learnerId });
          const deviceRequest = store.get('deviceId');
          deviceRequest.onsuccess = function () {
            const deviceId = deviceRequest.result && deviceRequest.result.value || generate();
            if (!deviceRequest.result) store.put({ key: 'deviceId', value: deviceId });
            identity = { learnerId, deviceId };
          };
        };
        return transactionResult(transaction, function () { return identity; });
      },
      async ensureReviewIdentity(identityKey, skill, generate, preferredIdentity) {
        const db = await database();
        const transaction = db.transaction(STORES.projections, 'readwrite');
        const store = transaction.objectStore(STORES.projections);
        const projectionKey = `vocabularyIdentity:${identityKey}`;
        let identity;
        let operationError;
        const request = store.get(projectionKey);
        request.onsuccess = function () {
          identity = request.result;
          if (!identity) {
            const preferred = preferredIdentity || {};
            identity = {
              projectionKey,
              projectionType: 'vocabularyIdentity',
              projectionVersion: 1,
              identityKey,
              senseId: preferred.senseId || generate(),
              reviewUnits: {
                [skill]: preferred.skill === skill && preferred.reviewUnitId
                  ? preferred.reviewUnitId
                  : generate()
              }
            };
            store.add(identity);
          } else {
            try {
              assertPreferredIdentity(identity, skill, preferredIdentity);
            } catch (error) {
              operationError = error;
              transaction.abort();
              return;
            }
            identity.reviewUnits = identity.reviewUnits || {};
            if (!identity.reviewUnits[skill]) {
              identity.reviewUnits[skill] = preferredIdentity && preferredIdentity.skill === skill && preferredIdentity.reviewUnitId
                ? preferredIdentity.reviewUnitId
                : generate();
              store.put(identity);
            }
          }
        };
        try {
          return await transactionResult(transaction, function () {
            return { ...identity, reviewUnitId: identity.reviewUnits[skill] };
          });
        } catch (error) {
          throw operationError || error;
        }
      },
      async ensureUnresolvedIdentity(identityKey, generate) {
        const db = await database();
        const transaction = db.transaction(STORES.projections, 'readwrite');
        const store = transaction.objectStore(STORES.projections);
        const projectionKey = `unresolvedLexemeIdentity:${identityKey}`;
        let identity;
        const request = store.get(projectionKey);
        request.onsuccess = function () {
          identity = request.result;
          if (!identity) {
            identity = {
              projectionKey,
              projectionType: 'unresolvedLexemeIdentity',
              projectionVersion: 1,
              identityKey,
              unresolvedLexemeId: generate()
            };
            store.add(identity);
          }
        };
        return transactionResult(transaction, function () { return { ...identity }; });
      },
      async appendEventsAndQueue(values, queuedAt) {
        const db = await database();
        const transaction = db.transaction([STORES.events, STORES.outbox, STORES.receipts], 'readwrite');
        const events = transaction.objectStore(STORES.events);
        const outbox = transaction.objectStore(STORES.outbox);
        const receipts = transaction.objectStore(STORES.receipts);
        let operationError;
        values.forEach(function (event) {
          const existingRequest = events.get(event.eventId);
          existingRequest.onsuccess = function () {
            const previous = existingRequest.result;
            if (previous && !sameEvent(previous, event)) {
              operationError = conflictError(event.eventId);
              transaction.abort();
              return;
            }
            if (!previous) events.add(event);
            const receiptRequest = receipts.get(event.eventId);
            receiptRequest.onsuccess = function () {
              if (!receiptRequest.result) {
                const outboxRequest = outbox.get(event.eventId);
                outboxRequest.onsuccess = function () {
                  if (!outboxRequest.result) {
                    outbox.put({
                      eventId: event.eventId,
                      queuedAt,
                      attemptCount: 0,
                      nextAttemptAt: queuedAt,
                      lastErrorCode: ''
                    });
                  }
                };
              }
            };
          };
        });
        try {
          return await transactionResult(transaction, function () { return values; });
        } catch (error) {
          throw operationError || error;
        }
      },
      async appendEventAndQueue(event, queuedAt) {
        await this.appendEventsAndQueue([event], queuedAt);
        return event;
      },
      async pending(limit, at) {
        const db = await database();
        const transaction = db.transaction([STORES.events, STORES.outbox], 'readonly');
        const outboxItems = await requestResult(transaction.objectStore(STORES.outbox).getAll());
        const selected = outboxItems
          .filter(item => !at || item.nextAttemptAt <= at)
          .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
          .slice(0, limit);
        const eventStore = transaction.objectStore(STORES.events);
        const values = await Promise.all(selected.map(async item => ({
          event: await requestResult(eventStore.get(item.eventId)),
          delivery: item
        })));
        return values.filter(item => item.event);
      },
      async acknowledge(eventIds, receipt) {
        const db = await database();
        const transaction = db.transaction([STORES.outbox, STORES.receipts], 'readwrite');
        const outbox = transaction.objectStore(STORES.outbox);
        const receipts = transaction.objectStore(STORES.receipts);
        eventIds.forEach(function (eventId) {
          receipts.put({ eventId, ...receipt });
          outbox.delete(eventId);
        });
        return transactionResult(transaction, function () { return undefined; });
      },
      async fail(eventIds, failure) {
        const db = await database();
        const transaction = db.transaction(STORES.outbox, 'readwrite');
        const outbox = transaction.objectStore(STORES.outbox);
        eventIds.forEach(function (eventId) {
          const request = outbox.get(eventId);
          request.onsuccess = function () {
            if (!request.result) return;
            outbox.put({
              ...request.result,
              attemptCount: Number(request.result.attemptCount || 0) + 1,
              nextAttemptAt: failure.nextAttemptAt,
              lastErrorCode: failure.errorCode || 'SYNC_FAILED'
            });
          };
        });
        return transactionResult(transaction, function () { return undefined; });
      },
      async stats() {
        const db = await database();
        const transaction = db.transaction([STORES.events, STORES.outbox, STORES.receipts], 'readonly');
        const results = await Promise.all([
          requestResult(transaction.objectStore(STORES.events).count()),
          requestResult(transaction.objectStore(STORES.outbox).count()),
          requestResult(transaction.objectStore(STORES.receipts).count())
        ]);
        return { events: results[0], pending: results[1], acknowledged: results[2] };
      },
      async nextPendingAt() {
        const db = await database();
        const transaction = db.transaction(STORES.outbox, 'readonly');
        const values = await requestResult(transaction.objectStore(STORES.outbox).getAll());
        return values.reduce(function (earliest, item) {
          return !earliest || item.nextAttemptAt < earliest ? item.nextAttemptAt : earliest;
        }, null);
      },
      async reviewAttempts(reviewUnitId, localDate) {
        const db = await database();
        const transaction = db.transaction(STORES.events, 'readonly');
        const values = await requestResult(transaction.objectStore(STORES.events).index('reviewUnitId').getAll(reviewUnitId));
        return values.filter(function (event) {
          return event.eventType === 'review_attempt_completed' && (!localDate || event.context.localDate === localDate);
        }).sort(function (left, right) {
          return left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId);
        });
      },
      async vocabularyAdditionActive(senseId) {
        const db = await database();
        const transaction = db.transaction(STORES.events, 'readonly');
        const values = await requestResult(transaction.objectStore(STORES.events).index('senseId').getAll(senseId));
        const excluded = new Set(values.filter(function (event) {
          return event.eventType === 'evidence_corrected'
            && event.payload && event.payload.newValue === 'excluded';
        }).map(function (event) { return event.correctsEventId; }));
        return values.some(function (event) {
          return event.eventType === 'vocabulary_entry_added'
            && event.subject.senseId === senseId
            && !excluded.has(event.eventId);
        });
      },
      async allEvents() {
        const db = await database();
        const transaction = db.transaction(STORES.events, 'readonly');
        const values = await requestResult(transaction.objectStore(STORES.events).getAll());
        return values.sort(function (left, right) {
          return left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId);
        });
      },
      async replaceProjections(projectionType, records, checkpoint) {
        const db = await database();
        const transaction = db.transaction([STORES.projections, STORES.checkpoints], 'readwrite');
        const projections = transaction.objectStore(STORES.projections);
        const checkpoints = transaction.objectStore(STORES.checkpoints);
        const request = projections.getAll();
        request.onsuccess = function () {
          request.result.forEach(function (record) {
            if (record && record.projectionType === projectionType) projections.delete(record.projectionKey);
          });
          (records || []).forEach(function (record) { projections.put(record); });
          if (checkpoint) checkpoints.put(checkpoint);
        };
        return transactionResult(transaction, function () { return undefined; });
      },
      async projectionsByType(projectionType) {
        const db = await database();
        const transaction = db.transaction(STORES.projections, 'readonly');
        const values = await requestResult(transaction.objectStore(STORES.projections).getAll());
        return values.filter(function (record) { return record && record.projectionType === projectionType; });
      },
      async projectionCheckpoint(projectionName) {
        const db = await database();
        const transaction = db.transaction(STORES.checkpoints, 'readonly');
        return requestResult(transaction.objectStore(STORES.checkpoints).get(projectionName));
      }
    };
  }

  function createLearningEventStore(options) {
    const settings = options || {};
    const cryptoImpl = settings.crypto || environment.crypto;
    const adapter = settings.adapter || createIndexedDbAdapter(settings.indexedDB || environment.indexedDB);
    const now = settings.now || function () { return new Date(); };
    const generate = function () { return createUuid(cryptoImpl); };

    async function identity() {
      return adapter.ensureIdentity(generate);
    }

    async function normalizeEvents(inputs) {
      const ids = await identity();
      const recordedAt = nowIso(now);
      const seen = new Set();
      const events = (Array.isArray(inputs) ? inputs : []).map(function (input) {
        const event = schema.normalizeLearningEvent({
          ...input,
          schema: schema.EVENT_SCHEMA,
          schemaVersion: schema.EVENT_SCHEMA_VERSION,
          eventId: input && input.eventId || generate(),
          learnerId: input && input.learnerId || ids.learnerId,
          deviceId: input && input.deviceId || ids.deviceId,
          occurredAt: input && input.occurredAt || recordedAt,
          recordedAt: input && input.recordedAt || recordedAt,
          receivedAt: input && input.receivedAt || null,
          correctsEventId: input && input.correctsEventId || null
        });
        if (seen.has(event.eventId)) {
          const error = new TypeError(`duplicate eventId in local write: ${event.eventId}`);
          error.code = 'DUPLICATE_LOCAL_EVENT';
          throw error;
        }
        seen.add(event.eventId);
        return event;
      });
      if (!events.length) throw new TypeError('at least one learning event is required');
      return { events, recordedAt };
    }

    return {
      identity,
      async ensureReviewIdentity(identityKey, skill, preferredIdentity) {
        const value = String(identityKey || '').trim();
        if (!value) throw new TypeError('vocabulary identity key is required');
        const direction = String(skill || 'meaning_recognition').trim();
        if (!direction) throw new TypeError('vocabulary review skill is required');
        return adapter.ensureReviewIdentity(value, direction, generate, preferredIdentity || null);
      },
      async ensureUnresolvedIdentity(identityKey) {
        const value = String(identityKey || '').trim();
        if (!value) throw new TypeError('unresolved identity key is required');
        return adapter.ensureUnresolvedIdentity(value, generate);
      },
      async recordEvents(inputs) {
        const normalized = await normalizeEvents(inputs);
        await adapter.appendEventsAndQueue(normalized.events, normalized.recordedAt);
        return normalized.events;
      },
      async recordEvent(input) {
        return (await this.recordEvents([input]))[0];
      },
      async reviewAttempts(reviewUnitId, localDate) {
        return adapter.reviewAttempts(String(reviewUnitId || ''), String(localDate || ''));
      },
      async vocabularyAdditionActive(senseId) {
        return adapter.vocabularyAdditionActive(String(senseId || ''));
      },
      async pendingBatch(limit, at) {
        const size = Math.min(100, Math.max(1, Number(limit || 100)));
        return adapter.pending(size, at || nowIso(now));
      },
      async acknowledge(eventIds, receipt) {
        return adapter.acknowledge(eventIds, receipt);
      },
      async markFailed(eventIds, failure) {
        return adapter.fail(eventIds, failure);
      },
      async stats() { return adapter.stats(); },
      async nextPendingAt() { return adapter.nextPendingAt(); },
      async allEvents() { return adapter.allEvents(); },
      async replaceProjections(projectionType, records, checkpoint) {
        return adapter.replaceProjections(String(projectionType || ''), records || [], checkpoint || null);
      },
      async projectionsByType(projectionType) {
        return adapter.projectionsByType(String(projectionType || ''));
      },
      async projectionCheckpoint(projectionName) {
        return adapter.projectionCheckpoint(String(projectionName || ''));
      }
    };
  }

  return {
    DB_NAME,
    DB_VERSION,
    STORES,
    conflictError,
    createIndexedDbAdapter,
    createLearningEventStore,
    createMemoryAdapter,
    createUuid
  };
});
