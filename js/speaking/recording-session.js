(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WhiteNightRecordingSession = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  const VALID_ZONES = Object.freeze(['send', 'cancel', 'transcribe']);

  function sessionError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function defaultId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'recording-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function createRecordingSession(options) {
    const settings = options || {};
    if (!settings.adapter) throw sessionError('ADAPTER_REQUIRED', '录音状态机缺少录音适配器');
    if (!settings.store) throw sessionError('STORE_REQUIRED', '录音状态机缺少本地录音库');
    const adapter = settings.adapter;
    const store = settings.store;
    const idFactory = settings.idFactory || defaultId;
    const clock = settings.now || function() { return new Date().toISOString(); };
    const onChange = settings.onChange || function() {};
    const onZoneChange = settings.onZoneChange || function() {};
    let finishPromise = null;
    let metadata = null;
    let state = { phase: 'idle', zone: 'send', error: null };

    function snapshot() { return Object.freeze(Object.assign({}, state)); }
    function transition(next) {
      state = Object.assign({}, state, next);
      onChange(snapshot());
      return snapshot();
    }

    async function prepare() {
      if (state.phase === 'ready') return snapshot();
      if (!['idle', 'failed', 'discarded', 'saved'].includes(state.phase)) throw sessionError('INVALID_STATE', '当前状态不能准备麦克风');
      transition({ phase: 'preparing', zone: 'send', error: null });
      try {
        await adapter.prepare();
        return transition({ phase: 'ready', error: null });
      } catch (error) {
        transition({ phase: 'failed', error: error });
        throw error;
      }
    }

    async function start(recordingMetadata) {
      if (state.phase !== 'ready') await prepare();
      if (state.phase !== 'ready') throw sessionError('NOT_READY', '麦克风尚未准备完成');
      metadata = Object.assign({ context: 'daily', sessionId: 'local-daily' }, recordingMetadata || {});
      transition({ phase: 'starting', zone: 'send', error: null });
      try {
        const started = await adapter.start(metadata);
        return transition({ phase: 'recording', zone: 'send', startedAt: started.startedAt, mimeType: started.mimeType, error: null });
      } catch (error) {
        metadata = null;
        transition({ phase: 'failed', error: error });
        throw error;
      }
    }

    function setZone(zone) {
      if (!VALID_ZONES.includes(zone)) throw sessionError('INVALID_ZONE', '未知录音手势区域');
      if (state.phase !== 'recording') return snapshot();
      if (state.zone === zone) return snapshot();
      const previous = state.zone;
      const next = transition({ zone: zone });
      onZoneChange(zone, previous);
      return next;
    }

    function finish(forcedZone) {
      if (finishPromise) return finishPromise;
      if (state.phase !== 'recording') return Promise.reject(sessionError('NOT_RECORDING', '当前没有正在进行的录音'));
      const zone = forcedZone || state.zone;
      if (!VALID_ZONES.includes(zone)) return Promise.reject(sessionError('INVALID_ZONE', '未知录音结束方式'));
      transition({ phase: 'stopping', zone: zone });
      finishPromise = (async function() {
        try {
          if (zone === 'cancel') {
            await adapter.cancel();
            transition({ phase: 'discarded', zone: 'send', error: null });
            metadata = null;
            transition({ phase: 'ready', zone: 'send', error: null });
            return null;
          }
          const result = await adapter.stop();
          const disposition = zone === 'transcribe' ? 'transcription_pending' : 'sent';
          const record = await store.save({
            id: idFactory(),
            sessionId: metadata.sessionId,
            context: metadata.context,
            disposition: disposition,
            createdAt: clock(),
            durationMs: result.durationMs,
            mimeType: result.mimeType,
            size: result.blob.size,
            blob: result.blob,
            transcriptStatus: zone === 'transcribe' ? 'pending' : 'not_requested'
          });
          transition({ phase: 'saved', zone: zone, recordingId: record.id, error: null });
          metadata = null;
          transition({ phase: 'ready', zone: 'send', recordingId: record.id, error: null });
          return record;
        } catch (error) {
          metadata = null;
          transition({ phase: 'failed', error: error });
          throw error;
        } finally {
          finishPromise = null;
        }
      })();
      return finishPromise;
    }

    async function dispose() {
      if (state.phase === 'recording') {
        try { await finish('cancel'); } catch (error) {}
      }
      await adapter.dispose();
      transition({ phase: 'idle', zone: 'send', error: null });
    }

    return {
      getState: snapshot,
      prepare: prepare,
      start: start,
      setZone: setZone,
      finish: finish,
      cancel: function() { return finish('cancel'); },
      dispose: dispose
    };
  }

  return { VALID_ZONES: VALID_ZONES, createRecordingSession: createRecordingSession, sessionError: sessionError };
});


