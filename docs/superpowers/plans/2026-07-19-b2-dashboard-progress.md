# B2 仪表盘继续学习与模块进度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让俄语 B2 仪表盘提供准确的“继续上次学习”、七模块进度摘要，以及写作、会话和真题写作的手动完成状态。

**Architecture:** 在 `js/russian-b2/dashboard.js` 增加不依赖浏览器的纯聚合器，输入教材清单、章节题目清单和已解析的本地记录，输出统一模块卡视图模型。`reader.html` 负责读取 localStorage、异步加载各模块的章节 JSON、渲染仪表盘、保存最后阅读位置，并提供手动完成按钮；不把统计规则复制到页面模板中。

**Tech Stack:** 原生 JavaScript、静态 HTML/CSS、localStorage、Node 内置 `node:test`、现有静态服务器。

## Global Constraints

- 不新增框架、构建工具或第三方依赖。
- 聚合器不能访问 DOM 或 localStorage；所有浏览器状态由 `reader.html` 解析后传入。
- 分母必须来自当前教材 JSON，不得从旧学习记录推断。
- 写作、会话和真题写作只能经用户明确点击“标记完成”计为完成；草稿、笔记、录音不能自动完成。
- 统一复习不显示伪造百分比；它只显示可可靠聚合的复习摘要。
- 任一来源 JSON 损坏时只降级对应数据源，B2 仪表盘及其他模块仍可打开。
- 只将本计划明确列出的文件加入提交；不得混入工作区已有的听力、写作、Obsidian 或临时文件改动。

---

## File Structure

- `js/russian-b2/dashboard.js` — B2 学习档案键、记录安全解析、统一模块进度聚合和继续学习视图模型。
- `tests/russian-b2/dashboard-progress.test.js` — 聚合器对空、部分、完成、损坏记录与真题写作的独立单元测试。
- `tests/russian-b2/dashboard-sync.test.js` — 学习档案导出/导入键覆盖测试。
- `reader.html` — localStorage 适配、模块清单加载、手动完成控件、继续学习卡和模块进度卡的渲染。
- `tests/russian-b2/b2-dashboard.test.js` — 仪表盘入口与进度渲染的静态契约。
- `tests/russian-b2/reader-static.test.js` — 手动完成、最后阅读时间和页面渲染安全网。
- `docs/superpowers/acceptance/2026-07-19-b2-dashboard-progress.md` — 最终浏览器验收记录。

## Data Interfaces

`js/russian-b2/dashboard.js` 新增并导出：

```js
function safeObject(value) // unknown -> plain object

function buildDashboardProgress({ manifest, inventories, records, lastRead, now }) {
  // -> {
  //      continueLearning: null | { bookId, moduleId, chapter, activeQuestionId, scroll, updatedAt, label },
  //      modules: [{ id, completed, total, percent, started, secondaryLabel, lastActivityAt, progressAvailable }]
  //    }
}
```

`inventories` 为按模块编号的完整清单，章节格式为：

```js
{
  grammar: [{ id: 'p1', questionIds: ['P1-Q001'] }],
  reading: [{ id: 'reading-01', questionIds: ['R01-Q01'] }],
  writing: [{ id: 'writing-01', taskIds: ['writing-01'] }],
  listening: [{ id: 'listening-01', questionIds: ['L01-Q01'] }],
  speaking: [{ id: 'speaking-01', taskIds: ['speaking-01'] }],
  exam: [{ id: 'exam-writing', questionIds: [], taskIds: ['exam-writing-01'] }]
}
```

`records` 的键固定为：

```js
{
  grammar: { 'russian_b2:p1': { 'P1-Q001': { submitted: true, lastAnsweredAt: '...' } } },
  reading: { 'R01-Q01': { answered: true, answeredAt: '...' } },
  listening: { 'L01-Q01': { answered: true, answeredAt: '...' } },
  writingDrafts: { 'writing-01': { value: '...', updatedAt: '...' } },
  writingCompleted: { 'writing-01': { completed: true, updatedAt: '...' } },
  speakingNotes: { 'speaking-01': { value: '...', updatedAt: '...' } },
  speakingCompleted: { 'speaking-01': { completed: true, updatedAt: '...' } },
  exam: { 'exam-reading-q01': { answered: true, answeredAt: '...' } },
  examWritingDrafts: { 'exam-writing-01': { value: '...', updatedAt: '...' } },
  examCompleted: { 'exam-writing:exam-writing-01': { completed: true, updatedAt: '...' } },
  studyCard: {}
}
```

手动完成记录的值必须同时包含 `completed: true` 和 ISO `updatedAt`；取消时删除该任务键，而不是写入 `false`。

### Task 1: 建立可测试的进度聚合器与完整学习档案键

**Files:**
- Modify: `js/russian-b2/dashboard.js`
- Create: `tests/russian-b2/dashboard-progress.test.js`
- Modify: `tests/russian-b2/dashboard-sync.test.js`

**Interfaces:**
- Consumes: `manifest.modules`、上方定义的 `inventories`、已解析的 `records` 和 B2 last-read 记录。
- Produces: `safeObject()` 与 `buildDashboardProgress()`，供 `reader.html` 和单元测试调用。

- [ ] **Step 1: 写聚合器的失败测试**

在 `tests/russian-b2/dashboard-progress.test.js` 写入最小清单夹具和下列断言：

```js
const { buildDashboardProgress } = require('../../js/russian-b2/dashboard');

const manifest = { modules: [
  { id: 'grammar', title: '语法词汇', chapters: 1 },
  { id: 'writing', title: '写作', chapters: 1 },
  { id: 'exam', title: '真题模拟', chapters: 1 },
  { id: 'review', title: '统一复习', chapters: 0 }
] };
const inventories = {
  grammar: [{ id: 'p1', questionIds: ['P1-Q001', 'P1-Q002'] }],
  writing: [{ id: 'writing-01', taskIds: ['writing-01'] }],
  exam: [{ id: 'exam-writing', questionIds: ['exam-reading-q01'], taskIds: ['exam-writing-01'] }]
};

test('dashboard counts only submitted grammar questions and manual writing completion', () => {
  const result = buildDashboardProgress({ manifest, inventories, records: {
    grammar: { 'russian_b2:p1': { 'P1-Q001': { submitted: true, lastAnsweredAt: '2026-07-19T08:00:00Z' } } },
    writingDrafts: { 'writing-01': { value: 'Черновик', updatedAt: '2026-07-19T09:00:00Z' } },
    writingCompleted: {}, exam: {}, examCompleted: {}
  }, lastRead: null });
  assert.deepEqual(result.modules.find(item => item.id === 'grammar').completed, 0);
  assert.deepEqual(result.modules.find(item => item.id === 'writing').completed, 0);
  assert.match(result.modules.find(item => item.id === 'writing').secondaryLabel, /草稿 1/);
});

test('dashboard completes an exam chapter only after questions and required manual writing completion', () => {
  const result = buildDashboardProgress({ manifest, inventories, records: {
    grammar: {}, writingDrafts: {}, writingCompleted: {},
    exam: { 'exam-reading-q01': { answered: true, answeredAt: '2026-07-19T08:00:00Z' } },
    examCompleted: { 'exam-writing:exam-writing-01': { completed: true, updatedAt: '2026-07-19T09:00:00Z' } }
  }, lastRead: null });
  assert.equal(result.modules.find(item => item.id === 'exam').completed, 1);
});
```

另加三个测试：损坏的 `records` 返回未开始而不抛错；无 `updatedAt` 的草稿不会生成 `lastActivityAt`；`lastRead` 仅在 `bookId === 'russian_b2'`、模块存在且 `updatedAt` 有效时生成继续学习对象。

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/russian-b2/dashboard-progress.test.js`

Expected: FAIL，提示 `buildDashboardProgress is not a function`。

- [ ] **Step 3: 实现纯聚合器和学习档案键**

在 `js/russian-b2/dashboard.js`：

```js
const ARCHIVE_KEYS = [
  'rr_b2_progress_v1', 'russian_b2_study_card_progress_v1',
  'rr_b2_reading_progress_v1', 'russian_b2_listening_progress_v1',
  'russian_b2_writing_drafts_v1', 'russian_b2_writing_completed_v1',
  'russian_b2_speaking_notes_v1', 'russian_b2_speaking_completed_v1',
  'russian_b2_exam_progress_v1', 'russian_b2_exam_writing_drafts_v1',
  'russian_b2_exam_completed_v1'
];

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
```

实现 `buildDashboardProgress()` 时：

- 逐模块以 `inventories[module.id]` 为唯一分母；
- 语法部分只有所有 `questionIds` 对应 `submitted === true` 才加一；
- 阅读、听力和真题客观题只有 `answered === true` 才计为已作答；
- 写作、会话只有其稳定 `taskIds` 在相应 completed 记录中为 `completed === true` 才加一；
- 真题章节同时要求所有 `questionIds` 已作答和所有 `taskIds` 已手动完成；
- `review` 只返回 `{ id: 'review', total: 0, completed: 0, percent: null }` 和来自现有错题/草稿/笔记/知识卡记录的摘要；
- 所有计数 `Math.min(total, Math.max(0, completed))`；
- `lastActivityAt` 只取可解析时间戳的最大值；
- B2 last-read 返回时保留 `moduleId`、`chapter`、`activeQuestionId`、`scroll`、`viewMode`、`updatedAt`。

最后把两个函数加入模块返回对象：

```js
return { ARCHIVE_SCHEMA, ARCHIVE_KEYS, createArchive, validateArchive, mergeArchive, safeObject, buildDashboardProgress };
```

- [ ] **Step 4: 扩充导出/导入回归测试**

在 `tests/russian-b2/dashboard-sync.test.js` 的 archive export 测试中加入：

```js
'russian_b2_listening_progress_v1': { 'L01-Q01': { answered: true } },
'russian_b2_writing_completed_v1': { 'writing-01': { completed: true, updatedAt: '2026-07-19T10:00:00Z' } },
'russian_b2_speaking_completed_v1': { 'speaking-01': { completed: true, updatedAt: '2026-07-19T10:00:00Z' } },
'russian_b2_exam_completed_v1': { 'exam-writing:exam-writing-01': { completed: true, updatedAt: '2026-07-19T10:00:00Z' } }
```

断言这些键均在 `archive.records` 中，缺失这些新键的旧格式 archive 仍通过 `validateArchive()`。

- [ ] **Step 5: 运行聚合和备份测试**

Run: `node --test tests/russian-b2/dashboard-progress.test.js tests/russian-b2/dashboard-sync.test.js`

Expected: PASS，所有聚合、损坏容错和 archive 键测试通过。

- [ ] **Step 6: 提交第一项**

```powershell
git add -- js/russian-b2/dashboard.js tests/russian-b2/dashboard-progress.test.js tests/russian-b2/dashboard-sync.test.js
git commit -m "feat: aggregate B2 dashboard progress"
```

### Task 2: 保存准确最后位置，并提供手动完成状态控件

**Files:**
- Modify: `reader.html`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Consumes: Task 1 的 `safeObject()`、新 archive key 和 `buildDashboardProgress()` 记录格式。
- Produces: 可靠的 B2 `updatedAt` last-read 记录；`getManualCompletion()`、`toggleManualCompletion()` 和写作/会话/真题写作页面中的状态按钮。

- [ ] **Step 1: 写失败的静态契约测试**

在 `tests/russian-b2/reader-static.test.js` 加入：

```js
test('B2 last-read stores an update time and manual completion never infers completion from drafts', () => {
  assert.match(reader, /updatedAt:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(reader, /var WRITING_COMPLETED_KEY = 'russian_b2_writing_completed_v1'/);
  assert.match(reader, /var SPEAKING_COMPLETED_KEY = 'russian_b2_speaking_completed_v1'/);
  assert.match(reader, /var EXAM_COMPLETED_KEY = 'russian_b2_exam_completed_v1'/);
  assert.match(reader, /function toggleManualCompletion\(storageKey, taskId\)/);
  assert.match(reader, /标记完成/);
  assert.doesNotMatch(reader, /value\.trim\(\).*completed/);
});
```

再加断言：`renderExamWritingTask()` 的按钮调用 `toggleManualCompletion(EXAM_COMPLETED_KEY,`，普通写作调用 `toggleManualCompletion(WRITING_COMPLETED_KEY,`，会话调用 `toggleManualCompletion(SPEAKING_COMPLETED_KEY,`。

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: FAIL，找不到三个 completion key 与 `toggleManualCompletion`。

- [ ] **Step 3: 实现 last-read 时间和通用完成记录函数**

在 `saveLastRead()` 的记录创建处写入：

```js
var record = {
  bookId: curBook.id,
  chapter: curCh,
  scroll: window.scrollY,
  updatedAt: new Date().toISOString()
};
```

在 writing 常量附近增加：

```js
var WRITING_COMPLETED_KEY = 'russian_b2_writing_completed_v1';
var SPEAKING_COMPLETED_KEY = 'russian_b2_speaking_completed_v1';
var EXAM_COMPLETED_KEY = 'russian_b2_exam_completed_v1';

function getManualCompletion(storageKey) {
  try { return window.RussianB2Dashboard.safeObject(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
  catch (e) { return {}; }
}
function isManuallyCompleted(storageKey, taskId) {
  return getManualCompletion(storageKey)[taskId] && getManualCompletion(storageKey)[taskId].completed === true;
}
function toggleManualCompletion(storageKey, taskId) {
  var completed = getManualCompletion(storageKey);
  if (completed[taskId] && completed[taskId].completed === true) delete completed[taskId];
  else completed[taskId] = { completed: true, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (e) {}
  rerenderCurrentB2TaskPreservingScroll();
}
```

实现 `rerenderCurrentB2TaskPreservingScroll()`：基于 `curBook.format` 调用当前对应的渲染函数；写作调用 `renderWritingWorkbench(currentWritingData, window.scrollY)`，会话调用 `renderSpeakingPractice(currentSpeakingData, window.scrollY)`，真题调用 `renderExamPracticeChapter(currentExamData, window.scrollY)`。数据不存在时只调用 `toast('完成状态已保存')`。

- [ ] **Step 4: 在三种页面渲染状态按钮**

定义统一模板函数：

```js
function renderManualCompletionButton(storageKey, taskId) {
  var completed = isManuallyCompleted(storageKey, taskId);
  return '<button class="tb-btn manual-completion" type="button" onclick="toggleManualCompletion(\'' + escapeHtml(storageKey) + '\',\'' + escapeHtml(taskId) + '\')">' +
    (completed ? '✓ 已完成 · 取消' : '标记完成') + '</button>';
}
```

- 在 `renderWritingWorkbench()` 的标题区插入 `renderManualCompletionButton(WRITING_COMPLETED_KEY, data.id)`；
- 在 `renderSpeakingPractice()` 的标题区插入 `renderManualCompletionButton(SPEAKING_COMPLETED_KEY, data.id)`；
- 在 `renderExamWritingTask(task)` 的任务标题后插入 `renderManualCompletionButton(EXAM_COMPLETED_KEY, currentExamData.id + ':' + task.id)`。

不修改 `saveWritingDraft()`、`saveSpeakingNote()`、`saveSpeakingRecording()`、`saveExamWritingDraft()` 的保存语义。

- [ ] **Step 5: 运行静态测试**

Run: `node --test tests/russian-b2/reader-static.test.js`

Expected: PASS，且已有阅读、听力、写作、会话和真题静态测试不回归。

- [ ] **Step 6: 提交第二项**

```powershell
git add -- reader.html tests/russian-b2/reader-static.test.js
git commit -m "feat: add manual B2 task completion"
```

### Task 3: 加载模块清单并渲染继续学习卡与七模块进度

**Files:**
- Modify: `reader.html`
- Modify: `tests/russian-b2/b2-dashboard.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Consumes: Task 1 的 `buildDashboardProgress()`，Task 2 的 completion storage 和 `updatedAt` last-read。
- Produces: `loadB2DashboardInventories()`、`getB2DashboardRecords()`、`renderB2Dashboard()` 的进度卡和 `continueB2Learning()`。

- [ ] **Step 1: 写仪表盘失败测试**

在 `tests/russian-b2/b2-dashboard.test.js` 加入：

```js
test('B2 dashboard renders progress from the pure dashboard aggregator and keeps review non-percentual', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const start = reader.indexOf('function renderB2Dashboard(book)');
  const end = reader.indexOf('function showB2Dashboard()', start);
  const dashboard = reader.slice(start, end);
  assert.match(dashboard, /RussianB2Dashboard\.buildDashboardProgress/);
  assert.match(dashboard, /继续上次学习/);
  assert.match(dashboard, /已完成/);
  assert.match(dashboard, /b2-module-progress/);
  assert.doesNotMatch(dashboard, /review[^]*?%/);
});
```

在 `tests/russian-b2/reader-static.test.js` 加入：

```js
test('dashboard loaders use current chapter JSON as the only progress denominator', () => {
  assert.match(reader, /function loadB2DashboardInventories\(manifest\)/);
  assert.match(reader, /questionIds/);
  assert.match(reader, /taskIds/);
  assert.match(reader, /function continueB2Learning\(\)/);
  assert.match(reader, /restoreLastRead\(lastRead\)/);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/russian-b2/b2-dashboard.test.js tests/russian-b2/reader-static.test.js`

Expected: FAIL，找不到进度加载器和继续学习按钮。

- [ ] **Step 3: 实现清单和本地记录适配器**

在 `reader.html` 的 B2 dashboard 函数前增加：

```js
function parseStoredObject(key) {
  try { return window.RussianB2Dashboard.safeObject(JSON.parse(localStorage.getItem(key) || '{}')); }
  catch (e) { return {}; }
}
function getB2DashboardRecords() {
  return {
    grammar: getB2Progress(), reading: getReadingProgress(), listening: getListeningProgress(),
    writingDrafts: getWritingDrafts(), writingCompleted: getManualCompletion(WRITING_COMPLETED_KEY),
    speakingNotes: getSpeakingNotes(), speakingCompleted: getManualCompletion(SPEAKING_COMPLETED_KEY),
    exam: getExamProgress(), examWritingDrafts: getExamWritingDrafts(),
    examCompleted: getManualCompletion(EXAM_COMPLETED_KEY),
    studyCard: parseStoredObject(STUDY_CARD_PROGRESS_KEY)
  };
}
function chapterInventory(data) {
  return {
    id: data.id,
    questionIds: (data.exercises || data.questions || []).map(function(item) { return item.id; }),
    taskIds: (data.tasks ? data.tasks : data.task ? [data.task] : []).map(function(item) { return item.id || data.id; })
  };
}
function loadB2DashboardInventories(manifest) {
  return Promise.all((manifest.modules || []).filter(function(module) { return module.id !== 'review'; }).map(function(module) {
    return fetchJson('data/textbook/' + module.dir + '/index.json', null).then(function(index) {
      var count = index.chapters || module.chapters || 0;
      return Promise.all(Array.from({ length: count }, function(_, chapter) {
        return fetchJson('data/textbook/' + module.dir + '/ch' + String(chapter).padStart(4, '0') + '.json', null).then(chapterInventory);
      })).then(function(chapters) { return [module.id, chapters]; });
    }).catch(function() { return [module.id, null]; });
  })).then(function(rows) { return Object.fromEntries(rows); });
}
```

使用真实 chapter 格式时，若 grammar 的生成文件是 `exercises`、阅读/听力/真题为 `questions`、写作为 `task`、真题写作为 `tasks`，都由 `chapterInventory()` 归一。模块读取失败返回 `null`，交给聚合器输出 `progressAvailable: false`。

- [ ] **Step 4: 渲染继续学习和模块进度卡**

将 `showB2Dashboard()` 改为先加载 `book.json`，再调用 `loadB2DashboardInventories(manifest)`；加载失败时仍传空 inventories 渲染七张入口卡。

在 `renderB2Dashboard(book, inventories)` 内：

```js
var lastRead = parseStoredObject('rr_lastread_' + NOVEL_ID);
var model = window.RussianB2Dashboard.buildDashboardProgress({
  manifest: book, inventories: inventories || {}, records: getB2DashboardRecords(), lastRead: lastRead
});
```

新增：

```js
function continueB2Learning() {
  var lastRead = parseStoredObject('rr_lastread_' + NOVEL_ID);
  if (!lastRead || lastRead.bookId !== 'russian_b2') { toast('没有可继续的 B2 学习位置'); return; }
  restoreLastRead(lastRead);
}
```

继续卡仅在 `model.continueLearning` 非空时渲染为：

```html
<section class="b2-continue-card">
  <p>继续上次学习</p><h2>模块名 · 章节或题号</h2>
  <small>最近保存于…</small><button onclick="continueB2Learning()">继续学习</button>
</section>
```

普通模块卡以 `model.modules.find(...)` 渲染：已开始显示 `已完成 N / total` 和 `<span class="b2-module-progress" style="--progress: N%">`；未开始显示“尚未开始”。`review` 只显示其 `secondaryLabel`，不得拼接百分比或 progress bar。`progressAvailable === false` 时显示“进度暂不可用”，但卡片仍能打开模块。

在现有暖色卡片规则旁新增 `b2-continue-card`、`b2-module-progress`、`.manual-completion` 的 CSS，只复用 `--accent`、`--glass-border`、`--surface-solid` 等已有色变量，不创建黑色工具栏或新主题。

- [ ] **Step 5: 运行仪表盘静态与完整 B2 测试**

Run: `node --test tests/russian-b2/b2-dashboard.test.js tests/russian-b2/reader-static.test.js && npm run test:russian-b2`

Expected: PASS，仪表盘契约、手动完成、既有听力/写作/词典/语法测试全部通过。

- [ ] **Step 6: 提交第三项**

```powershell
git add -- reader.html tests/russian-b2/b2-dashboard.test.js tests/russian-b2/reader-static.test.js
git commit -m "feat: show B2 dashboard progress"
```

### Task 4: 浏览器验收、异常降级和交付记录

**Files:**
- Create: `docs/superpowers/acceptance/2026-07-19-b2-dashboard-progress.md`
- Modify: `tests/russian-b2/dashboard-progress.test.js`

**Interfaces:**
- Consumes: 完整仪表盘、手动完成状态和本地进度记录。
- Produces: 可复查的验收记录；不修改教材题目、答案或来源数据。

- [ ] **Step 1: 加入最后的损坏数据回归测试**

在 `tests/russian-b2/dashboard-progress.test.js` 加入：

```js
test('dashboard keeps module entry available when one inventory cannot be loaded', () => {
  const result = buildDashboardProgress({ manifest, inventories: { grammar: null }, records: 'broken', lastRead: {} });
  const grammar = result.modules.find(item => item.id === 'grammar');
  assert.equal(grammar.progressAvailable, false);
  assert.equal(grammar.secondaryLabel, '进度暂不可用');
});
```

- [ ] **Step 2: 运行全部自动化验证**

Run: `npm run verify:russian-b2`

Expected: PASS，包括整书构建检查和所有 `tests/russian-b2/*.test.js`；不得通过修改或跳过旧测试来取得通过。

- [ ] **Step 3: 启动本地服务器并做浏览器验收**

Run: `node server.js`

在浏览器打开 `http://localhost:3000/reader.html`，按以下顺序核对：

1. 清空仅用于本次浏览器验收的 B2 localStorage key 后进入《俄语 B2 全模块》，确认七模块仍可进入，普通卡显示“尚未开始”，统一复习没有百分比；
2. 进入 P2 中间题目、刷新、返回仪表盘，确认“继续上次学习”卡一键恢复同一题和滚动位置；
3. 临时回答一篇阅读的全部题，确认阅读卡从“尚未开始”更新为 `已完成 1 / 10`；
4. 写作输入草稿但不点完成，确认卡只显示草稿摘要；点“标记完成”后返回仪表盘，确认写作完成数增加；再点“✓ 已完成 · 取消”，确认完成数回退；
5. 会话重复上述“笔记不算完成、手动点击才完成”的流程；
6. 真题写作输入草稿，确认不计完成；点击真题写作的手动完成按钮，再完成该真题章必要客观题，确认该真题章节才进入完成数；
7. 在开发者工具把一个 B2 进度 key 改为无效 JSON，刷新，确认仅该模块显示“进度暂不可用”，仪表盘其余卡片可打开；
8. 分别以桌面宽度和 390px 窄屏检查：继续卡、进度条、完成按钮都无横向溢出，暖色主题下文案可读。

完成后还原验收中写入的 localStorage 或明确保留为本人真实学习记录；不得清除用户既有学习数据。

- [ ] **Step 4: 写验收记录**

创建 `docs/superpowers/acceptance/2026-07-19-b2-dashboard-progress.md`，记录：验证日期、服务器地址、自动化命令与结果、八项浏览器检查结果、使用的临时测试记录是否已还原，以及任何未发现的问题写为“无”。

- [ ] **Step 5: 提交第四项**

```powershell
git add -- tests/russian-b2/dashboard-progress.test.js docs/superpowers/acceptance/2026-07-19-b2-dashboard-progress.md
git commit -m "test: verify B2 dashboard progress"
```

