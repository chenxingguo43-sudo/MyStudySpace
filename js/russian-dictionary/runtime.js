(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianDictionaryRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function createController(options = {}) {
    const core = options.core;
    const root = options.root;
    if (!core) throw new TypeError('core is required');
    if (!root || typeof root.addEventListener !== 'function') throw new TypeError('event root is required');

    let initialized = false;
    let current = null;
    let examPolicy = { mode: 'learning', lookupUnlocked: true };
    let lastTouchAt = 0;
    let drawerStartY = null;

    function getPanel() {
      return typeof root.querySelector === 'function' ? root.querySelector('#detailPanel') : null;
    }

    function getPanelState() {
      const panel = getPanel();
      return panel && panel.getAttribute ? panel.getAttribute('data-dictionary-state') || 'closed' : 'closed';
    }

    function setPanelState(state) {
      const next = ['closed', 'half', 'full'].includes(state) ? state : 'closed';
      const panel = getPanel();
      if (panel && panel.setAttribute) panel.setAttribute('data-dictionary-state', next);
      return next;
    }

    function parseContext(element) {
      const serialized = element && element.getAttribute
        ? element.getAttribute('data-lookup-context')
        : '';
      if (!serialized) return {};
      try { return JSON.parse(serialized); } catch (_error) { return {}; }
    }

    function lookupLocked() {
      return examPolicy.mode === 'exam' && examPolicy.lookupUnlocked !== true;
    }

    async function openWord(word, context = {}, element = null) {
      if (lookupLocked()) {
        if (options.onToast) options.onToast('考试模式默认关闭查词，可在考试设置中主动解锁');
        return { status: 'locked' };
      }
      const normalizedContext = core.normalizeContext(context);
      current = { kind: 'word', value: word, context: normalizedContext };
      setPanelState('half');
      if (options.onOpen) options.onOpen(current, element);
      if (!options.lookupWord) return current;
      try {
        const result = await options.lookupWord(word, normalizedContext, element);
        if (result !== undefined && result !== null && options.renderResult) {
          options.renderResult(word, result, normalizedContext);
        }
        return result;
      } catch (error) {
        if (options.onError) options.onError(error, current);
        else if (options.onToast) options.onToast('查词失败，请稍后重试');
        return { status: 'error', error };
      }
    }

    async function openPhrase(phrase, context = {}, element = null) {
      if (lookupLocked()) {
        if (options.onToast) options.onToast('考试模式默认关闭查词，可在考试设置中主动解锁');
        return { status: 'locked' };
      }
      const normalizedContext = core.normalizeContext(context);
      current = { kind: 'phrase', value: phrase, context: normalizedContext };
      setPanelState('half');
      if (options.onOpen) options.onOpen(current, element);
      const lookup = options.lookupPhrase || options.lookupWord;
      if (!lookup) return current;
      const result = await lookup(phrase, normalizedContext, element);
      if (result !== undefined && result !== null && options.renderResult) {
        options.renderResult(phrase, result, normalizedContext);
      }
      return result;
    }

    function activateWord(event) {
      const element = event.target && event.target.closest
        ? event.target.closest('.ru-word')
        : null;
      if (!element) return false;
      const word = element.getAttribute('data-word') || element.textContent || '';
      if (!core.normalizeRussian(word)) return false;
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      openWord(word, parseContext(element), element);
      return true;
    }

    function onClick(event) {
      if (Date.now() - lastTouchAt < 650) return;
      activateWord(event);
    }

    function onTouchEnd(event) {
      if (!activateWord(event)) return;
      lastTouchAt = Date.now();
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' && getPanelState() !== 'closed') close();
    }

    function onPointerDown(event) {
      const handle = event.target && event.target.closest
        ? event.target.closest('.dictionary-drawer-handle')
        : null;
      if (!handle) return;
      drawerStartY = Number(event.clientY || 0);
      if (event.preventDefault) event.preventDefault();
    }

    function onPointerUp(event) {
      if (drawerStartY === null) return;
      const delta = Number(event.clientY || 0) - drawerStartY;
      drawerStartY = null;
      const state = getPanelState();
      if (Math.abs(delta) < 36) {
        setPanelState(state === 'full' ? 'half' : 'full');
      } else if (delta < 0) {
        setPanelState('full');
      } else if (state === 'full') {
        setPanelState('half');
      } else {
        close();
      }
    }

    function init() {
      if (initialized) return;
      root.addEventListener('click', onClick);
      root.addEventListener('touchend', onTouchEnd, { passive: false });
      root.addEventListener('keydown', onKeyDown);
      root.addEventListener('pointerdown', onPointerDown);
      root.addEventListener('pointerup', onPointerUp);
      initialized = true;
    }

    function destroy() {
      if (!initialized) return;
      root.removeEventListener('click', onClick);
      root.removeEventListener('touchend', onTouchEnd, { passive: false });
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', onPointerUp);
      initialized = false;
    }

    function renderText(value, context = {}) {
      return core.renderRussianText(value, context);
    }

    function setExamPolicy(policy = {}) {
      examPolicy = {
        mode: policy.mode === 'exam' ? 'exam' : 'learning',
        lookupUnlocked: policy.mode === 'exam' ? policy.lookupUnlocked === true : true
      };
      return { ...examPolicy };
    }

    function close() {
      current = null;
      setPanelState('closed');
      if (options.onClose) options.onClose();
    }

    return {
      init,
      destroy,
      renderText,
      openWord,
      openPhrase,
      setExamPolicy,
      setPanelState,
      close,
      getCurrent: () => current
    };
  }

  return { createController };
});
