const test = require('node:test');
const assert = require('node:assert/strict');
const Runtime = require('../../js/russian-dictionary/runtime');
const Core = require('../../js/russian-dictionary/core');

test('touch scrolling across a word does not open the dictionary, while a deliberate tap does', () => {
  const listeners = {};
  const root = {
    defaultView: { getSelection() { return { isCollapsed: true }; } },
    addEventListener(type, handler) { listeners[type] = handler; },
    removeEventListener(type) { delete listeners[type]; }
  };
  const span = {
    textContent: '\u0441\u043b\u043e\u0432\u043e',
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      contains(value) { return this.values.has(value); }
    },
    getAttribute(name) {
      if (name === 'data-word') return this.textContent;
      if (name === 'data-lookup-context') return '{}';
      return '';
    }
  };
  const target = { closest(selector) { return selector === '.ru-word' ? span : null; } };
  const requests = [];
  const controller = Runtime.createController({
    core: Core,
    root,
    lookupWord(word) { requests.push(word); }
  });
  controller.init();

  listeners.touchstart({ target, touches: [{ clientX: 20, clientY: 40 }] });
  listeners.touchend({
    target,
    changedTouches: [{ clientX: 22, clientY: 90 }],
    preventDefault() {}, stopPropagation() {}
  });
  assert.deepEqual(requests, []);

  listeners.touchstart({ target, touches: [{ clientX: 20, clientY: 40 }] });
  listeners.touchend({
    target,
    changedTouches: [{ clientX: 23, clientY: 44 }],
    preventDefault() {}, stopPropagation() {}
  });
  assert.deepEqual(requests, [span.textContent]);
  assert.equal(span.classList.contains('dictionary-active'), true);

  controller.close();
  assert.equal(span.classList.contains('dictionary-active'), false);

  controller.destroy();
  assert.equal(listeners.touchstart, undefined);
  assert.equal(listeners.touchend, undefined);
});
