(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianDictionaryRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function isLookupSelectionAllowed({ text, startContext, endContext, editable } = {}) {
    const words = String(text || '').match(/[А-Яа-яЁё][А-Яа-яЁё\u0300-\u036f-]*/g) || [];
    return !editable && words.length >= 2 && Boolean(startContext) && startContext === endContext;
  }

  function createController(options = {}) {
    const core = options.core;
    const root = options.root;
    if (!core) throw new TypeError('core is required');
    if (!root || typeof root.addEventListener !== 'function') throw new TypeError('event root is required');

    let initialized = false;
    let current = null;
    let examPolicy = { mode: 'learning', lookupUnlocked: true };
    let lastTouchAt = 0;
    let touchIntent = null;
    let activeWordElement = null;
    let drawerStartY = null;
    let pendingSelection = null;

    function getPanel() {
      const existing = typeof root.querySelector === 'function' ? root.querySelector('#detailPanel') : null;
      if (existing) return existing;
      return typeof options.ensurePanel === 'function' ? options.ensurePanel() : null;
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

    function phraseAction() {
      if (typeof root.querySelector === 'function') return root.querySelector('#dictionaryPhraseLookup');
      return null;
    }

    function hidePhraseAction() {
      const action = phraseAction();
      if (action) action.hidden = true;
    }

    function nodeElement(node) {
      if (!node) return null;
      return node.nodeType === 1 ? node : node.parentElement || null;
    }

    function selectionObject() {
      if (options.getSelection) return options.getSelection();
      if (root.defaultView && root.defaultView.getSelection) return root.defaultView.getSelection();
      return null;
    }

    function refreshPhraseSelection() {
      const selection = selectionObject();
      if (!selection || selection.isCollapsed || selection.rangeCount < 1) {
        pendingSelection = null;
        hidePhraseAction();
        return;
      }
      const text = String(selection.toString() || '').trim();
      const startElement = nodeElement(selection.anchorNode);
      const endElement = nodeElement(selection.focusNode);
      const editable = Boolean(
        (startElement && startElement.closest && startElement.closest('textarea,input,select,[contenteditable="true"]')) ||
        (endElement && endElement.closest && endElement.closest('textarea,input,select,[contenteditable="true"]'))
      );
      const startTarget = startElement && startElement.closest ? startElement.closest('[data-lookup-context]') : null;
      const endTarget = endElement && endElement.closest ? endElement.closest('[data-lookup-context]') : null;
      const startContext = startTarget && startTarget.getAttribute ? startTarget.getAttribute('data-lookup-context') : '';
      const endContext = endTarget && endTarget.getAttribute ? endTarget.getAttribute('data-lookup-context') : '';
      if (!isLookupSelectionAllowed({ text, startContext, endContext, editable })) {
        pendingSelection = null;
        hidePhraseAction();
        return;
      }
      let context = {};
      try { context = JSON.parse(startContext); } catch (_error) {}
      pendingSelection = { text, context, element: startTarget };
      const action = phraseAction();
      if (!action) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      action.hidden = false;
      action.style.left = `${Math.max(8, rect.left + rect.width / 2)}px`;
      action.style.top = `${Math.max(8, rect.bottom + 8)}px`;
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
      if (activeWordElement && activeWordElement !== element && activeWordElement.classList) {
        activeWordElement.classList.remove('dictionary-active');
      }
      activeWordElement = element;
      if (activeWordElement.classList) activeWordElement.classList.add('dictionary-active');
      openWord(word, parseContext(element), element);
      return true;
    }

    function onClick(event) {
      if (Date.now() - lastTouchAt < 650) return;
      const phraseButton = event.target && event.target.closest
        ? event.target.closest('#dictionaryPhraseLookup')
        : null;
      if (phraseButton && pendingSelection) {
        if (event.preventDefault) event.preventDefault();
        const request = pendingSelection;
        pendingSelection = null;
        hidePhraseAction();
        openPhrase(request.text, request.context, request.element);
        return;
      }
      activateWord(event);
    }

    function touchPoint(event, key) {
      const list = event && event[key];
      return list && list.length ? list[0] : null;
    }

    function onTouchStart(event) {
      const point = touchPoint(event, 'touches');
      const element = event.target && event.target.closest
        ? event.target.closest('.ru-word')
        : null;
      touchIntent = point && element ? {
        element,
        x: Number(point.clientX || 0),
        y: Number(point.clientY || 0),
        startedAt: Date.now()
      } : null;
    }

    function onTouchEnd(event) {
      const intent = touchIntent;
      touchIntent = null;
      const point = touchPoint(event, 'changedTouches');
      if (!intent || !point) return;
      const dx = Number(point.clientX || 0) - intent.x;
      const dy = Number(point.clientY || 0) - intent.y;
      if (Math.hypot(dx, dy) > 12 || Date.now() - intent.startedAt > 650) return;
      const selection = selectionObject();
      if (selection && !selection.isCollapsed) return;
      const endedWord = event.target && event.target.closest
        ? event.target.closest('.ru-word')
        : null;
      if (endedWord !== intent.element || !activateWord(event)) return;
      lastTouchAt = Date.now();
    }

    function onTouchCancel() {
      touchIntent = null;
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
      root.addEventListener('touchstart', onTouchStart, { passive: true });
      root.addEventListener('touchend', onTouchEnd, { passive: false });
      root.addEventListener('touchcancel', onTouchCancel);
      root.addEventListener('keydown', onKeyDown);
      root.addEventListener('pointerdown', onPointerDown);
      root.addEventListener('pointerup', onPointerUp);
      root.addEventListener('selectionchange', refreshPhraseSelection);
      initialized = true;
    }

    function destroy() {
      if (!initialized) return;
      root.removeEventListener('click', onClick);
      root.removeEventListener('touchstart', onTouchStart, { passive: true });
      root.removeEventListener('touchend', onTouchEnd, { passive: false });
      root.removeEventListener('touchcancel', onTouchCancel);
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('selectionchange', refreshPhraseSelection);
      hidePhraseAction();
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
      if (activeWordElement && activeWordElement.classList) activeWordElement.classList.remove('dictionary-active');
      activeWordElement = null;
      setPanelState('closed');
      hidePhraseAction();
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

  return { createController, isLookupSelectionAllowed };
});
