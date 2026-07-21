# 统一阅读模块体验 + 升级 В мире людей 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 B2 阅读模块加分屏词典布局，将 В мире людей（30 篇）从旧小说阅读逻辑全面升级为 B2 标准模块体验（仪表盘 + 分屏阅读 + 标准答题交互）。

**Architecture:** 方案 A（增量添加）— 所有改动在 `reader.html` 单文件中。新增 `reading_speaking` 专属渲染函数但复用 B2 的导航栏、分屏布局、词典面板、markChapterDone；B2 语法词汇模块和小说阅读原封不动。

**Tech Stack:** Vanilla HTML/CSS/JS，零框架依赖

**Design Spec:** `docs/superpowers/specs/2026-07-21-reading-module-unification-design.md`

---

## File Structure

| 文件 | 操作 | 说明 |
|---|---|---|
| `reader.html` | 修改 | 所有改动集中于此单文件 |

**修改区域（按行号）：**
- `goChapter` (1626-1652): 导航栏选择逻辑
- `renderChapter` (2630-2703): 路由分支
- `renderReadingPracticeChapter` (2558-2569): 加分屏布局
- `showBreadcrumb` (1067-1129): 面包屑路径
- 文件末尾 (4013 前): 插入全部新函数

---

### Task 1: B2 阅读模块加分屏布局

**改动:** `reader.html` 的 `renderReadingPracticeChapter` 函数（行 2558-2569）

- [ ] **Step 1: 重构 renderReadingPracticeChapter 的 innerHTML**

将当前的单栏 `<main class="main-container">...</main>` 替换为三段式：标题区（main-container 居中）+ 分屏容器（reader-layout 含 reader-pane + resize-handle + detail-panel）。

定位到 `reader.html` 第 2567 行，将当前的：
```js
  document.getElementById('app').innerHTML = b2FloatingNavigation({ backAction: 'showB2Dashboard()', backTitle: '仪表盘', menuAction: 'showBreadcrumb()' }) + '<main class="main-container"><header class="chapter-header"><h1>' + escapeHtml(data.title || '') + '</h1><p>' + supportState + '</p><p class="reading-answer-source">原书原文页：' + escapeHtml(sourcePages) + '</p></header><section class="chapter-content">' + paragraphs + '</section>' + support + '<section><h2>阅读理解</h2>' + questions + '</section><nav class="b2-quiz-nav">' + navP + '<span class="fab-chapter">第 ' + (curCh + 1) + ' / ' + curBook.chapters + ' 篇</span>' + navN + '</nav></main>';
```

替换为：
```js
  document.getElementById('app').innerHTML = b2FloatingNavigation({ backAction: 'showB2Dashboard()', backTitle: '仪表盘', menuAction: 'showBreadcrumb()' }) +
    '<main class="main-container"><header class="chapter-header"><h1>' + escapeHtml(data.title || '') + '</h1><p>' + supportState + '</p><p class="reading-answer-source">原书原文页：' + escapeHtml(sourcePages) + '</p></header></main>' +
    '<div class="reader-layout" id="readerLayout">' +
    '<div class="reader-pane" id="readerPane"><div class="chapter-content">' +
    '<section class="chapter-content">' + paragraphs + '</section>' + support +
    '<section><h2>阅读理解</h2>' + questions + '</section>' +
    '<nav class="b2-quiz-nav">' + navP + '<span class="fab-chapter">第 ' + (curCh + 1) + ' / ' + curBook.chapters + ' 篇</span>' + navN + '</nav>' +
    '</div></div>' +
    '<div class="resize-handle" id="resizeHandle"></div>' +
    '<div class="detail-panel" id="detailPanel" data-dictionary-state="closed">' +
    '<button class="dictionary-drawer-handle" type="button" aria-label="展开或收起词典"></button>' +
    '<div class="detail-panel-inner" id="detailInner" aria-live="polite">' +
    '<button class="detail-close" type="button" onclick="event.stopPropagation();dictionaryController.close()" aria-label="关闭词典" title="关闭">✕</button>' +
    '<div class="detail-placeholder">👆 点击俄语单词查看详情</div>' +
    '</div></div>' +
    '</div>';
```

- [ ] **Step 2: 在函数末尾加分屏初始化调用**

在 `renderReadingPracticeChapter` 末尾（`window.scrollTo(...)` 行之后，`}` 之前），`highlightSavedWords` 和 `applyStressMarks` 只在当前 curBook 有对应规则时工作。`renderReadingPracticeChapter` 已经通过 `renderRuText(lookupContext(...))` 让点击查词工作 — 只要 `.detail-panel#detailPanel` DOM 存在，`dictionaryController` 自动找到它。

在 2568 行的 `window.scrollTo(...)` 之后，2569 行的 `}` 之前，添加：
```js
  restoreSplitRatio();
  highlightSavedWords();
  applyStressMarks();
```

完整函数末尾变为：
```js
  window.scrollTo(0, typeof scrollPosition === 'number' ? scrollPosition : 0); applyTheme(); saveLastRead(arguments[2]);
  restoreSplitRatio();
  highlightSavedWords();
  applyStressMarks();
}
```

- [ ] **Step 3: 新增 CSS 规则**

在 `.reader-pane .chapter-content` 的样式区域添加 CSS。定位到 `.reader-pane` 样式块（约行 143-148），在其后添加：
```css
/* 阅读区内的内容去除主容器最大宽度限制 */
.reader-pane .chapter-content { max-width: none; }
```

找到 CSS 插入位置 — 搜索 `/* 阅读区：flex-basis 百分比由 JS 动态控制 */` 附近（约行 142-148），在 `.reader-pane` 闭合 `}` 后添加。

- [ ] **Step 4: 验证 B2 阅读模块分屏**

启动服务器并手动验证：
```bash
node server.js
```
打开 `http://localhost:3000`，进入 B2 仪表盘 → 阅读模块 → 任意章节，确认：
- 页面显示分屏布局（左阅读区 + 右词典面板）
- 中间有可拖拽分割线
- 点击俄语单词可在右侧词典面板显示释义
- 拖拽分割线后刷新页面，比例保持

- [ ] **Step 5: 提交**

```bash
git add reader.html
git commit -m "feat: add split-pane layout to B2 reading practice module"
```

---

### Task 2: В мире людей 仪表盘

**改动:** `reader.html` — 新增函数 + 修改书架路由

- [ ] **Step 1: 在 goChapter 中加 reading_speaking 导航栏选择**

定位到 `goChapter` 函数（行 1635-1639），当前逻辑：
```js
  var chapterNavigation = curBook && curBook.isB2Module
    ? b2FloatingNavigation({ backAction: 'showB2Dashboard()', backTitle: '仪表盘', menuAction: 'showBreadcrumb()' })
    : toolbar('第 ' + (idx + 1) + ' 章', ...);
```

改为：
```js
  var chapterNavigation;
  if (curBook && curBook.isB2Module) {
    chapterNavigation = b2FloatingNavigation({ backAction: 'showB2Dashboard()', backTitle: '仪表盘', menuAction: 'showBreadcrumb()' });
  } else if (curBook && curBook.id === 'reading_speaking') {
    chapterNavigation = b2FloatingNavigation({ backAction: 'showReadingSpeakingDashboard()', backTitle: '仪表盘', menuAction: 'showBreadcrumb()' });
  } else {
    chapterNavigation = toolbar('第 ' + (idx + 1) + ' 章',
      '<button class="tb-btn" onclick="toggleSearch()" title="搜索 (Ctrl+F)">🔍</button>' +
      '<button class="tb-btn" onclick="showChapters(\'' + escapeHtml(curBook.id) + '\')" title="目录">☰</button>');
  }
```

- [ ] **Step 2: 书架点击 reading_speaking → 仪表盘**

搜索书架渲染函数 `renderShelf`（约行 1324+），找到点击书本时调用 `goChapter(0)` 的位置。需要改为：当 `book.id === 'reading_speaking'` 时调用 `showReadingSpeakingDashboard()` 而不是 `goChapter(0)`。

定位到 `renderShelf` 中每本书的点击处理（搜索 `onclick="goChapter` 或 `onclick="openBook`），将 reading_speaking 的判断加进去。

更精确的做法：找到 `renderShelf` 中生成书本卡片的循环，对 `reading_speaking` 做特殊处理。搜索 `curBook = target` 或类似赋值。

在 `renderShelf` 中找到 `onclick` 绑定处，将：
```js
onclick="...goChapter(0)..."
```
改为判断 book id：
```js
onclick="' + (book.id === 'reading_speaking' ? 'showReadingSpeakingDashboard()' : 'goChapter(0)') + '"
```

- [ ] **Step 3: 新增 showReadingSpeakingDashboard 和 renderReadingSpeakingDashboard**

在文件末尾 `</script>` 前（行 4013 前）插入两个新函数：

```js
/* ══════════════════════════════════════════════
   В мире людей — 仪表盘
   ══════════════════════════════════════════════ */
function showReadingSpeakingDashboard() {
  saveLastRead();
  curView = 'reading-speaking-dashboard';
  curBook = getBookById('reading_speaking');
  curCh = -1;
  stopTimer();
  if (!curBook) { showShelf(); return; }

  var stats = readStats['reading_speaking'] || {};
  var doneCount = 0;
  for (var i = 0; i < 30; i++) {
    if (stats[i] && stats[i].completed) doneCount++;
  }
  document.getElementById('app').innerHTML =
    b2FloatingNavigation({ backAction: 'showShelf()', backTitle: '书架' }) +
    '<main class="main-container b2-dashboard"><header class="b2-dashboard-hero">' +
    '<h1>📖 ' + escapeHtml(curBook.title) + '</h1>' +
    '<p>' + escapeHtml(curBook.description || '') + '</p>' +
    '</header>';

  // 继续上次学习
  var lastRead = parseStoredObject('rr_lastread_' + NOVEL_ID);
  if (lastRead && lastRead.bookId === 'reading_speaking' && typeof lastRead.chapter === 'number') {
    var savedAt = new Date(lastRead.updatedAt || Date.now()).toLocaleString('zh-CN');
    document.getElementById('app').innerHTML +=
      '<section class="b2-continue-card"><p>继续上次学习</p>' +
      '<h2>第 ' + (lastRead.chapter + 1) + ' 章</h2>' +
      '<small>最近保存于 ' + escapeHtml(savedAt) + '</small>' +
      '<button type="button" onclick="goChapter(' + lastRead.chapter + ')">继续学习</button></section>';
  }

  // 进度条
  var pct = Math.round(doneCount / 30 * 100);
  document.getElementById('app').innerHTML +=
    '<div class="b2-module-progress-bar"><span style="width:' + pct + '%"></span></div>' +
    '<p style="text-align:center;color:var(--text-dim);margin:8px 0 20px">' + doneCount + ' / 30 已完成</p>';

  // 章节 grid
  var gridHtml = '<div class="chapter-grid">';
  for (var i = 0; i < 30; i++) {
    var isDone = !!(stats[i] && stats[i].completed);
    gridHtml += '<button class="ch-item' + (isDone ? ' done' : '') + '" onclick="goChapter(' + i + ')">' +
      '<span class="ch-num">' + (isDone ? '✓' : (i + 1)) + '</span></button>';
  }
  gridHtml += '</div>';

  document.getElementById('app').innerHTML += gridHtml + '</main>';
  window.scrollTo(0, 0);
}

function getReadingSpeakingDashboardProgress() {
  var stats = readStats['reading_speaking'] || {};
  var doneCount = 0;
  for (var i = 0; i < 30; i++) {
    if (stats[i] && stats[i].completed) doneCount++;
  }
  return { total: 30, completed: doneCount };
}
```

- [ ] **Step 4: 验证仪表盘**

启动服务器，点击书架中的 "В мире людей — 阅读口语"，确认：
- 进入仪表盘页面（非直接跳章节）
- 显示 30 章 grid（未完成显示数字，已完成显示 ✓）
- 点击章节跳转到阅读页
- 点击 ← 返回书架

- [ ] **Step 5: 提交**

```bash
git add reader.html
git commit -m "feat: add В мире людей dashboard with chapter grid and progress"
```

---

### Task 3: В мире людей 章节阅读页（分屏 + quiz）

**改动:** `reader.html` — 新增多个函数 + renderChapter 路由

- [ ] **Step 1: 在 renderChapter 中加 reading_speaking 路由分支**

定位到 `renderChapter` 函数（行 2630），在现有 format 分支之后、小说阅读旧逻辑之前插入新分支。

在行 2641（`if (data.format === 'exam-practice') ...`）之后，行 2642（`var globalDictionaryPanel = ...`）之前，插入：

```js
  if (curBook && curBook.id === 'reading_speaking') { renderReadingSpeakingChapter(data, scrollPosition, restoreState); return; }
```

- [ ] **Step 2: 新增辅助函数 extractOptionKey**

在文件末尾 `</script>` 前插入：

```js
/* ══════════════════════════════════════════════
   В мире людей — 选项 key 提取
   ══════════════════════════════════════════════ */
function extractOptionKey(optionText) {
  var m = optionText.match(/^([а-я]+)\)/i);
  return m ? m[1].toLowerCase() : '';
}
```

- [ ] **Step 3: 新增进度管理函数**

```js
/* ══════════════════════════════════════════════
   В мире людей — 进度存储
   ══════════════════════════════════════════════ */
var RS_PROGRESS_KEY = 'rr_reading_speaking_progress_v1';

function getReadingSpeakingProgress() {
  try { return JSON.parse(localStorage.getItem(RS_PROGRESS_KEY)) || {}; }
  catch (e) { return {}; }
}

function saveReadingSpeakingProgress(progress) {
  try { localStorage.setItem(RS_PROGRESS_KEY, JSON.stringify(progress)); } catch (e) {}
}

function getReadingSpeakingRecord(exId) {
  var progress = getReadingSpeakingProgress();
  if (!progress[exId]) progress[exId] = { selected: '', submitted: false, wrong: false, expOpen: false };
  return progress[exId];
}

function getReadingSpeakingExercise(exId) {
  if (!_currentRSExercises) return null;
  for (var i = 0; i < _currentRSExercises.length; i++) {
    if (_currentRSExercises[i]._exId === exId) return _currentRSExercises[i];
  }
  return null;
}
```

- [ ] **Step 4: 全局变量声明**

在现有全局变量区域（约行 1660-1665，`_wrongAnswerQuizReturn` 附近）插入：

```js
var _currentRSExercises = [];
var _currentRSData = null;
```

- [ ] **Step 5: 新增核心渲染函数 renderReadingSpeakingChapter**

```js
/* ══════════════════════════════════════════════
   В мире людей — 章节阅读页
   ══════════════════════════════════════════════ */
function renderReadingSpeakingChapter(data, scrollPosition, restoreState) {
  _currentRSData = data;
  var paras = data.original || [], trans = data.translated || [];
  var bookMarks = (bookmarks['reading_speaking'] && bookmarks['reading_speaking'][curCh]) || [];
  var parts = [], visibleCount = 0;

  for (var i = 0; i < paras.length; i++) {
    if (!paras[i].trim()) continue;
    visibleCount++;
    var isBm = bookMarks.indexOf(i) >= 0;
    parts.push(
      '<div class="para-block" data-idx="' + i + '">' +
      '<div class="para-actions">' +
        '<button class="' + (isBm ? 'bookmarked' : '') + '" onclick="toggleBookmark(' + i + ',event)" title="收藏段落">' + (isBm ? '★' : '☆') + '</button>' +
      '</div>' +
      '<p class="ru-text">' + renderRuText(paras[i], lookupContext('reading', 'reading_speaking-ch' + curCh + '-p' + i, 'reading-body', paras[i], (trans[i] || ''), [])) + '</p>' +
      '<p class="cn-text" style="display:none">' + escapeHtml(trans[i] || '') + '</p></div>'
    );
  }
  if (!visibleCount) parts.push('<div class="loading">📭 本章暂无内容</div>');

  // 练习题
  var exercises = data.exercises || [];
  _currentRSExercises = exercises.map(function(ex) {
    return Object.assign({}, ex, { _exId: 'rs-' + curCh + '-ex' + ex.num });
  });

  var exercisesHtml = '';
  if (_currentRSExercises.length > 0) {
    exercisesHtml = '<section class="exercises-section">' +
      '<h2>📝 练习题 (' + _currentRSExercises.length + ' 道)</h2>' +
      _currentRSExercises.map(function(ex) { return renderReadingSpeakingExercise(ex); }).join('') +
      '</section>';
  }

  var navP = curCh > 0 ? '<button class="fab-nav" onclick="goChapter(' + (curCh - 1) + ')">← 上一章</button>' : '<span class="fab-nav disabled">← 上一章</span>';
  var navN = curCh < 29 ? '<button class="fab-nav" onclick="goChapter(' + (curCh + 1) + ')">下一章 →</button>' : '<span class="fab-nav disabled">下一章 →</span>';

  document.getElementById('app').innerHTML =
    b2FloatingNavigation({ backAction: 'showReadingSpeakingDashboard()', backTitle: '仪表盘', menuAction: 'showBreadcrumb()' }) +
    '<div class="peek-counter">👁 查看原文: <span id="peekCnt">0</span> / <span id="totalParas">' + visibleCount + '</span> 段</div>' +
    '<div class="main-container"><header class="chapter-header"><h1>第 ' + (curCh + 1) + ' 章</h1><h2>' + escapeHtml(data.title || '') + '</h2></header></div>' +
    '<div class="reader-layout" id="readerLayout">' +
    '<div class="reader-pane" id="readerPane"><div class="chapter-content">' +
    parts.join('') + exercisesHtml +
    '</div></div>' +
    '<div class="resize-handle" id="resizeHandle"></div>' +
    '<div class="detail-panel" id="detailPanel" data-dictionary-state="closed">' +
    '<button class="dictionary-drawer-handle" type="button" aria-label="展开或收起词典"></button>' +
    '<div class="detail-panel-inner" id="detailInner" aria-live="polite">' +
    '<button class="detail-close" type="button" onclick="event.stopPropagation();dictionaryController.close()" aria-label="关闭词典" title="关闭">✕</button>' +
    '<div class="detail-placeholder">👆 点击俄语单词查看详情</div>' +
    '</div></div>' +
    '</div>' +
    '<div class="fab-group-bottom">' + navP +
    '<span class="fab-chapter">第 ' + (curCh + 1) + ' / 30 章</span>' +
    '<button id="markDoneBtn" class="fab-nav fab-mark-done" onclick="markChapterDone()"' + (isChapterCompleted('reading_speaking', curCh) ? ' disabled' : '') + '>✓ 标记完成</button>' +
    navN + '</div>';

  window.scrollTo(0, typeof scrollPosition === 'number' ? scrollPosition : 0); applyTheme(); saveLastRead(restoreState);
  restoreSplitRatio();
  highlightSavedWords();
  applyStressMarks();
}
```

- [ ] **Step 6: 新增 renderReadingSpeakingExercise**

```js
/* ══════════════════════════════════════════════
   В мире людей — 单题渲染
   ══════════════════════════════════════════════ */
function renderReadingSpeakingExercise(ex) {
  var exId = ex._exId || ('rs-' + curCh + '-ex' + ex.num);
  var record = getReadingSpeakingRecord(exId);
  var submitted = record.submitted;

  var html = '<div class="b2-quiz-item" data-question-id="' + escapeHtml(exId) + '">';
  html += '<h3>' + ex.num + '. ' + escapeHtml(ex.question || '') + '</h3>';

  // 中文提示
  if (ex.zhQuestion) {
    html += '<p class="exercise-zh-hint">' + escapeHtml(ex.zhQuestion) + '</p>';
  }

  // 选项
  html += '<div class="b2-options">';
  for (var j = 0; j < (ex.options || []).length; j++) {
    var key = extractOptionKey(ex.options[j]);
    var selected = record.selected === key;
    var isCorrectAnswer = key === ex.answer;
    var cls = 'b2-option-row' +
      (submitted && isCorrectAnswer ? ' correct' : '') +
      (submitted && selected && !isCorrectAnswer ? ' wrong' : '') +
      (selected && !submitted ? ' selected' : '');
    var disabled = submitted ? ' style="pointer-events:none;opacity:0.85"' : '';

    html += '<div class="' + cls + '" onclick="submitReadingSpeakingOption(\'' + escapeHtml(exId) + '\',\'' + escapeHtml(key) + '\',event)"' + disabled + '>' +
      '<span class="b2-option-label">' + escapeHtml(ex.options[j]) + '</span>';
    if (ex.zhOptions && ex.zhOptions[j]) {
      html += '<span class="b2-option-zh">' + escapeHtml(ex.zhOptions[j]) + '</span>';
    }
    html += '</div>';
  }
  html += '</div>';

  // 结果
  if (submitted) {
    html += '<p class="b2-quiz-result ' + (record.wrong ? 'wrong' : 'correct') + '">' +
      (record.wrong ? '回答错误' : '回答正确') + '</p>';
  }

  // 解析
  if (submitted) {
    html += '<button class="b2-explanation-toggle" onclick="toggleReadingSpeakingExplanation(\'' + escapeHtml(exId) + '\')">' +
      (record.expOpen ? '收起解析 ▲' : '查看解析 ▼') + '</button>';
    if (record.expOpen) {
      html += '<div class="b2-explanation">' +
        '<p><strong>答案：' + escapeHtml(ex.answer) + '</strong></p>';
      if (ex.detailed_explanation) {
        var paragraphs = ex.detailed_explanation.split('\\n').filter(function(p) { return p.trim(); });
        for (var p = 0; p < paragraphs.length; p++) {
          var para = paragraphs[p].trim();
          if (para.startsWith('【') && para.includes('】')) {
            html += '<div class="answer-section-title">' + escapeHtml(para) + '</div>';
          } else {
            html += '<div class="answer-para">' + escapeHtml(para) + '</div>';
          }
        }
      } else if (ex.explanation) {
        html += '<p>' + escapeHtml(ex.explanation) + '</p>';
      }
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}
```

- [ ] **Step 7: 新增交互函数**

```js
/* ══════════════════════════════════════════════
   В мире людей — 答题交互
   ══════════════════════════════════════════════ */
function submitReadingSpeakingOption(exId, key, evt) {
  // 点到俄语单词 → 交给词典
  if (evt && evt.target.closest('.ru-word')) return;
  var record = getReadingSpeakingRecord(exId);
  if (record.submitted) return;

  if (record.selected === key) {
    // 双击同一选项 → 确认提交
    record.submitted = true;
    var ex = getReadingSpeakingExercise(exId);
    record.wrong = ex ? key !== ex.answer : false;
    if (record.wrong) {
      record._wrongRecorded = true;
    }
    var progress = getReadingSpeakingProgress();
    progress[exId] = record;
    saveReadingSpeakingProgress(progress);
  } else {
    // 第一次点击 → 选中
    record.selected = key;
    var progress = getReadingSpeakingProgress();
    progress[exId] = record;
    saveReadingSpeakingProgress(progress);
  }
  rerenderReadingSpeakingChapter();
}

function toggleReadingSpeakingExplanation(exId) {
  var record = getReadingSpeakingRecord(exId);
  if (!record.submitted) return;
  record.expOpen = !record.expOpen;
  var progress = getReadingSpeakingProgress();
  progress[exId] = record;
  saveReadingSpeakingProgress(progress);
  rerenderReadingSpeakingChapter();
}

function rerenderReadingSpeakingChapter() {
  if (!_currentRSData) return;
  renderReadingSpeakingChapter(_currentRSData, window.scrollY);
}
```

- [ ] **Step 8: 验证章节阅读页**

手动验证：
- 仪表盘点击章节 → 进入分屏阅读页
- 左侧显示段落（☆ 收藏按钮、点击俄语行展开翻译）
- 点击俄语单词 → 右侧词典面板显示释义
- 练习题：单击选项高亮，再次单击同一选项提交
- 提交后显示对/错 + 可展开解析
- 底部 ← → 翻章，✓ 标记完成按钮
- 标记完成后弹窗显示统计

- [ ] **Step 9: 提交**

```bash
git add reader.html
git commit -m "feat: add В мире людей chapter reader with split-pane and quiz interaction"
```

---

### Task 4: 面包屑适配 + 润色

**改动:** `reader.html` `showBreadcrumb` 函数（行 1067-1129）

- [ ] **Step 1: 在 showBreadcrumb 中加 reading_speaking 路径**

定位到 `showBreadcrumb` 函数中构建 items 的 else 分支（约行 1084）：

```js
  } else if (curBook) {
    items.push({ label: '📘 ' + curBook.title, action: 'showChapters(\'' + escapeHtml(curBook.id) + '\')', type: 'page' });
  }
```

改为：
```js
  } else if (curBook && curBook.id === 'reading_speaking') {
    items.push({ label: '📘 ' + curBook.title, action: 'showReadingSpeakingDashboard()', type: 'page' });
  } else if (curBook) {
    items.push({ label: '📘 ' + curBook.title, action: 'showChapters(\'' + escapeHtml(curBook.id) + '\')', type: 'page' });
  }
```

- [ ] **Step 2: 当前章节标题获取**

在 `showBreadcrumb` 的当前标题获取逻辑（约行 1089）中，`_currentRSData` 不会被识别，需要在其前加入：

在行 1090 附近，`currentQuizData` 检查之后插入：
```js
  else if (_currentRSData && _currentRSData.title) curTitle = _currentRSData.title;
```

- [ ] **Step 3: 验证面包屑**

手动验证：
- 在 В мире людей 章节页点击 ☰
- 面包屑显示：📖 书架 → 📘 В мире людей — 阅读口语 → 当前章节标题
- 点击中间项回到仪表盘
- B2 阅读模块的面包屑不受影响

- [ ] **Step 4: 提交**

```bash
git add reader.html
git commit -m "fix: add reading_speaking breadcrumb path"
```

---

### Task 5: 回归测试

- [ ] **Step 1: 运行现有测试**

```bash
node tests/russian-b2/reader-static.test.js
```

预期：全部通过（所有测试都是静态检查 reader.html 源码中的函数名和模式，新增代码不应该破坏任何现有断言）。

- [ ] **Step 2: 手动回归小说阅读**

启动服务器，打开 `http://localhost:3000`：
- 点击 boss_yin → 确认小说阅读界面正常（旧 toolbar、段落点击展开翻译）
- 点击 russian_tales → 同上
- 确认 markChapterDone 工作正常

- [ ] **Step 3: 手动回归 B2 语法词汇模块**

- B2 仪表盘 → 语法模块 → P1 → quiz 选项交互正常
- 错题本功能正常

- [ ] **Step 4: 手动回归 B2 全模块**

- 阅读模块 → 分屏 + 词典正常
- 写作模块 → 正常
- 听力模块 → 正常
- 会话模块 → 正常
- 真题模块 → 正常

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "test: regression verification for reading module unification"
```

---

## 验证清单（最终）

- [ ] B2 阅读模块 → 有分屏布局 + 右侧词典面板
- [ ] B2 阅读模块 → 拖拽分割线可调整比例，刷新后保持
- [ ] B2 阅读模块 → 点击俄语单词查词正常
- [ ] 书架 → 点击 В мире людей → 仪表盘（30 章 grid）
- [ ] 仪表盘 → 显示进度条 + 已完成章节 ✓
- [ ] 仪表盘 → 有继续上次学习按钮（如有记录）
- [ ] 仪表盘 → 点击章节 → 分屏阅读页
- [ ] 章节页 → 段落 ☆ 收藏 + 点击展开翻译
- [ ] 章节页 → 俄语单词点击查词（右侧词典面板）
- [ ] 章节页 → 单击选项选中，双击同一选项提交
- [ ] 章节页 → 答对 ✓ / 答错 ✗ 显示，解析可展开
- [ ] 章节页 → 标记完成 → 弹窗（时长、段落数、查阅词数）
- [ ] 章节页 → 回到仪表盘 → 对应章节显示 ✓
- [ ] 章节页 → 键盘 ← → 翻页
- [ ] 面包屑：书架 → В мире людей 仪表盘 → 当前章节
- [ ] 🎨 Aa 主题字号切换正常
- [ ] boss_yin / russian_tales 小说 → 旧逻辑完好
- [ ] B2 语法词汇 quiz → 不受影响
- [ ] `reader-static.test.js` → 全部通过
