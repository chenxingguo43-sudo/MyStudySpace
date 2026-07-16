# Russian B2 Part 2 Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the verified Russian B2 pilot into a stable, scalable quiz-first system and publish the complete Part 2 (case government) only after every question has been checked against the original PDF.

**Architecture:** Canonical units have permanent IDs and are built from a manifest into reader JSON, Markdown, a range map, and a quality report. The reader stores B2 attempts and completion by permanent unit ID, migrates the existing pilot once, and treats numeric chapter positions as navigation only. PDF/OCR processing writes a source ledger first; only ledger-backed canonical units can be built or released.

**Tech Stack:** Vanilla ES5 browser JavaScript, Node.js CommonJS, Node built-in test runner, JSON, Markdown, local Python/PyPDF/Pillow PDF extraction, existing static Node server.

## Global Constraints

- `E:\Desktop\俄语B2.pdf` is authoritative; OCR is only a locator.
- Scope is grammar-and-vocabulary Part 2 only. Other parts and modules are not modified by this plan.
- Answers and explanations are hidden by default; explanations open only on user action.
- The reader remains single-column and has no original-page viewer.
- Every released exercise must have original-book answer, original explanation, Chinese translation, and source-page mapping.
- `answer` must equal `sourceAnswer`; AI explanations remain labelled `参考解析（AI，待复核）`.
- Do not edit generated reader JSON or generated Markdown as content sources.
- Preserve the existing novel reader, reading textbook, themes, lookup, bookmarks, and unrelated dirty files. Never stage `cloudsync-config.js` or `package-lock.json`.

---

## File map

| Path | Responsibility |
|---|---|
| `scripts/russian-b2/lib/contracts.js` | Canonical unit, permanent-ID, and source-ledger validation. |
| `scripts/russian-b2/build-book.js` | Reads the unit manifest and generates all published reader/Markdown/range-map/report outputs. |
| `scripts/russian-b2/build-pilot.js` | Compatibility wrapper that delegates to the book builder for the original pilot unit. |
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/index.json` | Published-unit manifest and append-only reader chapter allocation. |
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-02-source-ledger.json` | Per-question PDF evidence before canonical content is released. |
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/p2-q001-q010.json` | Migrated pilot canonical unit. |
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/p2-*.json` | Additional Part 2 canonical units, each backed by the source ledger. |
| `reader.html` | Stable B2 unit IDs, legacy progress migration, and B2 completion keyed by unit ID. |
| `data/textbook/index.json` | Reader chapter count and metadata after generated units are published. |
| `tests/russian-b2/*.test.js` | Contracts, builder, progress migration, and reader regression coverage. |

## Task 1: Introduce permanent unit and exercise contracts

**Files:**

- Modify: `scripts/russian-b2/lib/contracts.js`
- Modify: `tests/russian-b2/contracts.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/index.json`

**Interfaces:**

- Produces `validateUnit(unit)` and `validateUnitManifest(manifest)`.
- A unit has `{ id, chapterIndex, part, title, module, format: 'quiz-first', sourcePages, exercises }`.
- An exercise has `{ id: 'P2-Q001', printedNumber: 1, type: 'single-choice', options, answer, sourceAnswer, sourceEvidence, sourceExplanation, referenceExplanation, pitfalls, questionPages, answerPages, reviewStatus: 'verified' }`.

- [ ] **Step 1: Write failing contract tests**

```js
test('requires permanent unit and exercise IDs', () => {
  const unit = makeUnit();
  delete unit.id;
  delete unit.exercises[0].printedNumber;
  unit.exercises[0].id = 'Q001';
  const errors = validateUnit(unit);
  assert.match(errors.join('\n'), /unit.id/);
  assert.match(errors.join('\n'), /printedNumber/);
  assert.match(errors.join('\n'), /P2-Q001/);
});

test('rejects reused reader chapter indexes in the manifest', () => {
  const errors = validateUnitManifest({ units: [makeUnit(), { ...makeUnit(), id: 'p2-q011-q020' }] });
  assert.match(errors.join('\n'), /chapterIndex.*unique/);
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: failure because `validateUnit` and `validateUnitManifest` do not exist.

- [ ] **Step 3: Implement the validators and manifest**

```js
function validateUnit(unit) {
  const errors = [];
  if (!/^[a-z0-9-]+$/.test(unit.id || '')) errors.push('unit.id must be a stable slug');
  if (!Number.isInteger(unit.chapterIndex) || unit.chapterIndex < 0) errors.push('unit.chapterIndex must be non-negative');
  (unit.exercises || []).forEach(exercise => {
    if (!/^P\d+-Q\d{3}$/.test(exercise.id || '')) errors.push(`${exercise.id}: exercise id must be Pn-Qnnn`);
    if (!Number.isInteger(exercise.printedNumber) || exercise.printedNumber < 1) errors.push(`${exercise.id}: printedNumber is required`);
    errors.push(...validateExercise(exercise));
  });
  return errors;
}

function validateUnitManifest(manifest) {
  const indexes = new Set();
  return (manifest.units || []).flatMap(unit => {
    const errors = validateUnit(unit);
    if (indexes.has(unit.chapterIndex)) errors.push(`${unit.id}: chapterIndex must be unique`);
    indexes.add(unit.chapterIndex);
    return errors;
  });
}
```

Create the manifest with the existing pilot as `{ "id": "p2-q001-q010", "chapterIndex": 0, "source": "p2-q001-q010.json", "published": true }`.

- [ ] **Step 4: Run the contract test and full B2 test suite**

Run: `npm run test:russian-b2`

Expected: all tests pass.

- [ ] **Step 5: Commit the stable-content contract**

```powershell
git add -- scripts/russian-b2/lib/contracts.js tests/russian-b2/contracts.test.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/index.json"
git commit -m "feat: add stable B2 unit contracts"
```

## Task 2: Build every published unit from one manifest

**Files:**

- Create: `scripts/russian-b2/build-book.js`
- Modify: `scripts/russian-b2/build-pilot.js`
- Modify: `tests/russian-b2/contracts.test.js`
- Modify: `data/textbook/index.json`

**Interfaces:**

- Produces `buildBook({ root })` returning `{ readerPaths, markdownPaths, rangeMapPath, qualityReportPath }`.
- Reads only `规范数据/语法词汇/index.json` and its declared unit sources.
- Emits `data/textbook/russian_b2/chNNNN.json` for each `published: true` unit and sets the reader book's `chapters` to the number of published manifest entries.

- [ ] **Step 1: Write a failing multi-unit builder test**

```js
test('buildBook emits only published units in append-only chapter slots', () => {
  const result = buildBook({ root: path.resolve('.') });
  assert.deepEqual(result.readerPaths.map(path.basename), ['ch0000.json']);
  assert.equal(JSON.parse(fs.readFileSync('data/textbook/index.json')).books.find(book => book.id === 'russian_b2').chapters, 1);
  assert.equal(JSON.parse(fs.readFileSync(result.qualityReportPath)).units[0].id, 'p2-q001-q010');
});
```

- [ ] **Step 2: Run the builder test and verify it fails**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: failure because `buildBook` does not exist.

- [ ] **Step 3: Implement `buildBook` and convert the pilot script into a wrapper**

```js
function buildBook({ root }) {
  const manifest = readJson(path.join(root, ...VAULT, '规范数据', '语法词汇', 'index.json'));
  const published = manifest.units.filter(unit => unit.published).sort((a, b) => a.chapterIndex - b.chapterIndex);
  const errors = validateUnitManifest({ units: published.map(loadUnit) });
  if (errors.length) throw new Error(errors.join('\n'));
  // write one reader JSON and one Markdown file per published unit
  // write range_map.json and quality-report.json from the same loaded units
  return { readerPaths, markdownPaths, rangeMapPath, qualityReportPath };
}

function buildPilot({ root }) { return buildBook({ root }); }
```

The quality report must include each unit ID, printed question-number range, question/rule/answer page sets, exercise count, and `reviewStatus` summary.

- [ ] **Step 4: Run generation and tests**

Run: `node scripts/russian-b2/build-book.js`

Expected: generated pilot outputs match their existing content except for permanent IDs and the new quality report.

Run: `npm run test:russian-b2`

Expected: all tests pass.

- [ ] **Step 5: Commit the manifest-driven generator**

```powershell
git add -- scripts/russian-b2/build-book.js scripts/russian-b2/build-pilot.js tests/russian-b2/contracts.test.js data/textbook/index.json data/textbook/russian_b2 "俄语资料库/俄语B2·原书复刻与学习版/_data" "俄语资料库/俄语B2·原书复刻与学习版/学习单元"
git commit -m "feat: build B2 units from manifest"
```

## Task 3: Migrate reader progress to permanent unit IDs

**Files:**

- Modify: `reader.html`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**

- `getQuizUnitKey()` returns `curBook.id + ':' + currentQuizData.id`.
- `migrateB2Progress(progress)` returns the migrated progress object without changing unrelated books.
- Legacy `russian_b2:0.Q001` through `Q010` become `russian_b2:p2-q001-q010.P2-Q001` through `P2-Q010` once only.

- [ ] **Step 1: Write failing migration and static-reader tests**

```js
test('B2 progress uses the chapter unit ID instead of curCh', () => {
  assert.match(reader, /function getQuizUnitKey\(\)/);
  assert.match(reader, /currentQuizData\.id/);
  assert.doesNotMatch(reader, /var chapterKey = curBook\.id \+ ':' \+ curCh/);
});

test('legacy pilot records migrate to permanent exercise IDs once', () => {
  const migrated = migrateB2Progress({ 'russian_b2:0': { Q001: { submitted: true } } });
  assert.deepEqual(migrated['russian_b2:p2-q001-q010']['P2-Q001'], { submitted: true });
  assert.deepEqual(migrateB2Progress(migrated), migrated);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: failure because the reader still keys progress by `curCh`.

- [ ] **Step 3: Implement stable keys and migration**

```js
function getQuizUnitKey() {
  return curBook.id + ':' + currentQuizData.id;
}

function migrateB2Progress(progress) {
  var legacy = progress['russian_b2:0'];
  var stableKey = 'russian_b2:p2-q001-q010';
  if (!legacy || progress[stableKey]) return progress;
  progress[stableKey] = {};
  Object.keys(legacy).forEach(function(oldId) {
    progress[stableKey]['P2-' + oldId] = legacy[oldId];
  });
  delete progress['russian_b2:0'];
  return progress;
}
```

Run the migration in `getB2Progress()` before returning data. Replace every B2 quiz write and completion read that uses `curBook.id + ':' + curCh` with `getQuizUnitKey()`. Store B2 completion under the unit key and derive the shelf count from published B2 unit keys, leaving non-B2 `readStats` unchanged.

- [ ] **Step 4: Verify no quiz action regresses**

Run: `npm run test:russian-b2`

Expected: all tests pass, including answer-hidden behavior and preserved scroll position.

- [ ] **Step 5: Commit the migration**

```powershell
git add -- reader.html tests/russian-b2/reader-static.test.js tests/russian-b2/contracts.test.js
git commit -m "feat: preserve B2 progress across unit rollout"
```

## Task 4: Create the Part 2 source ledger before content release

**Files:**

- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-02-source-ledger.json`
- Create: `scripts/russian-b2/verify-source-ledger.js`
- Modify: `tests/russian-b2/contracts.test.js`

**Interfaces:**

- Each ledger record has `{ exerciseId, printedNumber, questionPages, rulePages, answerPages, answer, sourceExplanation, translation, status: 'verified' }`.
- `verifySourceLedger({ ledger, units })` rejects missing question numbers, missing page groups, duplicate printed numbers, and a canonical answer/explanation that differs from the ledger.

- [ ] **Step 1: Write failing ledger tests**

```js
test('source ledger rejects a canonical question without verified explanation and translation', () => {
  const errors = verifySourceLedger({ ledger: { part: 2, entries: [makeLedgerEntry()] }, units: [makeUnit()] });
  assert.deepEqual(errors, []);
  const broken = makeLedgerEntry();
  broken.translation = '';
  assert.match(verifySourceLedger({ ledger: { part: 2, entries: [broken] }, units: [makeUnit()] }).join('\n'), /translation/);
});
```

- [ ] **Step 2: Run the ledger test and verify it fails**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: failure because `verifySourceLedger` does not exist.

- [ ] **Step 3: Build the ledger from the PDF, not from OCR**

For each candidate Part 2 question, render the relevant original PDF page locally, compare the candidate OCR text against the scan, and record the exact page groups and original explanation. Use this record shape:

```json
{
  "exerciseId": "P2-Q011",
  "printedNumber": 11,
  "questionPages": [19],
  "rulePages": [24],
  "answerPages": [25],
  "answer": "А",
  "sourceExplanation": "原书解析：……",
  "translation": "原书译文：……",
  "status": "verified"
}
```

Do not create a record when the scan cannot establish one of these fields. Record the page and ambiguity in `unresolved` instead; do not include unresolved entries in `entries`.

- [ ] **Step 4: Implement validation and verify coverage**

Run: `node scripts/russian-b2/verify-source-ledger.js`

Expected: either a zero-error report for all ledger entries or a non-zero report naming each unresolved printed question. Do not begin canonical-unit generation until this command reports zero errors for the next unit's printed-number range.

- [ ] **Step 5: Commit verified ledger evidence only**

```powershell
git add -- scripts/russian-b2/verify-source-ledger.js tests/russian-b2/contracts.test.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-02-source-ledger.json"
git commit -m "docs: record verified B2 part 2 sources"
```

## Task 5: Publish Part 2 in verified 8-12-question units

**Files:**

- Create: canonical `p2-*.json` units under `规范数据/语法词汇/`
- Modify: `规范数据/语法词汇/index.json`
- Generated: reader JSON, Markdown, range map, and quality report from Task 2
- Modify: `tests/russian-b2/contracts.test.js`

**Interfaces:**

- Every canonical unit source is listed once in the manifest with a never-reused `chapterIndex` and `published: true` only after its ledger entries all verify.
- Unit exercise IDs are `P2-Qnnn`; `printedNumber` is the original-book question number.

- [ ] **Step 1: Write a failing published-unit coverage test**

```js
test('each published Part 2 unit is fully backed by source-ledger entries', () => {
  const { manifest, units, ledger } = loadPart2Sources();
  const published = manifest.units.filter(unit => unit.published && unit.id.startsWith('p2-'));
  const publishedExercises = units.filter(unit => published.some(entry => entry.id === unit.id)).flatMap(unit => unit.exercises);
  assert.deepEqual(verifySourceLedger({ ledger, units: units.filter(unit => published.some(entry => entry.id === unit.id)) }), []);
  assert.ok(publishedExercises.every(exercise => /^P2-Q\d{3}$/.test(exercise.id)));
});
```

- [ ] **Step 2: Run the test before each unit is published**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: failure until every question in the candidate unit has a verified ledger record and canonical source file.

- [ ] **Step 3: Create one canonical unit at a time from verified ledger data**

Use the exact data shape:

```json
{
  "id": "p2-q011-q020",
  "chapterIndex": 1,
  "part": 2,
  "title": "接格关系（题 11-20）",
  "module": "语法词汇",
  "format": "quiz-first",
  "sourcePages": { "questions": [19], "rules": [24], "answers": [25] },
  "exercises": []
}
```

Fill `exercises` only by copying the verified ledger's question, answer, explanation, and translation fields. Generate the AI reference explanation separately and retain its required label. Add the unit to the manifest only after the canonical validator and ledger validator both pass.

- [ ] **Step 4: Generate and inspect outputs after each published unit**

Run: `node scripts/russian-b2/build-book.js`

Run: `npm run test:russian-b2`

Expected: all tests pass; the quality report contains the new unit with no `needs_review` or unresolved records.

- [ ] **Step 5: Commit each independently releasable unit**

```powershell
git add -- data/textbook/index.json data/textbook/russian_b2 tests/russian-b2/contracts.test.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇" "俄语资料库/俄语B2·原书复刻与学习版/学习单元" "俄语资料库/俄语B2·原书复刻与学习版/_data"
git commit -m "feat: add verified B2 part 2 unit"
```

## Task 6: Browser acceptance and Part 2 release report

**Files:**

- Create: `docs/superpowers/acceptance/2026-07-16-russian-b2-part2-rollout.md`
- Test: `tests/russian-b2/reader-static.test.js`

**Interfaces:**

- The report lists every published Part 2 unit, its printed-number range, and each verification command's observed result.

- [ ] **Step 1: Verify the published reader flow in a browser**

For the first, a middle, and the final published Part 2 unit:

1. Open the unit and confirm answers and explanations start hidden.
2. Submit a deliberately wrong answer and confirm only the wrong state appears.
3. Manually open the explanation and confirm original answer, original explanation with translation, AI-labelled reference explanation, pitfalls, and page identifiers appear in that order.
4. Perform the action in a lower unit and confirm viewport position remains on that question.
5. Refresh the page and confirm the same answer record remains attached to its permanent unit ID.

- [ ] **Step 2: Run final automated verification**

Run: `node scripts/russian-b2/build-book.js`

Run: `npm run test:russian-b2`

Run: `git diff --check`

Expected: generation succeeds, all B2 tests pass, and no whitespace errors are reported.

- [ ] **Step 3: Write the release report with actual evidence**

Use these headings: `Result`, `Published units`, `Source coverage`, `Commands`, `Browser evidence`, `Progress migration`, `Regression evidence`, and `Unresolved source questions`.

`Unresolved source questions` must be empty for a completed Part 2 release. If it is not empty, do not call the part complete; release only the already verified units and state their exact printed-number ranges.

- [ ] **Step 4: Commit the acceptance report**

```powershell
git add -- docs/superpowers/acceptance/2026-07-16-russian-b2-part2-rollout.md
git commit -m "docs: verify B2 part 2 rollout"
```

## Plan self-review

### Spec coverage

| Spec requirement | Plan task |
|---|---|
| Part 2 precedes all other parts | Tasks 4-6 |
| Permanent unit/exercise IDs | Task 1 |
| One canonical source and generated outputs | Task 2 |
| Existing pilot progress migration | Task 3 |
| PDF-only source verification | Task 4 |
| 8-12 question independent releases | Task 5 |
| Answer-hidden single-column reader behavior | Tasks 3 and 6 |
| No silent omission of uncertain questions | Tasks 4-6 |
| Browser and regression acceptance | Task 6 |

### Placeholder scan

The plan has no deferred implementation markers. The variable names in code blocks (`readerPaths`, `markdownPaths`, `rangeMapPath`, and `qualityReportPath`) are the explicit return fields of `buildBook({ root })`; their paths are defined by Task 2.

### Type consistency

`validateUnit`, `validateUnitManifest`, `buildBook`, `getQuizUnitKey`, `migrateB2Progress`, and `verifySourceLedger` are introduced before later tasks consume them. Canonical exercise IDs use `P2-Qnnn` throughout; the legacy `Qnnn` notation appears only in the explicit one-time migration.
