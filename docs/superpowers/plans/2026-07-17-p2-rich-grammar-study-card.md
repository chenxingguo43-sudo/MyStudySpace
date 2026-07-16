# P2 Rich Grammar Study Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the P2 `p2-time-cause` card from a compact rule summary into a source-traceable, evidence-reviewed mini grammar course with a quick-reference layer, detailed lessons, independent checks, and separate mastery tracking.

**Architecture:** Keep rich content in the existing standalone study-card JSON pipeline. Extend the card schema and validator first, then render the validated JSON in `reader.html` through focused helper functions. Store card self-test progress under a dedicated localStorage key so it never enters the formal B2 wrong-answer book. Preserve the existing P2 quiz and answer-analysis flows as independent fallbacks.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js CommonJS scripts, Node built-in test runner, JSON data, browser acceptance on the local static server.

## Global Constraints

- Use the A “上简下详” continuous long-page layout; primary content is expanded by default.
- Keep original B2 answers, option elimination, and per-question explanations out of the study card.
- Label every item as grammar-book source, B2 original focus, learning explanation, supplement, or related extension.
- Publish only `approved` content; `pending-review` may exist only in the review draft.
- Use single-choice or judgment questions for scored instant checks; unscored “think, then reveal” handles form recall without adding a submit button.
- Show representative case-form changes in place; do not embed a complete declension textbook.
- Core content covers P2-Q051–Q058; related structures live in a separate extension section.
- Card self-test progress is separate from the formal B2 wrong-answer book.
- Do not modify the protected Pomodoro dynamic colors or unrelated worktree changes.

## File Map

- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/p2-time-cause-study-card.json` — rich source-authored P2 card content and independent checks.
- Modify: `scripts/russian-b2/lib/study-cards.js` — schema validation, source identity validation, approval filtering, and published-card generation.
- Modify: `tests/russian-b2/study-cards.test.js` — failing tests for the richer schema and publication gates.
- Modify: `reader.html` — A-layout rendering, anchor navigation, source disclosure, immediate checks, comprehensive self-test, and progress display.
- Modify: `tests/russian-b2/reader-static.test.js` — static contracts for the new renderer and isolated progress key.
- Modify: `package.json` only if a new test/build script is required; keep existing scripts intact otherwise.
- Create: `docs/superpowers/acceptance/2026-07-17-p2-rich-grammar-study-card.md` — browser and automated acceptance record.

---

### Task 1: Lock the rich card schema and publication rules

**Files:**
- Modify: `scripts/russian-b2/lib/study-cards.js`
- Modify: `tests/russian-b2/study-cards.test.js`

**Interfaces:**
- `validateStudyCard({ card, chapter, grammarText }) -> string[]` remains the validator entry point.
- Add `validateRichSection(card, section, grammarText) -> string[]` for each detailed lesson.
- Add `validateCheck(card, check) -> string[]` for scored and unscored checks.
- `buildStudyCards({ root, write = true })` continues to publish only validated data to `data/textbook/russian_b2/study-cards/p2-time-cause.json`.

- [ ] **Step 1: Write failing schema tests.** Add tests asserting that a valid card must contain `quickReference`, `lessons`, `relatedExtensions`, `checks`, and `reviewStatus: "approved"`; each lesson must contain `meaning`, `conditions`, `structure`, `caseChanges`, `examples`, `boundaries`, `instantChecks`, and `sources`; each source must have a supported kind and, for grammar-book items, file/section/pages.

```js
const fs = require('node:fs');
const { buildSixPartBook } = require('../../scripts/russian-b2/build-six-part-book');
const { resolveGrammarRoot } = require('../../scripts/russian-b2/lib/study-cards');

test('rich P2 card requires approved layered lesson content', () => {
  const card = structuredClone(buildStudyCards({ root, write: false }).cards[0]);
  const chapter = buildSixPartBook({ root, write: false }).parts.find(part => part.id === card.partId);
  const grammarText = fs.readFileSync(path.join(resolveGrammarRoot(root), '08 前置词.md'), 'utf8');
  Object.assign(card, {
    reviewStatus: 'approved',
    quickReference: { semanticQuestions: ['持续多久'], structures: ['за + В.п.'] },
    lessons: [{ id: 'duration', title: '持续多久', scope: 'core', meaning: '持续时间', conditions: ['动作持续'], structure: 'В.п.', caseChanges: [{ from: 'день', to: 'день' }], examples: [{ ru: 'Я ждал день', zh: '我等了一天', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [34] } }], boundaries: ['不表示未来起点'], instantChecks: [{ id: 'duration-check', type: 'judgment', prompt: '判断', answer: true, rationale: '持续', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [34] } }], sources: [{ kind: 'b2-original', label: 'B2 原书考点', pages: [34] }] }],
    relatedExtensions: [],
    checks: []
  });
  assert.deepEqual(validateStudyCard({ card, chapter, grammarText }), []);
  card.reviewStatus = 'pending-review';
  assert.match(validateStudyCard({ card, chapter, grammarText }).join('\n'), /approved/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails.**

Run: `node --test tests/russian-b2/study-cards.test.js`

Expected: FAIL because the current validator does not know the rich schema or approval gate.

- [ ] **Step 3: Implement the minimal validator extensions.** Validate exact required arrays, reject empty lesson headings, require at least one case change and one source per lesson, reject `pending-review` from publication, allow only the six approved source kinds, and reject answer/option/analysis fields anywhere in the card tree.

- [ ] **Step 4: Run the focused test and the full suite.**

Run: `node --test tests/russian-b2/study-cards.test.js` and then `npm run test:russian-b2`

Expected: the new schema tests and all existing tests pass.

- [ ] **Step 5: Commit the schema gate.**

```bash
git add scripts/russian-b2/lib/study-cards.js tests/russian-b2/study-cards.test.js
git commit -m "test: define rich grammar study card schema"
```

### Task 2: Author and validate the detailed P2 content

**Files:**
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/p2-time-cause-study-card.json`
- Modify: `tests/russian-b2/study-cards.test.js`

**Interfaces:**
- The JSON remains the single source for `p2-time-cause` and must keep `exerciseIds` exactly equal to P2-Q051–Q058.
- Each `lessons[]` item has stable `id`, `title`, `scope` (`core` or `related-extension`), `meaning`, `conditions[]`, `structure`, `caseChanges[]`, `examples[]`, `boundaries[]`, `instantChecks[]`, and `sources[]`.
- Each check has `id`, `type` (`choice`, `judgment`, or `reveal`), `prompt`, `options` only for scored checks, `answer` only in data, `rationale`, and `source`.

- [ ] **Step 1: Add failing content coverage tests.** Assert that the card contains the nine lesson topics from the approved design, at least one example of representative noun/adjective/plural case changes, at least one `related-extension`, and 3–5 comprehensive checks. Assert no lesson contains `answerAnalysis`, `correctOption`, or B2 option arrays.

- [ ] **Step 2: Run the focused test and confirm the current compact card fails the coverage assertions.**

Run: `node --test tests/russian-b2/study-cards.test.js`

Expected: FAIL on missing lessons, case-change examples, and checks.

- [ ] **Step 3: Replace the compact P2 card data with evidence-driven content.** Author the quick layer and the detailed lessons in the specified order: duration, planned duration, after-an-interval, completion-within, sequence/deadline, causes, related extensions, comparison table, and self-test. Mark grammar-book rules/examples with exact source file/section/pages; mark B2-only structure coverage as `b2-original-focus`; mark all authored explanations and examples explicitly.

- [ ] **Step 4: Add content-specific tests for the actual examples.** Test that the published card includes the checked transformations `дождь → из-за дождя`, `ошибка → из-за ошибки`, `плохая погода → из-за плохой погоды`, and `проблемы → из-за проблем`, plus the contrast `через неделю` versus `за неделю`.

- [ ] **Step 5: Rebuild and run all data tests.**

Run: `npm run build:russian-b2-study-cards`, then `npm run test:russian-b2`, then `node scripts/russian-b2/build-six-part-book.js` to restore the six-part reader output.

Expected: all tests pass and `data/textbook/russian_b2/study-cards/p2-time-cause.json` contains only approved, source-labelled content.

- [ ] **Step 6: Commit the authored card.**

```bash
git add "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/p2-time-cause-study-card.json" tests/russian-b2/study-cards.test.js data/textbook/russian_b2/study-cards/p2-time-cause.json
git commit -m "feat: author rich P2 grammar study content"
```

### Task 3: Render the A-layout card and source disclosures

**Files:**
- Modify: `reader.html`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Preserve `showStudyCard(partId, pointId)` and `renderStudyCard(card, point)` as the public reader entry points.
- Add `renderStudyQuickLayer(card) -> string`.
- Add `renderStudyLessons(card) -> string`.
- Add `renderStudyLesson(lesson, index) -> string`.
- Add `renderStudySourceDisclosure(source) -> string`.
- Add `renderStudyAnchorNav(card) -> string`.

- [ ] **Step 1: Add failing static contracts.** Assert that `reader.html` defines the new render helpers, emits the quick layer and nine lesson sections, emits source identity labels, creates stable section IDs, and contains no `sourceAnswer`, `referenceExplanation`, or option-answer rendering inside `renderStudyCard`.

- [ ] **Step 2: Run the reader static test and confirm it fails.**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL because only the compact renderer exists.

- [ ] **Step 3: Add the A-layout CSS.** Keep the existing card visual language and add only focused classes for `.b2-study-quick`, `.b2-study-outline`, `.b2-study-lesson`, `.b2-study-case-change`, `.b2-study-check`, `.b2-study-source-disclosure`, and the non-obscuring sticky outline. Use responsive single-column fallbacks for narrow windows.

- [ ] **Step 4: Implement the render helpers.** Render quick reference first, then the approved lesson order. Render case changes as readable source-to-target pairs, examples with Russian and Chinese text, source labels as compact buttons/details, and related extensions in a visually distinct section. Use `escapeHtml` for all data text and stable IDs derived from the lesson ID for anchor navigation.

- [ ] **Step 5: Run reader static tests and the full suite.**

Run: `node --test tests/russian-b2/reader-static.test.js` and `npm run test:russian-b2`

Expected: PASS with no regression to existing quiz rendering or scroll preservation.

- [ ] **Step 6: Commit the renderer.**

```bash
git add reader.html tests/russian-b2/reader-static.test.js
git commit -m "feat: render layered rich P2 grammar card"
```

### Task 4: Add independent instant checks, comprehensive self-test, and mastery storage

**Files:**
- Modify: `reader.html`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Define `const STUDY_CARD_PROGRESS_KEY = 'russian_b2_study_card_progress_v1'`.
- Add `loadStudyCardProgress() -> object` and `saveStudyCardProgress(progress) -> void`.
- Add `recordStudyCardAttempt(cardId, result) -> object`.
- Add `renderStudyChecks(card) -> string` and `renderStudyCheck(check, index) -> string`.
- Add `answerStudyCheck(cardId, checkId, selectedValue) -> void`.

- [ ] **Step 1: Add failing static tests for the isolated progress contract.** Assert the dedicated key, load/save functions, check renderer, immediate-answer handler, retry action, and mastery summary are present; assert the functions do not call formal B2 wrong-answer storage.

- [ ] **Step 2: Run the static test and confirm it fails.**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL because card checks are not yet rendered or persisted.

- [ ] **Step 3: Implement progress storage and scoring.** Store per-card `attempts`, `lastScore`, `bestScore`, `answeredCheckIds`, and `lastStudiedAt` under the dedicated key. Use the existing single-click interaction convention for choice/judgment checks; reveal checks disclose the rationale without affecting score. Re-render only the affected check region so the page does not jump to the top.

- [ ] **Step 4: Render the mastery summary and retry controls.** Show recent score, best score, attempt count, and date near the card heading; add “再做本卡自测” without changing formal B2 progress or wrong-answer history.

- [ ] **Step 5: Run static and full tests.**

Run: `node --test tests/russian-b2/reader-static.test.js` and `npm run test:russian-b2`

Expected: PASS, including the existing tests for one-click answers, retry history, wrong-answer book isolation, and scroll preservation.

- [ ] **Step 6: Commit independent self-test progress.**

```bash
git add reader.html tests/russian-b2/reader-static.test.js
git commit -m "feat: track independent grammar card mastery"
```

### Task 5: Browser acceptance and documentation

**Files:**
- Create: `docs/superpowers/acceptance/2026-07-17-p2-rich-grammar-study-card.md`

**Interfaces:**
- Browser target: `http://localhost:3001/reader.html` served from this worktree.
- Final card entry: P2 → `持续、原因与时间关系`.

- [ ] **Step 1: Run the complete automated verification.**

Run: `npm run test:russian-b2; npm run build:russian-b2-study-cards; node scripts/russian-b2/build-six-part-book.js; git diff --check`

Expected: 46+ tests pass, the study-card build exits 0, six-part output is restored, and `git diff --check` reports no errors.

- [ ] **Step 2: Start the isolated browser server and open the card.** Use the existing browser visual/local-testing workflow and confirm the URL is reachable before interacting.

- [ ] **Step 3: Verify the quick layer and all lesson sections.** Confirm the top summary, semantic decision path, source labels, case changes, examples, boundaries, related extensions, and anchor navigation are visible and readable on desktop and a narrow viewport.

- [ ] **Step 4: Verify checks and mastery.** Answer an instant check, expand a reveal check, run the comprehensive self-test, retry it, and confirm score/attempt/date changes without page-top jumps.

- [ ] **Step 5: Verify isolation and fallback.** Confirm B2-Q051–Q058 still open through the formal practice button, original answer analysis remains unchanged, card self-test state is not shown in the formal wrong-answer book, and a missing-card failure leaves P2 practice usable.

- [ ] **Step 6: Record evidence and commit acceptance notes.** Include automated results, browser observations, and any intentionally deferred visual issues.

```bash
git add docs/superpowers/acceptance/2026-07-17-p2-rich-grammar-study-card.md
git commit -m "test: record rich P2 grammar card acceptance"
```

## Self-Review Checklist

- Spec coverage: the plan covers the two-layer A layout, source labels, evidence-driven editorial workflow, case changes, core/extension split, instant checks, comprehensive self-test, isolated mastery storage, fallback behavior, and browser acceptance.
- Placeholder scan: the plan contains no unfinished steps or unspecified edge-case instructions.
- Interface consistency: validator, renderer, and progress function names are defined before later tasks consume them; the dedicated storage key is fixed.
- Build-order safety: after the full regression suite, the six-part builder is explicitly rerun before browser acceptance.
