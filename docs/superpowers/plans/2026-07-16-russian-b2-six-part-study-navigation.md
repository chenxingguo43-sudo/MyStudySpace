# 俄语 B2 六部分连续练习与知识点导航 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将《俄语 B2 全模块》从 30 个十题单元收束为 P1–P6 六个连续练习部分，并在每部分提供由原书解析支持的知识点导航。

**Architecture:** 规范数据新增一份六部分导航清单，清单负责题目聚合顺序与知识点—题号关系。新的构建脚本读取既有已发布单元、验证题目和来源账本不变，生成 6 个 reader JSON；`reader.html` 将其作为新的章节入口，并用稳定题号作为进度键，避免旧作答数据失效。

**Tech Stack:** Node.js CommonJS、`node:test`、静态 HTML/CSS/JavaScript、JSON、现有 Node 静态服务器。

## Global Constraints

- 不修改原题、选项、答案、原书页图绑定或来源账本。
- 不重排题目；一个题目只在所属 P1–P6 部分中出现一次。
- 知识点名称、规则、易错点和原书依据必须逐题/逐页核验，不得凭泛化语法知识补写。
- P6 只包含已发布的独立题 1–8、27–36。
- 继续使用 `rr_b2_progress_v1`；已答题的稳定 ID 记录必须可被新章节读取。
- 不暂存 `package-lock.json`、`cloudsync-config.js`、`data/textbook/russian_b2/pages/`、`tmp/` 或原书/页图未跟踪文件。

---

## File structure

- Create `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-study-navigation.json`: 六个部分的标题、原单元顺序、知识点和依据页；唯一的学习导航事实来源。
- Create `scripts/russian-b2/build-six-part-book.js`: 聚合已发布单元、验证导航清单、生成六个 `data/textbook/russian_b2/ch0000.json` 至 `ch0005.json`，并更新 reader index。
- Modify `scripts/russian-b2/lib/contracts.js`: 增加 `validateStudyNavigation` 与 `validatePartChapter`，使导航数据和聚合章节可独立验证。
- Create `tests/russian-b2/six-part-book.test.js`: 对导航验证、题目聚合、P6 非连续范围和不变量做 TDD 测试。
- Modify `reader.html`: 渲染知识点导航卡片、实现无重排跳转，调整章节目录文案为六部分。
- Modify `tests/russian-b2/reader-static.test.js`: 固化新导航元素、稳定进度键和滚动行为的静态回归。
- Modify `data/textbook/index.json`: 由构建脚本写入 `chapters: 6`、六个部分 ID 与 `chapterTitles`；不手动维护。

### Task 1: 定义并测试导航数据契约

**Files:**
- Create: `tests/russian-b2/six-part-book.test.js`
- Modify: `scripts/russian-b2/lib/contracts.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-study-navigation.json`

**Interfaces:**
- Produces: `validateStudyNavigation({ navigation, units }) -> string[]`。
- A navigation part has `{ id, part, title, unitIds, knowledgePoints }`.
- A knowledge point has `{ id, title, exerciseIds, rule, pitfalls, sourcePages }`.

- [ ] **Step 1: Write the failing contract tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStudyNavigation } = require('../../scripts/russian-b2/lib/contracts');

test('study navigation rejects a missing exercise and unsupported rule', () => {
  const errors = validateStudyNavigation({
    units: [{ id: 'p2-q001-q010', part: 2, exercises: [{ id: 'P2-Q001' }] }],
    navigation: { parts: [{
      id: 'p2', part: 2, title: 'P2', unitIds: ['p2-q001-q010'],
      knowledgePoints: [{ id: 'p2-case', title: '接格', exerciseIds: ['P2-Q999'], rule: '', pitfalls: '', sourcePages: [] }]
    }] }
  });
  assert.deepEqual(errors, [
    'p2-case: exercise P2-Q999 is not in part 2',
    'p2-case: rule is required',
    'p2-case: sourcePages is required'
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/russian-b2/six-part-book.test.js`

Expected: FAIL because `validateStudyNavigation` is not exported.

- [ ] **Step 3: Implement the smallest validation API**

```js
function validateStudyNavigation({ navigation, units }) {
  const errors = [];
  const byUnit = new Map((units || []).map(unit => [unit.id, unit]));
  const byExercise = new Map((units || []).flatMap(unit =>
    (unit.exercises || []).map(exercise => [exercise.id, { exercise, unit }])
  ));
  const seenParts = new Set();
  (navigation.parts || []).forEach(part => {
    if (seenParts.has(part.id)) errors.push(`${part.id}: part id must be unique`);
    seenParts.add(part.id);
    (part.unitIds || []).forEach(unitId => {
      const unit = byUnit.get(unitId);
      if (!unit || unit.part !== part.part) errors.push(`${part.id}: unit ${unitId} is not in part ${part.part}`);
    });
    (part.knowledgePoints || []).forEach(point => {
      (point.exerciseIds || []).forEach(exerciseId => {
        const found = byExercise.get(exerciseId);
        if (!found || found.unit.part !== part.part) errors.push(`${point.id}: exercise ${exerciseId} is not in part ${part.part}`);
      });
      if (!point.rule) errors.push(`${point.id}: rule is required`);
      if (!Array.isArray(point.sourcePages) || !point.sourcePages.length) errors.push(`${point.id}: sourcePages is required`);
    });
  });
  return errors;
}
```

Export it with the existing contract functions.

- [ ] **Step 4: Run the contract test**

Run: `node --test tests/russian-b2/six-part-book.test.js`

Expected: PASS for the negative validation case.

- [ ] **Step 5: Add the verified six-part navigation document**

Use the published unit manifest and each `part-0N-source-ledger.json` as primary evidence. For every P1–P6 entry, include all published unit IDs in printed order. For every knowledge point, cite the exact `exerciseIds`, a concise rule, optional concise pitfall, and nonempty original rule/answer page list. P6 must name only `P6-Q001`–`P6-Q008` and `P6-Q027`–`P6-Q036`.

```json
{
  "parts": [{
    "id": "p2",
    "part": 2,
    "title": "P2 名词、形容词与接格",
    "unitIds": ["p2-q001-q010", "p2-q011-q020"],
    "knowledgePoints": [{
      "id": "p2-time-relations",
      "title": "时间关系的前置词结构",
      "exerciseIds": ["P2-Q055", "P2-Q056", "P2-Q057", "P2-Q058"],
      "rule": "按原书解析区分 через、после、за … до … 与 за + 时间的搭配。",
      "pitfalls": "不要把表示时点、先后与所用时长的结构混用。",
      "sourcePages": [34, 35]
    }]
  }]
}
```

The snippet is a schema example only. Final metadata must contain the six complete verified parts and must not claim that Q55–Q60 are all imperfective-aspect questions; the verified ledger shows P2 Q55–Q60 concern time/preposition constructions.

- [ ] **Step 6: Add positive coverage tests**

```js
test('published navigation covers every published exercise once in its original part order', () => {
  const { navigation, units } = loadPublishedNavigationFixture();
  assert.deepEqual(validateStudyNavigation({ navigation, units }), []);
  assert.equal(navigation.parts.length, 6);
  assert.deepEqual(navigation.parts.find(part => part.id === 'p6').unitIds, ['p6-q001-q028', 'p6-q029-q036']);
});
```

`loadPublishedNavigationFixture` reads the real manifest, each published unit JSON and `part-study-navigation.json`, rather than duplicating data in the test.

- [ ] **Step 7: Run the complete contract test file**

Run: `node --test tests/russian-b2/six-part-book.test.js`

Expected: PASS, with all six parts and all currently published questions validated.

- [ ] **Step 8: Commit the contract and verified data**

```powershell
git add -- tests/russian-b2/six-part-book.test.js scripts/russian-b2/lib/contracts.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-study-navigation.json"
git commit -m "feat: define verified B2 part study navigation"
```

### Task 2: Build six reader chapters from existing units

**Files:**
- Modify: `tests/russian-b2/six-part-book.test.js`
- Create: `scripts/russian-b2/build-six-part-book.js`
- Modify: `data/textbook/index.json` (generated output)
- Create: `data/textbook/russian_b2/ch0000.json` through `ch0005.json` (generated output)

**Interfaces:**
- Consumes: `part-study-navigation.json`, published manifest entries, unit JSON.
- Produces: `buildSixPartBook({ root }) -> { readerPaths, indexPath, parts }`.
- Each reader chapter is `{ id, index, part, title, module, format: 'quiz-first', sourcePages, knowledgePoints, exercises }`.

- [ ] **Step 1: Add a failing aggregation test**

```js
const { buildSixPartBook } = require('../../scripts/russian-b2/build-six-part-book');

test('six-part builder preserves all published exercises and their stable order', () => {
  const result = buildSixPartBook({ root: process.cwd() });
  assert.equal(result.parts.length, 6);
  const p2 = result.parts.find(part => part.id === 'p2');
  assert.deepEqual(p2.exercises.slice(54, 58).map(item => item.id), ['P2-Q055', 'P2-Q056', 'P2-Q057', 'P2-Q058']);
  assert.equal(new Set(result.parts.flatMap(part => part.exercises.map(item => item.id))).size,
    result.parts.reduce((sum, part) => sum + part.exercises.length, 0));
});
```

- [ ] **Step 2: Run it to verify RED**

Run: `node --test tests/russian-b2/six-part-book.test.js`

Expected: FAIL because `build-six-part-book.js` does not exist.

- [ ] **Step 3: Implement the minimal builder**

```js
function buildPart(part, units) {
  const byId = new Map(units.map(unit => [unit.id, unit]));
  const selected = part.unitIds.map(id => byId.get(id));
  const exercises = selected.flatMap(unit => unit.exercises);
  return {
    id: part.id,
    index: part.part - 1,
    part: part.part,
    title: part.title,
    module: part.title,
    format: 'quiz-first',
    sourcePages: mergeSourcePages(selected),
    knowledgePoints: part.knowledgePoints,
    exercises
  };
}
```

`mergeSourcePages` returns sorted unique `questions`, `rules`, and `answers` arrays. Before writing, call `validateStudyNavigation` and `validateChapter`; throw one `Error` containing joined errors if either is nonempty. Write six chapter files by `index`, remove the previous B2 `ch0006.json` through `ch0029.json` outputs, and set the `russian_b2` index record to `chapters: 6`, `unitIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']`, and `chapterTitles: parts.map(part => part.title)`.

- [ ] **Step 4: Run the builder test to verify GREEN**

Run: `node --test tests/russian-b2/six-part-book.test.js`

Expected: PASS.

- [ ] **Step 5: Add invariant tests and execute the builder**

```js
test('P6 output excludes the source-dependent ranges', () => {
  const { parts } = buildSixPartBook({ root: process.cwd() });
  const numbers = parts.find(part => part.id === 'p6').exercises.map(item => item.printedNumber);
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7, 8, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]);
});
```

Run: `node scripts/russian-b2/build-six-part-book.js`

Expected: six `ch000N.json` files are written and `data/textbook/index.json` reports six B2 chapters.

- [ ] **Step 6: Commit generated reader data and builder**

```powershell
git add -- tests/russian-b2/six-part-book.test.js scripts/russian-b2/build-six-part-book.js data/textbook/index.json data/textbook/russian_b2/ch0000.json data/textbook/russian_b2/ch0001.json data/textbook/russian_b2/ch0002.json data/textbook/russian_b2/ch0003.json data/textbook/russian_b2/ch0004.json data/textbook/russian_b2/ch0005.json
git commit -m "feat: build six continuous B2 grammar parts"
```

### Task 3: Render navigation cards and preserve continuous-study behavior

**Files:**
- Modify: `tests/russian-b2/reader-static.test.js`
- Modify: `reader.html`

**Interfaces:**
- Consumes: chapter `knowledgePoints` with `exerciseIds`.
- Produces: `renderKnowledgePointNav(points) -> string` and `jumpToQuizExercise(exerciseId) -> void`.

- [ ] **Step 1: Add failing reader static tests**

```js
test('quiz reader renders knowledge-point navigation without changing stable progress keys', () => {
  assert.match(reader, /function renderKnowledgePointNav\(points\)/);
  assert.match(reader, /function jumpToQuizExercise\(exerciseId\)/);
  assert.match(reader, /data-question-id/);
  assert.match(reader, /scrollIntoView/);
  assert.match(reader, /function getQuizUnitKey\(\)/);
});

test('reader migrates old B2 unit progress into the new part key', () => {
  assert.match(reader, /russian_b2:p2/);
  assert.match(reader, /russian_b2:p2-q001-q010/);
  assert.match(reader, /function migrateB2Progress\(progress\)/);
});
```

- [ ] **Step 2: Run to verify RED**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL because the navigation render and jump functions are absent.

- [ ] **Step 3: Implement the navigation UI and jump function**

```js
function renderKnowledgePointNav(points) {
  if (!Array.isArray(points) || !points.length) return '';
  var html = '<section class="b2-knowledge-nav"><h2>知识点导航</h2><div class="b2-knowledge-grid">';
  points.forEach(function(point) {
    var first = point.exerciseIds && point.exerciseIds[0];
    html += '<button class="b2-knowledge-card" onclick="jumpToQuizExercise(\'' + escapeHtml(first) + '\')">' +
      '<strong>' + escapeHtml(point.title) + '</strong><span>' + escapeHtml(formatQuestionRange(point.exerciseIds)) + '</span>' +
      '<small>' + escapeHtml(point.rule) + '</small></button>';
  });
  return html + '</div></section>';
}
function jumpToQuizExercise(exerciseId) {
  var target = document.querySelector('[data-question-id="' + cssEscape(exerciseId) + '"]');
  if (!target) { toast('未找到对应题目'); return; }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.classList.add('b2-quiz-target');
  setTimeout(function() { target.classList.remove('b2-quiz-target'); }, 1600);
}
```

Add the `renderKnowledgePointNav(data.knowledgePoints)` output after the chapter header and before the first question. Add focused CSS for `.b2-knowledge-nav`, `.b2-knowledge-card`, and `.b2-quiz-target`; it must follow the existing warm reader palette and remain usable on the mobile breakpoint. Do not change `renderQuizItem`, answer reveal rules, or `rerenderQuizChapterPreservingScroll`.

- [ ] **Step 4: Update completion and directory wording**

Keep `getQuizUnitKey()` based on `currentQuizData.id`, which is now `p1` … `p6`. Extend `migrateB2Progress` to merge each old key `russian_b2:pN-qNNN-qNNN` into `russian_b2:pN`, preserving each question record by its stable `PN-QNNN` ID; if both have a record, retain the submitted record with the greater `attempts` value. Remove old 10-question completion markers during migration but do not create a part completion marker from them: a part is complete only after every exercise in its new continuous chapter is submitted. Change visible wording from “章” to “部分” only for the B2 book, so the non-B2 reader remains unchanged. In `showChapters`, B2 cards should use `curBook.chapterTitles[i]` rather than display “第 N 章”.

- [ ] **Step 5: Run static tests to verify GREEN**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the reader interaction**

```powershell
git add -- reader.html tests/russian-b2/reader-static.test.js
git commit -m "feat: add B2 knowledge point navigation"
```

### Task 4: Full verification and browser acceptance

**Files:**
- Modify: `docs/superpowers/acceptance/2026-07-16-russian-b2-six-part-study-navigation.md`

**Interfaces:**
- Consumes: six generated chapters, source ledgers, static server.
- Produces: an acceptance record containing exact command output summary and browser observations.

- [ ] **Step 1: Run all automated checks**

```powershell
npm run test:russian-b2
node scripts/russian-b2/verify-source-ledger.js
node scripts/russian-b2/build-six-part-book.js
git diff --check
```

Expected: test suite passes, ledger prints `All published source ledgers verified.`, builder completes, and diff check has no output.

- [ ] **Step 2: Run browser acceptance against the static server**

Start `node server.js`, then verify:

1. The B2 shelf/section directory shows six parts, including P1 through P6.
2. P2 opens as one continuous chapter containing Q001 and Q070.
3. The P2 time-relation card points to Q055; selecting it scrolls to Q055 and temporarily highlights that item.
4. Select, confirm, and manually expand an explanation for a non-top P2 question; the viewport stays at that question.
5. Reload and confirm the answer state persists under `russian_b2:p2`.
6. P6 shows exactly Q001–Q008 and Q027–Q036; it does not expose Q009–Q026 or Q037–Q050.

- [ ] **Step 3: Record the evidence**

Create the acceptance file with command results, the observed route, P2 and P6 question vectors, navigation target result, scroll-preservation result, and localStorage persistence result. Do not include screenshots containing personal account information.

- [ ] **Step 4: Commit verification evidence**

```powershell
git add -- docs/superpowers/acceptance/2026-07-16-russian-b2-six-part-study-navigation.md
git commit -m "docs: record six-part B2 navigation acceptance"
```
