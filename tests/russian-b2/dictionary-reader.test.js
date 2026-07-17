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
  assert.match(reader, /\/api\/dictionary\/lookup/);
  assert.match(reader, /dictionaryStorage\.saveProvisional/);
  assert.match(reader, /俄文释义（未翻译）/);
  assert.match(reader, /一键联网查询/);
});
