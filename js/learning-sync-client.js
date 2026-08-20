(function (root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('./learning-event-schema')
    : root.BelyeNochiLearningEventSchema;
  const eventStore = typeof module === 'object' && module.exports
    ? require('./learning-event-store')
    : root.BelyeNochiLearningEventStore;
  const api = factory(schema, eventStore, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiLearningSyncClient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (schema, eventStore, environment) {
  'use strict';

  if (!schema || !eventStore) throw new Error('learning event schema and store are required');

  const DEFAULT_ENDPOINT = '/api/learning-events/batch';
  const HEALTH_ENDPOINT = '/api/learning-store/health';
  const RETRY_DELAYS_MS = Object.freeze([0, 5000, 15000, 60000, 300000, 1800000]);

  function nextRetryDelay(attemptCount) {
    const index = Math.min(Math.max(0, Number(attemptCount || 0)), RETRY_DELAYS_MS.length - 1);
    return RETRY_DELAYS_MS[index];
  }

  function errorCode(error) {
    return String(error && (error.code || error.name) || 'SYNC_FAILED').slice(0, 80);
  }

  function createSyncClient(options) {
    const settings = options || {};
    if (!settings.store || typeof settings.store.pendingBatch !== 'function') throw new TypeError('store is required');
    const store = settings.store;
    const fetchImpl = settings.fetch || environment.fetch;
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
    const cryptoImpl = settings.crypto || environment.crypto;
    const now = settings.now || function () { return new Date(); };
    const setTimer = settings.setTimeout || environment.setTimeout;
    const clearTimer = settings.clearTimeout || environment.clearTimeout;
    const endpoint = settings.endpoint || DEFAULT_ENDPOINT;
    const projectionClient = settings.projectionClient || null;
    let timer = null;
    let inFlight = null;
    let stopped = true;

    function nowDate() {
      const value = now();
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid date');
      return date;
    }

    function schedule(delayMs) {
      if (stopped || typeof setTimer !== 'function') return;
      if (timer && typeof clearTimer === 'function') clearTimer(timer);
      timer = setTimer(function () {
        timer = null;
        syncOnce().catch(function () {});
      }, Math.max(0, Number(delayMs || 0)));
    }

    async function syncOnce() {
      if (inFlight) return inFlight;
      inFlight = (async function () {
        const at = nowDate();
        const pending = await store.pendingBatch(100, at.toISOString());
        if (!pending.length) {
          if (!stopped && typeof store.nextPendingAt === 'function') {
            const nextPendingAt = await store.nextPendingAt();
            if (nextPendingAt) schedule(Math.max(0, Date.parse(nextPendingAt) - at.getTime()));
          }
          return { sent: false, reason: 'empty' };
        }
        const identity = await store.identity();
        const eventIds = pending.map(item => item.event.eventId);
        const maxAttempt = pending.reduce((value, item) => Math.max(value, Number(item.delivery.attemptCount || 0)), 0);
        const batch = schema.normalizeEventBatch({
          schema: schema.BATCH_SCHEMA,
          schemaVersion: schema.BATCH_SCHEMA_VERSION,
          batchId: eventStore.createUuid(cryptoImpl),
          deviceId: identity.deviceId,
          events: pending.map(item => item.event)
        });
        try {
          const response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch)
          });
          const body = response && typeof response.json === 'function' ? await response.json() : {};
          if (!response || !response.ok || !body || body.ok !== true) {
            const failure = new Error(body && body.error && body.error.message || `learning sync failed (${response && response.status || 'network'})`);
            failure.code = body && body.error && body.error.code || 'SYNC_HTTP_ERROR';
            throw failure;
          }
          const acknowledged = new Set([].concat(body.acceptedEventIds || [], body.duplicateEventIds || []));
          if (acknowledged.size !== eventIds.length || eventIds.some(id => !acknowledged.has(id))) {
            const failure = new Error('sync acknowledgement did not cover the full batch');
            failure.code = 'INCOMPLETE_ACK';
            throw failure;
          }
          await store.acknowledge(eventIds, {
            batchId: body.batchId,
            committedAt: body.committedAt,
            contentHash: String(body.contentHash || '')
          });
          let projectionComparison = null;
          if (projectionClient && typeof projectionClient.rebuild === 'function') {
            try {
              const projectionResult = await projectionClient.rebuild(body.projectionCheckpoint || null);
              projectionComparison = projectionResult.checkpoint && projectionResult.checkpoint.comparison || null;
            } catch (projectionError) {
              projectionComparison = { status: 'projection_failed', matched: null, errorCode: errorCode(projectionError) };
            }
          }
          if (!stopped) schedule(0);
          return {
            sent: true,
            accepted: (body.acceptedEventIds || []).length,
            duplicates: (body.duplicateEventIds || []).length,
            ...(projectionComparison ? { projectionComparison } : {})
          };
        } catch (error) {
          const delay = nextRetryDelay(maxAttempt + 1);
          await store.markFailed(eventIds, {
            errorCode: errorCode(error),
            nextAttemptAt: new Date(at.getTime() + delay).toISOString()
          });
          if (!stopped) schedule(delay);
          return { sent: false, reason: 'failed', errorCode: errorCode(error), retryAfterMs: delay };
        }
      })();
      try { return await inFlight; }
      finally { inFlight = null; }
    }

    return {
      syncOnce,
      kick() { schedule(0); },
      start() { stopped = false; schedule(0); },
      stop() {
        stopped = true;
        if (timer && typeof clearTimer === 'function') clearTimer(timer);
        timer = null;
      },
      async health() {
        const response = await fetchImpl(HEALTH_ENDPOINT, { cache: 'no-store' });
        if (!response || !response.ok) throw new Error('learning store health check failed');
        return response.json();
      }
    };
  }

  return { DEFAULT_ENDPOINT, HEALTH_ENDPOINT, RETRY_DELAYS_MS, createSyncClient, nextRetryDelay };
});
