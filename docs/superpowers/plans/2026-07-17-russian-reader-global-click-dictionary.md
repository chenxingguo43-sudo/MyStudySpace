# Russian Reader Global Click Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Russian word lookup work consistently across every read-only learning surface, add safe phrase lookup and exam gating, and raise offline dictionary coverage to the approved thresholds.

**Architecture:** Extract pure tokenization, lookup, storage, and coverage logic into focused CommonJS/browser-compatible modules. `reader.html` keeps the existing visual dictionary panel but delegates Russian rendering and interactions to a shared controller; build-time scripts use `pymorphy3` plus a pinned, attributed FreeDict import to create offline resources, while a server-side adapter handles user-triggered online fallback.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js 24 CommonJS, Node test runner, Python 3.14 with installed `pymorphy3`, Cheerio XML mode, localStorage, existing Node static server.

## Global Constraints

- Do not enable lookup in writing drafts, speaking transcription editors, notes, search inputs, code, paths, locked answers, or locked model texts.
- Preserve the existing desktop detail-panel information order and existing `vocabulary-review-records` review fields.
- Desktop uses the right detail panel; narrow screens use an accessible bottom drawer.
- Learning-mode option words trigger lookup while the explicit radio control answers; exam lookup is locked by default.
- Unlocking lookup in an exam writes `lookupAssisted: true` and excludes that attempt from official trends.
- Runtime lookup is offline-first; network lookup occurs only after an explicit user action.
- Network results remain personal provisional entries until reviewed; they never count toward formal local coverage.
- Common function-word forms must reach 100% across the reader.
- B2 and structured textbooks must reach 98% formal offline coverage by distinct valid form.
- The whole reader including novels must reach 98% formal offline coverage weighted by occurrences.
- Proper names, abbreviations, speaker labels, and suspected OCR defects are reported separately.
- Never lower a coverage threshold to make a failing audit pass.
- Do not stage `cloudsync-config.js`, unrelated worktree files, generated visual-companion files, or user workspace state.

---

## File Map

**Create:**

- `js/russian-dictionary/core.js` — pure tokenization, context normalization, lemma resolution, and result classification.
- `js/russian-dictionary/storage.js` — provisional entries, missing queue, and backward-compatible saved-word merging.
- `js/russian-dictionary/runtime.js` — browser event controller, phrase selection, panel/drawer state, and exam lock.
- `server/russian-dictionary.js` — validated server-side online dictionary adapter.
- `scripts/russian-dictionary/build-freedict.js` — pinned FreeDict importer and Russian→Chinese inversion.
- `scripts/russian-dictionary/build-corpus-morphology.js` — corpus token extraction and batched `pymorphy3` analysis.
- `scripts/russian-dictionary/audit-coverage.js` — structured-textbook and full-reader coverage gates.
- `data/dictionary/function-word-forms.json` — reviewed closed-class forms and lemmas.
- `data/dictionary/manifest.json` — generated resource versions, checksums, licenses, and counts.
- `data/dictionary/ATTRIBUTION.md` — FreeDict and source attribution.
- `tests/russian-b2/dictionary-core.test.js`
- `tests/russian-b2/dictionary-storage.test.js`
- `tests/russian-b2/dictionary-reader.test.js`
- `tests/russian-b2/dictionary-server.test.js`
- `tests/russian-b2/dictionary-build.test.js`
- `tests/russian-b2/dictionary-coverage.test.js`
- `tests/fixtures/dictionary/freedict-zho-rus.tei`
- `docs/superpowers/acceptance/2026-07-17-russian-reader-global-click-dictionary.md`

**Modify:**

- `reader.html` — load shared modules, delegate lookup, render Russian fields, adapt option controls, and add drawer markup/styles.
- `server.js` — route `/api/dictionary/lookup` through the server adapter.
- `package.json` — add dictionary build, audit, and verification commands.
- `tests/russian-b2/reader-static.test.js` — retain old reader guarantees and add integration assertions.

**Generated and tracked after successful build:**

- `data/dictionary/freedict-rus-zh.json`
- `data/dictionary/corpus-morphology.json`
- `data/dictionary/coverage-report.json`

---

### Task 1: Pure Russian Text and Lookup Core

**Files:**

- Create: `js/russian-dictionary/core.js`
- Create: `tests/russian-b2/dictionary-core.test.js`

**Interfaces:**

- Produces `RussianDictionaryCore.normalizeRussian(value): string`.
- Produces `RussianDictionaryCore.tokenizeRussian(value): Array<{type:'text'|'word', value:string, normalized?:string}>`.
- Produces `RussianDictionaryCore.renderRussianText(value, context): string`.
- Produces `RussianDictionaryCore.normalizeContext(context): LookupContext`.
- Produces `RussianDictionaryCore.resolveLemma(form, sources): LookupResolution`.

- [ ] **Step 1: Write failing tokenization and escaping tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../js/russian-dictionary/core');

test('tokenizes stressed and hyphenated Russian without losing punctuation', () => {
  assert.deepEqual(Core.tokenizeRussian('Из-за э́тих проблем.'), [
    { type: 'word', value: 'Из-за', normalized: 'из-за' },
    { type: 'text', value: ' ' },
    { type: 'word', value: 'э́тих', normalized: 'этих' },
    { type: 'text', value: ' ' },
    { type: 'word', value: 'проблем', normalized: 'проблем' },
    { type: 'text', value: '.' }
  ]);
});

test('renders safe word targets with serialized lookup context', () => {
  const html = Core.renderRussianText('тех < людей', {
    bookId: 'russian_b2', moduleId: 'grammar', taskId: 'P2-Q001', regionType: 'prompt',
    sentenceRu: 'Я знаю тех людей.', sentenceZh: '我认识那些人。'
  });
  assert.match(html, /class="ru-word"/);
  assert.match(html, /data-word="тех"/);
  assert.match(html, /data-lookup-context=/);
  assert.match(html, /&lt;/);
  assert.doesNotMatch(html, /<script/);
});
```

- [ ] **Step 2: Run the focused test and confirm red state**

Run: `node --test tests/russian-b2/dictionary-core.test.js`

Expected: FAIL with `Cannot find module '../../js/russian-dictionary/core'`.

- [ ] **Step 3: Implement the UMD core with exact exports**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RussianDictionaryCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const WORD_RE = /[А-Яа-яЁё](?:[А-Яа-яЁё\u0300-\u036f-]*[А-Яа-яЁё\u0300-\u036f])?/g;
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const normalizeRussian = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ё/gi, match => match === 'Ё' ? 'Е' : 'е')
    .toLowerCase().replace(/[^а-я-]/g, '');
  function tokenizeRussian(value) {
    const text = String(value || ''); const result = []; let cursor = 0;
    for (const match of text.matchAll(WORD_RE)) {
      if (match.index > cursor) result.push({ type: 'text', value: text.slice(cursor, match.index) });
      result.push({ type: 'word', value: match[0], normalized: normalizeRussian(match[0]) });
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) result.push({ type: 'text', value: text.slice(cursor) });
    return result;
  }
  function normalizeContext(value = {}) {
    return {
      bookId: String(value.bookId || ''), moduleId: String(value.moduleId || ''),
      taskId: String(value.taskId || ''), regionType: String(value.regionType || ''),
      sentenceRu: String(value.sentenceRu || ''), sentenceZh: String(value.sentenceZh || ''),
      sourceLabel: String(value.sourceLabel || ''), sourcePages: Array.isArray(value.sourcePages) ? value.sourcePages : []
    };
  }
  function renderRussianText(value, context = {}) {
    const encoded = escapeHtml(JSON.stringify(normalizeContext(context)));
    return tokenizeRussian(value).map(token => token.type === 'text' ? escapeHtml(token.value) :
      `<span class="ru-word" data-word="${escapeHtml(token.value)}" data-lookup-context="${encoded}">${escapeHtml(token.value)}</span>`).join('');
  }
  function resolveLemma(form, { morphology = {}, functionForms = {}, lookupLemma = () => null } = {}) {
    const normalized = normalizeRussian(form);
    const candidates = functionForms[normalized] || morphology[normalized] || [normalized];
    for (const lemma of candidates) { const entry = lookupLemma(lemma); if (entry) return { form, normalized, lemma, entry, reliability: functionForms[normalized] ? 'morphology-map' : lemma === normalized ? 'dictionary-exact' : 'morphology-map', alternatives: candidates.filter(item => item !== lemma) }; }
    return { form, normalized, lemma: candidates[0] || normalized, entry: null, reliability: candidates.length ? 'morphology-guess' : 'not-found', alternatives: candidates.slice(1) };
  }
  return { normalizeRussian, tokenizeRussian, renderRussianText, normalizeContext, resolveLemma };
});
```

- [ ] **Step 4: Run the test and confirm green state**

Run: `node --test tests/russian-b2/dictionary-core.test.js`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit the core**

```powershell
git add js/russian-dictionary/core.js tests/russian-b2/dictionary-core.test.js
git commit -m "feat: add shared Russian dictionary core"
```

---

### Task 2: Saved Words, Missing Queue, and Provisional Entries

**Files:**

- Create: `js/russian-dictionary/storage.js`
- Create: `tests/russian-b2/dictionary-storage.test.js`

**Interfaces:**

- Consumes `RussianDictionaryCore.normalizeRussian`.
- Produces `createDictionaryStorage({storage, now})`.
- Methods: `mergeSavedWord(input)`, `recordMissing(input)`, `saveProvisional(input)`, `getProvisional(key)`, `markReviewed(key, formalEntry)`.
- Storage keys: existing `vocabulary-review-records`, new `rr_dictionary_missing_v1`, new `rr_dictionary_provisional_v1`.

- [ ] **Step 1: Write failing migration and merge tests**

```js
const test = require('node:test'); const assert = require('node:assert/strict');
const { createDictionaryStorage } = require('../../js/russian-dictionary/storage');

test('adds a B2 source without overwriting legacy review progress', () => {
  const storage = new Map([['vocabulary-review-records', JSON.stringify({ тот: { mastery: 3, interval: 9, source: 'novel' } })]]);
  const db = createDictionaryStorage({ storage, now: () => '2026-07-17T12:00:00.000Z' });
  const result = db.mergeSavedWord({ form: 'тех', lemma: 'тот', meaning: '那个', partOfSpeech: 'pronoun', reliability: 'morphology-map', context: { bookId: 'russian_b2', moduleId: 'grammar', taskId: 'P2-Q001', sentenceRu: 'Я знаю тех людей.' } });
  assert.equal(result.mastery, 3); assert.equal(result.interval, 9);
  assert.equal(result.sources[0].taskId, 'P2-Q001');
});

test('deduplicates missing forms and increments occurrence count', () => {
  const db = createDictionaryStorage({ storage: new Map(), now: () => '2026-07-17T12:00:00.000Z' });
  db.recordMissing({ form: 'тех', lemmaCandidates: ['тот'], failureStage: 'lemma-resolution', context: { taskId: 'P2-Q001' } });
  assert.equal(db.recordMissing({ form: 'тех', lemmaCandidates: ['тот'], failureStage: 'lemma-resolution', context: { taskId: 'P2-Q002' } }).occurrences, 2);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/russian-b2/dictionary-storage.test.js`

Expected: FAIL because `storage.js` does not exist.

- [ ] **Step 3: Implement storage with Map/localStorage adapters**

Implement a UMD module whose `read` and `write` helpers support both `Map` and `localStorage`. `mergeSavedWord` must preserve `mastery`, `nextReview`, `interval`, `easeFactor`, and `count`; append a deduplicated source keyed by `bookId|moduleId|taskId|sentenceRu`; and retain legacy `source`. `recordMissing` normalizes by form, increments `occurrences`, appends unique contexts, and records `firstSeenAt`/`lastSeenAt`. `saveProvisional` stores `provider`, `sourceUrl`, `queriedAt`, `meaningRu`, and `meaningZh` without writing `vocabulary-review-records`.

```js
return { mergeSavedWord, recordMissing, saveProvisional, getProvisional, markReviewed, keys: { saved: SAVED_KEY, missing: MISSING_KEY, provisional: PROVISIONAL_KEY } };
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/russian-b2/dictionary-storage.test.js`

Expected: PASS, including legacy progress preservation and missing deduplication.

- [ ] **Step 5: Commit**

```powershell
git add js/russian-dictionary/storage.js tests/russian-b2/dictionary-storage.test.js
git commit -m "feat: add dictionary storage and migration"
```

---

### Task 3: Browser Runtime and Existing Panel Compatibility

**Files:**

- Create: `js/russian-dictionary/runtime.js`
- Modify: `reader.html:356-359, 639-650, 674-705, 1964-2178, 2538-2655, 2835-2842`
- Create: `tests/russian-b2/dictionary-reader.test.js`

**Interfaces:**

- Consumes `RussianDictionaryCore`, `createDictionaryStorage`, existing `autoLookup`, `renderDetailPanel`, `lookupLocalChineseMeaning`, and `toast` through an adapter.
- Produces `RussianDictionaryRuntime.createController(options)` with `init()`, `destroy()`, `renderText()`, `openWord()`, `openPhrase()`, `setExamPolicy()`, and `close()`.
- Keeps global `renderRuText(text, context)` as compatibility wrapper.

- [ ] **Step 1: Write failing static/runtime assertions**

```js
const fs = require('node:fs'); const test = require('node:test'); const assert = require('node:assert/strict');
const reader = fs.readFileSync('reader.html', 'utf8');
test('reader loads shared dictionary modules before its inline runtime', () => {
  assert.match(reader, /js\/russian-dictionary\/core\.js/);
  assert.match(reader, /js\/russian-dictionary\/storage\.js/);
  assert.match(reader, /js\/russian-dictionary\/runtime\.js/);
  assert.match(reader, /RussianDictionaryRuntime\.createController/);
});
test('legacy renderRuText delegates to the shared renderer', () => {
  const body = reader.match(/function renderRuText\(text(?:, context)?\) \{([\s\S]*?)\n\}/);
  assert.ok(body); assert.match(body[1], /dictionaryController\.renderText/);
});
```

- [ ] **Step 2: Run and verify red state**

Run: `node --test tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL because shared scripts and controller are absent.

- [ ] **Step 3: Implement the controller and wire the existing adapter**

Load scripts before `dashboard.js`. Create the controller after local lookup state variables exist:

```js
var dictionaryStorage = RussianDictionaryStorage.createDictionaryStorage({ storage: localStorage });
var dictionaryController = RussianDictionaryRuntime.createController({
  core: RussianDictionaryCore,
  storage: dictionaryStorage,
  root: document,
  lookupWord: function(word, context) { return resolveReaderDictionaryWord(word, context); },
  renderResult: function(word, result) { return renderDetailPanel(word, result); },
  onToast: toast
});
dictionaryController.init();
function renderRuText(text, context) { return dictionaryController.renderText(text, context || {}); }
```

Move the one global `.ru-word` click listener into `runtime.js`; remove the duplicate inline click/touch handlers. Keep `autoLookup` as the lookup adapter until Task 8 replaces its morphology source. Add `aria-live="polite"` to `#detailInner`.

- [ ] **Step 4: Run dictionary and existing B2 tests**

Run: `node --test tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js`

Expected: PASS; legacy reading lookup remains present and no duplicate click handler remains.

- [ ] **Step 5: Commit**

```powershell
git add js/russian-dictionary/runtime.js reader.html tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js
git commit -m "refactor: share Russian dictionary runtime"
```

---

### Task 4: Desktop Panel and Mobile Bottom Drawer

**Files:**

- Modify: `reader.html:356-620, 639-650, 1850-1882`
- Modify: `js/russian-dictionary/runtime.js`
- Modify: `tests/russian-b2/dictionary-reader.test.js`

**Interfaces:**

- Consumes controller `openWord()` and `close()`.
- Produces responsive states `data-dictionary-state="closed|half|full"` and media behavior at `max-width: 760px`.

- [ ] **Step 1: Add failing markup and accessibility tests**

```js
test('dictionary uses a desktop panel and accessible narrow-screen drawer', () => {
  assert.match(reader, /id="detailPanel"/);
  assert.match(reader, /class="dictionary-drawer-handle"/);
  assert.match(reader, /aria-label="关闭词典"/);
  assert.match(reader, /@media \(max-width: 760px\)/);
  assert.match(reader, /data-dictionary-state/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL on drawer assertions.

- [ ] **Step 3: Add responsive CSS, handle, and pointer state machine**

Desktop retains the existing `.reader-layout`, `.resize-handle`, and `.detail-panel`. Under 760px, position `#detailPanel` fixed at the bottom, set half height to `52dvh`, full height to `92dvh`, and closed transform to `translateY(105%)`. The controller tracks pointer start/end and changes only among `closed`, `half`, and `full`; Escape and the visible close button call `close()`.

```css
@media (max-width: 760px) {
  #detailPanel { position: fixed; inset: auto 0 0; height: 52dvh; transform: translateY(105%); z-index: 220; border-radius: 20px 20px 0 0; }
  #detailPanel[data-dictionary-state="half"] { transform: translateY(0); height: 52dvh; }
  #detailPanel[data-dictionary-state="full"] { transform: translateY(0); height: 92dvh; }
  .dictionary-drawer-handle { display: block; width: 48px; height: 5px; margin: 8px auto; border-radius: 999px; background: var(--border); }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add reader.html js/russian-dictionary/runtime.js tests/russian-b2/dictionary-reader.test.js
git commit -m "feat: add responsive dictionary drawer"
```

---

### Task 5: Grammar, Knowledge Cards, and Reading Integration

**Files:**

- Modify: `reader.html:1242-1535, 1454-1528, 1745-1795`
- Modify: `tests/russian-b2/dictionary-reader.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**

- Consumes `renderRuText(text, context)`.
- Produces lookup-enabled grammar prompts/options/explanations, study-card Russian fields, reading prompts/options/body/support.

- [ ] **Step 1: Write failing module coverage tests**

```js
test('grammar, study cards, and reading pass explicit lookup contexts', () => {
  assert.match(reader, /renderLookupOption\(exercise, option/);
  assert.match(reader, /regionType: 'quiz-option'/);
  assert.match(reader, /regionType: 'study-example'/);
  assert.match(reader, /regionType: 'reading-body'/);
  assert.match(reader, /regionType: 'reading-option'/);
});
test('learning options separate answer radio from lookup words', () => {
  assert.match(reader, /class="b2-option-radio"/);
  assert.match(reader, /submitQuizOption/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL on missing lookup contexts and radio control.

- [ ] **Step 3: Add focused rendering helpers and replace Russian `escapeHtml` calls**

```js
function lookupContext(moduleId, taskId, regionType, sentenceRu, sentenceZh, sourcePages) {
  return { bookId: curBook && curBook.id || '', moduleId, taskId, regionType, sentenceRu, sentenceZh: sentenceZh || '', sourceLabel: 'B2 原书', sourcePages: sourcePages || [] };
}
function renderLookupOption(exercise, option, onAnswer) {
  var context = lookupContext('grammar', exercise.id, 'quiz-option', option.text, '', exercise.sourcePages || []);
  return '<div class="b2-option-row"><button class="b2-option-radio" aria-label="选择 ' + escapeHtml(option.label) + '" onclick="' + onAnswer + '"></button><span class="b2-option-text">' + renderRuText(option.text, context) + '</span></div>';
}
```

Use `renderRuText` for Russian content only. Chinese explanations remain `escapeHtml`. Study-card `item.ru`, Russian structures, and reading `paragraph`, `question.prompt`, and `option.text` receive stable context. Already hidden explanations are wrapped only inside the open branch.

- [ ] **Step 4: Run focused and full B2 tests**

Run: `node --test tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js && npm run test:russian-b2`

Expected: PASS; quiz scroll and answer-reveal tests remain green.

- [ ] **Step 5: Commit**

```powershell
git add reader.html tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js
git commit -m "feat: enable lookup in grammar and reading"
```

---

### Task 6: Writing, Listening, Speaking, and Exam Content Integration

**Files:**

- Modify: `reader.html:1613-1795`
- Modify: `tests/russian-b2/dictionary-reader.test.js`

**Interfaces:**

- Consumes `renderRuText` and `lookupContext`.
- Produces lookup-enabled read-only task/material/transcript/reference content while leaving editors untouched.

- [ ] **Step 1: Write failing inclusion/exclusion tests**

```js
test('writing, listening, and speaking wrap only read-only Russian', () => {
  assert.match(reader, /regionType: 'writing-material'/);
  assert.match(reader, /regionType: 'writing-model'/);
  assert.match(reader, /regionType: 'listening-transcript'/);
  assert.match(reader, /regionType: 'speaking-reference'/);
  const writing = reader.match(/function renderWritingWorkbench\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  assert.ok(writing); assert.doesNotMatch(writing[1], /renderRuText\(draft/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL on missing region types.

- [ ] **Step 3: Wrap visible source fields and keep editors escaped**

Use `renderRuText` for writing prompts, material-card Russian values, unlocked model text, listening segment text, listening prompts/options, speaking prompt, scaffold expressions, and unlocked source answer. Keep `textarea` values passed only through `escapeHtml`.

```js
var transcript = (data.transcriptSegments || []).map(function(segment) {
  var context = lookupContext('listening', data.id, 'listening-transcript', segment.text, segment.translation || '', data.sourcePages || []);
  return '<p class="ru-text"><strong>' + escapeHtml(segment.speaker || '') + '：</strong> ' + renderRuText(segment.text || '', context) + '</p>';
}).join('');
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js && npm run test:russian-b2`

Expected: PASS; writing drafts and speaking transcript inputs remain plain editable text.

- [ ] **Step 5: Commit**

```powershell
git add reader.html tests/russian-b2/dictionary-reader.test.js
git commit -m "feat: enable lookup across B2 workbenches"
```

---

### Task 7: Phrase Selection and Degraded Phrase Analysis

**Files:**

- Modify: `js/russian-dictionary/core.js`
- Modify: `js/russian-dictionary/runtime.js`
- Modify: `reader.html`
- Modify: `tests/russian-b2/dictionary-core.test.js`
- Modify: `tests/russian-b2/dictionary-reader.test.js`

**Interfaces:**

- Produces `Core.normalizePhrase(value)` and `Core.analyzePhrase(value, adapter)`.
- Runtime listens to `selectionchange`/`pointerup` only inside `[data-lookup-context]` read-only regions.

- [ ] **Step 1: Write failing phrase tests**

```js
test('phrase lookup prefers an exact collocation and otherwise returns components', () => {
  const exact = Core.analyzePhrase('в состоянии', { lookupPhrase: value => value === 'в состоянии' ? { meaning: '处于……状态' } : null, resolveWord: () => null });
  assert.equal(exact.kind, 'phrase-exact');
  const degraded = Core.analyzePhrase('тех людей', { lookupPhrase: () => null, resolveWord: word => ({ form: word, lemma: word === 'тех' ? 'тот' : 'человек' }) });
  assert.equal(degraded.kind, 'phrase-components'); assert.equal(degraded.components[0].lemma, 'тот');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/russian-b2/dictionary-core.test.js`

Expected: FAIL because `analyzePhrase` is undefined.

- [ ] **Step 3: Implement phrase analysis and selection guard**

Reject selections spanning different lookup contexts, editors, hidden content, or fewer than two Russian words. Render a single floating “查询短语” button adjacent to the selection. Exact phrase results use existing collocations; degraded results show “未找到完整短语词条”, component resolutions, and the sentence context. The deep-analysis button copies a source-labelled prompt and does not store it as a formal definition.

- [ ] **Step 4: Run tests**

Run: `node --test tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-reader.test.js`

Expected: PASS for exact, degraded, and excluded-editor cases.

- [ ] **Step 5: Commit**

```powershell
git add js/russian-dictionary/core.js js/russian-dictionary/runtime.js reader.html tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-reader.test.js
git commit -m "feat: add contextual Russian phrase lookup"
```

---

### Task 8: Exam Lookup Lock and Assisted Attempt Marker

**Files:**

- Modify: `js/russian-dictionary/runtime.js`
- Modify: `reader.html:1700-1745`
- Modify: `tests/russian-b2/dictionary-reader.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**

- Runtime consumes `{mode:'learning'|'exam', lookupUnlocked:boolean}`.
- Exam records add `lookupAssisted: boolean` and `lookupUnlockedAt: string`.

- [ ] **Step 1: Write failing exam-policy tests**

```js
test('exam lookup is locked until the attempt is explicitly marked assisted', () => {
  assert.match(reader, /function unlockExamLookup\(attemptId\)/);
  assert.match(reader, /lookupAssisted/);
  assert.match(reader, /lookupUnlockedAt/);
  assert.match(reader, /使用查词辅助/);
  assert.match(reader, /不计入正式模拟趋势/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL because unlock flow is absent.

- [ ] **Step 3: Implement explicit unlock and rendering policy**

`unlockExamLookup` shows a confirmation dialog, writes both fields to the current attempt, calls `dictionaryController.setExamPolicy({ mode:'exam', lookupUnlocked:true })`, and re-renders options with explicit radios. Official trend filtering must require `lookupAssisted !== true`.

```js
function unlockExamLookup(attemptId) {
  if (!window.confirm('解锁查词后，本次只保留为辅助练习，不计入正式模拟趋势。继续吗？')) return;
  var progress = getExamProgress(); var attempt = progress[attemptId] || {};
  attempt.lookupAssisted = true; attempt.lookupUnlockedAt = new Date().toISOString();
  progress[attemptId] = attempt; saveExamProgress(progress);
  dictionaryController.setExamPolicy({ mode: 'exam', lookupUnlocked: true });
  rerenderExamPracticePreservingScroll();
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js`

Expected: PASS; pre-unlock option rows remain normal answer targets.

- [ ] **Step 5: Commit**

```powershell
git add js/russian-dictionary/runtime.js reader.html tests/russian-b2/dictionary-reader.test.js tests/russian-b2/reader-static.test.js
git commit -m "feat: gate dictionary lookup in mock exams"
```

---

### Task 9: Offline Morphology and FreeDict Supplement Build

**Files:**

- Create: `scripts/russian-dictionary/build-corpus-morphology.js`
- Create: `scripts/russian-dictionary/build-freedict.js`
- Create: `data/dictionary/function-word-forms.json`
- Create: `data/dictionary/ATTRIBUTION.md`
- Create: `data/dictionary/manifest.json`
- Create: `tests/fixtures/dictionary/freedict-zho-rus.tei`
- Create: `tests/russian-b2/dictionary-build.test.js`
- Modify: `package.json`

**Interfaces:**

- Produces `data/dictionary/corpus-morphology.json` keyed by normalized form with `{lemmas, tags, classification}`.
- Produces `data/dictionary/freedict-rus-zh.json` keyed by normalized Russian lemma with Chinese meanings and attribution.
- Exports testable `extractRussianForms`, `analyzeWithPymorphy`, and `invertFreeDictXml`.

- [ ] **Step 1: Add a pinned FreeDict fixture and failing importer tests**

```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body>
  <entry><form><orth>那个</orth></form><sense><cit type="trans"><quote>тот</quote></cit></sense></entry>
  <entry><form><orth>状态</orth></form><sense><cit type="trans"><quote>состояние</quote></cit></sense></entry>
</body></text></TEI>
```

```js
test('inverts Chinese-Russian FreeDict entries into attributed Russian-Chinese entries', () => {
  const xml = fs.readFileSync('tests/fixtures/dictionary/freedict-zho-rus.tei', 'utf8');
  const result = invertFreeDictXml(xml);
  assert.deepEqual(result['тот'].meanings, ['那个']);
  assert.equal(result['тот'].source, 'FreeDict zho-rus 2025.11.23');
});
```

- [ ] **Step 2: Verify red state and Python dependency**

Run: `node --test tests/russian-b2/dictionary-build.test.js`

Expected: FAIL because builders are absent.

Run: `python -c "import pymorphy3; print(pymorphy3.__version__)"`

Expected: exit 0 and a version string.

- [ ] **Step 3: Implement deterministic builders**

`build-corpus-morphology.js` recursively reads `data/textbook/**/*.json` and `data/novel/**/*.json`, extracts normalized forms, and sends a JSON array once to `python -c` using `spawnSync`; the embedded Python loads `pymorphy3.MorphAnalyzer`, returns up to three parses with normal form and grammemes, and never writes files itself.

`build-freedict.js` pins FreeDict `zho-rus` version `2025.11.23` with these constants:

```js
const FREEDICT_VERSION = '2025.11.23';
const FREEDICT_BASE = `https://download.freedict.org/dictionaries/zho-rus/${FREEDICT_VERSION}`;
const FREEDICT_ARCHIVE = `freedict-zho-rus-${FREEDICT_VERSION}.src.tar.xz`;
const FREEDICT_SHA512 = `${FREEDICT_ARCHIVE}.sha512`;
```

Download the archive and its adjacent `.sha512` file from `FREEDICT_BASE`, compare the computed archive SHA-512 with the published checksum before extraction, and abort on any mismatch. Parse the extracted TEI with Cheerio XML mode, invert Russian translation quotes to Chinese headwords, deduplicate meanings, and write source/license metadata. The generated dictionary remains attributed and is not merged invisibly into `vocabulary.json`.

Add scripts:

```json
"build:russian-dictionary": "node scripts/russian-dictionary/build-corpus-morphology.js && node scripts/russian-dictionary/build-freedict.js",
"audit:russian-dictionary": "node scripts/russian-dictionary/audit-coverage.js",
"verify:russian-dictionary": "node scripts/russian-dictionary/audit-coverage.js --check && node --test tests/russian-b2/dictionary-*.test.js"
```

- [ ] **Step 4: Run fixture tests and full resource build**

Run: `node --test tests/russian-b2/dictionary-build.test.js`

Expected: PASS.

Run: `npm run build:russian-dictionary`

Expected: exits 0; manifest records FreeDict version, SHA-512, license, morphology form count, and generated file checksums.

- [ ] **Step 5: Commit source, attribution, generated resources, and tests**

```powershell
git add scripts/russian-dictionary data/dictionary tests/fixtures/dictionary tests/russian-b2/dictionary-build.test.js package.json
git commit -m "feat: build offline Russian dictionary resources"
```

---

### Task 10: Runtime Lookup Pipeline with Corpus Morphology

**Files:**

- Modify: `reader.html:879-930, 2211-2600`
- Modify: `js/russian-dictionary/core.js`
- Modify: `tests/russian-b2/dictionary-core.test.js`
- Modify: `tests/russian-b2/dictionary-reader.test.js`

**Interfaces:**

- Lookup order: reviewed function forms → corpus morphology → legacy morphology map → primary vocabulary → external vocabulary → FreeDict supplement → provisional cache → missing.
- Produces visible reliability labels matching the spec.

- [ ] **Step 1: Add failing `тех` and source-priority tests**

```js
test('resolves тех to тот before looking up the formal entry', () => {
  const result = Core.resolveLemma('тех', { functionForms: { тех: ['тот'] }, morphology: {}, lookupLemma: lemma => lemma === 'тот' ? { meaning: '那个' } : null });
  assert.equal(result.lemma, 'тот'); assert.equal(result.entry.meaning, '那个');
  assert.equal(result.reliability, 'morphology-map');
});
```

Add equivalent tests for `этих → этот`, `всех → весь`, `кого → кто`, and `чего → что`.

- [ ] **Step 2: Run and verify any priority failures**

Run: `node --test tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL until generated resources are loaded and priority is wired.

- [ ] **Step 3: Load generated resources and replace the old three-level lookup**

Extend `loadLocalLookupData()` to fetch `data/dictionary/function-word-forms.json`, `corpus-morphology.json`, and `freedict-rus-zh.json`. Keep the existing rich primary entry when multiple sources exist. Adapt FreeDict entries to `{meaning, type:'', source:'FreeDict zho-rus 2025.11.23', _raw:{}}`. On a true miss, call `dictionaryStorage.recordMissing` and render a real not-found state instead of `待补中文释义`.

- [ ] **Step 4: Run tests and a browser-data smoke check**

Run: `node --test tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-reader.test.js && npm run test:russian-b2`

Expected: PASS; `тех` resolves to the primary `тот` entry.

- [ ] **Step 5: Commit**

```powershell
git add reader.html js/russian-dictionary/core.js tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-reader.test.js
git commit -m "feat: expand offline Russian lookup coverage"
```

---

### Task 11: User-Triggered Online Lookup and Personal Provisional Entries

**Files:**

- Create: `server/russian-dictionary.js`
- Modify: `server.js:1-45, 36-84`
- Modify: `js/russian-dictionary/runtime.js`
- Modify: `reader.html`
- Create: `tests/russian-b2/dictionary-server.test.js`
- Modify: `tests/russian-b2/dictionary-storage.test.js`

**Interfaces:**

- Server exports `createRussianDictionaryLookup({fetchImpl})`.
- GET `/api/dictionary/lookup?term=<encoded>&includeContext=0|1&context=<encoded>`.
- Response: `{found, term, provider, sourceUrl, meaningRu, meaningZh, queriedAt}`.

- [ ] **Step 1: Write failing server adapter tests with mocked fetch**

```js
test('returns a source-labelled Wiktionary extract without inventing Chinese', async () => {
  const lookup = createRussianDictionaryLookup({ fetchImpl: async () => ({ ok: true, json: async () => ({ query: { pages: { 1: { title: 'тех', extract: 'Форма местоимения тот.' } } } }) }) });
  const result = await lookup('тех');
  assert.equal(result.provider, 'Russian Wiktionary');
  assert.equal(result.meaningRu, 'Форма местоимения тот.');
  assert.equal(result.meaningZh, '');
  assert.match(result.sourceUrl, /wiktionary/);
});
```

- [ ] **Step 2: Run and verify red state**

Run: `node --test tests/russian-b2/dictionary-server.test.js`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement validated server route and provisional client flow**

Use the official Russian Wiktionary MediaWiki Action API through server-side `fetch`. Accept only 1–80 Russian letters, spaces, and hyphens; cap context at 500 characters; set a 7-second timeout; return source URL and provider; never accept a client-supplied provider URL. In the reader, show “一键联网查询” only for `not-found`, ask before including context, save successful results with `dictionaryStorage.saveProvisional`, and label Russian-only extracts accurately.

- [ ] **Step 4: Run tests**

Run: `node --test tests/russian-b2/dictionary-server.test.js tests/russian-b2/dictionary-storage.test.js tests/russian-b2/dictionary-reader.test.js`

Expected: PASS for validation, timeout, not-found, source attribution, and provisional persistence.

- [ ] **Step 5: Commit**

```powershell
git add server/russian-dictionary.js server.js js/russian-dictionary/runtime.js reader.html tests/russian-b2/dictionary-server.test.js tests/russian-b2/dictionary-storage.test.js
git commit -m "feat: add explicit online dictionary fallback"
```

---

### Task 12: Coverage Audit and Hard Gates

**Files:**

- Create: `scripts/russian-dictionary/audit-coverage.js`
- Create: `tests/russian-b2/dictionary-coverage.test.js`
- Generate: `data/dictionary/coverage-report.json`
- Modify: `package.json`

**Interfaces:**

- Exports `auditCoverage({textbookRoot, novelRoot, dictionaries, morphology, functionForms})`.
- CLI `--check` exits non-zero if any approved threshold fails.

- [ ] **Step 1: Write failing fixture-level metric tests**

```js
test('reports distinct textbook coverage separately from weighted whole-reader coverage', () => {
  const report = auditCoverage({
    textbookDocuments: ['Я знаю тех людей.'], novelDocuments: ['Он он он редкость.'],
    resolve: form => ({ я: true, знаю: true, тех: true, людей: true, он: true })[form] || false,
    functionForms: new Set(['я', 'тех', 'он'])
  });
  assert.equal(report.functionWords.rate, 1);
  assert.equal(report.structuredTextbooks.distinctRate, 1);
  assert.equal(report.wholeReader.occurrenceRate, 7 / 8);
});
```

- [ ] **Step 2: Run and verify red state**

Run: `node --test tests/russian-b2/dictionary-coverage.test.js`

Expected: FAIL because the audit module is absent.

- [ ] **Step 3: Implement classification, metrics, report, and gates**

Scan approved JSON fields under `data/textbook` and content JSON under `data/novel`. Classify one-letter speaker labels, `pymorphy3` `Name/Surn/Patr/Geox`, all-uppercase abbreviations, mixed-symbol tokens, and configured OCR exceptions separately. Report form-resolution failure separately from missing-lemma definition. Formal coverage includes primary, external, and attributed FreeDict entries; provisional entries are excluded.

`--check` requires:

```js
if (report.functionWords.rate !== 1) failures.push('function-word coverage below 100%');
if (report.structuredTextbooks.distinctRate < 0.98) failures.push('structured-textbook distinct coverage below 98%');
if (report.wholeReader.occurrenceRate < 0.98) failures.push('whole-reader weighted coverage below 98%');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
```

- [ ] **Step 4: Run the real audit without weakening gates**

Run: `npm run audit:russian-dictionary`

Expected: creates `data/dictionary/coverage-report.json` with separate structured/full metrics and classified exclusions.

Run: `npm run verify:russian-dictionary`

Expected: PASS only when function words are 100%, structured distinct coverage is at least 98%, and whole-reader weighted coverage is at least 98%. If it fails, Task 12 remains incomplete; add only sourced formal entries or reviewed morphology mappings, rebuild, and rerun. Do not count provisional results or change thresholds.

- [ ] **Step 5: Commit the audit and passing report**

```powershell
git add scripts/russian-dictionary/audit-coverage.js tests/russian-b2/dictionary-coverage.test.js data/dictionary/coverage-report.json package.json
git commit -m "test: enforce Russian dictionary coverage gates"
```

---

### Task 13: Full Regression and Browser Acceptance

**Files:**

- Create: `docs/superpowers/acceptance/2026-07-17-russian-reader-global-click-dictionary.md`
- Modify only if a verified defect is found: files from Tasks 1–12 and their matching tests.

**Interfaces:**

- Consumes the completed dictionary build and reader.
- Produces evidence-backed acceptance and restores the listening/writing plan as next priority.

- [ ] **Step 1: Run clean automated verification**

Run: `npm run build:russian-dictionary`

Expected: exit 0 with reproducible checksums.

Run: `npm run verify:russian-dictionary && npm run test:russian-b2`

Expected: all dictionary gates and B2 regression tests pass.

- [ ] **Step 2: Start the local server and verify desktop flows**

Run: `$env:PORT=3002; node server.js`

Open: `http://localhost:3002/reader.html`

Verify reading body, grammar prompt/option, knowledge-card example, writing material/model, listening transcript, and speaking reference. Confirm each opens the right panel with correct task context; answer radios still submit; clicking words never submits; lookup never jumps to page top.

- [ ] **Step 3: Verify dictionary coverage and failure states**

Verify `тех` resolves to `тот`; a fixed phrase returns an exact entry; an unknown phrase shows component analysis; a real miss enters the missing queue; explicit online lookup creates a labelled provisional entry; refresh reuses it; formal coverage report remains unchanged by provisional entries.

- [ ] **Step 4: Verify exam and responsive flows**

At 390px width, verify half/full/closed drawer states, scroll preservation, touch selection, close button, and no horizontal overflow. In mock exam mode, confirm lookup is unavailable before unlock; after confirmation it works, writes `lookupAssisted: true`, and the attempt is absent from official trends. Confirm writing drafts, speaking textareas, notes, locked answers, and locked model text never become lookup targets.

- [ ] **Step 5: Record evidence and commit acceptance**

The acceptance document records commands and results, coverage percentages, representative pages, desktop/mobile screenshots, known classified exclusions, and confirmation that listening/writing rebuild is the next active plan.

```powershell
git add docs/superpowers/acceptance/2026-07-17-russian-reader-global-click-dictionary.md
git commit -m "docs: accept global Russian dictionary lookup"
```

---

## Execution Order and Stop Conditions

Execute Tasks 1–13 in order. Do not start listening/writing reconstruction until Task 13 passes. Ordinary test failures are fixed within the current task. Stop for user direction only if a required dictionary source has incompatible licensing, a network provider requires a paid account, or meeting the approved coverage gate requires changing the agreed content scope.
