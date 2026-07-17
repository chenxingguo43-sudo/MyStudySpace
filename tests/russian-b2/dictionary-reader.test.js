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
