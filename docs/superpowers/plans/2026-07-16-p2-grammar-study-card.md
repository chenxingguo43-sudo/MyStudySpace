# P2 Grammar Study Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one source-traceable P2 study card for “持续、原因与时间关系” that teaches grammar before practice and links back to the existing P2 question and wrong-answer flows.

**Architecture:** Keep the full grammar book untouched. Store a compact, validated card document in the B2 canonical-data tree; a small builder copies it into the reader’s `data/textbook/russian_b2/study-cards/` directory. `reader.html` loads that one card on demand, renders its source-labelled learning sections, and uses the existing persistent B2 progress records plus a queued practice request to enter either all scoped questions or only scoped historical wrong questions.

**Tech Stack:** Node.js built-in test runner and filesystem APIs; static HTML/CSS/JavaScript; existing JSON textbook build pipeline; browser verification at localhost.

## Global Constraints

- Do not modify any source Markdown under `D:\MyStudySpace\俄语资料库\新编俄语语法`.
- Use grammar-book examples as the primary examples; mark every added pair as `学习补充`.
- Do not include B2 correct answers, option elimination, or original per-question explanations in the study card.
- Keep the original answer/analysis reveal in the quiz page unchanged.
- The card’s practice scope is exactly `P2-Q051` through `P2-Q058`.
- The card must cite existing `08 前置词.md` sections and source-page markers, and its citations must be machine-validated.
- Preserve existing P1–P6 navigation, retry behavior, wrong-answer book behavior, and all user progress fields.

---

## File Structure

| File | Responsibility |
|---|---|
| `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/p2-time-cause-study-card.json` | Canonical, source-labelled learning content for one P2 point. |
| `scripts/russian-b2/lib/study-cards.js` | Reads, validates, and publishes study-card JSON without reading or changing user progress. |
| `scripts/russian-b2/build-study-cards.js` | CLI/build entry point that validates the card against the P2 chapter and grammar-book Markdown, then writes reader data. |
| `data/textbook/russian_b2/study-cards/p2-time-cause.json` | Generated reader payload; never edit manually. |
| `tests/russian-b2/study-cards.test.js` | Source, scope, provenance, and output validation. |
| `reader.html` | Study-card route, card rendering, progress summary, navigation action handlers, and targeted CSS. |
| `tests/russian-b2/reader-static.test.js` | Static contracts for the new route and for preserving answer/analysis separation. |

## Task 1: Publish and validate the P2 study-card data

**Files:**
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/p2-time-cause-study-card.json`
- Create: `scripts/russian-b2/lib/study-cards.js`
- Create: `scripts/russian-b2/build-study-cards.js`
- Create: `tests/russian-b2/study-cards.test.js`
- Modify: `package.json` to add `build:russian-b2-study-cards`.

**Interfaces:**
- Consumes: `data/textbook/russian_b2/ch0001.json`, `08 前置词.md`, and the canonical card JSON.
- Produces: `buildStudyCards({ root, write }) -> { cards, outputPaths }` and `validateStudyCard({ card, chapter, grammarText }) -> string[]`.
- Output document fields: `id`, `partId`, `knowledgePointId`, `title`, `exerciseIds`, `overview`, `decisionSteps`, `rules`, `comparisons`, `examples`, `pitfalls`, `sources`.

- [ ] **Step 1: Write the failing card-data test**

Create `tests/russian-b2/study-cards.test.js` with these exact behavioral checks:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildStudyCards, validateStudyCard } = require('../../scripts/russian-b2/lib/study-cards');

const root = path.resolve(__dirname, '..', '..');

test('P2 time-and-cause card is source-traceable and scoped to Q051–Q058', () => {
  const result = buildStudyCards({ root, write: false });
  assert.equal(result.cards.length, 1);
  const card = result.cards[0];
  assert.equal(card.id, 'p2-time-cause');
  assert.deepEqual(card.exerciseIds, ['P2-Q051','P2-Q052','P2-Q053','P2-Q054','P2-Q055','P2-Q056','P2-Q057','P2-Q058']);
  assert.ok(card.rules.every(rule => rule.source.kind === 'grammar-book'));
  assert.ok(card.examples.filter(example => example.source.kind === 'study-supplement').length <= 2);
  assert.deepEqual(card.answerAnalysis, undefined);
});

test('study-card validation rejects missing grammar headings and unlabelled supplements', () => {
  const card = { id: 'p2-time-cause', partId: 'p2', knowledgePointId: 'p2-time-cause', exerciseIds: ['P2-Q051'], rules: [{ text: 'x', source: { kind: 'grammar-book', file: '08 前置词.md', section: '不存在的小节', pages: [1] } }], examples: [{ ru: 'x', zh: 'x', source: { kind: 'study-supplement' } }] };
  const chapter = { id: 'p2', knowledgePoints: [{ id: 'p2-time-cause', exerciseIds: ['P2-Q051'] }] };
  const errors = validateStudyCard({ card, chapter, grammarText: '# 前置词' });
  assert.ok(errors.some(error => error.includes('不存在的小节')));
  assert.ok(errors.some(error => error.includes('学习补充')));
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `node --test tests/russian-b2/study-cards.test.js`

Expected: failure because `scripts/russian-b2/lib/study-cards.js` and the canonical card do not exist.

- [ ] **Step 3: Create the canonical card using only cited rules and labelled examples**

Create `p2-time-cause-study-card.json` using this shape. Preserve the source label on every rule and example:

```json
{
  "id": "p2-time-cause",
  "partId": "p2",
  "knowledgePointId": "p2-time-cause",
  "title": "持续、原因与时间关系",
  "exerciseIds": ["P2-Q051", "P2-Q052", "P2-Q053", "P2-Q054", "P2-Q055", "P2-Q056", "P2-Q057", "P2-Q058"],
  "overview": "本组练习区分时间点、完成时长、先后关系与原因关系；先判断语义，再选前置词和格。",
  "decisionSteps": [
    "先判断动作是经过多久后发生，还是在多久内完成。",
    "再判断结构表达时间先后，还是表达产生结果的原因。",
    "最后检查前置词要求的格和名词词形。"
  ],
  "rules": [
    {
      "structure": "через + 时间",
      "meaning": "经过一段时间以后发生。",
      "source": { "kind": "grammar-book", "label": "新编俄语语法", "file": "08 前置词.md", "section": "表示时间意义的前置词辨析", "pages": [297] }
    },
    {
      "structure": "за + 时间",
      "meaning": "在一段时间内完成动作。",
      "source": { "kind": "grammar-book", "label": "新编俄语语法", "file": "08 前置词.md", "section": "表示时间意义的前置词辨析", "pages": [297] }
    },
    {
      "structure": "благодаря + 第三格 / из-за + 第二格",
      "meaning": "前者说明积极结果的原因，后者说明消极或不良结果的外在原因。",
      "source": { "kind": "grammar-book", "label": "新编俄语语法", "file": "08 前置词.md", "section": "前置词 благодаря, из-за", "pages": [304, 305] }
    }
  ],
  "comparisons": [],
  "examples": [],
  "pitfalls": ["不要把“多久后发生”和“用了多久完成”当成同一类时间关系。"],
  "sources": []
}
```

Fill `comparisons` with `через / за` and `благодаря / из-за`; fill `examples` with four to six grammar-book examples that are verifiably present in the cited Markdown. Add no more than two supplementary paired examples, each with `source: { "kind": "study-supplement", "label": "学习补充" }`.

- [ ] **Step 4: Implement source discovery, validation, and publication**

Create `scripts/russian-b2/lib/study-cards.js` with these exports and behavior:

```js
function resolveGrammarRoot(root) {
  const direct = path.join(root, '俄语资料库', '新编俄语语法');
  const shared = path.resolve(root, '..', '..', '俄语资料库', '新编俄语语法');
  return fs.existsSync(direct) ? direct : shared;
}

function validateStudyCard({ card, chapter, grammarText }) {
  const errors = [];
  const point = (chapter.knowledgePoints || []).find(item => item.id === card.knowledgePointId);
  if (!point) errors.push(`${card.id}: knowledge point is missing from ${chapter.id}`);
  if (!point || JSON.stringify(card.exerciseIds) !== JSON.stringify(point.exerciseIds)) errors.push(`${card.id}: exerciseIds must exactly match its knowledge point`);
  for (const item of [...(card.rules || []), ...(card.examples || [])]) {
    const source = item.source || {};
    if (source.kind === 'grammar-book' && (!source.section || !grammarText.includes(source.section))) errors.push(`${card.id}: grammar section ${source.section || '(missing)'} was not found`);
    if (source.kind === 'study-supplement' && source.label !== '学习补充') errors.push(`${card.id}: 学习补充 must use the 学习补充 label`);
  }
  if ('answerAnalysis' in card) errors.push(`${card.id}: answerAnalysis is not allowed in a study card`);
  return errors;
}
```

`buildStudyCards({ root, write })` must load `ch0001.json`, load the canonical card, load its cited `08 前置词.md`, throw `Error(errors.join('\n'))` on validation errors, and when `write` is true write the card to `data/textbook/russian_b2/study-cards/p2-time-cause.json` using UTF-8 pretty JSON.

Create `scripts/russian-b2/build-study-cards.js` as:

```js
const path = require('node:path');
const { buildStudyCards } = require('./lib/study-cards');
console.log(buildStudyCards({ root: path.resolve(__dirname, '..', '..'), write: true }));
```

Add to `package.json`:

```json
"build:russian-b2-study-cards": "node scripts/russian-b2/build-study-cards.js"
```

- [ ] **Step 5: Run data tests and build output**

Run:

```powershell
node --test tests/russian-b2/study-cards.test.js
npm run build:russian-b2-study-cards
```

Expected: both commands pass; the output JSON exists at `data/textbook/russian_b2/study-cards/p2-time-cause.json`.

- [ ] **Step 6: Commit the self-contained data pipeline**

```powershell
git add -- "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/p2-time-cause-study-card.json" scripts/russian-b2/lib/study-cards.js scripts/russian-b2/build-study-cards.js tests/russian-b2/study-cards.test.js package.json data/textbook/russian_b2/study-cards/p2-time-cause.json
git commit -m "feat: publish source-traceable P2 study card"
```

## Task 2: Render the study card and route existing learning actions through it

**Files:**
- Modify: `reader.html:507-513` for study-card styles.
- Modify: `reader.html:1045-1265` for load/render/action functions and queued scoped practice.
- Modify: `tests/russian-b2/reader-static.test.js`.

**Interfaces:**
- Consumes: published `data/textbook/russian_b2/study-cards/p2-time-cause.json`, `getB2Progress()`, `restartQuiz(mode, exerciseIds)`, and `showWrongAnswerBook(partFilter, pointFilter)`.
- Produces: `showStudyCard(partId, pointId)`, `renderStudyCard(card, point)`, `openStudyCardPractice(partId, exerciseIds, wrongOnly)`, `getStudyCardProgress(partId, exerciseIds)`.

- [ ] **Step 1: Write failing reader static contracts**

Append this test:

```js
test('reader provides a source-labelled study card without duplicating answer analysis', () => {
  assert.match(reader, /function showStudyCard\(partId, pointId\)/);
  assert.match(reader, /function renderStudyCard\(card, point\)/);
  assert.match(reader, /function getStudyCardProgress\(partId, exerciseIds\)/);
  assert.match(reader, /function openStudyCardPractice\(partId, exerciseIds, wrongOnly\)/);
  assert.match(reader, /study-cards\//);
  const cardBody = reader.match(/function renderStudyCard\(card, point\) \{([\s\S]*?)\n\}/);
  assert.ok(cardBody);
  assert.doesNotMatch(cardBody[1], /sourceAnswer|sourceExplanation|referenceExplanation/);
});
```

- [ ] **Step 2: Run the reader test and verify it fails**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: failure because the four study-card functions do not exist.

- [ ] **Step 3: Add focused card styles and safe card rendering**

Add CSS classes adjacent to `.b2-knowledge-nav`: `.b2-study-card`, `.b2-study-section`, `.b2-study-rule-grid`, `.b2-study-comparison`, `.b2-study-source`, `.b2-study-actions`, and `.b2-study-status`. Use existing CSS variables (`--surface-solid`, `--accent`, `--border`, `--text-secondary`) only.

Implement the renderer so it never reads answer-related fields:

```js
function renderStudyCard(card, point) {
  var progress = getStudyCardProgress(card.partId, card.exerciseIds);
  var rules = card.rules.map(function(rule) {
    return '<article class="b2-study-rule"><strong>' + escapeHtml(rule.structure) + '</strong><p>' + escapeHtml(rule.meaning) + '</p>' + renderStudySource(rule.source) + '</article>';
  }).join('');
  return '<div class="main-container b2-study-card">' +
    '<button class="tb-btn" onclick="goChapter(' + (card.partId.slice(1) - 1) + ')">← 返回 P' + card.partId.slice(1) + '</button>' +
    '<header class="b2-quiz-header"><h1>' + escapeHtml(card.title) + '</h1><p>对应练习：' + escapeHtml(formatQuestionRange(card.exerciseIds)) + '</p><div class="b2-study-status">已答 ' + progress.answered + ' · 历史错 ' + progress.everWrong + ' · 待掌握 ' + progress.pending + '</div></header>' +
    '<section class="b2-study-section"><h2>这一组题考什么</h2><p>' + escapeHtml(card.overview) + '</p></section>' +
    '<section class="b2-study-section"><h2>做题判断顺序</h2><ol>' + card.decisionSteps.map(function(step) { return '<li>' + escapeHtml(step) + '</li>'; }).join('') + '</ol></section>' +
    '<section class="b2-study-section"><h2>核心规则</h2><div class="b2-study-rule-grid">' + rules + '</div></section>' +
    renderStudyComparisons(card.comparisons) + renderStudyExamples(card.examples) + renderStudyPitfalls(card.pitfalls) +
    '<section class="b2-study-actions"><button class="b2-finish" onclick="openStudyCardPractice(\'' + card.partId + '\',' + escapeHtml(JSON.stringify(card.exerciseIds)).replace(/"/g, '&quot;') + ',false)">做本知识点全部题目</button><button class="b2-finish" onclick="openStudyCardPractice(\'' + card.partId + '\',' + escapeHtml(JSON.stringify(card.exerciseIds)).replace(/"/g, '&quot;') + ',true)">只重做本点错题</button><button class="b2-finish" onclick="showWrongAnswerBook(\'' + card.partId + '\',\'' + escapeHtml(point.title) + '\')">查看错题本</button></section></div>';
}
```

`renderStudySource` must render only `source.label`, `source.file`, `source.section`, and `source.pages`; `renderStudyExamples` must visibly render `学习补充` when `example.source.kind === 'study-supplement'`.

- [ ] **Step 4: Implement loading, progress totals, and queued scoped practice**

Use the reader’s existing chapter fetch convention. Add:

```js
function fetchStudyCard(pointId) {
  return fetch('data/textbook/russian_b2/study-cards/' + encodeURIComponent(pointId) + '.json').then(function(response) {
    if (!response.ok) throw new Error('study card not found');
    return response.json();
  });
}
function getStudyCardProgress(partId, exerciseIds) {
  var records = getB2Progress()['russian_b2:' + partId] || {};
  return exerciseIds.reduce(function(total, exerciseId) {
    var record = records[exerciseId] || {};
    total.answered += record.submitted ? 1 : 0;
    total.everWrong += record.everWrong ? 1 : 0;
    total.pending += record.lastResult === 'wrong' ? 1 : 0;
    return total;
  }, { answered: 0, everWrong: 0, pending: 0 });
}
```

`showStudyCard(partId, pointId)` must fetch the P2 chapter, find the point by ID, display a loading state, then render the card. On failure, render `❌ 知识点卡加载失败` with a return-to-P2 button.

Add a `pendingQuizPractice` object. `openStudyCardPractice` sets `{ partId, exerciseIds, wrongOnly }`, sets `curBook` to `russian_b2`, and calls `goChapter(partIndex)`. At the end of `renderQuizChapter`, consume the request only when `data.id === pendingQuizPractice.partId`; then call `restartQuiz(pendingQuizPractice.wrongOnly ? 'knowledge-wrong' : 'knowledge', pendingQuizPractice.exerciseIds)`.

Extend the existing filter inside `restartQuiz` so both modes work:

```js
var needsWrongHistory = mode === 'wrong' || mode === 'knowledge-wrong';
var needsKnowledgeScope = mode === 'knowledge' || mode === 'knowledge-wrong';
currentQuizExercises = currentQuizAllExercises
  .filter(function(exercise) { return !needsWrongHistory || records[exercise.id] && records[exercise.id].everWrong; })
  .filter(function(exercise) { return !needsKnowledgeScope || (exerciseIds || []).indexOf(exercise.id) !== -1; });
```

Change `renderKnowledgePointNav(points)` so its card invokes `showStudyCard('p2', point.id)` for P2 points with a published card; retain direct `restartQuiz('knowledge', exerciseIds)` behavior for all points without a card.

- [ ] **Step 5: Run reader static tests**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: all existing reader tests and the new card contract pass.

- [ ] **Step 6: Commit the reader route**

```powershell
git add -- reader.html tests/russian-b2/reader-static.test.js
git commit -m "feat: add P2 grammar study card"
```

## Task 3: Run full verification and browser acceptance

**Files:**
- Create: `docs/superpowers/acceptance/2026-07-16-p2-grammar-study-card.md`

**Interfaces:**
- Consumes: built card JSON, P2 reader route, and existing wrong-answer progress structure.
- Produces: repeatable written evidence that the card is source-labelled, readable, and connected to the right scoped practice.

- [ ] **Step 1: Run the full automated suite and regenerate published output**

Run:

```powershell
npm run test:russian-b2
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build:russian-b2-study-cards
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/russian-b2/build-six-part-book.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git diff --check
```

Expected: the B2 suite passes, the generated card is present, six-part reader data remains P1–P6, and whitespace validation passes.

- [ ] **Step 2: Browser-verify the learning flow using an isolated local port**

Run the worktree server on an unused port. In a clean browser origin:

1. Open the B2 shelf, then P2.
2. Click `持续、原因与时间关系` in the knowledge-point navigation.
3. Confirm the visible card contains all eight learning sections, source labels pointing to `08 前置词.md`, grammar-book examples, and any supplementary label.
4. Confirm no B2 answer, source explanation, reference explanation, or option-elimination text appears on the card.
5. Click “做本知识点全部题目” and confirm exactly P2-Q051 through P2-Q058 render.
6. Create one wrong result in that scope, return to the card, click “只重做本点错题”, and confirm only that historical wrong question renders.
7. Click “查看错题本” and confirm both filters show P2 plus `持续、原因与时间关系`.
8. Return to the original question and confirm its existing `查看答案与解析` button still reveals the answer and original explanation.

- [ ] **Step 3: Record evidence and commit it**

Create the acceptance document with command results, browser observations, test URL/port, and a statement that the isolated browser origin did not use the user’s normal study progress.

```powershell
git add -- docs/superpowers/acceptance/2026-07-16-p2-grammar-study-card.md data/textbook/russian_b2/study-cards/p2-time-cause.json
git commit -m "test: verify P2 grammar study card"
```
