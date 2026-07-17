const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const Runtime = require('../../js/russian-dictionary/runtime');
const Core = require('../../js/russian-dictionary/core');

const reader = fs.readFileSync('reader.html', 'utf8');

test('reader loads shared dictionary modules before its inline runtime', () => {
  const coreAt = reader.indexOf('js/russian-dictionary/core.js');
  const storageAt = reader.indexOf('js/russian-dictionary/storage.js');
  const runtimeAt = reader.indexOf('js/russian-dictionary/runtime.js');
  const inlineAt = reader.indexOf('<script>', runtimeAt);
  assert.ok(coreAt >= 0 && storageAt > coreAt && runtimeAt > storageAt && inlineAt > runtimeAt);
  assert.match(reader, /RussianDictionaryRuntime\.createController/);
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
