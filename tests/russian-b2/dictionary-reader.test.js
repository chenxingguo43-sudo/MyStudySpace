const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const Runtime = require('../../js/russian-dictionary/runtime');
const Core = require('../../js/russian-dictionary/core');

const reader = fs.readFileSync('reader.html', 'utf8');
const runtimeSource = fs.readFileSync('js/russian-dictionary/runtime.js', 'utf8');

test('reader loads shared dictionary modules before its inline runtime', () => {
  const coreAt = reader.indexOf('js/russian-dictionary/core.js');
  const storageAt = reader.indexOf('js/russian-dictionary/storage.js');
  const runtimeAt = reader.indexOf('js/russian-dictionary/runtime.js');
  const inlineAt = reader.indexOf('<script>', runtimeAt);
  assert.ok(coreAt >= 0 && storageAt > coreAt && runtimeAt > storageAt && inlineAt > runtimeAt);
  assert.match(reader, /RussianDictionaryRuntime\.createController/);
});

test('reader version-pins all shared dictionary scripts', () => {
  const sources = [...reader.matchAll(/<script src="(js\/russian-dictionary\/(?:core|storage|runtime)\.js\?v=[^"]+)"><\/script>/g)]
    .map(match => match[1]);

  assert.equal(sources.length, 3);
  assert.equal(new Set(sources.map(source => source.split('?v=')[1])).size, 1);
});

test('legacy renderRuText delegates to the shared renderer', () => {
  const body = reader.match(/function renderRuText\(text, context\) \{([\s\S]*?)\n\}/);
  assert.ok(body);
  assert.match(body[1], /dictionaryController\.renderText/);
});

test('runtime delegates one word click with its serialized context', async () => {
  const listeners = {};
  const root = {
    addEventListener(type, handler) { listeners[type] = handler; },
    removeEventListener(type) { delete listeners[type]; }
  };
  const context = { moduleId: 'grammar', taskId: 'P2-Q001', regionType: 'prompt' };
  const span = {
    getAttribute(name) {
      if (name === 'data-word') return 'тех';
      if (name === 'data-lookup-context') return JSON.stringify(context);
      return '';
    }
  };
  let request = null;
  const controller = Runtime.createController({
    core: Core,
    root,
    lookupWord(word, lookupContext) { request = { word, lookupContext }; }
  });
  controller.init();
  listeners.click({
    target: { closest(selector) { return selector === '.ru-word' ? span : null; } },
    preventDefault() {}, stopPropagation() {}
  });

  assert.deepEqual(request, { word: 'тех', lookupContext: Core.normalizeContext(context) });
  controller.destroy();
  assert.equal(listeners.click, undefined);
});

test('dictionary uses a desktop panel and accessible narrow-screen drawer', () => {
  assert.match(reader, /id="detailPanel"[^>]*data-dictionary-state="closed"/);
  assert.match(reader, /class="dictionary-drawer-handle"/);
  assert.match(reader, /aria-label="关闭词典"/);
  assert.match(reader, /@media \(max-width: 760px\)/);
  assert.match(reader, /#detailPanel\[data-dictionary-state="half"\]/);
  assert.match(reader, /#detailPanel\[data-dictionary-state="full"\]/);
});

test('dictionary drawer gestures expand, collapse, and close predictably', () => {
  assert.equal(Runtime.resolveDrawerGesture('half', -80, { velocity: -0.7 }), 'full');
  assert.equal(Runtime.resolveDrawerGesture('full', 80, { velocity: 0.7 }), 'half');
  assert.equal(Runtime.resolveDrawerGesture('half', 220, { velocity: 0.7 }), 'closed');
  assert.equal(Runtime.resolveDrawerGesture('full', 0), 'half');
  assert.equal(Runtime.resolveDrawerGesture('half', 80, {
    currentHeight: 440,
    halfHeight: 480,
    fullHeight: 820
  }), 'half');
  assert.equal(Runtime.resolveDrawerGesture('half', 300, {
    currentHeight: 180,
    halfHeight: 480,
    fullHeight: 820
  }), 'closed');
  assert.equal(Runtime.resolveDrawerGesture('full', 120, {
    velocity: 0.8,
    currentHeight: 700,
    halfHeight: 480,
    fullHeight: 820
  }), 'half');
  assert.match(reader, /html\.dictionary-sheet-open body \{ overflow: hidden/);
  assert.match(reader, /dictionary-drawer-handle::before/);
  assert.match(reader, /data-dictionary-dragging="true"\] \{ transition: none; will-change: height/);
});

test('dictionary drawer follows the active pointer and cleans up every drag path', () => {
  const listeners = {};
  const attributes = new Map([['data-dictionary-state', 'half']]);
  const styleValues = new Map();
  const panel = {
    style: {
      set height(value) { styleValues.set('height', value); },
      get height() { return styleValues.get('height') || ''; },
      removeProperty(name) { styleValues.delete(name); }
    },
    getBoundingClientRect() { return { height: 480 }; },
    getAttribute(name) { return attributes.get(name) || null; },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); }
  };
  const captured = new Set();
  const handle = {
    setPointerCapture(id) { captured.add(id); },
    hasPointerCapture(id) { return captured.has(id); },
    releasePointerCapture(id) { captured.delete(id); }
  };
  const root = {
    defaultView: {
      innerHeight: 900,
      getComputedStyle() {
        return {
          maxHeight: '828px',
          getPropertyValue(name) {
            return name === '--dictionary-half-height' ? '52dvh' : '92dvh';
          }
        };
      }
    },
    documentElement: { classList: { toggle() {}, remove() {} } },
    querySelector(selector) { return selector === '#detailPanel' ? panel : null; },
    addEventListener(type, handler) { listeners[type] = handler; },
    removeEventListener(type) { delete listeners[type]; }
  };
  const event = (type, y, time) => ({
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    clientY: y,
    timeStamp: time,
    target: { closest(selector) { return type === 'down' && selector === '.dictionary-drawer-handle' ? handle : null; } },
    preventDefault() {}
  });
  const controller = Runtime.createController({ core: Core, root });
  controller.init();

  listeners.pointerdown(event('down', 600, 100));
  listeners.pointermove(event('move', 430, 300));
  assert.equal(attributes.get('data-dictionary-dragging'), 'true');
  assert.equal(styleValues.get('height'), '650px');
  assert.equal(captured.has(7), true);
  listeners.pointerup(event('up', 350, 340));
  assert.equal(attributes.get('data-dictionary-state'), 'full');
  assert.equal(attributes.has('data-dictionary-dragging'), false);
  assert.equal(styleValues.has('height'), false);
  assert.equal(captured.has(7), false);

  attributes.set('data-dictionary-state', 'full');
  panel.getBoundingClientRect = () => ({ height: 828 });
  listeners.pointerdown(event('down', 300, 500));
  listeners.pointermove(event('move', 430, 650));
  listeners.pointercancel(event('cancel', 430, 650));
  assert.equal(attributes.get('data-dictionary-state'), 'full');
  assert.equal(attributes.has('data-dictionary-dragging'), false);
  assert.equal(styleValues.has('height'), false);

  controller.destroy();
  assert.equal(listeners.pointermove, undefined);
  assert.equal(listeners.pointercancel, undefined);
});

test('grammar, study cards, and reading pass explicit lookup contexts', () => {
  assert.match(reader, /function renderLookupOption\(exercise, option/);
  assert.match(reader, /lookupContext\('grammar',[^\n]+ 'quiz-option'/);
  assert.match(reader, /lookupContext\('grammar',[^\n]+ 'study-example'/);
  assert.match(reader, /lookupContext\('reading',[^\n]+ 'reading-body'/);
  assert.match(reader, /lookupContext\('reading',[^\n]+ 'reading-option'/);
});

test('learning options separate the answer control from lookup words', () => {
  assert.match(reader, /class="b2-option-radio"/);
  assert.match(reader, /class="b2-option-text"/);
  assert.match(reader, /submitQuizOption/);
});

test('writing, listening, and speaking wrap only read-only Russian', () => {
  assert.match(reader, /lookupContext\('writing',[^\n]+ 'writing-material'/);
  assert.match(reader, /lookupContext\('writing',[^\n]+ 'writing-model'/);
  assert.match(reader, /lookupContext\('listening',[^\n]+ 'listening-transcript'/);
  assert.match(reader, /lookupContext\('speaking',[^\n]+ 'speaking-reference'/);
  const writing = reader.match(/function renderWritingWorkbench\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  const speaking = reader.match(/function renderSpeakingPractice\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  assert.ok(writing && speaking);
  assert.doesNotMatch(writing[1], /renderRuText\(draft/);
  assert.doesNotMatch(speaking[1], /renderRuText\(note/);
});

test('phrase selection is available only for read-only lookup contexts', () => {
  assert.equal(Runtime.isLookupSelectionAllowed({
    text: 'тех людей', startContext: '{"taskId":"P2-Q001"}', endContext: '{"taskId":"P2-Q001"}', editable: false
  }), true);
  assert.equal(Runtime.isLookupSelectionAllowed({
    text: 'тех людей', startContext: '{"taskId":"P2-Q001"}', endContext: '{"taskId":"P2-Q001"}', editable: true
  }), false);
  assert.equal(Runtime.isLookupSelectionAllowed({
    text: 'тех людей', startContext: '{"taskId":"P2-Q001"}', endContext: '{"taskId":"P2-Q002"}', editable: false
  }), false);
  assert.match(reader, /id="dictionaryPhraseLookup"/);
  assert.match(runtimeSource, /selectionchange/);
  assert.match(reader, /lookupPhrase: function/);
  assert.match(reader, /renderPhraseDetail/);
  assert.match(reader, /ensurePanel: ensureDictionaryPanel/);
});

test('exam lookup is locked until the attempt is explicitly marked assisted', () => {
  assert.match(reader, /function unlockExamLookup\(attemptId\)/);
  assert.match(reader, /lookupAssisted/);
  assert.match(reader, /lookupUnlockedAt/);
  assert.match(reader, /使用查词辅助/);
  assert.match(reader, /不计入正式模拟趋势/);
  assert.match(reader, /function getOfficialExamAttempts/);
});

test('reader loads generated morphology and attributed dictionary supplements', () => {
  assert.match(reader, /data\/dictionary\/function-word-forms\.json/);
  assert.match(reader, /data\/dictionary\/corpus-morphology\.json/);
  assert.match(reader, /data\/dictionary\/freedict-rus-zh\.json/);
  assert.match(reader, /data\/dictionary\/markdown-glossary\.json/);
  assert.match(reader, /data\/dictionary\/reviewed-function-entries\.json/);
  assert.match(reader, /data\/dictionary\/openrussian-en\.json/);
  assert.match(reader, /OpenRussian · 英文释义 · CC BY-SA 4\.0/);
  assert.match(reader, /data\/dictionary\/wiktionary-ru\.json/);
  assert.match(reader, /Русский Викисловарь · CC BY-SA 4\.0/);
  assert.match(reader, /reviewed-function-form/);
  assert.match(reader, /dictionaryStorage\.recordMissing/);
  assert.doesNotMatch(reader, /meaning: '待补中文释义'/);
  assert.doesNotMatch(reader, /allowedTypes/);
});

test('true misses expose only an explicit source-labelled online fallback', () => {
  assert.match(reader, /function onlineDictionaryLookup\(\)/);
  assert.match(reader, /appRuntime\.canUseOnlineDictionary\(\)/);
  assert.match(reader, /appRuntime\.lookupDictionary\(term/);
  assert.match(reader, /dictionaryStorage\.saveProvisional/);
  assert.match(reader, /俄文释义（未翻译）/);
  assert.match(reader, /一键联网查询/);
});
