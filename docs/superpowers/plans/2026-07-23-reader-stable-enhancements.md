# Russian Reader Stable Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely add lemma-aware vocabulary storage, compact offline morphology, contextual cloze review, reading wrong-answer review, and adaptive iPad layouts without changing completed P1-P6 behavior or unfinished textbook content.

**Architecture:** Keep the existing vanilla HTML/CSS/JavaScript and localStorage architecture. Add small UMD helper modules for pure, testable vocabulary, morphology, and reading-review logic; keep `reader.html` and `vocabulary.html` as integration shells. Migrations are versioned, backed up, idempotent, and conservative: uncertain words are never merged.

**Tech Stack:** Vanilla JavaScript (UMD/CommonJS), HTML/CSS, Node.js built-in test runner, localStorage, precomputed `pymorphy3` corpus JSON, Playwright browser verification.

---

## Delivery Rules

- Preserve all unrelated working-tree changes. Before every commit, run `git diff --cached --name-only` and stage only the paths listed in that task.
- Never stage `cloudsync-config.js`, generated personal learning logs, `.obsidian/workspace.json`, or unrelated textbook/OCR data.
- Do not edit unfinished textbook question content, OCR cleanup, stress marks, or P1-P6 two-click confirmation behavior.
- Do not add a browser Python runtime, large model, live AI request, or device sniffing.
- `reader.html` and `tests/russian-b2/reader-static.test.js` already contain user changes. Read the current sections again immediately before each patch and extend them in place.
- Run focused tests after each red/green cycle. Run the full 71+ reader/dictionary/B2 regression set before completion.
- Do not push. All commits remain local until the user confirms.

## File Map

**Create:**

- `js/russian-dictionary/review.js` - canonical vocabulary identity, conservative merge, migration transformation, and context-cloze generation.
- `js/russian-dictionary/morphology-summary.js` - select a trustworthy precomputed analysis and format the compact Chinese summary.
- `js/russian-b2/reading-review.js` - backward-compatible reading attempt history, classification, retry, and review-item derivation.
- `tests/russian-b2/dictionary-review.test.js` - identity, merge, migration-transform, and cloze tests.
- `tests/russian-b2/dictionary-morphology-summary.test.js` - compact morphology confidence and formatting tests.
- `tests/russian-b2/dictionary-morphology-build.test.js` - offline builder output contract for per-analysis features.
- `tests/russian-b2/reading-review.test.js` - reading history, error category, and pending/mastered tests.
- `tests/russian-b2/reader-enhancements-static.test.js` - script order, tablet media-query, UI-state, and integration contracts.

**Modify:**

- `js/russian-dictionary/storage.js` - use canonical identities; add backup, alias, migration, and restore APIs.
- `js/russian-dictionary/core.js` - expose normalized part-of-speech extraction used by storage and morphology.
- `scripts/russian-dictionary/build-corpus-morphology.js` - publish per-analysis lemma/POS/score/grammemes while keeping existing fields.
- `tests/russian-b2/dictionary-storage.test.js` - migration/backup/write-failure/idempotency coverage.
- `reader.html` - load helpers, save canonical words, render morphology, record reading errors, unify wrong-answer book, and add iPad behavior.
- `vocabulary.html` - load the review helper and render eligible saved contexts as reveal-and-rate cloze cards through the current scheduler.
- `tests/russian-b2/reader-static.test.js` - only extend if the new focused static test cannot cover an existing contract; never replace current user changes.
- `data/dictionary/corpus-morphology.json` and `data/dictionary/manifest.json` - regenerated offline data, only after the builder tests pass.

### Task 1: Pure Vocabulary Identity, Merge, and Cloze Rules

**Files:**
- Create: `js/russian-dictionary/review.js`
- Create: `tests/russian-b2/dictionary-review.test.js`

- [ ] **Step 1: Write failing identity and conservative-merge tests**

Create `tests/russian-b2/dictionary-review.test.js` with these initial tests:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../../js/russian-dictionary/review');

test('canonical identity requires reliable lemma and part of speech', () => {
  assert.deepEqual(Review.createIdentity({
    lemma: 'написать',
    reliability: 'morphology-map',
    entry: { partOfSpeech: 'verb' }
  }), { key: 'написать|verb', lemma: 'написать', partOfSpeech: 'verb' });
  assert.equal(Review.createIdentity({
    lemma: 'написать', reliability: 'morphology-guess', entry: { partOfSpeech: 'verb' }
  }), null);
  assert.equal(Review.createIdentity({
    lemma: 'написать', reliability: 'morphology-map', entry: {}
  }), null);
});

test('merge keeps conservative scheduling and deduplicates forms and contexts', () => {
  const merged = Review.mergeRecords({
    mastery: 5, count: 2, interval: 9, nextReview: '2026-08-10T00:00:00.000Z',
    forms: ['написаны'], contexts: [{ surfaceForm: 'написаны', sentenceRu: 'Они написаны автором.' }]
  }, {
    mastery: 1, count: 8, interval: 1, nextReview: '2026-07-24T00:00:00.000Z',
    forms: ['написаны', 'написанного'], contexts: [
      { surfaceForm: 'написаны', sentenceRu: 'Они написаны автором.' },
      { surfaceForm: 'написанного', sentenceRu: 'Текст написанного письма сохранён.' }
    ]
  });
  assert.equal(merged.mastery, 1);
  assert.equal(merged.count, 8);
  assert.equal(merged.interval, 1);
  assert.equal(merged.nextReview, '2026-07-24T00:00:00.000Z');
  assert.deepEqual(merged.forms, ['написаны', 'написанного']);
  assert.equal(merged.contexts.length, 2);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `node --test tests/russian-b2/dictionary-review.test.js`

Expected: FAIL with `Cannot find module '../../js/russian-dictionary/review'`.

- [ ] **Step 3: Implement canonical identity and conservative merge**

Create `js/russian-dictionary/review.js` as a UMD module. Its public API must be exactly:

```js
{
  RELIABLE_RESULTS,
  normalizePartOfSpeech,
  createIdentity,
  mergeRecords,
  transformRecords,
  createContextCloze
}
```

Use these rules in the implementation:

```js
const RELIABLE_RESULTS = new Set([
  'reviewed-function-form',
  'morphology-map',
  'dictionary-exact',
  'personally-reviewed'
]);

const POS_ALIASES = {
  verb: 'verb', v: 'verb', infn: 'verb', prtf: 'verb', prts: 'verb', grnd: 'verb', '动词': 'verb', 'гл': 'verb',
  noun: 'noun', n: 'noun', '名词': 'noun', 'сущ': 'noun',
  adj: 'adjective', adjective: 'adjective', adjf: 'adjective', adjs: 'adjective', comp: 'adjective', '形容词': 'adjective', 'прил': 'adjective',
  adv: 'adverb', adverb: 'adverb', advb: 'adverb', '副词': 'adverb', 'нар': 'adverb',
  pronoun: 'pronoun', npro: 'pronoun', '代词': 'pronoun', 'мест': 'pronoun',
  numeral: 'numeral', numr: 'numeral',
  preposition: 'preposition', prep: 'preposition',
  conjunction: 'conjunction', conj: 'conjunction',
  particle: 'particle', prcl: 'particle',
  interjection: 'interjection', intj: 'interjection',
  predicative: 'predicative', pred: 'predicative'
};

function normalizePartOfSpeech(value) {
  const raw = String(value || '').trim().toLowerCase();
  return POS_ALIASES[raw] || '';
}

function createIdentity(resolution, normalizeRussian) {
  const normalizer = normalizeRussian || (value => String(value || '').trim().toLowerCase());
  if (!resolution || !RELIABLE_RESULTS.has(resolution.reliability)) return null;
  const lemma = normalizer(resolution.lemma);
  const entry = resolution.entry || {};
  const partOfSpeech = normalizePartOfSpeech(
    resolution.partOfSpeech || entry.partOfSpeech || entry.pos || entry.type
  );
  return lemma && partOfSpeech ? { key: `${lemma}|${partOfSpeech}`, lemma, partOfSpeech } : null;
}
```

`mergeRecords(left, right)` must preserve unknown fields using object spread, then explicitly set:

- `mastery` to the lower defined value;
- `count` to the higher value;
- `interval` to the lower positive defined value;
- `nextReview` to the earlier valid date string;
- `createdAt` to the earlier valid date string;
- `updatedAt` to the later valid date string;
- `forms` to stable unique non-empty strings;
- `contexts` and legacy `sources` to one normalized `contexts` array, deduplicated by `surfaceForm + sentenceRu + bookId + moduleId + taskId`.

Do not let an absent field act like zero. A legacy record containing only `{ mastery: 3, interval: 9 }` must keep both values when merged with metadata that does not contain scheduling fields.

- [ ] **Step 4: Add failing context-cloze and migration-transform tests**

Append:

```js
test('context cloze masks one exact encountered form and retains the lemma hint', () => {
  const card = Review.createContextCloze({
    lemma: 'написать', partOfSpeech: 'verb', forms: ['написаны'],
    contexts: [{ surfaceForm: 'написаны', sentenceRu: 'Эти произведения написаны известным художником.' }]
  });
  assert.deepEqual(card, {
    prompt: 'Эти произведения ______ известным художником.',
    answer: 'написаны',
    lemma: 'написать',
    contextIndex: 0
  });
});

test('context cloze rejects repeated, missing, trivial, and excessively long forms', () => {
  assert.equal(Review.createContextCloze({ lemma: 'и', contexts: [{ surfaceForm: 'и', sentenceRu: 'Он и она.' }] }), null);
  assert.equal(Review.createContextCloze({ lemma: 'слово', contexts: [{ surfaceForm: 'слово', sentenceRu: 'слово и слово' }] }), null);
  assert.equal(Review.createContextCloze({ lemma: 'слово', contexts: [{ surfaceForm: 'слово', sentenceRu: 'Другой текст.' }] }), null);
  assert.equal(Review.createContextCloze({ lemma: 'слово', contexts: [{ surfaceForm: 'слово', sentenceRu: `${'Очень '.repeat(45)}слово.` }] }), null);
});

test('record transform merges only reliable identities and leaves uncertain keys untouched', () => {
  const result = Review.transformRecords({
    написаны: { word: 'написаны', mastery: 3 },
    спорная: { word: 'спорная', mastery: 2 }
  }, (key) => key === 'написаны'
    ? { lemma: 'написать', reliability: 'morphology-map', entry: { partOfSpeech: 'verb' } }
    : { lemma: 'спорный', reliability: 'morphology-guess', entry: { partOfSpeech: 'adjective' } });
  assert.ok(result.records['написать|verb']);
  assert.ok(result.records.спорная);
  assert.equal(result.records['спорный|adjective'], undefined);
  assert.equal(result.aliases.написаны, 'написать|verb');
});
```

- [ ] **Step 5: Implement `transformRecords` and `createContextCloze`**

`transformRecords(records, resolver, normalizeRussian)` must return `{ records, aliases, changed }`, call `createIdentity` for every old record, merge reliable identities with `mergeRecords`, and preserve the old key unchanged when identity is null. Add the old display word and encountered form to `forms` when canonicalizing.

`createContextCloze(record)` must:

1. Read normalized `record.contexts` plus legacy `record.sources`.
2. Reject lemmas in `['и','а','но','в','во','на','не','ни','к','ко','с','со','у','о','об','от','до','за','по','из']`.
3. Accept a sentence from 8 through 240 characters.
4. Require the exact `surfaceForm` to occur once as a Russian token boundary using escaped RegExp text.
5. Replace only that occurrence with `______`.
6. Return the first eligible context, or `null`.

- [ ] **Step 6: Run the focused tests**

Run: `node --test tests/russian-b2/dictionary-review.test.js`

Expected: all tests PASS.

- [ ] **Step 7: Commit the pure review rules**

```powershell
git add -- js/russian-dictionary/review.js tests/russian-b2/dictionary-review.test.js
git diff --cached --name-only
git commit -m "feat: add safe vocabulary review rules"
```

Expected staged paths: exactly the two files above.

### Task 2: Versioned Vocabulary Migration and Backup

**Files:**
- Modify: `js/russian-dictionary/storage.js`
- Modify: `tests/russian-b2/dictionary-storage.test.js`

- [ ] **Step 1: Add failing storage migration tests**

Append tests using a storage double that can throw on demand:

```js
function createThrowingStorage(entries = []) {
  const values = new Map(entries);
  let failKey = '';
  return {
    getItem: key => values.get(key) || null,
    setItem(key, value) {
      if (key === failKey) throw new Error('quota');
      values.set(key, value);
    },
    removeItem: key => values.delete(key),
    failOn: key => { failKey = key; },
    values
  };
}

test('migration backs up once, aliases reliable words, and is idempotent', () => {
  const storage = createThrowingStorage([[
    'vocabulary-review-records',
    JSON.stringify({ написаны: { word: 'написаны', mastery: 2, count: 4 } })
  ]]);
  const db = createDictionaryStorage({ storage, now: () => NOW });
  const resolver = () => ({
    lemma: 'написать', reliability: 'morphology-map', entry: { partOfSpeech: 'verb' }
  });
  const first = db.migrateSavedWords({ resolver });
  const second = db.migrateSavedWords({ resolver });
  assert.equal(first.status, 'migrated');
  assert.equal(second.status, 'already-migrated');
  assert.equal(JSON.parse(storage.values.get('rr_vocabulary_aliases_v2')).написаны, 'написать|verb');
  assert.equal(JSON.parse(storage.values.get('vocabulary-review-records'))['написать|verb'].mastery, 2);
  assert.equal([...storage.values.keys()].filter(key => key.startsWith('rr_vocabulary_backup_v2_')).length, 1);
});

test('migration write failure leaves active records and version unchanged', () => {
  const original = JSON.stringify({ написаны: { mastery: 2 } });
  const storage = createThrowingStorage([['vocabulary-review-records', original]]);
  storage.failOn('vocabulary-review-records');
  const db = createDictionaryStorage({ storage, now: () => NOW });
  const result = db.migrateSavedWords({ resolver: () => ({
    lemma: 'написать', reliability: 'morphology-map', entry: { partOfSpeech: 'verb' }
  }) });
  assert.equal(result.status, 'failed');
  assert.equal(storage.values.get('vocabulary-review-records'), original);
  assert.equal(storage.values.has('rr_vocabulary_migration_v2'), false);
});

test('restore replaces active records from the recorded migration backup', () => {
  const storage = createThrowingStorage([['vocabulary-review-records', JSON.stringify({ старое: { mastery: 1 } })]]);
  const db = createDictionaryStorage({ storage, now: () => NOW });
  db.migrateSavedWords({ resolver: () => ({ lemma: 'старый', reliability: 'dictionary-exact', entry: { partOfSpeech: 'adjective' } }) });
  const restored = db.restoreVocabularyBackup();
  assert.equal(restored.status, 'restored');
  assert.ok(JSON.parse(storage.values.get('vocabulary-review-records')).старое);
});
```

- [ ] **Step 2: Run the tests and verify missing methods**

Run: `node --test tests/russian-b2/dictionary-storage.test.js`

Expected: FAIL because `migrateSavedWords` and `restoreVocabularyBackup` do not exist.

- [ ] **Step 3: Extend storage without breaking old calls**

Change the UMD dependency header so Node requires `./review` and the browser receives `root.RussianDictionaryReview`. Add constants:

```js
const SAVED_KEY = 'vocabulary-review-records';
const ALIASES_KEY = 'rr_vocabulary_aliases_v2';
const MIGRATION_KEY = 'rr_vocabulary_migration_v2';
const BACKUP_PREFIX = 'rr_vocabulary_backup_v2_';
const MIGRATION_VERSION = 2;
```

Add these methods to the returned storage API:

```js
function migrateSavedWords({ resolver } = {}) {
  if (readObject(MIGRATION_KEY).version === MIGRATION_VERSION) return { status: 'already-migrated' };
  const raw = getRaw(SAVED_KEY);
  if (!raw) {
    writeObject(MIGRATION_KEY, { version: MIGRATION_VERSION, migratedAt: now(), backupKey: '' });
    return { status: 'empty' };
  }
  let source;
  try { source = JSON.parse(raw); } catch (error) { return { status: 'invalid-source', error }; }
  const backupKey = `${BACKUP_PREFIX}${now().replace(/[:.]/g, '-')}`;
  try {
    setRaw(backupKey, raw);
    const transformed = Review.transformRecords(source, resolver, Core.normalizeRussian);
    setRaw(SAVED_KEY, JSON.stringify(transformed.records));
    setRaw(ALIASES_KEY, JSON.stringify(transformed.aliases));
    setRaw(MIGRATION_KEY, JSON.stringify({ version: MIGRATION_VERSION, migratedAt: now(), backupKey }));
    return { status: 'migrated', ...transformed, backupKey };
  } catch (error) {
    try { setRaw(SAVED_KEY, raw); } catch (_restoreError) {}
    return { status: 'failed', error, backupKey };
  }
}

function restoreVocabularyBackup() {
  const metadata = readObject(MIGRATION_KEY);
  const raw = metadata.backupKey ? getRaw(metadata.backupKey) : '';
  if (!raw) return { status: 'missing-backup' };
  try {
    JSON.parse(raw);
    setRaw(SAVED_KEY, raw);
    removeRaw(ALIASES_KEY);
    removeRaw(MIGRATION_KEY);
    return { status: 'restored', backupKey: metadata.backupKey };
  } catch (error) {
    return { status: 'failed', error };
  }
}
```

Update `mergeSavedWord(input)` to use `input.identity.key` only when supplied; otherwise preserve its current normalized lemma/form key. This keeps existing callers working until Task 3 wires reliable identities. Store `contexts` as the new field while also reading legacy `sources`. Use `Review.mergeRecords` when the canonical key already exists.

Return `keys` containing `saved`, `aliases`, `migration`, `backupPrefix`, `missing`, and `provisional`.

- [ ] **Step 4: Run storage and review tests**

Run: `node --test tests/russian-b2/dictionary-review.test.js tests/russian-b2/dictionary-storage.test.js`

Expected: all tests PASS, including the three pre-existing storage tests.

- [ ] **Step 5: Commit migration support**

```powershell
git add -- js/russian-dictionary/storage.js tests/russian-b2/dictionary-storage.test.js
git diff --cached --name-only
git commit -m "feat: migrate vocabulary records safely"
```

### Task 3: Precomputed Compact Morphology and Canonical Reader Saves

**Files:**
- Create: `js/russian-dictionary/morphology-summary.js`
- Create: `tests/russian-b2/dictionary-morphology-summary.test.js`
- Modify: `js/russian-dictionary/core.js`
- Modify: `scripts/russian-dictionary/build-corpus-morphology.js`
- Modify: `reader.html`
- Modify after tests pass: `data/dictionary/corpus-morphology.json`
- Modify after tests pass: `data/dictionary/manifest.json`
- Create: `tests/russian-b2/reader-enhancements-static.test.js`
- Create: `tests/russian-b2/dictionary-morphology-build.test.js`

- [ ] **Step 1: Write failing morphology summary tests**

Create `tests/russian-b2/dictionary-morphology-summary.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Morphology = require('../../js/russian-dictionary/morphology-summary');

test('formats a confident short passive participle analysis', () => {
  const summary = Morphology.createSummary({
    form: 'написаны', lemma: 'написать', reliability: 'morphology-map',
    entry: { partOfSpeech: 'verb', aspect: 'perfective' }
  }, {
    analyses: [
      { lemma: 'написать', pos: 'PRTS', score: 0.91, grammemes: ['PRTS','perf','past','pssv','plur'] },
      { lemma: 'написать', pos: 'PRTF', score: 0.09, grammemes: ['PRTF','perf','past','pssv','plur'] }
    ]
  });
  assert.deepEqual(summary, {
    form: 'написаны', lemma: 'написать', partOfSpeech: '动词',
    features: ['完成体','过去时','短尾被动形动词','复数'], confidence: 'reliable'
  });
});

test('does not present ambiguous or guessed analyses as facts', () => {
  const ambiguous = { analyses: [
    { lemma: 'замок', pos: 'NOUN', score: 0.51, grammemes: ['NOUN'] },
    { lemma: 'замок', pos: 'NOUN', score: 0.49, grammemes: ['NOUN'] }
  ] };
  assert.equal(Morphology.createSummary({ lemma: 'замок', reliability: 'morphology-map', entry: { partOfSpeech: 'noun' } }, ambiguous), null);
  assert.equal(Morphology.createSummary({ lemma: 'писать', reliability: 'morphology-guess', entry: { partOfSpeech: 'verb' } }, ambiguous), null);
});
```

- [ ] **Step 2: Run and confirm missing-module failure**

Run: `node --test tests/russian-b2/dictionary-morphology-summary.test.js`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement morphology selection and labels**

Create a UMD module exporting `{ createSummary, formatSummary, labelsForGrammemes }`.

`createSummary(resolution, morphologyItem)` must return `null` unless:

- reliability is `reviewed-function-form`, `morphology-map`, `dictionary-exact`, or `personally-reviewed`;
- `analyses` exists;
- the highest-scoring analysis matches the resolved lemma;
- top score is at least `0.55`;
- score gap to the second matching analysis is at least `0.15`, unless only one matching analysis exists.

Use this ordered grammeme map so compact output is stable:

```js
const FEATURE_LABELS = [
  ['perf', '完成体'], ['impf', '未完成体'],
  ['pres', '现在时'], ['past', '过去时'], ['futr', '将来时'],
  ['1per', '第一人称'], ['2per', '第二人称'], ['3per', '第三人称'],
  ['sing', '单数'], ['plur', '复数'],
  ['masc', '阳性'], ['femn', '阴性'], ['neut', '中性'],
  ['nomn', '第一格'], ['gent', '第二格'], ['datv', '第三格'],
  ['accs', '第四格'], ['ablt', '第五格'], ['loct', '第六格'],
  ['actv', '主动'], ['pssv', '被动'],
  ['PRTS', '短尾被动形动词'], ['PRTF', '长尾形动词'], ['GRND', '副动词']
];
```

Avoid duplicate generic labels when a specific participle label exists. `formatSummary(summary)` returns one escaped-display-ready model, not HTML:

```js
{
  heading: `${summary.form} → ${summary.lemma}`,
  detail: [summary.partOfSpeech, ...summary.features].join(' · ')
}
```

- [ ] **Step 4: Write the failing offline-builder contract and extend its output**

Create `tests/russian-b2/dictionary-morphology-build.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { PYTHON_ANALYZER } = require('../../scripts/russian-dictionary/build-corpus-morphology');

test('offline morphology analyzer publishes ranked per-parse features', () => {
  assert.match(PYTHON_ANALYZER, /'analyses'/);
  assert.match(PYTHON_ANALYZER, /'lemma'/);
  assert.match(PYTHON_ANALYZER, /'pos'/);
  assert.match(PYTHON_ANALYZER, /'score'/);
  assert.match(PYTHON_ANALYZER, /'grammemes'/);
});
```

Run: `node --test tests/russian-b2/dictionary-morphology-build.test.js`

Expected: FAIL because `PYTHON_ANALYZER` is not exported and does not contain `analyses`.

Change `PYTHON_ANALYZER` so each form retains the existing `lemmas`, `tags`, and `classification` fields and adds:

```python
'analyses': [
    {
        'lemma': parsed.normal_form.replace('ё', 'е'),
        'pos': str(parsed.tag.POS or ''),
        'score': round(float(parsed.score), 6),
        'grammemes': sorted(str(item) for item in parsed.tag.grammemes)
    }
    for parsed in parses
]
```

This is build-time only. Do not add Python or `pymorphy3` to browser code.

Export `PYTHON_ANALYZER` with the existing builder exports so the contract remains inspectable without requiring Python during the JavaScript test run.

- [ ] **Step 5: Add failing static integration contracts**

Create `tests/russian-b2/reader-enhancements-static.test.js` with:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const reader = fs.readFileSync('reader.html', 'utf8');

test('reader loads vocabulary review before storage and morphology summary before app code', () => {
  const review = reader.indexOf('js/russian-dictionary/review.js');
  const storage = reader.indexOf('js/russian-dictionary/storage.js');
  const morphology = reader.indexOf('js/russian-dictionary/morphology-summary.js');
  assert.ok(review >= 0 && storage > review && morphology > storage);
});

test('reader renders compact morphology and migrates only after local dictionaries load', () => {
  assert.match(reader, /RussianDictionaryMorphology\.createSummary/);
  assert.match(reader, /dictionaryStorage\.migrateSavedWords/);
  assert.match(reader, /createIdentity/);
});
```

Run: `node --test tests/russian-b2/reader-enhancements-static.test.js`

Expected: FAIL because the scripts and calls are absent.

- [ ] **Step 6: Wire scripts, lookup result, compact UI, and save identity in `reader.html`**

Add script tags in this order:

```html
<script src="js/russian-dictionary/core.js?v=20260723-1"></script>
<script src="js/russian-dictionary/review.js?v=20260723-1"></script>
<script src="js/russian-dictionary/storage.js?v=20260723-1"></script>
<script src="js/russian-dictionary/morphology-summary.js?v=20260723-1"></script>
<script src="js/russian-dictionary/runtime.js?v=20260723-1"></script>
```

Keep the full latest resolution in a new `currentDictionaryResolution` variable. In `resolveDictionaryLookup`, retain the existing return fields and include the raw morphology item. In `renderDetailPanel`, render this block directly below the head only when `createSummary` returns a result:

```js
var compact = RussianDictionaryMorphology.createSummary(currentDictionaryResolution, currentDictionaryResolution.morphologyItem);
var compactHtml = '';
if (compact) {
  var formatted = RussianDictionaryMorphology.formatSummary(compact);
  compactHtml = '<section class="dict-morph-compact" aria-label="词态速览">' +
    '<strong>' + escapeHtml(formatted.heading) + '</strong>' +
    '<span>' + escapeHtml(formatted.detail) + '</span>' +
  '</section>';
}
```

Add compact CSS with no animation and no nested decorative card:

```css
.dict-morph-compact { margin: 10px 0 14px; padding: 10px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.dict-morph-compact strong, .dict-morph-compact span { display: block; overflow-wrap: anywhere; }
.dict-morph-compact strong { color: var(--text); font-size: 16px; }
.dict-morph-compact span { margin-top: 4px; color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
```

Replace the direct localStorage write in `doSaveWord()` with:

```js
var identity = RussianDictionaryReview.createIdentity(currentDictionaryResolution, RussianDictionaryCore.normalizeRussian);
var saveContext = dictionaryController.getCurrent && dictionaryController.getCurrent();
saveContext = saveContext && saveContext.context || {};
var saved = dictionaryStorage.mergeSavedWord({
  form: clean,
  lemma: identity ? identity.lemma : clean,
  identity: identity,
  meaning: meaning.trim(),
  partOfSpeech: identity ? identity.partOfSpeech : '',
  reliability: currentDictionaryResolution && currentDictionaryResolution.reliability || '',
  context: Object.assign({}, saveContext, {
    surfaceForm: clean,
    sentenceRu: saveContext.sentenceRu || selContext || '',
    sentenceZh: saveContext.sentenceZh || selTranslationContext || ''
  })
});
```

Use the returned canonical key for duplicate checks and `savedWords`; keep the clicked form for display. After `loadLocalLookupData()` resolves, call `migrateSavedWords` with a resolver that uses the same `resolveDictionaryLookup(form, {}, false)` path. Do not migrate before dictionary data is ready.

Extend `Core.normalizeContext` with `surfaceForm: String(value.surfaceForm || '')`; otherwise the encountered form would be dropped before storage deduplication. Add a core test asserting `normalizeContext({ surfaceForm: 'написаны' }).surfaceForm === 'написаны'`.

- [ ] **Step 7: Run focused tests before regenerating data**

Run:

```powershell
node --test tests/russian-b2/dictionary-review.test.js tests/russian-b2/dictionary-storage.test.js tests/russian-b2/dictionary-morphology-summary.test.js tests/russian-b2/dictionary-morphology-build.test.js tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/dictionary-core.test.js
```

Expected: all tests PASS.

- [ ] **Step 8: Regenerate and verify offline morphology data**

Run: `node scripts/russian-dictionary/build-corpus-morphology.js`

Expected: `Built corpus morphology for <positive number> forms.`

Then run:

```powershell
node -e "const d=require('./data/dictionary/corpus-morphology.json'); const x=Object.values(d).find(v=>Array.isArray(v.analyses)&&v.analyses.length); if(!x) process.exit(1); console.log(x.analyses[0])"
```

Expected: one object containing `lemma`, `pos`, `score`, and `grammemes`.

- [ ] **Step 9: Commit morphology and reader save wiring**

```powershell
git add -- js/russian-dictionary/core.js js/russian-dictionary/morphology-summary.js scripts/russian-dictionary/build-corpus-morphology.js tests/russian-b2/dictionary-morphology-summary.test.js tests/russian-b2/dictionary-morphology-build.test.js tests/russian-b2/reader-enhancements-static.test.js reader.html data/dictionary/corpus-morphology.json data/dictionary/manifest.json
git diff --cached --name-only
git commit -m "feat: add compact offline morphology"
```

Before committing, inspect `git diff --cached -- reader.html` and confirm no P1-P6 confirmation functions or textbook content changed.

### Task 4: Context Cloze in the Existing Vocabulary Scheduler

**Files:**
- Modify: `vocabulary.html`
- Modify: `tests/russian-b2/reader-enhancements-static.test.js`

- [ ] **Step 1: Add failing vocabulary integration contracts**

Append:

```js
const vocabulary = fs.readFileSync('vocabulary.html', 'utf8');

test('vocabulary review loads the shared review helper and keeps the existing rating path', () => {
  assert.match(vocabulary, /js\/russian-dictionary\/review\.js/);
  assert.match(vocabulary, /RussianDictionaryReview\.createContextCloze/);
  assert.match(vocabulary, /saveRecord\(w\.id, score\)/);
  assert.match(vocabulary, /不认识/);
  assert.match(vocabulary, /模糊/);
  assert.match(vocabulary, /认识/);
  assert.equal((vocabulary.match(/function rateBrush\(score\)/g) || []).length, 1);
  assert.match(vocabulary, /else if \(score < 5\)/);
});
```

Run: `node --test tests/russian-b2/reader-enhancements-static.test.js`

Expected: FAIL because `vocabulary.html` does not load or call the helper.

- [ ] **Step 2: Load saved canonical records without replacing the vocabulary database**

Add `<script src="js/russian-dictionary/review.js?v=20260723-1"></script>` before the inline application script.

When assembling `allWords`, merge localStorage review records into existing words by record key and aliases. For a canonical record absent from the static vocabulary list, create this minimal compatible card model:

```js
function savedRecordToWord(id, record) {
  return {
    id: id,
    word: record.lemma || record.word || (record.forms && record.forms[0]) || id.split('|')[0],
    meaning: record.meaning || '',
    type: record.partOfSpeech || 'saved',
    source: 'reader',
    forms: record.forms || [],
    contexts: record.contexts || record.sources || []
  };
}
```

Do not rewrite static `data/vocabulary.json`, word audio IDs, favorites, skips, or server sync payloads.

- [ ] **Step 3: Render eligible cloze prompts but keep reveal-and-rate behavior**

Inside `renderBrushCard`, after loading `rec`, derive:

```js
var cloze = window.RussianDictionaryReview
  ? RussianDictionaryReview.createContextCloze(Object.assign({}, rec || {}, w))
  : null;
```

When `cloze` exists, replace only the card-front content with:

```js
var frontContent = '<div class="context-cloze">' +
  '<p class="context-cloze-sentence">' + esc(cloze.prompt) + '</p>' +
  '<p class="context-cloze-hint">原形：' + esc(cloze.lemma) + '</p>' +
  '<p class="card-hint">先在心里回答，再显示答案</p>' +
'</div>';
```

On the back, put `cloze.answer` above the existing meaning. After reveal, render the existing three rating buttons with `rate(1)`, `rate(3)`, and `rate(5)`. They continue through `rateBrush(score)` and its existing `saveRecord(w.id, score)` SM-2 call; no input field and no Russian keyboard are added.

`vocabulary.html` currently contains two declarations named `rateBrush(score)`, and the later declaration overrides the earlier three-way queue behavior. Remove the later duplicate and retain the earlier implementation that handles `< 3` as unknown, `< 5` as fuzzy, and `5` as known. Do not change the delays, retry queue, undo snapshot, sync call, or `saveRecord` algorithm.

Add CSS:

```css
.context-cloze { width: 100%; max-width: 680px; text-align: left; }
.context-cloze-sentence { margin: 0; color: var(--text); font-family: Georgia, 'Noto Serif', serif; font-size: 24px; line-height: 1.55; overflow-wrap: anywhere; }
.context-cloze-hint { margin: 14px 0 0; color: var(--text-secondary); font-size: 15px; }
@media (max-width: 600px) { .context-cloze-sentence { font-size: 20px; } }
```

- [ ] **Step 4: Run focused and existing vocabulary static tests**

Run:

```powershell
node --test tests/russian-b2/dictionary-review.test.js tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/reader-static.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit cloze integration**

```powershell
git add -- vocabulary.html tests/russian-b2/reader-enhancements-static.test.js
git diff --cached --name-only
git commit -m "feat: add contextual vocabulary cloze review"
```

### Task 5: Backward-Compatible Reading Review Records

**Files:**
- Create: `js/russian-b2/reading-review.js`
- Create: `tests/russian-b2/reading-review.test.js`

- [ ] **Step 1: Write failing reading-review tests**

Create:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../../js/russian-b2/reading-review');

const question = {
  id: 'reading-q001', unitId: 'reading-text-01', answer: 'Б',
  options: [{ label: 'А', text: 'wrong', distractorTag: 'logic' }, { label: 'Б', text: 'right' }],
  answerSource: { pdfPage: 93 }
};

test('wrong answer uses reviewed distractor tag and enters pending review', () => {
  const record = Review.recordAttempt({}, question, 'А', '2026-07-23T10:00:00.000Z');
  assert.equal(record.errorCategory, 'logic');
  assert.equal(record.everWrong, true);
  assert.equal(record.reviewStatus, 'pending');
  assert.equal(record.attempts, 1);
  assert.equal(record.history.length, 1);
  assert.equal(record.needsClassification, false);
});

test('untagged wrong answer requests optional classification and accepts skip', () => {
  const untagged = { ...question, options: [{ label: 'А', text: 'wrong' }, { label: 'Б', text: 'right' }] };
  const record = Review.recordAttempt({}, untagged, 'А', '2026-07-23T10:00:00.000Z');
  assert.equal(record.needsClassification, true);
  const skipped = Review.setErrorCategory(record, '');
  assert.equal(skipped.errorCategory, '');
  assert.equal(skipped.needsClassification, false);
});

test('correct retry masters but keeps ever-wrong history; later wrong returns to pending', () => {
  const wrong = Review.recordAttempt({}, question, 'А', '2026-07-23T10:00:00.000Z');
  const retry = Review.prepareRetry(wrong);
  assert.equal(retry.answered, false);
  assert.equal(retry.selected, '');
  const correct = Review.recordAttempt(retry, question, 'Б', '2026-07-24T10:00:00.000Z');
  assert.equal(correct.reviewStatus, 'mastered');
  assert.equal(correct.everWrong, true);
  assert.equal(correct.history.length, 2);
  const wrongAgain = Review.recordAttempt(Review.prepareRetry(correct), question, 'А', '2026-07-25T10:00:00.000Z');
  assert.equal(wrongAgain.reviewStatus, 'pending');
  assert.equal(wrongAgain.history.length, 3);
});

test('legacy selected/answered/answerOpen records remain readable', () => {
  const record = Review.normalizeRecord({ selected: 'А', answered: true, answerOpen: true });
  assert.equal(record.selected, 'А');
  assert.equal(record.answered, true);
  assert.equal(record.answerOpen, true);
  assert.deepEqual(record.history, []);
});
```

- [ ] **Step 2: Run and verify missing module**

Run: `node --test tests/russian-b2/reading-review.test.js`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement the pure reading-review module**

Create a UMD module exporting exactly:

```js
{
  CATEGORY_LABELS,
  normalizeRecord,
  recordAttempt,
  setErrorCategory,
  prepareRetry,
  getReviewItems
}
```

Use stable category values and labels:

```js
const CATEGORY_LABELS = {
  location: '没找到原文',
  vocabulary: '词义不懂',
  logic: '逻辑判断错',
  uncertain: '不确定'
};
```

`recordAttempt` must preserve legacy fields, append `{ selected, correct, result, answeredAt }` to history, increment attempts, set `lastResult`, `lastAnsweredAt`, `everWrong`, and `reviewStatus`, and copy `questionId`, `unitId`, `moduleId: 'reading'`, `correctAnswer`, and source page metadata. Only use an option's `distractorTag` when it is one of the category keys.

`getReviewItems(progress)` returns only `everWrong` records, marks status from `reviewStatus`, and sorts newest first. `prepareRetry` clears only selected/answered/answerOpen/needsClassification; it must retain history and classification.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/russian-b2/reading-review.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit reading-review logic**

```powershell
git add -- js/russian-b2/reading-review.js tests/russian-b2/reading-review.test.js
git diff --cached --name-only
git commit -m "feat: model reading wrong-answer review"
```

### Task 6: Unified Reading and Grammar Wrong-Answer UI

**Files:**
- Modify: `reader.html`
- Modify: `tests/russian-b2/reader-enhancements-static.test.js`

- [ ] **Step 1: Add failing integration contracts**

Append:

```js
test('reader integrates reading attempts with the unified wrong-answer book', () => {
  assert.match(reader, /js\/russian-b2\/reading-review\.js/);
  assert.match(reader, /RussianB2ReadingReview\.recordAttempt/);
  assert.match(reader, /setReadingErrorCategory/);
  assert.match(reader, /prepareReadingRetry/);
  assert.match(reader, /moduleId === 'reading'/);
  assert.match(reader, /阅读 ·/);
});
```

Run: `node --test tests/russian-b2/reader-enhancements-static.test.js`

Expected: FAIL because the helper and UI hooks are absent.

- [ ] **Step 2: Load helper and normalize all reading records**

Add `<script src="js/russian-b2/reading-review.js?v=20260723-1"></script>` before `dashboard.js`.

Change `getReadingRecord(questionId)` to always call `normalizeRecord`. Change `answerReadingQuestion` to find the question in `currentReadingData.questions` and call:

```js
record = RussianB2ReadingReview.recordAttempt(record, Object.assign({}, question, {
  unitId: currentReadingData.id,
  moduleId: 'reading'
}), selected, new Date().toISOString());
```

Do not modify listening or exam records.

- [ ] **Step 3: Add skippable one-tap classification**

Render this only when a wrong record has `needsClassification === true`:

```js
function renderReadingErrorCategory(questionId, record) {
  if (!record.needsClassification) return '';
  var labels = RussianB2ReadingReview.CATEGORY_LABELS;
  var buttons = Object.keys(labels).map(function(key) {
    return '<button type="button" onclick="setReadingErrorCategory(\'' + escapeHtml(questionId) + '\',\'' + key + '\')">' + escapeHtml(labels[key]) + '</button>';
  }).join('');
  return '<div class="reading-error-reason" role="group" aria-label="这题主要错在哪里">' +
    '<span>这题主要错在哪里？</span>' + buttons +
    '<button type="button" onclick="setReadingErrorCategory(\'' + escapeHtml(questionId) + '\',\'\')">跳过</button>' +
  '</div>';
}
```

`setReadingErrorCategory` updates only that record using the helper, saves, and rerenders at the current scroll position. Submission and answer viewing never wait for classification.

- [ ] **Step 4: Merge reading items into the existing wrong-answer book**

Keep grammar items unchanged. Extend `getWrongAnswerItems()` with:

```js
RussianB2ReadingReview.getReviewItems(getReadingProgress()).forEach(function(item) {
  items.push(Object.assign({ moduleId: 'reading', partId: 'reading' }, item));
});
```

When `wrongAnswerBookMeta` is first built, also fetch `data/textbook/russian_b2/modules/reading/index.json` and each `chNNNN.json`. Add metadata keyed by question ID with `{ title, unitId, chapter, moduleId: 'reading' }`.

Render a visible module label for every row:

- grammar: `语法 · P1` through `语法 · P6`;
- reading: `阅读 · 文章 N`.

Keep pending items before mastered items and newest first inside each group. Add `全部 / 语法 / 阅读` module filtering without removing the current part and knowledge-point filters.

- [ ] **Step 5: Reopen reading questions unanswered and preserve history**

Add:

```js
function prepareReadingRetry(questionId) {
  var progress = getReadingProgress();
  progress[questionId] = RussianB2ReadingReview.prepareRetry(progress[questionId]);
  saveReadingProgress(progress);
}

function openReadingWrongAnswerItem(chapter, questionId) {
  prepareReadingRetry(questionId);
  _wrongAnswerQuizReturn = { back: _wrongAnswerBookReturn };
  pendingQuizJumpId = questionId;
  var module = (b2BookManifest.modules || []).find(function(item) { return item.id === 'reading'; });
  var rootBook = getBookById('russian_b2');
  if (!module || !rootBook) return;
  curBook = Object.assign({}, rootBook, module, {
    id: 'russian_b2', moduleId: 'reading', isB2Module: true,
    kind: 'textbook', direction: 'ru→cn'
  });
  fetchJson('data/textbook/' + module.dir + '/index.json', null).then(function(index) {
    curBook.chapters = index.chapters || module.chapters || 0;
    curBook.chapterTitles = index.chapterTitles || module.chapterTitles || [];
    goChapter(chapter, { activeQuestionId: questionId });
  }).catch(function() { toast('阅读错题加载失败'); });
}
```

During `renderReadingPracticeChapter`, use the existing pending jump mechanism to scroll to the question after render. The prior choice must not appear before retry submission. A correct retry becomes mastered but keeps `everWrong`; a later wrong retry becomes pending.

- [ ] **Step 6: Run focused and existing reader tests**

Run:

```powershell
node --test tests/russian-b2/reading-review.test.js tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/reader-static.test.js tests/russian-b2/reading.test.js
```

Expected: all tests PASS. Existing P1-P6 wrong-answer and two-click tests must remain green.

- [ ] **Step 7: Commit unified review UI**

```powershell
git add -- reader.html tests/russian-b2/reader-enhancements-static.test.js
git diff --cached --name-only
git commit -m "feat: include reading errors in review"
```

### Task 7: Adaptive iPad 11 Reader and Dictionary Layout

**Files:**
- Modify: `reader.html`
- Modify: `js/russian-dictionary/runtime.js`
- Modify: `tests/russian-b2/reader-enhancements-static.test.js`
- Modify: `tests/russian-b2/dictionary-runtime.test.js`

- [ ] **Step 1: Add failing static tablet contracts**

Append:

```js
test('reader has explicit iPad portrait sheet and landscape split contracts', () => {
  assert.match(reader, /min-width:\s*761px[^}]*max-width:\s*1024px[^}]*orientation:\s*portrait/s);
  assert.match(reader, /min-width:\s*900px[^}]*max-width:\s*1366px[^}]*orientation:\s*landscape/s);
  assert.match(reader, /rr_split_tablet_landscape/);
  assert.match(reader, /data-tablet-layout/);
});
```

Add a runtime test asserting that changing layout state does not clear `controller.getCurrent()` or panel state. Use the existing fake root from `dictionary-runtime.test.js`; do not replace its current tests.

Run:

```powershell
node --test tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/dictionary-runtime.test.js
```

Expected: FAIL on the missing tablet contracts.

- [ ] **Step 2: Add explicit tablet media queries**

Keep the phone rule at `max-width: 760px`. Add portrait tablet CSS:

```css
@media (min-width: 761px) and (max-width: 1024px) and (orientation: portrait) {
  .reader-layout { display: block; max-width: 100%; padding: 0 0 72px; }
  .reader-pane { width: 100%; min-width: 0; padding: 0 clamp(22px, 5vw, 52px); }
  .resize-handle { display: none; }
  #detailPanel { position: fixed; inset: auto 0 0; z-index: 220; width: 100%; min-width: 0; max-width: none; overflow-y: auto; border-left: 0; border-radius: 16px 16px 0 0; background: var(--surface-solid); box-shadow: 0 -12px 40px rgba(0,0,0,.28); transform: translateY(105%); transition: transform 180ms ease, height 180ms ease; }
  #detailPanel[data-dictionary-state="half"] { height: 46dvh; transform: translateY(0); }
  #detailPanel[data-dictionary-state="full"] { height: 88dvh; transform: translateY(0); }
  #detailPanel[data-dictionary-state="closed"] { transform: translateY(105%); }
  .dictionary-drawer-handle { display: block; width: 48px; height: 5px; margin: 10px auto 2px; border-radius: 999px; }
}
```

Add landscape tablet CSS:

```css
@media (min-width: 900px) and (max-width: 1366px) and (orientation: landscape) {
  .reader-layout { display: flex; max-width: 100%; }
  .reader-pane { flex: 0 0 65%; min-width: 0; }
  .detail-panel { flex: 1 1 35%; min-width: 300px; }
  .resize-handle { display: block; }
  .dictionary-drawer-handle { display: none; }
}
```

Use readable padding and existing colors. Do not add decorative motion or a dynamic-island notification.

- [ ] **Step 3: Store desktop and tablet landscape ratios separately**

Add:

```js
function getReaderLayoutMode() {
  if (matchMedia('(min-width: 761px) and (max-width: 1024px) and (orientation: portrait)').matches) return 'tablet-portrait';
  if (matchMedia('(min-width: 900px) and (max-width: 1366px) and (orientation: landscape)').matches) return 'tablet-landscape';
  if (matchMedia('(max-width: 760px)').matches) return 'phone';
  return 'desktop';
}

function splitRatioKey(mode) {
  return mode === 'tablet-landscape' ? 'rr_split_tablet_landscape' : 'rr_split_h';
}
```

Set `document.body.dataset.tabletLayout` to the mode in `restoreSplitRatio` and on viewport changes. Replace only the horizontal split storage key selection; keep any existing vertical key needed by current behavior.

- [ ] **Step 4: Preserve state across orientation-equivalent viewport changes**

In `runtime.js`, expose a `refreshLayout()` method that reapplies the current panel state and invokes optional `onLayoutChange(current, state)` without clearing `current`. In `reader.html`, listen to a debounced `resize`/`orientationchange`, record `window.scrollY`, call `restoreSplitRatio()`, call `dictionaryController.refreshLayout()`, and restore scroll on the next animation frame.

Do not call `renderChapter`, `goChapter`, `saveReadingProgress`, or `saveB2Progress` from this handler.

- [ ] **Step 5: Run tablet and runtime tests**

Run:

```powershell
node --test tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/dictionary-runtime.test.js tests/russian-b2/reader-static.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit tablet behavior**

```powershell
git add -- reader.html js/russian-dictionary/runtime.js tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/dictionary-runtime.test.js
git diff --cached --name-only
git commit -m "feat: adapt reader layout for ipad"
```

### Task 8: Regression, Browser Verification, and Rollback Proof

**Files:**
- Modify only when a test exposes an in-scope defect: files already listed above
- Do not modify: textbook/OCR content files, `cloudsync-config.js`, personal study logs

- [ ] **Step 1: Run all focused enhancement tests**

```powershell
node --test tests/russian-b2/dictionary-review.test.js tests/russian-b2/dictionary-storage.test.js tests/russian-b2/dictionary-morphology-summary.test.js tests/russian-b2/dictionary-morphology-build.test.js tests/russian-b2/reading-review.test.js tests/russian-b2/reader-enhancements-static.test.js tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-runtime.test.js tests/russian-b2/reader-static.test.js tests/russian-b2/reading.test.js
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the complete B2 regression suite**

Run: `npm run test:russian-b2`

Expected: the existing 71 tests plus new tests PASS. Record the exact final pass count in the completion report.

- [ ] **Step 3: Start the local server without disturbing an existing server**

First check port 3000:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
```

If no listener exists:

```powershell
Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory 'D:\MyStudySpace' -WindowStyle Hidden
```

Open `http://localhost:3000/reader.html` and verify the existing server response is the current workspace before testing.

- [ ] **Step 4: Verify vocabulary migration and rollback in an isolated browser context**

Using a fresh Playwright browser context:

1. Seed `vocabulary-review-records` with one reliable inflected record and one uncertain record.
2. Reload after dictionary data becomes ready.
3. Confirm a timestamped `rr_vocabulary_backup_v2_...` key exists.
4. Confirm the reliable word uses `lemma|partOfSpeech` and the uncertain word retains its old key.
5. Reload again and confirm no second backup appears.
6. Invoke `dictionaryStorage.restoreVocabularyBackup()` from page context.
7. Confirm the original raw records are active again.

Expected: no data loss, no optimistic mastery increase, and no duplicate backup on reload.

- [ ] **Step 5: Verify dictionary and cloze flow**

At desktop `1280×720`:

1. Open a completed reading chapter, click a known inflected form, and confirm the compact line fits without hiding meaning/save controls.
2. Confirm an ambiguous or missing morphology result shows the old dictionary panel unchanged.
3. Save the word twice from two contexts and confirm one canonical record contains both forms/contexts.
4. Open `vocabulary.html`, reach the saved word, confirm the contextual blank appears, reveal the answer, and rate each of the three outcomes once.
5. Confirm `count`, `mastery`, `interval`, and `nextReview` update through the existing SM-2 record rather than a second key.

- [ ] **Step 6: Verify unified reading review**

1. Answer one reading question incorrectly with a distractor tag and one without a tag.
2. Confirm the tagged one classifies automatically.
3. Confirm the untagged one offers four one-tap reasons plus `跳过`, and skipping does not block `查看答案`.
4. Open `错题复习`; confirm grammar and reading rows both appear with module labels.
5. Reopen the reading item; confirm it is unanswered and prior history is hidden.
6. Answer correctly; confirm it moves to mastered while retaining `everWrong` and history.
7. Retry incorrectly; confirm it returns to pending.

- [ ] **Step 7: Verify all target viewports with screenshots and overlap checks**

Use Playwright or the in-app browser at exactly:

- phone: `390×844`;
- iPad portrait: `834×1194`;
- iPad landscape: `1194×834`;
- desktop: `1280×720`.

At each viewport, capture dictionary closed, half, and full/open states. Check:

- no blank reader or dictionary panel;
- no article/control overlap;
- long Russian lemma and long Chinese meaning wrap inside their container;
- phone and iPad portrait use a bottom sheet;
- iPad landscape starts near 65:35 and resizing persists under `rr_split_tablet_landscape`;
- desktop remains side by side and keeps `rr_split_h`;
- changing `834×1194` to `1194×834` preserves selected word, dictionary content, current question, and scroll position;
- tapping a Russian option word opens the dictionary without submitting the question.

- [ ] **Step 8: Inspect the final diff and repository safety**

Run:

```powershell
git status --short
git diff --stat bccf958a..HEAD
git diff bccf958a..HEAD -- reader.html vocabulary.html js/russian-dictionary js/russian-b2 tests/russian-b2 scripts/russian-dictionary/build-corpus-morphology.js
git log --oneline bccf958a..HEAD
```

Confirm:

- no credentials or authenticated repository URLs were introduced;
- no `cloudsync-config.js` change is staged;
- no unfinished textbook/OCR data is part of the enhancement commits;
- no P1-P6 two-click behavior changed;
- only the intended helper modules, integrations, tests, and generated morphology data changed.

- [ ] **Step 9: Final local commit only if verification required a fix**

If verification exposed and fixed an in-scope defect, stage only its exact files and commit:

```powershell
git diff --cached --name-only
git commit -m "fix: complete reader enhancement verification"
```

If no fix was needed, create no empty commit. Do not push.

## Acceptance Summary

The batch is complete only when all statements below are true:

- Reliable saves use `lemma + part of speech`; uncertain saves remain surface-form records.
- Old vocabulary data has one restorable backup, and migration is idempotent.
- Existing SM-2 progress survives merges conservatively.
- Compact grammar appears only for trustworthy offline analyses and costs no browser Python/model runtime.
- Eligible source sentences become reveal-and-rate cloze cards with no keyboard requirement.
- Reading wrong answers enter the same visible review surface as grammar errors.
- Classification is reviewed metadata first, optional learner choice second, and never live AI.
- Reading retries retain history and correctly move between pending and mastered.
- iPad 11 portrait uses a bottom sheet; landscape uses a persistent near-65:35 split.
- Rotation preserves reader, question, scroll, and dictionary state.
- Existing P1-P6, reading, dictionary, listening, writing, speaking, archive, and dashboard tests remain green.
- No unfinished content cleanup, broad rewrite, credential change, or automatic push occurs.
