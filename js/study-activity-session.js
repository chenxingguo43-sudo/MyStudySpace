(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StudyActivitySession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function shouldCount({ visible, now, lastInteractionAt, idleMs }) {
    return visible !== false && Number(now) - Number(lastInteractionAt) <= Number(idleMs);
  }

  function contextKey(context) {
    if (!context) return '';
    return [context.module, context.submodule, context.bookId, context.chapterId, context.unitId].map(value => String(value || '')).join('|');
  }

  function mount(options = {}) {
    const store = options.store;
    const documentRef = options.document || document;
    const windowRef = options.window || window;
    const idleMsByModule = { reader: 300000, b2: 300000, vocabulary: 120000 };
    let context = null;
    const sessions = new Map();
    let activeSeconds = 0;
    let lastPersistedSeconds = 0;
    let lastTickAt = Date.now();
    let lastInteractionAt = lastTickAt;
    let destroyed = false;
    let operation = Promise.resolve();

    function currentIdleMs() {
      return Number(options.idleMs || idleMsByModule[context && context.module] || 300000);
    }

    function noteInteraction() { lastInteractionAt = Date.now(); }

    function recordInput(value = context) {
      return {
        module: value.module,
        submodule: value.submodule || '',
        action: value.action || (value.module === 'vocabulary' ? 'review' : value.module === 'b2' ? 'practice' : 'study'),
        source: value.source || options.source || '',
        content: {
          bookId: value.bookId || '',
          chapterId: value.chapterId || '',
          unitId: value.unitId || '',
          itemIds: []
        }
      };
    }

    function enqueue(task) {
      operation = operation.then(task).catch(function () {});
      return operation;
    }

    function persist(finalize) {
      if (activeSeconds <= 0 || (!finalize && activeSeconds - lastPersistedSeconds < 10)) return operation;
      const durationSec = Math.floor(activeSeconds);
      const contextSnapshot = context && { ...context };
      const contextSnapshotKey = contextKey(contextSnapshot);
      lastPersistedSeconds = durationSec;
      return enqueue(async function () {
        let target = sessions.get(contextSnapshotKey);
        if (!target && contextSnapshot && store) target = await store.startSession(recordInput(contextSnapshot));
        if (!target) return;
        sessions.set(contextSnapshotKey, target);
        const updated = finalize
          ? await store.finishSession(target.id, { durationSec })
          : await store.checkpoint(target.id, { durationSec });
        if (finalize) sessions.delete(contextSnapshotKey);
        else sessions.set(contextSnapshotKey, updated);
      });
    }

    function tick() {
      const now = Date.now();
      const elapsed = Math.max(0, Math.min(5, (now - lastTickAt) / 1000));
      lastTickAt = now;
      if (!context || destroyed) return;
      if (shouldCount({ visible: documentRef.visibilityState !== 'hidden', now, lastInteractionAt, idleMs: currentIdleMs() })) {
        activeSeconds += elapsed;
        persist(false);
      }
    }

    function setContext(next) {
      const normalized = next && next.module ? { ...next } : null;
      if (contextKey(normalized) === contextKey(context)) return;
      persist(true);
      context = normalized;
      activeSeconds = 0;
      lastPersistedSeconds = 0;
      lastTickAt = Date.now();
      lastInteractionAt = lastTickAt;
    }

    function onVisibilityChange() {
      tick();
      if (documentRef.visibilityState === 'hidden') persist(false);
      else noteInteraction();
    }

    function destroy() {
      if (destroyed) return operation;
      tick();
      destroyed = true;
      clearInterval(timer);
      documentRef.removeEventListener('visibilitychange', onVisibilityChange);
      ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(type => documentRef.removeEventListener(type, noteInteraction));
      windowRef.removeEventListener('pagehide', destroy);
      return persist(true);
    }

    documentRef.addEventListener('visibilitychange', onVisibilityChange);
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(type => documentRef.addEventListener(type, noteInteraction, { passive: true }));
    windowRef.addEventListener('pagehide', destroy);
    const timer = setInterval(tick, 1000);
    if (options.context) setContext(options.context);
    return { destroy, setContext, tick };
  }

  return { contextKey, mount, shouldCount };
});
