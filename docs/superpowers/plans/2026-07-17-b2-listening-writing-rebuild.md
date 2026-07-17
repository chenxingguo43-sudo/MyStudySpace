# B2 Listening, Writing, and Unified Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore every verified B2 listening question and writing task from the source PDF, fix reconstructed dialogue audio so speaker labels are never spoken, and present every B2 module inside one unified textbook dashboard.

**Architecture:** Keep `reader.html` as the only study entry. Canonical listening and writing JSON remains under `俄语资料库/俄语B2·原书复刻与学习版/规范数据/`; Node builders validate and publish it to `data/textbook/russian_b2/modules/`. `data/textbook/russian_b2/book.json` and the catalogue expose one B2 book, while module adapters render dashboard, listening exam pages, intensive-listening links, and the writing workbench.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js CommonJS, `node:test`, existing static server, localStorage, existing reconstructed MP3/VTT media, Poppler/PDF page rendering for visual verification.

## Global Constraints

- The only shelf entry is `russian_b2`; reading, writing, listening, speaking, exam, grammar, and review are modules inside it.
- Listening opens on the exam page; `精听这段材料` is a prominent secondary action and never replaces the exam page.
- Every published listening question has complete Russian prompt, all original choices, answer, evidence/source pages, and stable ID.
- Display labels `А:`/`Б:` remain visible but are removed from speech input; dialogue speakers use distinct voices.
- Reconstructed TTS and missing original video are visibly labelled and never presented as original media.
- Writing tasks preserve complete Russian instructions, source materials, layout, original model text, printed page and PDF page.
- The recommendation-letter pilot uses book pages 90-91 / PDF-094-095; the complete model text is sourced from PDF-096.
- Original content, learning support, reconstructed media, and AI feedback retain separate provenance labels.
- User drafts, grammar progress, wrong answers, study-card mastery, and existing module records must survive migration.
- Click-to-lookup remains enabled on read-only Russian task/material/transcript text and disabled in user drafts.
- No changes to `cloudsync-config.js`; no credentials, temporary page renders, or browser recordings are committed.
- Every behavior change follows RED -> GREEN -> full regression -> commit.

---

### Task 1: Freeze the Current Defects and Define Release Contracts

**Files:**
- Modify: `tests/russian-b2/listening.test.js`
- Modify: `tests/russian-b2/writing.test.js`
- Create: `tests/russian-b2/b2-dashboard.test.js`
- Create: `scripts/russian-b2/lib/listening-writing-contracts.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-listening-writing-baseline.md`

**Interfaces:**
- Produces: `validateListeningQuestion(question): string[]`
- Produces: `validateListeningSegments(unit): string[]`
- Produces: `validateWritingTask(unit): string[]`
- Produces: `validateB2Dashboard(book, catalogue): string[]`

- [ ] **Step 1: Add failing listening completeness tests**

```js
for (const unit of units) {
  assert.equal(unit.questions.length, 5);
  for (const question of unit.questions) {
    assert.match(question.promptRu, /[А-Яа-яЁё]/);
    assert.equal(question.options.length, 3);
    assert.ok(question.options.some(option => option.key === question.answer));
    assert.ok(question.evidence.pages.length > 0);
  }
}
assert.ok(dialogues.transcriptSegments.every(segment => segment.speechText && !/^[АAБB]:/.test(segment.speechText)));
assert.ok(new Set(dialogues.transcriptSegments.map(segment => segment.voice)).size >= 2);
```

- [ ] **Step 2: Add failing writing fidelity tests**

```js
const recommendation = units.find(unit => unit.id === 'recommendation-letter');
assert.deepEqual(recommendation.source.printedPages, [90, 91, 92]);
assert.deepEqual(recommendation.source.pdfPages, [94, 95, 96]);
assert.ok(recommendation.task.instructionsRu.length > 200);
assert.ok(recommendation.materials.length >= 3);
assert.equal(recommendation.model.source.pdfPages.includes(96), true);
assert.ok(recommendation.rubric.length > 0);
```

- [ ] **Step 3: Add failing unified-dashboard tests**

```js
assert.deepEqual(book.modules.map(module => module.id), ['grammar','reading','writing','listening','speaking','exam','review']);
assert.equal(catalogue.books.filter(item => item.id.startsWith('russian_b2')).length, 1);
assert.equal(catalogue.books.find(item => item.id === 'russian_b2').format, 'b2-full');
```

- [ ] **Step 4: Run tests and confirm expected failures**

Run: `node --test tests/russian-b2/listening.test.js tests/russian-b2/writing.test.js tests/russian-b2/b2-dashboard.test.js`

Expected: FAIL because current listening options/material fields and unified catalogue contract are missing.

- [ ] **Step 5: Implement only reusable validators and record the baseline**

Validators return stable, question/task-scoped error messages and do not mutate source data. Re-run the tests; contract unit tests pass while source completeness tests remain red until Tasks 2-5.

- [ ] **Step 6: Commit**

Commit: `test: define B2 listening writing and dashboard gates`

### Task 2: Merge B2 Shelf Entries into One Dashboard

**Files:**
- Modify: `data/textbook/index.json`
- Modify: `data/textbook/russian_b2/book.json`
- Modify: `reader.html`
- Modify: `js/russian-b2/core.js`
- Modify: `js/russian-b2/dashboard.js`
- Modify: `tests/russian-b2/b2-dashboard.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Produces: `openB2Module(moduleId)`
- Produces: `renderB2Dashboard(book, moduleStats)`
- Preserves module directories under `data/textbook/russian_b2/modules/<module>`.

- [ ] **Step 1: Make the dashboard test fail on module navigation and migration**

```js
assert.match(reader, /function renderB2Dashboard/);
assert.match(reader, /function openB2Module/);
assert.doesNotMatch(JSON.stringify(catalogue.books), /russian_b2_(reading|writing|listening|speaking|exam)/);
```

- [ ] **Step 2: Publish one catalogue record**

Change `russian_b2` to `format: "b2-full"`, point it at `russian_b2/book.json`, and remove the five module-as-book records. Keep their directories and data intact.

- [ ] **Step 3: Render the module dashboard**

Dashboard cards display module title, availability, progress, pending wrong items/drafts, and `继续学习`. Opening a module loads its generated index without returning to the global shelf.

- [ ] **Step 4: Migrate recent-location keys without deleting legacy data**

Read old module book IDs once, translate them to `{ moduleId, unitId }`, save the unified key, and leave old keys untouched as fallback.

- [ ] **Step 5: Verify and commit**

Run: `node --test tests/russian-b2/b2-dashboard.test.js tests/russian-b2/reader-static.test.js && npm run test:russian-b2`

Commit: `feat: unify B2 modules under one dashboard`

### Task 3: Restore Listening Tasks 1-5 and Fix Speaker Audio Data

**Files:**
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/dialogues.json`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/advertisements.json`
- Modify: `scripts/russian-b2/build-listening.js`
- Modify: `scripts/russian-b2/prepare-listening-media.js`
- Create: `scripts/russian-b2/lib/dialogue-segments.js`
- Modify: `tests/russian-b2/listening.test.js`

**Interfaces:**
- Produces: `parseDialogueSegments(transcript): Array<{ id, speaker, displayLabel, text, speechText, voice }>`
- Produces: five approved questions for each listening unit.

- [ ] **Step 1: Render and inspect PDF-104-106**

Use Poppler to render pages 104-106 into `tmp/pdfs/b2-listening-writing/`; compare question numbering, Russian prompts, three options, transcript, answers, and speaker boundaries. Do not commit renders.

- [ ] **Step 2: Write a failing parser test**

```js
const segments = parseDialogueSegments('А: Привет! Б: Как дела?');
assert.deepEqual(segments.map(s => s.displayLabel), ['А', 'Б']);
assert.deepEqual(segments.map(s => s.speechText), ['Привет!', 'Как дела?']);
assert.equal(new Set(segments.map(s => s.voice)).size, 2);
```

- [ ] **Step 3: Implement speaker-safe segmentation**

Keep `displayLabel` for HTML/VTT, strip it from `speechText`, assign stable speaker voices, and insert explicit pause metadata at role changes. Media generation consumes `speechText`, never raw transcript lines.

- [ ] **Step 4: Restore complete tasks 1-10**

Enter Russian prompts, three original options, answers, evidence pages, and stable IDs `B2-LISTEN-T01-Q01` through `B2-LISTEN-T10-Q01` as represented by the book's five-question groupings. Preserve original printed numbering separately.

- [ ] **Step 5: Build/check media manifests**

`prepare-listening-media.js --check` rejects a dialogue whose TTS text contains speaker labels or whose speakers share one voice. Existing MP3 remains labelled reconstructed until regenerated from approved segments.

- [ ] **Step 6: Verify and commit**

Run: `node --test tests/russian-b2/listening.test.js && npm run test:russian-b2`

Commit: `feat: restore B2 dialogue questions and speaker-safe audio`

### Task 4: Build the Listening Exam Page and Intensive-Listening Bridge

**Files:**
- Modify: `reader.html`
- Create: `js/russian-b2/listening.js`
- Modify: `tests/russian-b2/listening.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`
- Create: `immersion-study-space/public/data/b2-listening/index.json`

**Interfaces:**
- Produces: `renderListeningExam(unit, state)`
- Produces: `openIntensiveListening(unitId)`
- Produces: `returnToListeningExam(unitId)`

- [ ] **Step 1: Write failing interaction tests**

Require the exam view to render complete questions/options before transcript, hide answers until group submission, and contain a visible `精听这段材料` action.

- [ ] **Step 2: Implement exam-first rendering**

The default view contains media identity, player, all questions, one-click choices, group submission, then source answer/evidence. Transcript is hidden until permitted by learning/exam mode.

- [ ] **Step 3: Export canonical segments to the existing intensive-listening tool**

Generate a course manifest using the same stable unit/segment/media IDs. Pass `returnUrl`, `bookId`, and `unitId`; returning restores the exact exam unit and scroll anchor.

- [ ] **Step 4: Preserve lookup and exam boundaries**

Click lookup works on visible transcript/prompts/options. It cannot expose hidden transcript, answers, or evidence before unlock.

- [ ] **Step 5: Browser-verify desktop and 390px mobile, then commit**

Commit: `feat: add B2 listening exam and intensive study flow`

### Task 5: Rebuild the Recommendation-Letter Writing Pilot from PDF-094-096

**Files:**
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/写作/recommendation-letter.json`
- Modify: `scripts/russian-b2/build-writing.js`
- Modify: `tests/russian-b2/writing.test.js`
- Modify: `reader.html`
- Create: `js/russian-b2/writing.js`

**Interfaces:**
- `WritingTask = { id, source, examContext, task, materials, layoutTemplate, rubric, model, studySupport, reviewStatus }`
- Produces: draft versions keyed by stable task ID.

- [ ] **Step 1: Render and inspect PDF-094-096**

Verify book pages 90-92, overall writing instructions, 55-minute limit, score/pass information, every advertisement/material block, task sequence, and the complete recommendation model on PDF-096.

- [ ] **Step 2: Confirm the fidelity test fails against current short data**

Run: `node --test tests/russian-b2/writing.test.js`

Expected: FAIL on `instructionsRu`, `materials`, model page, rubric, and full model content.

- [ ] **Step 3: Enter the approved canonical task**

Preserve original Russian wording and visual grouping in structured blocks; add Chinese explanation only as `learning-summary`. Record both printed and PDF pages. Never label an abridged model as original.

- [ ] **Step 4: Implement the A-layout workbench**

Desktop: source task/materials left, draft and requirements right, learning support below. Mobile: task -> draft -> self-check -> feedback. Add word count, autosave, format preview, self-check, model unlock warning, and immutable version snapshots.

- [ ] **Step 5: Verify click lookup and draft exclusion**

Read-only Russian task/material/model text supports lookup; textarea and personal notes do not.

- [ ] **Step 6: Browser-verify and commit**

Commit: `feat: rebuild B2 recommendation writing workbench`

### Task 6: Restore All Remaining Listening Questions and Media States

**Files:**
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/film.json`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/news.json`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/interview.json`
- Modify: `scripts/russian-b2/build-listening.js`
- Modify: `tests/russian-b2/listening.test.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-listening-rebuild.md`

**Interfaces:** Produces 25/25 verified listening questions and explicit media/video status.

- [ ] **Step 1: Add the 25/25 release gate**

```js
assert.equal(units.flatMap(unit => unit.questions).length, 25);
assert.ok(units.flatMap(unit => unit.questions).every(q => q.options.length === 3));
```

- [ ] **Step 2: Verify PDF-106-112 and restore tasks 11-25**

Use Markdown/OCR only to accelerate transcription. Confirm every prompt, option, answer, transcript, and page against rendered source pages.

- [ ] **Step 3: Publish explicit media status**

Film/news/interview units without original video use `missing-original-video` plus `reconstructed-audio`; their attempts are labelled learning practice, not official simulation scores.

- [ ] **Step 4: Regenerate module data and intensive-listening manifests**

Run builders from canonical source once; no hand-edited copies in reader or immersion tool.

- [ ] **Step 5: Verify first/middle/last unit and commit**

Run: `node --test tests/russian-b2/listening.test.js tests/russian-b2/server-mime.test.js && npm run test:russian-b2`

Commit: `feat: complete verified B2 listening module`

### Task 7: Restore the Remaining Twelve Writing Genres

**Files:**
- Modify: the twelve remaining JSON files under `俄语资料库/俄语B2·原书复刻与学习版/规范数据/写作/`
- Modify: `scripts/russian-b2/build-writing.js`
- Modify: `tests/russian-b2/writing.test.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-writing-rebuild.md`

**Interfaces:** Produces 13/13 approved writing tasks using the Task 5 schema and workbench.

- [ ] **Step 1: Add a 13/13 fidelity gate**

Every task must contain full Russian instructions, structured materials (or an explicit verified no-material reason), layout template, rubric, complete original model, precise source pages, and approved status.

- [ ] **Step 2: Verify each task against its PDF pages**

Process in source order: application, invitation, autobiography, receipt, certificate, thank-you, congratulation, announcement, complaint, explanatory note, internship report, introduction letter. Preserve spatial document layout as structured regions.

- [ ] **Step 3: Add local feedback and version-chain tests**

Verify initial/revision/final versions never overwrite each other; model early-unlock is recorded; confirmed issues alone enter the writing issue book.

- [ ] **Step 4: Build all writing chapters and Markdown archive**

The reader and archive are generated from the same approved JSON; learning templates remain labelled separately from original models.

- [ ] **Step 5: Browser-verify representative genres and commit**

Verify recommendation, application, complaint, receipt, and internship report at desktop and 390px.

Run: `node --test tests/russian-b2/writing.test.js && npm run test:russian-b2`

Commit: `feat: complete verified B2 writing module`

### Task 8: Final Full-Book Build, Regression, and Acceptance

**Files:**
- Modify: `scripts/russian-b2/build-full-book.js`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/全书覆盖/pdf-page-ledger.json`
- Modify: `data/textbook/russian_b2/book.json`
- Create: `tests/russian-b2/listening-writing-acceptance.test.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-listening-writing-dashboard.md`

**Interfaces:** `buildFullBook({ root, write, strict })` publishes the single-book dashboard and all approved module indexes.

- [ ] **Step 1: Add final acceptance assertions**

Assert one B2 shelf book, seven dashboard modules, 25 complete listening questions, 13 complete writing tasks, zero spoken role labels, correct recommendation pages, and no unresolved published-source errors.

- [ ] **Step 2: Update page ledger and run strict build**

Record listening/writing task IDs, printed pages, PDF pages, media provenance, and review status. Strict build rejects unmapped published content or missing generated targets.

- [ ] **Step 3: Run fresh automated verification**

Run:

```powershell
node scripts/russian-b2/build-full-book.js --strict
npm run verify:russian-b2
npm run verify:russian-dictionary
```

Expected: all commands exit 0; global lookup and existing grammar/reading/speaking/exam tests remain green.

- [ ] **Step 4: Run browser acceptance**

Desktop and 390px: shelf -> one B2 book -> dashboard -> listening exam -> intensive listening -> return -> writing task -> draft/version/model -> dashboard. Confirm no horizontal overflow and no hidden-answer leakage.

- [ ] **Step 5: Record acceptance and finish branch**

Commit: `docs: accept rebuilt B2 listening writing and dashboard`

Use `superpowers:finishing-a-development-branch` only after all verification is fresh and the working tree contains no unrelated or sensitive files.
