(function (root, factory) {
  const projection = typeof module === 'object' && module.exports
    ? require('./vocabulary-fsrs-projection')
    : root.BelyeNochiVocabularyFsrsProjection;
  const api = factory(projection, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiLearningProjectionClient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (projection, environment) {
  'use strict';

  if (!projection) throw new Error('vocabulary FSRS projection is required');

  const ENDPOINT = '/api/learning-projections/fsrs';
  const COMPARISON_ENDPOINT = '/api/learning-projections/fsrs/comparison';

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }

  async function sha256(value, cryptoImpl) {
    if (!cryptoImpl || !cryptoImpl.subtle || typeof cryptoImpl.subtle.digest !== 'function') {
      throw new Error('Web Crypto SHA-256 is required for projection comparison');
    }
    const bytes = new TextEncoder().encode(String(value));
    return hex(await cryptoImpl.subtle.digest('SHA-256', bytes));
  }

  function comparison(local, server) {
    if (!server) return { status: 'local_only', matched: null };
    if (local.sourceEventCount !== server.sourceEventCount) {
      return {
        status: 'event_count_pending',
        matched: null,
        localEventCount: local.sourceEventCount,
        serverEventCount: server.sourceEventCount
      };
    }
    const matched = local.sourceHash === server.sourceHash && local.stateHash === server.stateHash;
    return {
      status: matched ? 'matched' : 'mismatch',
      matched,
      localEventCount: local.sourceEventCount,
      serverEventCount: server.sourceEventCount,
      sourceMatched: local.sourceHash === server.sourceHash,
      stateMatched: local.stateHash === server.stateHash
    };
  }

  function createProjectionClient(options) {
    const settings = options || {};
    const store = settings.store;
    if (!store || typeof store.allEvents !== 'function' || typeof store.replaceProjections !== 'function') {
      throw new TypeError('projection-capable learning event store is required');
    }
    const cryptoImpl = settings.crypto || environment.crypto;
    const fetchImpl = settings.fetch || environment.fetch;
    const now = settings.now || function () { return new Date(); };

    async function rebuild(serverCheckpoint) {
      const events = await store.allEvents();
      const result = projection.buildProjection(events);
      const rebuiltAtValue = now();
      const rebuiltAt = (rebuiltAtValue instanceof Date ? rebuiltAtValue : new Date(rebuiltAtValue)).toISOString();
      const checkpoint = {
        projectionName: projection.PROJECTION_NAME,
        projectionVersion: projection.PROJECTION_VERSION,
        parameterSetId: projection.PARAMETER_SET_ID,
        sourceEventCount: result.sourceEventCount,
        effectiveReviewCount: result.effectiveReviewCount,
        reviewUnitCount: result.reviewUnitCount,
        sourceHash: await sha256(result.sourceCanonical, cryptoImpl),
        stateHash: await sha256(result.stateCanonical, cryptoImpl),
        rebuiltAt
      };
      checkpoint.comparison = comparison(checkpoint, serverCheckpoint || null);
      await store.replaceProjections(projection.PROJECTION_TYPE, result.records, checkpoint);
      return { checkpoint, records: result.records };
    }

    async function compareServer() {
      if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required for server comparison');
      const response = await fetchImpl(ENDPOINT, { cache: 'no-store' });
      const body = response && typeof response.json === 'function' ? await response.json() : null;
      if (!response || !response.ok || !body || body.ok !== true) throw new Error('server FSRS projection is unavailable');
      const local = await rebuild(body.checkpoint);
      let calibration = null;
      if (local.checkpoint.comparison && local.checkpoint.comparison.matched) {
        const identity = await store.identity();
        const reportResponse = await fetchImpl(COMPARISON_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: identity.deviceId,
            localDate: projection.localDateKey(new Date(local.checkpoint.rebuiltAt), projection.TIME_ZONE),
            comparedAt: local.checkpoint.rebuiltAt,
            sourceEventCount: local.checkpoint.sourceEventCount,
            sourceHash: local.checkpoint.sourceHash,
            stateHash: local.checkpoint.stateHash
          })
        });
        const reportBody = reportResponse && typeof reportResponse.json === 'function' ? await reportResponse.json() : null;
        if (reportResponse && reportResponse.ok && reportBody && reportBody.ok === true) calibration = reportBody;
      }
      return { ...local, server: body, calibration };
    }

    return { rebuild, compareServer };
  }

  return { COMPARISON_ENDPOINT, ENDPOINT, comparison, createProjectionClient, sha256 };
});
