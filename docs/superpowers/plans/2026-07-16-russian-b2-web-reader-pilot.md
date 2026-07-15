# Russian B2 Web Reader Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a verified 10-question Russian B2 grammar pilot in the existing web reader, with original-page evidence, answer-hidden quiz interaction, local progress, and generated Obsidian archive.

**Architecture:** Maintain one human-edited canonical chapter JSON inside the new Obsidian source vault. A Node build script validates it and generates the reader chapter JSON, Markdown archive, and range map. `reader.html` gains a metadata-driven `quiz-first` textbook renderer; it never hardcodes the Russian B2 book ID and keeps existing novel and reading-textbook flows intact.

**Tech Stack:** Vanilla ES5-compatible JavaScript in `reader.html`, Node.js 24 built-in test runner, Node CommonJS build/validation scripts, bundled Python 3.12 with pypdf/Pillow for local source-page extraction, JSON, Markdown, HTML/CSS, existing static `server.js`.

## Global Constraints

- `E:\Desktop\俄语B2.pdf` is the authoritative source; all transcribed question, answer, and rule text must be checked against the listed PDF pages.
- The first delivery is only grammar questions 1–10: questions PDF 18–19, rule page PDF 24, answers/explanations PDF 25–27; verified answer sequence is `В, В, Б, А, Г, Г, А, А, А, Б`.
- The reader is the main learning UI; Obsidian is an automatically generated searchable archive and evidence store.
- Do not hand-maintain both reader JSON and Markdown. Canonical JSON is the sole editable learning-content source.
- Answers and explanations are hidden by default. Selecting and confirming an answer must not automatically expand the explanation.
- Original answer/evidence and AI reference explanation must be visibly separate; AI text must carry `参考解析（AI，待复核）`.
- `reader.html` is a monolithic file. Add focused helpers and scoped CSS; preserve novel reading, lookup, bookmarks, report, themes, and existing textbook behavior.
- Do not touch `cloudsync-config.js`. If `package.json` is edited, replace the credential-bearing `repository.url` with `git+https://github.com/chenxingguo43-sudo/MyStudySpace.git`.
- Existing unrelated staged and untracked files must remain untouched. Use explicit path-only Git commits.
- PDF/JPEG source assets are local learning assets and are not committed to ordinary Git. Generated WebP preview pages may be evaluated separately before any asset commit.

---

## File Structure

| Path | Responsibility |
|---|---|
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/book.json` | Canonical book metadata, source manifest reference, and module list. |
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json` | Canonical pilot chapter, questions, source pages, verified answers, and labelled explanations. |
| `scripts/russian-b2/lib/contracts.js` | Pure CommonJS schema, answer-vector, and content-safety validators. |
| `scripts/russian-b2/build-pilot.js` | Reads canonical JSON and creates reader JSON, Markdown, and range-map outputs. |
| `scripts/russian-b2/extract-pilot-pages.py` | Local-only extractor: embeds original PDF JPEGs and makes browser-sized WebP derivatives. Ignored by the repository’s `*.py` rule. |
| `tests/russian-b2/contracts.test.js` | Unit tests for canonical-data and build-output contracts. |
| `tests/russian-b2/reader-static.test.js` | Static regression checks for reader functions, quiz safety, and no hardcoded B2 path. |
| `data/textbook/index.json` | Adds the `russian_b2` book entry with metadata-driven textbook location. |
| `data/textbook/russian_b2/ch0000.json` | Generated web-reader pilot chapter. |
| `data/textbook/russian_b2/pages/PDF-018.webp` etc. | Generated browser preview pages: 018, 019, 024, 025, 026, 027. |
| `reader.html` | General textbook metadata loading plus `quiz-first` rendering, interaction, local progress, source-page viewer, and scoped styles. |
| `俄语资料库/俄语B2·原书复刻与学习版/学习单元/语法词汇/02-名词与形容词接格-题1-10.md` | Generated Obsidian archive for the pilot. |
| `俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json` | Generated page-to-question-to-output mapping. |
| `docs/superpowers/acceptance/2026-07-16-russian-b2-web-reader-pilot.md` | Browser, mobile, source, and generation acceptance evidence. |

## Task 1: Establish the canonical-data contract and test command

**Files:**
- Create: `scripts/russian-b2/lib/contracts.js`
- Create: `tests/russian-b2/contracts.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces `validateBook(book)`, `validateChapter(chapter)`, `validateExercise(exercise)`, `assertPilotAnswerVector(chapter)`, and `toSafeText(value)` exported from `contracts.js`.
- Consumes canonical chapter objects defined in Task 3.
- Later tasks call `validateChapter()` before generating outputs and call `assertPilotAnswerVector()` as a non-negotiable guard.

- [ ] **Step 1: Write the failing contract tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateChapter,
  assertPilotAnswerVector,
  toSafeText
} = require('../../scripts/russian-b2/lib/contracts');

function makeExercise(id, answer) {
  return {
    id,
    type: 'single-choice',
    question: 'Тестовый вопрос',
    options: [
      { key: 'А', text: 'a' }, { key: 'Б', text: 'b' },
      { key: 'В', text: 'c' }, { key: 'Г', text: 'd' }
    ],
    answer,
    sourceAnswer: answer,
    sourceEvidence: 'PDF-025',
    referenceExplanation: '参考解析（AI，待复核）：测试。',
    pitfalls: ['测试干扰项'],
    questionPages: [18],
    answerPages: [25],
    reviewStatus: 'verified'
  };
}

test('accepts the complete Q001–Q010 pilot answer vector', () => {
  const answers = ['В', 'В', 'Б', 'А', 'Г', 'Г', 'А', 'А', 'А', 'Б'];
  const chapter = {
    index: 0, title: '名词与形容词接格（题 1–10）', module: '语法词汇',
    format: 'quiz-first',
    sourcePages: { questions: [18, 19], rules: [24], answers: [25, 26, 27] },
    exercises: answers.map((answer, index) => makeExercise(`Q${String(index + 1).padStart(3, '0')}`, answer))
  };
  assert.deepEqual(validateChapter(chapter), []);
  assert.doesNotThrow(() => assertPilotAnswerVector(chapter));
});

test('rejects answer/sourceAnswer mismatches and missing AI label', () => {
  const exercise = makeExercise('Q001', 'В');
  exercise.sourceAnswer = 'Б';
  exercise.referenceExplanation = '没有来源标签的解释';
  const errors = validateChapter({
    index: 0, title: 'x', module: '语法词汇', format: 'quiz-first',
    sourcePages: { questions: [18], rules: [24], answers: [25] }, exercises: [exercise]
  });
  assert.match(errors.join('\n'), /sourceAnswer/);
  assert.match(errors.join('\n'), /参考解析（AI，待复核）/);
});

test('escapes unsafe text before reader HTML rendering', () => {
  assert.equal(toSafeText('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});
```

- [ ] **Step 2: Run the tests and verify they fail because the contract module is absent**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: FAIL with `Cannot find module '../../scripts/russian-b2/lib/contracts'`.

- [ ] **Step 3: Implement the minimal reusable contract module**

```js
// scripts/russian-b2/lib/contracts.js
const PILOT_ANSWERS = ['В', 'В', 'Б', 'А', 'Г', 'Г', 'А', 'А', 'А', 'Б'];
const OPTION_KEYS = ['А', 'Б', 'В', 'Г'];

function toSafeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validateExercise(exercise) {
  const errors = [];
  if (!/^Q\d{3}$/.test(exercise.id || '')) errors.push('exercise.id must be QNNN');
  if (exercise.type !== 'single-choice') errors.push(`${exercise.id}: type must be single-choice`);
  if (!exercise.question) errors.push(`${exercise.id}: question is required`);
  if (!Array.isArray(exercise.options) || exercise.options.length !== 4) errors.push(`${exercise.id}: exactly four options are required`);
  if (Array.isArray(exercise.options) && exercise.options.map(o => o.key).join(',') !== OPTION_KEYS.join(',')) errors.push(`${exercise.id}: option keys must be А,Б,В,Г`);
  if (!OPTION_KEYS.includes(exercise.answer)) errors.push(`${exercise.id}: invalid answer`);
  if (exercise.answer !== exercise.sourceAnswer) errors.push(`${exercise.id}: answer must equal sourceAnswer`);
  if (!exercise.sourceEvidence) errors.push(`${exercise.id}: sourceEvidence is required`);
  if (!String(exercise.referenceExplanation || '').includes('参考解析（AI，待复核）')) errors.push(`${exercise.id}: referenceExplanation needs AI label`);
  if (!Array.isArray(exercise.questionPages) || !exercise.questionPages.length) errors.push(`${exercise.id}: questionPages is required`);
  if (!Array.isArray(exercise.answerPages) || !exercise.answerPages.length) errors.push(`${exercise.id}: answerPages is required`);
  if (!['verified', 'needs_review'].includes(exercise.reviewStatus)) errors.push(`${exercise.id}: invalid reviewStatus`);
  return errors;
}

function validateChapter(chapter) {
  const errors = [];
  if (!Number.isInteger(chapter.index) || chapter.index < 0) errors.push('chapter.index must be a non-negative integer');
  if (!chapter.title || !chapter.module) errors.push('chapter title and module are required');
  if (chapter.format !== 'quiz-first') errors.push('chapter.format must be quiz-first');
  if (!chapter.sourcePages || !chapter.sourcePages.questions?.length || !chapter.sourcePages.answers?.length) errors.push('chapter sourcePages questions and answers are required');
  if (!Array.isArray(chapter.exercises) || !chapter.exercises.length) errors.push('chapter exercises are required');
  (chapter.exercises || []).forEach(exercise => errors.push(...validateExercise(exercise)));
  return errors;
}

function assertPilotAnswerVector(chapter) {
  const actual = chapter.exercises.map(exercise => exercise.answer);
  if (actual.join('|') !== PILOT_ANSWERS.join('|')) throw new Error(`Pilot answers differ: ${actual.join(', ')}`);
}

module.exports = { PILOT_ANSWERS, validateExercise, validateChapter, assertPilotAnswerVector, toSafeText };
```

- [ ] **Step 4: Add the focused package command and remove the credential from package metadata**

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "test:russian-b2": "node --test tests/russian-b2/*.test.js",
    "start": "node server.js",
    "build:vocab": "node build-vocabulary.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/chenxingguo43-sudo/MyStudySpace.git"
  }
}
```

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `npm run test:russian-b2`

Expected: `3` passing tests and exit code `0`.

- [ ] **Step 6: Commit only this contract slice**

```powershell
git add -- package.json scripts/russian-b2/lib/contracts.js tests/russian-b2/contracts.test.js
git commit --only -m "feat: add Russian B2 data contracts" -- package.json scripts/russian-b2/lib/contracts.js tests/russian-b2/contracts.test.js
```

## Task 2: Extract and verify the six authoritative pilot pages

**Files:**
- Create: `scripts/russian-b2/extract-pilot-pages.py`
- Create locally, do not commit: `俄语资料库/俄语B2·原书复刻与学习版/原书/俄语B2.pdf`
- Create locally, do not commit: `俄语资料库/俄语B2·原书复刻与学习版/页图/PDF-018.jpg`, `PDF-019.jpg`, `PDF-024.jpg`, `PDF-025.jpg`, `PDF-026.jpg`, `PDF-027.jpg`
- Create locally, do not commit until asset policy is decided: `data/textbook/russian_b2/pages/PDF-018.webp` through `PDF-027.webp`
- Test: `tests/russian-b2/contracts.test.js`

**Interfaces:**
- Consumes `E:\Desktop\俄语B2.pdf` and page numbers `[18, 19, 24, 25, 26, 27]`.
- Produces original JPEGs for human evidence and page-matched WebP files for `sourcePages` in Task 4.
- Produces a manifest object `{ pdfPages: 190, extractedPages: [18,19,24,25,26,27] }` used by the build validator in Task 5.

- [ ] **Step 1: Extend the failing test with the required evidence-page set**

```js
test('requires all pilot question, rule, and answer page references', () => {
  const chapter = require('../../俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json');
  const pages = new Set([
    ...chapter.sourcePages.questions,
    ...chapter.sourcePages.rules,
    ...chapter.sourcePages.answers
  ]);
  assert.deepEqual([...pages].sort((a, b) => a - b), [18, 19, 24, 25, 26, 27]);
});
```

- [ ] **Step 2: Run the test and verify it fails because canonical pilot data does not yet exist**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: FAIL with module-not-found for the canonical pilot JSON.

- [ ] **Step 3: Add the local extractor with exact source and image policy**

```python
from pathlib import Path
from pypdf import PdfReader
from PIL import Image
from io import BytesIO

ROOT = Path(r"D:\MyStudySpace")
PDF = Path(r"E:\Desktop") / "俄语B2.pdf"
VAULT = ROOT / "俄语资料库" / "俄语B2·原书复刻与学习版"
PAGES = (18, 19, 24, 25, 26, 27)

reader = PdfReader(str(PDF))
if len(reader.pages) != 190:
    raise SystemExit(f"Expected 190 pages, found {len(reader.pages)}")

for number in PAGES:
    image = list(reader.pages[number - 1].images)[0]
    jpeg_path = VAULT / "页图" / f"PDF-{number:03}.jpg"
    jpeg_path.parent.mkdir(parents=True, exist_ok=True)
    jpeg_path.write_bytes(image.data)
    preview_path = ROOT / "data" / "textbook" / "russian_b2" / "pages" / f"PDF-{number:03}.webp"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview = Image.open(BytesIO(image.data)).convert("RGB")
    preview.thumbnail((1400, 1400))
    preview.save(preview_path, "WEBP", quality=82, method=6)
```

- [ ] **Step 4: Run extraction, inspect all six page files, and verify source facts manually**

Run:

```powershell
& 'C:\Users\梅子\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/russian-b2/extract-pilot-pages.py
```

Expected: six original JPEGs and six WebP previews. Visually verify: PDF 18–19 contain Q001–Q010, PDF 24 contains the rule reference, PDF 25–27 contain the answer sequence.

- [ ] **Step 5: Record the source manifest data, then rerun the evidence-page test**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: the page-set assertion now runs after Task 3 creates canonical data.

- [ ] **Step 6: Do not commit PDF, JPEG, WebP, or local Python extractor assets**

Keep the assets available for Tasks 4–7. Confirm with:

```powershell
git status --short -- "俄语资料库/俄语B2·原书复刻与学习版/原书" "俄语资料库/俄语B2·原书复刻与学习版/页图" "data/textbook/russian_b2/pages"
```

Expected: no large source asset is staged.

## Task 3: Create canonical pilot content and validate all ten questions

**Files:**
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/book.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json`
- Modify: `tests/russian-b2/contracts.test.js`

**Interfaces:**
- Produces canonical JSON consumed by `build-pilot.js` in Task 5.
- Each exercise uses the `validateExercise()` shape from Task 1.
- Questions use IDs `Q001` through `Q010` in order and answer vector exactly `В, В, Б, А, Г, Г, А, А, А, Б`.

- [ ] **Step 1: Write the failing content-completeness test**

```js
test('pilot source content has exactly ten sequential verified questions', () => {
  const chapter = require('../../俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json');
  assert.equal(chapter.exercises.length, 10);
  assert.deepEqual(chapter.exercises.map(exercise => exercise.id), [
    'Q001', 'Q002', 'Q003', 'Q004', 'Q005',
    'Q006', 'Q007', 'Q008', 'Q009', 'Q010'
  ]);
  assert.ok(chapter.exercises.every(exercise => exercise.reviewStatus === 'verified'));
  assert.doesNotThrow(() => assertPilotAnswerVector(chapter));
});
```

- [ ] **Step 2: Run the test and verify it fails before the canonical JSON exists**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: FAIL with module-not-found for `02-名词与形容词接格-题1-10.json`.

- [ ] **Step 3: Create book metadata and transcribe the pilot from the six checked pages**

Use this exact book metadata:

```json
{
  "id": "russian_b2",
  "title": "俄语 B2 全模块",
  "sourcePdf": "原书/俄语B2.pdf",
  "sourcePageCount": 190,
  "modules": ["语法词汇", "阅读", "写作", "听力", "会话", "真题"],
  "contentAuthority": "page-images",
  "generatedOutputs": ["reader-json", "obsidian-markdown", "range-map"]
}
```

Create a canonical chapter with `index: 0`, `title: "名词与形容词接格（题 1–10）"`, `module: "语法词汇"`, `format: "quiz-first"`, and `sourcePages: { "questions": [18, 19], "rules": [24], "answers": [25, 26, 27] }`. Every exercise must satisfy the Task 1 contract, contain four options in `А, Б, В, Г` order, and copy its Russian question and options character-for-character from the PDF page image.

Use this verified transcription checklist while entering the ten records; the old `P2_questions.md` is a cross-check only, while the six extracted source pages remain authoritative:

| ID | PDF page | Question stem | Required answer |
|---|---:|---|---|
| Q001 | 18 | `В центре Петербурга поставили памятник ... в 1782 г.` | В |
| Q002 | 18 | `Занятия ... развивают волю и повышают уверенность в себе.` | В |
| Q003 | 18 | `Студенты окружают заведующего ... русского языка.` | Б |
| Q004 | 18 | `Это лечение и забота ... наших верных друзей.` | А |
| Q005 | 18 | `Увлечение ... лишило его работы.` | Г |
| Q006 | 19 | `Из уважения ... молодые люди оказали нам большую услугу.` | Г |
| Q007 | 19 | `... на своем заседании принял важные решения.` | А |
| Q008 | 19 | `Если университет не живет свободной наукой, то в таком случае он не достоин ... университета.` | А |
| Q009 | 19 | `Я очень благодарен ..., кто помогал мне в трудные моменты.` | А |
| Q010 | 19 | `Задача легкая и понятна даже . . .` | Б |

Set Q001–Q005 `questionPages` to `[18]` and Q006–Q010 to `[19]`. Cite the actual supporting rule page and answer page(s) per question after checking PDF 24–27. Write an `referenceExplanation` beginning with `参考解析（AI，待复核）：` and at least one concrete wrong-option risk in `pitfalls` for every record.

- [ ] **Step 4: Run schema, vector, and source-page tests**

Run: `npm run test:russian-b2`

Expected: all contract tests pass and Q001–Q010 match the verified answer vector.

- [ ] **Step 5: Conduct a page-image content review before any code integration**

Checklist:

```text
[ ] Every prompt and option matches PDF 18 or 19.
[ ] Q001–Q010 answers match PDF 25–27 and the fixed vector.
[ ] Every sourceEvidence cites a real rule or answer page.
[ ] AI explanation has the required label and does not claim to be original text.
[ ] Every canonical field contains verified source text or a labelled explanatory sentence; no temporary marker text remains.
```

- [ ] **Step 6: Commit only canonical text and its tests**

```powershell
git add -- tests/russian-b2/contracts.test.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/book.json" "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json"
git commit --only -m "feat: add verified Russian B2 grammar pilot source" -- tests/russian-b2/contracts.test.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/book.json" "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json"
```

## Task 4: Generalize reader textbook loading and add the B2 shelf entry

**Files:**
- Modify: `data/textbook/index.json`
- Modify: `reader.html` in the data-loading and shelf-rendering sections around `fetchIndex()`, `fetchChapter()`, and `renderShelf()`
- Create: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Produces `getBookDataDir(bookId)` and `isQuizFirstBook(book)` in `reader.html`.
- Consumes textbook metadata where `kind: "textbook"`, `format: "quiz-first"`, and `dir: "russian_b2"` are authoritative.
- `fetchChapter('russian_b2', 0)` resolves `data/textbook/russian_b2/ch0000.json` without a new hardcoded book-ID comparison.

- [ ] **Step 1: Write static regression tests before modifying the monolith**

```js
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');

test('reader resolves textbook paths from metadata instead of a B2-specific branch', () => {
  assert.match(reader, /function getBookDataDir\(bookId\)/);
  assert.doesNotMatch(reader, /bookId === 'russian_b2'/);
  assert.match(reader, /data\/textbook/);
});

test('reader shows the textbook badge from metadata', () => {
  assert.match(reader, /b\.kind === 'textbook'/);
  assert.doesNotMatch(reader, /b\.id === 'reading_speaking'/);
});
```

- [ ] **Step 2: Run the reader static tests and verify the expected initial failure**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL because `getBookDataDir` and metadata-based badge logic do not exist yet.

- [ ] **Step 3: Add the B2 textbook record and metadata helpers**

Append this object to `data/textbook/index.json` without changing the existing reading textbook object:

```json
{
  "id": "russian_b2",
  "kind": "textbook",
  "format": "quiz-first",
  "title": "俄语 B2 全模块",
  "author": "原版教材学习版",
  "direction": "ru→cn",
  "chapters": 1,
  "dir": "russian_b2",
  "description": "原书对照、逐题解析与错题复习"
}
```

Replace the hardcoded textbook path logic with these functions:

```js
function getBookById(bookId) {
  for (var i = 0; i < booksData.length; i++) {
    if (booksData[i].id === bookId) return booksData[i];
  }
  return null;
}

function getBookDataDir(bookId) {
  var book = getBookById(bookId);
  return book && book.kind === 'textbook' ? 'data/textbook' : 'data/novel';
}

function isQuizFirstBook(book) {
  return !!book && book.kind === 'textbook' && book.format === 'quiz-first';
}

function fetchChapter(bookId, idx) {
  var padIdx = String(idx).padStart(4, '0');
  var book = getBookById(bookId);
  var dataDir = getBookDataDir(bookId);
  var directory = book && book.dir ? book.dir : bookId;
  return fetchJson(
    '/api/novel/' + encodeURIComponent(bookId) + '/' + idx,
    dataDir + '/' + directory + '/ch' + padIdx + '.json'
  );
}
```

In `renderShelf()`, replace the special `reading_speaking` expression with:

```js
(b.kind === 'textbook' ? '<span class="book-kind">教材</span>' : '')
```

and add `.book-kind` to the existing reader CSS using the current accent color and no emoji-only meaning.

- [ ] **Step 4: Rerun static tests and manually check existing reading textbook routing**

Run: `npm run test:russian-b2`

Expected: all tests pass.

Then run `node server.js`, open `http://localhost:3000/reader.html`, and verify both “В мире людей — 阅读口语” and “俄语 B2 全模块” appear on the shelf. Do not enter the B2 book until Task 6 has generated `ch0000.json`.

- [ ] **Step 5: Commit the metadata-routing slice**

```powershell
git add -- reader.html data/textbook/index.json tests/russian-b2/reader-static.test.js
git commit --only -m "feat: support metadata-driven textbooks in reader" -- reader.html data/textbook/index.json tests/russian-b2/reader-static.test.js
```

## Task 5: Generate reader JSON, Markdown archive, and range map from canonical data

**Files:**
- Create: `scripts/russian-b2/build-pilot.js`
- Create: `data/textbook/russian_b2/ch0000.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/学习单元/语法词汇/02-名词与形容词接格-题1-10.md`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json`
- Modify: `tests/russian-b2/contracts.test.js`

**Interfaces:**
- Consumes Task 3 canonical chapter JSON and Task 1 contracts.
- Produces the exact web `ch0000.json` consumed by Task 6 and Markdown/range-map evidence consumed by Task 7.
- Exports `buildPilot({ root })` for test use and invokes it when run directly.

- [ ] **Step 1: Write failing generated-output tests**

```js
const path = require('node:path');
const { buildPilot } = require('../../scripts/russian-b2/build-pilot');

test('build creates matching reader JSON, Markdown, and range map', () => {
  const root = path.resolve('.');
  const result = buildPilot({ root });
  const readerChapter = require('../../data/textbook/russian_b2/ch0000.json');
  const markdown = fs.readFileSync(result.markdownPath, 'utf8');
  const rangeMap = JSON.parse(fs.readFileSync(result.rangeMapPath, 'utf8'));
  assert.equal(readerChapter.exercises.length, 10);
  assert.match(markdown, /Q001/);
  assert.match(markdown, /答案与解析/);
  assert.deepEqual(rangeMap.entries[0].question_pages, [18, 19]);
  assert.deepEqual(rangeMap.entries[0].answer_pages, [25, 26, 27]);
});
```

- [ ] **Step 2: Run the test and verify it fails because the builder is absent**

Run: `node --test tests/russian-b2/contracts.test.js`

Expected: FAIL with module-not-found for `build-pilot`.

- [ ] **Step 3: Implement the deterministic builder**

The builder must:

```js
const readerChapter = {
  index: chapter.index,
  title: chapter.title,
  module: chapter.module,
  format: 'quiz-first',
  sourcePages: chapter.sourcePages,
  exercises: chapter.exercises
};
```

Write it to `data/textbook/russian_b2/ch0000.json` with two-space JSON indentation. Before writing, call `validateChapter(chapter)` and `assertPilotAnswerVector(chapter)`; throw a single `Error(errors.join('\n'))` if validation fails.

Generate Markdown with this answer-hidden structure for every exercise by interpolating the existing `exercise` fields; do not put template markers into generated Markdown:

```markdown
## Q001

${exercise.question}

- А. ${exercise.options[0].text}
- Б. ${exercise.options[1].text}
- В. ${exercise.options[2].text}
- Г. ${exercise.options[3].text}

> [!success]- 答案与解析
> **原书答案（已核对）：** В
>
> **原书依据：** ${exercise.sourceEvidence}
>
> **参考解析（AI，待复核）：** ${exercise.referenceExplanation}
>
> **易错点：** ${exercise.pitfalls.join('；')}
>
> **原书页：** PDF-018 · PDF-025
```

Generate `range_map.json` as:

```json
{
  "entries": [
    {
      "id": "russian_b2-grammar-02",
      "module": "语法词汇",
      "question_pages": [18, 19],
      "explanation_pages": [24],
      "answer_pages": [25, 26, 27],
      "reader_chapter": "data/textbook/russian_b2/ch0000.json",
      "markdown": "学习单元/语法词汇/02-名词与形容词接格-题1-10.md"
    }
  ]
}
```

- [ ] **Step 4: Run the builder and all data tests**

Run:

```powershell
node scripts/russian-b2/build-pilot.js
npm run test:russian-b2
```

Expected: generated outputs exist, all tests pass, and `ch0000.json` retains exactly ten canonical exercises.

- [ ] **Step 5: Diff generated content against the canonical data before committing**

Run:

```powershell
node -e "const a=require('./data/textbook/russian_b2/ch0000.json'); const b=require('./俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/02-名词与形容词接格-题1-10.json'); if(JSON.stringify(a.exercises)!==JSON.stringify(b.exercises)) process.exit(1)"
```

Expected: exit code `0`.

- [ ] **Step 6: Commit only generated text outputs and builder**

```powershell
git add -- scripts/russian-b2/build-pilot.js tests/russian-b2/contracts.test.js data/textbook/russian_b2/ch0000.json "俄语资料库/俄语B2·原书复刻与学习版/学习单元/语法词汇/02-名词与形容词接格-题1-10.md" "俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json"
git commit --only -m "feat: generate Russian B2 pilot learning outputs" -- scripts/russian-b2/build-pilot.js tests/russian-b2/contracts.test.js data/textbook/russian_b2/ch0000.json "俄语资料库/俄语B2·原书复刻与学习版/学习单元/语法词汇/02-名词与形容词接格-题1-10.md" "俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json"
```

## Task 6: Implement answer-hidden `quiz-first` interaction and local progress

**Files:**
- Modify: `reader.html` around `renderChapter()`, `renderExercises()`, and reader CSS
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Produces `renderQuizChapter(data)`, `renderQuizItem(exercise, progress)`, `selectQuizOption(questionId, key)`, `submitQuizQuestion(questionId)`, `toggleQuizExplanation(questionId)`, `getB2Progress()`, and `saveB2Progress(progress)`.
- Consumes canonical-shaped `data.exercises` from Task 5.
- Persists under `rr_b2_progress_v1` and does not change existing `rr_state_*`, `rr_stats_*`, bookmarks, or sync keys.

- [ ] **Step 1: Add failing static tests for the quiz interaction contract**

```js
test('reader provides quiz-first interaction without auto-revealing answers', () => {
  assert.match(reader, /function renderQuizChapter\(data\)/);
  assert.match(reader, /function selectQuizOption\(questionId, key\)/);
  assert.match(reader, /function submitQuizQuestion\(questionId\)/);
  assert.match(reader, /function toggleQuizExplanation\(questionId\)/);
  assert.match(reader, /rr_b2_progress_v1/);
  assert.match(reader, /查看答案与解析/);
  assert.doesNotMatch(reader, /submitQuizQuestion[\s\S]{0,900}toggleQuizExplanation/);
});
```

- [ ] **Step 2: Run static tests and verify they fail before quiz code exists**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL because the quiz helpers do not exist.

- [ ] **Step 3: Add scoped quiz progress helpers**

```js
var B2_PROGRESS_KEY = 'rr_b2_progress_v1';
var quizProgress = {};

function getB2Progress() {
  try { return JSON.parse(localStorage.getItem(B2_PROGRESS_KEY)) || {}; }
  catch (e) { return {}; }
}

function saveB2Progress(progress) {
  quizProgress = progress;
  try { localStorage.setItem(B2_PROGRESS_KEY, JSON.stringify(progress)); } catch (e) {}
}

function getQuizRecord(questionId) {
  var chapterKey = curBook.id + ':' + curCh;
  var all = getB2Progress();
  if (!all[chapterKey]) all[chapterKey] = {};
  if (!all[chapterKey][questionId]) all[chapterKey][questionId] = { selected: '', submitted: false, attempts: 0, wrong: false, explanationOpen: false };
  saveB2Progress(all);
  return all[chapterKey][questionId];
}
```

- [ ] **Step 4: Render native radio choices, confirm action, and collapsed explanation**

Use a `fieldset` per question. The implementation must render each option as a real radio input and label, disable the confirm button until selection, and use escaped text:

```js
function renderQuizItem(exercise, record) {
  var html = '<section class="b2-quiz-item" data-question-id="' + escapeHtml(exercise.id) + '">';
  html += '<h3>' + escapeHtml(exercise.id) + '. ' + escapeHtml(exercise.question) + '</h3>';
  html += '<fieldset class="b2-options"><legend class="sr-only">选择答案</legend>';
  for (var i = 0; i < exercise.options.length; i++) {
    var option = exercise.options[i];
    var inputId = 'b2-' + exercise.id + '-' + option.key;
    var checked = record.selected === option.key ? ' checked' : '';
    var disabled = record.submitted ? ' disabled' : '';
    html += '<input type="radio" id="' + inputId + '" name="b2-' + exercise.id + '" value="' + option.key + '"' + checked + disabled + ' onchange="selectQuizOption(\'' + exercise.id + '\',\'' + option.key + '\')">';
    html += '<label for="' + inputId + '"><strong>' + option.key + '.</strong> ' + escapeHtml(option.text) + '</label>';
  }
  html += '</fieldset>';
  html += '<button class="b2-confirm" data-question-id="' + exercise.id + '" onclick="submitQuizQuestion(\'' + exercise.id + '\')"' + (!record.selected || record.submitted ? ' disabled' : '') + '>确认答案</button>';
  html += '<div class="b2-result" aria-live="polite">' + renderQuizResult(exercise, record) + '</div>';
  html += '<button class="b2-explanation-toggle" onclick="toggleQuizExplanation(\'' + exercise.id + '\')"' + (!record.submitted ? ' disabled' : '') + '>查看答案与解析</button>';
  html += '<div class="b2-explanation"' + (record.explanationOpen ? '' : ' hidden') + '>' + renderQuizExplanation(exercise) + '</div></section>';
  return html;
}
```

`submitQuizQuestion()` must set `submitted`, increment `attempts`, set `wrong: record.selected !== exercise.answer`, save progress, and rerender the quiz. It must never call `toggleQuizExplanation()` or set `explanationOpen: true`.

- [ ] **Step 5: Add the quiz chapter branch without changing existing text chapters**

At the top of `renderChapter(data)`, add:

```js
if (isQuizFirstBook(curBook) && data.format === 'quiz-first') {
  renderQuizChapter(data);
  return;
}
```

`renderQuizChapter()` must provide: a title, source page buttons for question/rule/answer pages, all ten question sections, a manual `结束本单元` action, and existing previous/next chapter navigation. It must not render the old “查看原文 0/N 段” counter or call the paragraph-completion logic.

- [ ] **Step 6: Add responsive, accessible, scoped CSS**

```css
.b2-quiz-item { margin: 0 0 18px; padding: 20px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.b2-options { display: grid; gap: 10px; margin: 16px 0; border: 0; padding: 0; }
.b2-options input { position: absolute; opacity: 0; }
.b2-options label, .b2-confirm, .b2-explanation-toggle, .b2-source-page { min-height: 44px; display: flex; align-items: center; border-radius: 9px; }
.b2-options label { padding: 10px 14px; border: 1px solid var(--border); cursor: pointer; }
.b2-options input:focus-visible + label { outline: 3px solid var(--accent); outline-offset: 2px; }
.b2-options input:checked + label { border-color: var(--accent); background: var(--accent-dim); }
.b2-result.is-correct, .b2-result.is-wrong { font-weight: 700; margin-top: 12px; }
.b2-explanation { margin-top: 12px; padding: 16px; border-left: 3px solid var(--accent); background: var(--glass); }
.b2-source-label { display: block; margin-top: 12px; font-weight: 700; }
@media (max-width: 767px) { .b2-quiz-item { padding: 16px; } .b2-options label { font-size: 16px; } }
```

Use text labels `正确` and `错误` in addition to color. Render explanation sections in this exact order: `原书答案（已核对）`, `原书依据`, `参考解析（AI，待复核）`, `易错点`, `原书页`.

- [ ] **Step 7: Run tests and perform a browser interaction check**

Run: `npm run test:russian-b2`

Expected: all tests pass.

Browser check: choose a wrong option in Q001, click `确认答案`, verify the result reads `错误` while the explanation remains hidden; click `查看答案与解析`, verify the five labelled sections appear; refresh and verify the selected answer, attempt count, and wrong state persist.

- [ ] **Step 8: Commit the quiz-interaction slice**

```powershell
git add -- reader.html tests/russian-b2/reader-static.test.js
git commit --only -m "feat: add answer-hidden Russian B2 quiz flow" -- reader.html tests/russian-b2/reader-static.test.js
```

## Task 7: Add original-page viewer and correct completion behavior

**Files:**
- Modify: `reader.html` reader layout, source-page viewer helpers, completion logic, and responsive CSS
- Modify: `tests/russian-b2/reader-static.test.js`
- Create locally, do not commit: `data/textbook/russian_b2/pages/PDF-018.webp` through `PDF-027.webp`

**Interfaces:**
- Produces `renderSourceViewer(sourcePages)`, `setSourcePage(pageNumber)`, `openQuizSourceViewer()`, and `finishQuizChapter()`.
- Consumes WebP paths `data/textbook/russian_b2/pages/PDF-NNN.webp` created in Task 2.
- Reuses `reader-layout`, `reader-pane`, and the existing right panel without interfering with `openDetailPanel()` word lookup behavior.

- [ ] **Step 1: Add failing static checks for evidence-page and completion contracts**

```js
test('quiz source pages use local WebP assets and completion is not scroll-triggered', () => {
  assert.match(reader, /function setSourcePage\(pageNumber\)/);
  assert.match(reader, /PDF-' \+ String\(pageNumber\)\.padStart\(3, '0'\) \+ '\\.webp'/);
  assert.match(reader, /function finishQuizChapter\(\)/);
  assert.doesNotMatch(reader, /renderQuizChapter[\s\S]{0,6000}markChapterDone\(/);
});
```

- [ ] **Step 2: Run static tests and verify they fail before source-viewer implementation**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL because source-page functions are absent.

- [ ] **Step 3: Implement a quiz-only source panel that does not replace the word panel**

```js
function sourcePageUrl(pageNumber) {
  return 'data/textbook/russian_b2/pages/PDF-' + String(pageNumber).padStart(3, '0') + '.webp';
}

function renderSourceViewer(sourcePages) {
  var pages = [].concat(sourcePages.questions || [], sourcePages.rules || [], sourcePages.answers || []);
  var unique = pages.filter(function(page, index) { return pages.indexOf(page) === index; });
  var buttons = unique.map(function(page) {
    return '<button class="b2-source-page" onclick="setSourcePage(' + page + ')">PDF ' + page + '</button>';
  }).join('');
  return '<aside class="b2-source-viewer" id="b2SourceViewer" aria-label="原书页对照">' +
    '<div class="b2-source-tabs">' + buttons + '</div>' +
    '<img id="b2SourceImage" src="' + sourcePageUrl(unique[0]) + '" alt="原书 PDF 第 ' + unique[0] + ' 页">' +
    '</aside>';
}

function setSourcePage(pageNumber) {
  var image = document.getElementById('b2SourceImage');
  if (!image) return;
  image.src = sourcePageUrl(pageNumber);
  image.alt = '原书 PDF 第 ' + pageNumber + ' 页';
}
```

In `renderQuizChapter()`, render `renderSourceViewer(data.sourcePages)` beside the quiz pane. Keep the existing `detail-panel` available only for word lookup in non-quiz chapters; do not put source images inside `detailInner`.

- [ ] **Step 4: Implement completion based on submitted questions or explicit action**

```js
function finishQuizChapter() {
  var chapterKey = curBook.id + ':' + curCh;
  var records = getB2Progress()[chapterKey] || {};
  var questions = window.currentQuizExercises || [];
  var complete = questions.length > 0 && questions.every(function(exercise) { return records[exercise.id] && records[exercise.id].submitted; });
  if (!complete) {
    toast('请先确认全部题目，再结束本单元');
    return;
  }
  markChapterDone();
  toast('本单元已完成');
}
```

Remove or guard the old scroll-bottom completion handler so it skips `isQuizFirstBook(curBook)`. The learner should never receive “本章读完” solely from opening, scrolling to, or expanding the last quiz item.

- [ ] **Step 5: Add desktop and mobile source-viewer CSS**

```css
.b2-quiz-layout { display: flex; min-width: 0; gap: 18px; }
.b2-quiz-pane { min-width: 0; flex: 1 1 62%; }
.b2-source-viewer { width: min(38%, 480px); flex: 0 0 min(38%, 480px); position: sticky; top: 72px; align-self: flex-start; }
.b2-source-viewer img { width: 100%; max-height: calc(100vh - 110px); object-fit: contain; border: 1px solid var(--border); border-radius: 10px; background: #111; }
.b2-source-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
@media (max-width: 959px) { .b2-source-viewer { display: none; } .b2-source-viewer.is-open { display: block; position: fixed; inset: 56px 12px 70px; z-index: 220; width: auto; background: var(--bg); padding: 12px; overflow: auto; } }
@media (max-width: 767px) { .b2-quiz-layout { display: block; } .b2-source-viewer.is-open { inset: 48px 8px 60px; } }
```

Provide a visible `查看原书页` button in the quiz toolbar that toggles `.is-open` below 960px.

- [ ] **Step 6: Run unit tests and browser source-page checks**

Run: `npm run test:russian-b2`

Expected: all tests pass.

Browser check: open Q001, switch PDF 18 → 24 → 25, confirm each image is correct and non-empty; at 390px width open and close `查看原书页`; confirm no horizontal overflow and no covered bottom controls.

- [ ] **Step 7: Commit reader source-viewer and completion fixes**

```powershell
git add -- reader.html tests/russian-b2/reader-static.test.js
git commit --only -m "feat: add B2 source-page viewer and explicit completion" -- reader.html tests/russian-b2/reader-static.test.js
```

## Task 8: Full build verification, browser QA, and acceptance report

**Files:**
- Create: `docs/superpowers/acceptance/2026-07-16-russian-b2-web-reader-pilot.md`
- Modify if evidence reveals a defect: `reader.html`, `scripts/russian-b2/*`, or `tests/russian-b2/*`
- Create locally, do not commit by default: `docs/superpowers/acceptance/2026-07-16-russian-b2-web-reader-pilot/*.png`

**Interfaces:**
- Consumes all outputs from Tasks 1–7.
- Produces a factual pass/fail report, screenshots, exact commands, and known risks.
- A later whole-book plan may only use this pilot after the report is `PASS` or `PASS with known risks`.

- [ ] **Step 1: Run the full deterministic build and test sequence**

```powershell
& 'C:\Users\梅子\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/russian-b2/extract-pilot-pages.py
node scripts/russian-b2/build-pilot.js
npm run test:russian-b2
```

Expected: all three commands exit `0`; no answer-vector, canonical-data, range-map, or static-reader assertion fails.

- [ ] **Step 2: Test the local HTTP routes**

Run `node server.js`, then check:

```text
GET /reader.html                                      → 200 text/html
GET /data/textbook/index.json                         → contains russian_b2
GET /data/textbook/russian_b2/ch0000.json             → 200 application/json, 10 exercises
GET /data/textbook/russian_b2/pages/PDF-018.webp      → 200 image/webp
GET /api/novel/russian_b2/0                           → 200 application/json, same chapter data
```

If `.webp` is returned as `application/octet-stream`, update the `mimeTypes` map in `server.js` with `'.webp': 'image/webp'`, add a Node HTTP test for it, and rerun this step before continuing.

- [ ] **Step 3: Complete four visual acceptance states in the actual browser**

Capture and inspect screenshots for:

```text
1. Desktop dark: Q001–Q010 visible, no answers or explanations expanded.
2. Desktop dark: Q001 wrong answer submitted, text status visible, explanation still collapsed.
3. Desktop dark: Q001 explanation expanded with all five labelled source sections and PDF 25 selected.
4. 390px narrow viewport: source page opened and closed; no horizontal overflow or obscured action button.
```

Also verify existing reading textbook chapter 1 still loads, Russian word click still opens its detail pane, and the normal chapter completion flow still works outside `quiz-first`.

- [ ] **Step 4: Write the acceptance report with actual evidence only**

Write the report with these exact sections: `Result`, `Commands`, `Data evidence`, `Browser evidence`, `Regression evidence`, and `Known risks`. In `Commands`, record every real command and its observed result. In `Data evidence`, name the canonical source file, answer vector `В, В, Б, А, Г, Г, А, А, А, Б`, and page groups `18–19 / 24 / 25–27`. In `Browser evidence`, use a four-row table for desktop hidden, submitted-collapsed, expanded evidence, and narrow viewport; each row must cite the actual saved screenshot path and PASS or FAIL. `Known risks` may list only risks observed in this run.

- [ ] **Step 5: Final verification before claiming completion**

Run:

```powershell
git diff --check
npm run test:russian-b2
git status --short
```

Expected: no whitespace errors in project changes, tests pass, and only deliberate Russian B2 files are staged for the final commit.

- [ ] **Step 6: Commit the report only after a passing verification run**

```powershell
git add -- docs/superpowers/acceptance/2026-07-16-russian-b2-web-reader-pilot.md
git commit --only -m "docs: verify Russian B2 web reader pilot" -- docs/superpowers/acceptance/2026-07-16-russian-b2-web-reader-pilot.md
```

## Final Plan Self-Review

### Spec coverage

| Design requirement | Plan task |
|---|---|
| Web reader as primary learning UI | Tasks 4, 6, 7 |
| One canonical content source, generated outputs | Tasks 1, 3, 5 |
| Original page evidence and WebP preview | Task 2, Task 7 |
| A/Б/В/Г selection, answer hidden, no auto-reveal | Task 6 |
| Separate original/AI explanations | Tasks 1, 3, 5, 6 |
| Local progress and wrong-answer record | Task 6 |
| No scroll-triggered quiz completion | Task 7 |
| Obsidian searchable archive and range map | Task 5 |
| Desktop/mobile accessibility and regression QA | Tasks 6–8 |
| Pilot-only scope and verified answer sequence | Tasks 2–3, 8 |

### Placeholder scan

No task contains temporary content markers. The HTML-like strings found by a literal angle-bracket search are executable HTML-rendering or XSS-escaping code, not unfinished content. No implementation task depends on undefined names: all builder, validator, reader, and progress interfaces are defined in the task where they are introduced.

### Type consistency

- Canonical exercises use `id`, `type`, `options`, `answer`, `sourceAnswer`, `sourceEvidence`, `referenceExplanation`, `pitfalls`, `questionPages`, `answerPages`, and `reviewStatus` in Tasks 1, 3, 5, and 6.
- `buildPilot({ root })` is introduced in Task 5 and used by its test only.
- `getB2Progress()`, `saveB2Progress(progress)`, `renderQuizChapter(data)`, `selectQuizOption(questionId, key)`, `submitQuizQuestion(questionId)`, and `toggleQuizExplanation(questionId)` are introduced and used consistently in Task 6.
- `setSourcePage(pageNumber)` and `finishQuizChapter()` are introduced and tested in Task 7.
