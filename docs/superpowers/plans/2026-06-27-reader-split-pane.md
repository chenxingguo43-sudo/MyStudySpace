# Reader 可拖拽分栏布局 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 reader.html 的阅读区+详情面板从 px 宽度 + CSS transition 方案改为 Flexbox 百分比 + Pointer Events 可拖拽分栏，适配 iPad 横屏（左右）和手机竖屏（上下）。

**Architecture:** 所有改动集中在单文件 `reader.html`。CSS 改用 `flex-basis` 百分比控制阅读区宽度，移除 `.detail-panel` 的 transition 和 `.detail-overlay` 浮层。JS 拖拽逻辑从 `mousedown` + px 计算重写为 `pointerdown/move/up` + 百分比计算，横屏/竖屏比例分别存入 localStorage。

**Tech Stack:** Vanilla HTML/CSS/JS，Pointer Events API，Flexbox，localStorage

---

## 文件改动总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `reader.html` | 修改 | CSS、HTML 模板、JS 三处改动 |

---

## 改动区块速查

| 区块 | 行号范围 | 操作 |
|------|----------|------|
| CSS: 分屏布局容器 | 129–161 | 重写 |
| CSS: 竖屏媒体查询 | 445–461 | 重写 |
| HTML 模板 | 961–974 | 改 DOM 顺序，去 overlay |
| JS: 面板开关函数 | 1062–1128 | 简化 |
| JS: 拖拽逻辑 | 1130–1160 | 重写 |
| JS: renderChapter 末尾 | 975–981 | 新增 restoreSplitRatio 调用 |

---

### Task 1: 重写 CSS — 分屏布局和分割线

**Files:**
- Modify: `reader.html:129-161`（替换整个区块）

- [ ] **Step 1: 替换分屏布局 CSS**

找到 `.reader-layout` 到 `.detail-overlay` 之间的 CSS（约第 129–161 行），整段替换为以下代码：

```css
/* ─── 分屏布局容器 ─── */
.reader-layout {
  position: relative; z-index: 1;
  display: flex; flex-direction: row;
  width: 100%; max-width: 1100px; margin: 0 auto;
  padding: 0 16px 100px;
  /* 减去 toolbar(48px) + peek-counter(~36px) + bottom-nav(52px) 的近似值 */
  min-height: calc(100vh - 140px);
}
/* 阅读区：flex-basis 百分比由 JS 动态控制 */
.reader-pane {
  flex: 0 0 70%;   /* 默认 70%，JS 可覆盖 */
  min-width: 25%;   /* 最小 25% */
  max-width: 85%;   /* 最大 85% */
  min-width: 0;     /* 允许 flex 收缩到 min-width 以下时不会溢出 */
  overflow-y: auto;
  padding-right: 8px;
}
/* 分割线 */
.resize-handle {
  width: 8px; flex-shrink: 0; cursor: col-resize;
  background: transparent; border-radius: 4px;
  transition: background 0.2s;
  touch-action: none;         /* 禁止浏览器默认手势 */
  align-self: stretch;
  user-select: none;          /* 防止拖拽时选中文字 */
  -webkit-user-select: none;
}
.resize-handle:hover { background: var(--accent); opacity: 0.5; }
.resize-handle.active { background: var(--accent); opacity: 1; box-shadow: 0 0 12px var(--accent-dim); }
/* 详情面板 */
.detail-panel {
  flex: 1;                    /* 自动填满剩余空间 */
  min-width: 0;               /* 允许收缩 */
  overflow-y: auto;
  background: var(--surface-solid);
  border: 1px solid var(--glass-border); border-radius: 16px;
  margin-left: 8px;
  /* 注意：无 transition！拖拽需要即时响应 */
}
.detail-panel-inner { padding: 20px; }
/* 面板占位提示 */
.detail-placeholder {
  display: flex; align-items: center; justify-content: center;
  min-height: 200px; color: var(--text-dim); font-size: 14px;
  text-align: center; line-height: 1.8; padding: 20px;
}
/* ─── 叠加遮罩（竖屏）─── 已移除 .detail-overlay ─── */
```

- [ ] **Step 2: 替换竖屏媒体查询**

找到 `@media (max-width: 767px)` 内的 `.reader-layout`、`.detail-panel`、`.resize-handle`、`.detail-overlay` 规则（约第 445–461 行），替换为以下代码：

```css
@media (max-width: 767px) {
  .main-container { padding: 12px 12px 80px; }
  .mode-btn { font-size: 11px; padding: 4px 8px; }
  .chapter-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
  .ch-item { padding: 8px 6px; font-size: 12px; }
  .toolbar { padding: 0 8px; min-height: 44px; }
  .peek-counter { top: 44px; }
  .search-bar.visible + .peek-counter { top: 88px; }
  .toolbar-timer { display: none; }
  .search-bar { top: 44px; }
  /* ─── 竖屏分栏：上下布局 ─── */
  .reader-layout {
    flex-direction: column;
    max-width: 100%; padding: 0 12px 80px;
  }
  .reader-pane {
    flex: 0 0 55%;        /* 竖屏默认上方 55% */
    min-width: 0; max-width: 100%;
    min-height: 25%; max-height: 85%;
    width: 100%;
    padding-right: 0;
    padding-bottom: 4px;
  }
  .resize-handle {
    width: 100%; height: 8px;
    cursor: row-resize;    /* 上下拖拽光标 */
    align-self: auto;
  }
  .detail-panel {
    margin-left: 0; margin-top: 4px;
    min-height: 15%;
    width: 100%;
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add reader.html
git commit -m "style: rewrite split-pane CSS with flex-basis + responsive direction"
```

---

### Task 2: 修改 HTML 模板结构

**Files:**
- Modify: `reader.html:961-974`（HTML 模板字符串）

- [ ] **Step 1: 调整 DOM 顺序并移除 overlay**

找到 `renderChapter` 函数中的 `document.getElementById('app').innerHTML =` 赋值语句（约第 961–974 行），将 `.reader-layout` 内部结构改为：阅读区 → 分割线 → 详情面板。移除 `.detail-overlay`，面板添加默认占位内容。

将这段：

```javascript
document.getElementById('app').innerHTML =
    toolbar('第 ' + (curCh + 1) + ' 章',
      '<button class="tb-btn" onclick="toggleSearch()" title="搜索 (Ctrl+F)">🔍</button>' +
      '<button class="tb-btn" onclick="showChapters(\'' + escapeHtml(curBook.id) + '\')" title="目录">☰</button>') +
    '<div class="peek-counter">👁 查看原文: <span id="peekCnt">0</span> / <span id="totalParas">' + visibleCount + '</span> 段</div>' +
    '<div class="reader-layout">' +
    '<div class="reader-pane"><div class="chapter-content">' +
    '<div class="chapter-header"><h1>Глава ' + (curCh + 1) + '</h1><h2>' + escapeHtml(data.title || '') + '</h2></div>' +
    parts.join('') + exercisesHtml + '</div></div>' +
    '<div class="detail-panel" id="detailPanel"><div class="detail-panel-inner" id="detailInner"></div></div>' +
    '<div class="resize-handle" id="resizeHandle"></div>' +
    '<div class="detail-overlay" id="detailOverlay" onclick="closeDetailPanel()"></div>' +
    '</div>' +
    '<nav class="bottom-nav">' + navP + '<span class="nav-info">第 ' + (curCh + 1) + ' / ' + curBook.chapters + ' 章</span>' + navN + '</nav>';
```

替换为：

```javascript
document.getElementById('app').innerHTML =
    toolbar('第 ' + (curCh + 1) + ' 章',
      '<button class="tb-btn" onclick="toggleSearch()" title="搜索 (Ctrl+F)">🔍</button>' +
      '<button class="tb-btn" onclick="showChapters(\'' + escapeHtml(curBook.id) + '\')" title="目录">☰</button>') +
    '<div class="peek-counter">👁 查看原文: <span id="peekCnt">0</span> / <span id="totalParas">' + visibleCount + '</span> 段</div>' +
    '<div class="reader-layout" id="readerLayout">' +
    '<div class="reader-pane" id="readerPane"><div class="chapter-content">' +
    '<div class="chapter-header"><h1>Глава ' + (curCh + 1) + '</h1><h2>' + escapeHtml(data.title || '') + '</h2></div>' +
    parts.join('') + exercisesHtml + '</div></div>' +
    '<div class="resize-handle" id="resizeHandle"></div>' +
    '<div class="detail-panel" id="detailPanel"><div class="detail-panel-inner" id="detailInner">' +
    '<div class="detail-placeholder">👆 点击俄语单词查看详情</div>' +
    '</div></div>' +
    '</div>' +
    '<nav class="bottom-nav">' + navP + '<span class="nav-info">第 ' + (curCh + 1) + ' / ' + curBook.chapters + ' 章</span>' + navN + '</nav>';
```

- [ ] **Step 2: 在 renderChapter 末尾添加分栏比例恢复调用**

找到 `renderChapter` 函数末尾的这几行（约第 976–981 行）：

```javascript
  window.scrollTo(0, 0); applyTheme(); saveLastRead();
  // 恢复滚动
  try { var lr2 = JSON.parse(localStorage.getItem('rr_lastread_' + NOVEL_ID)); if (lr2 && lr2.bookId === curBook.id && lr2.chapter === curCh && lr2.scroll > 0) setTimeout(function() { window.scrollTo(0, lr2.scroll); }, 100); } catch(e) {}
  // 高亮已保存单词
  highlightSavedWords();
```

替换为：

```javascript
  window.scrollTo(0, 0); applyTheme(); saveLastRead();
  // 恢复分栏比例
  restoreSplitRatio();
  // 恢复滚动
  try { var lr2 = JSON.parse(localStorage.getItem('rr_lastread_' + NOVEL_ID)); if (lr2 && lr2.bookId === curBook.id && lr2.chapter === curCh && lr2.scroll > 0) setTimeout(function() { window.scrollTo(0, lr2.scroll); }, 100); } catch(e) {}
  // 高亮已保存单词
  highlightSavedWords();
```

- [ ] **Step 3: 提交**

```bash
git add reader.html
git commit -m "feat: reorder DOM for split-pane, remove overlay, add restoreSplitRatio"
```

---

### Task 3: 重写面板开关函数

**Files:**
- Modify: `reader.html:1062-1128`（openDetailPanel / closeDetailPanel / toggleDetailPanel）

- [ ] **Step 1: 替换面板开关函数**

找到 `/* ─── 详情面板开关 ─── */` 区块（约第 1062–1128 行），将三个函数整段替换：

删掉旧的：

```javascript
/* ─── 详情面板开关 ─── */
var _detailWord = '';

function openDetailPanel(word) {
  _detailWord = word;
  var panel = document.getElementById('detailPanel');
  var overlay = document.getElementById('detailOverlay');
  var handle = document.getElementById('resizeHandle');
  if (panel) {
    // 恢复用户拖拽偏好宽度
    var savedW = null;
    try { savedW = localStorage.getItem('rr_panel_width'); } catch(e) {}
    if (savedW) { panel.style.width = savedW; }
    panel.classList.add('open');
  }
  if (overlay) overlay.classList.add('visible');
  if (handle) handle.classList.add('visible');
}

function closeDetailPanel() {
  _detailWord = '';
  var panel = document.getElementById('detailPanel');
  var overlay = document.getElementById('detailOverlay');
  var handle = document.getElementById('resizeHandle');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
  if (handle) handle.classList.remove('visible');
}
```

替换为：

```javascript
/* ─── 详情面板开关 ─── */
var _detailWord = '';

function openDetailPanel(word) {
  _detailWord = word;
  // 面板始终可见，不需要 .open 类切换
  // 内容由 autoLookup → renderDetailPanel 填充
}

function closeDetailPanel() {
  _detailWord = '';
  var inner = document.getElementById('detailInner');
  if (inner) {
    inner.innerHTML = '<div class="detail-placeholder">👆 点击俄语单词查看详情</div>';
  }
}
```

- [ ] **Step 2: 更新 toggleDetailPanel 逻辑**

`toggleDetailPanel` 保持不变（之前的逻辑是同一单词再点就关闭，不同单词就切换，语义正确）。

- [ ] **Step 3: 提交**

```bash
git add reader.html
git commit -m "refactor: simplify panel open/close, panel always visible"
```

---

### Task 4: 重写拖拽逻辑（Pointer Events + 百分比）

**Files:**
- Modify: `reader.html:1130-1160`（拖拽 IIFE）
- Add: `restoreSplitRatio` 函数（新函数，放在拖拽 IIFE 之后）

- [ ] **Step 1: 替换拖拽 IIFE**

找到 `/* ─── 拖拽分界线 ─── */` 区块（约第 1130–1160 行），整段替换：

删掉旧的：

```javascript
/* ─── 拖拽分界线 ─── */
(function() {
  var handleEl = null, panelEl = null, startX = 0, startW = 0;
  document.addEventListener('pointerdown', function(e) {
    if (!e.target.closest('#resizeHandle')) return;
    handleEl = e.target.closest('#resizeHandle');
    panelEl = document.getElementById('detailPanel');
    if (!panelEl) return;
    handleEl.classList.add('active');
    startX = e.clientX;
    startW = panelEl.offsetWidth || 380;
    handleEl.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', function(e) {
    if (!handleEl) return;
    var delta = startX - e.clientX;
    var w = Math.max(280, Math.min(520, startW + delta));
    panelEl.style.width = w + 'px';
  });
  document.addEventListener('pointerup', function() {
    if (!handleEl) return;
    handleEl.classList.remove('active');
    handleEl = null;
    panelEl = null;
    // 保存偏好
    try {
      var pw = document.getElementById('detailPanel');
      if (pw) localStorage.setItem('rr_panel_width', pw.style.width);
    } catch(err) {}
  });
})();
```

替换为：

```javascript
/* ─── 拖拽分界线 ─── */
(function() {
  var layoutEl = null, paneEl = null, handleEl = null;
  var dragging = false, isHorizontal = true;

  function refreshRefs() {
    layoutEl = document.getElementById('readerLayout');
    paneEl = document.getElementById('readerPane');
    handleEl = document.getElementById('resizeHandle');
  }

  function getDirection() {
    if (!layoutEl) return 'row';
    return getComputedStyle(layoutEl).flexDirection;
  }

  document.addEventListener('pointerdown', function(e) {
    refreshRefs();
    if (!e.target.closest('#resizeHandle')) return;
    if (!paneEl) return;
    dragging = true;
    isHorizontal = getDirection() === 'row';
    handleEl.classList.add('active');
    handleEl.setPointerCapture(e.pointerId);
  });

  document.addEventListener('pointermove', function(e) {
    if (!dragging || !paneEl || !layoutEl) return;
    var rect = layoutEl.getBoundingClientRect();
    var percentage;
    if (isHorizontal) {
      percentage = ((e.clientX - rect.left) / rect.width) * 100;
    } else {
      percentage = ((e.clientY - rect.top) / rect.height) * 100;
    }
    percentage = Math.max(25, Math.min(85, percentage));
    paneEl.style.flexBasis = percentage + '%';
  });

  document.addEventListener('pointerup', function(e) {
    if (!dragging) return;
    dragging = false;
    if (handleEl) handleEl.classList.remove('active');
    if (handleEl) handleEl.releasePointerCapture(e.pointerId);
    // 持久化：横屏/竖屏各存一份
    try {
      var key = isHorizontal ? 'rr_split_h' : 'rr_split_v';
      localStorage.setItem(key, paneEl.style.flexBasis);
    } catch(err) {}
  });
})();
```

- [ ] **Step 2: 新增 restoreSplitRatio 函数**

在拖拽 IIFE 的 `})();` 之后、`// ─── 查词弹窗共用逻辑 ───` 注释之前，插入新函数：

```javascript
/* ─── 恢复分栏比例 ─── */
function restoreSplitRatio() {
  var layout = document.getElementById('readerLayout');
  var pane = document.getElementById('readerPane');
  if (!layout || !pane) return;

  var isH = getComputedStyle(layout).flexDirection === 'row';
  var key = isH ? 'rr_split_h' : 'rr_split_v';
  var saved = null;
  try { saved = localStorage.getItem(key); } catch(e) {}

  if (saved) {
    pane.style.flexBasis = saved;
  } else {
    // 默认值：横屏 70%，竖屏 55%
    pane.style.flexBasis = isH ? '70%' : '55%';
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add reader.html
git commit -m "feat: rewrite drag logic with pointer events + flex-basis percentage"
```

---

### Task 5: 验证 — 手动测试 10 项

**Files:** 无新建文件

**前提：** `node server.js` 已运行在 http://localhost:3000

- [ ] **Step 1: 桌面鼠标拖拽**

打开 http://localhost:3000/reader.html，进入任意书籍 → 任意章节。
用鼠标拖动分割线左右移动，确认阅读区宽度实时变化，松开后比例不变。

- [ ] **Step 2: 边界限制**

拖拽到最左（阅读区最小），确认不会小于 25%（阅读区始终可读）。
拖拽到最右（阅读区最大），确认不会超过 85%（面板始终有空间）。

- [ ] **Step 3: 比例记忆**

调好比例（比如把分割线拖到中间 50% 位置），按 F5 刷新页面，确认比例恢复。

- [ ] **Step 4: 方向独立记忆**

横屏下调成 40%，缩小窗口到 <768px 触发竖屏，调成 60%，再放大窗口回横屏。确认横屏恢复 40%，竖屏恢复 60%。

- [ ] **Step 5: 竖屏上下拖拽**

缩小窗口到 <768px，确认布局变为上下分栏，分割线水平，光标为 row-resize。上下拖动分割线，确认阅读区高度实时变化。

- [ ] **Step 6: 主题切换**

点 🎨 切换暗色/护眼/纸质主题，确认分割线颜色跟随主题变量变化，拖拽时发光的颜色也是主题色。

- [ ] **Step 7: 书架/目录视图不受影响**

从阅读视图点 ☰ 返回目录，确认布局正常（使用 .main-container，不是 .reader-layout）。
再返回书架，确认书架布局正常。

- [ ] **Step 8: 点击单词查词**

在阅读区点击任意俄语单词，确认右侧面板显示该单词的释义。再点击另一个单词，确认面板内容切换。点击空白区域，面板恢复占位提示。

- [ ] **Step 9: 点击外部关闭**

面板显示某单词释义时，点击阅读区空白处（非单词区域），确认面板清空并恢复占位提示。分割线保持原位置不变。

- [ ] **Step 10: 拖拽后查词**

拖拽调整分栏比例后，点击单词查词。确认面板正常显示内容，分栏比例不受查词操作影响。

- [ ] **Step 11: 提交验证结果**

如果全部通过：

```bash
git add reader.html
git commit -m "test: manual verification of split-pane — all 10 checks passed"
```

如果有失败项，回到对应 Task 修复后重新验证。

---

## 回滚方案

如果改动引入问题，用 git 回滚：

```bash
git checkout main -- reader.html
```

改动完全限制在 `reader.html` 一个文件内，不影响项目其他部分。

## 预期最终 diff 统计

| 区块 | 删除行 | 新增行 |
|------|--------|--------|
| CSS 分屏布局 | ~33 | ~45 |
| CSS 竖屏媒体查询 | ~17 | ~30 |
| HTML 模板 | ~5 | ~6 |
| 面板开关函数 | ~10 | ~8 |
| 拖拽逻辑 | ~30 | ~40 |
| restoreSplitRatio | 0 | +16 |
| **合计** | **~95** | **~145** |
