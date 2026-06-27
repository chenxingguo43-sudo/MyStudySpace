# Reader 交互修复 + 悬浮工具栏 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复点击空白丢失面板内容 + 面板不跟随滚动 + 工具栏改为悬浮半透明按钮，提升阅读沉浸感。

**Architecture:** 所有改动集中在单文件 `reader.html`。CSS 三处改动（面板 sticky、底栏瘦身、浮动工具栏）、HTML 模板一处改动（阅读视图）、JS 一处改动（去掉外部点击关闭）。书架/目录视图保留原 toolbar 不变。

**Tech Stack:** Vanilla HTML/CSS/JS, CSS `position: sticky`, CSS `position: fixed`

---

## 文件改动总览

| 文件 | 区块 | 操作 |
|------|------|------|
| `reader.html` | CSS `.floating-toolbar` 新增 | 新样式块 |
| `reader.html` | CSS `.bottom-nav` / `.nav-btn` | 修改透明度/高度 |
| `reader.html` | CSS `.reader-layout` / `.reader-pane` / `.detail-panel` | 修改 overflow/sticky/min-height |
| `reader.html` | CSS `.detail-close` 新增 | 关闭按钮样式 |
| `reader.html` | HTML `renderChapter` 模板 | 工具栏→浮动按钮 + 面板加 ✕ |
| `reader.html` | JS click 处理器 | 删除外部点击关闭 |

---

### Task 1: CSS — 修复面板 sticky 跟随滚动 + 去掉外部关闭

**Files:**
- Modify: `reader.html` CSS 部分

- [ ] **Step 1: 修改 `.reader-layout` 去掉 min-height**

找到第 130-137 行：

```css
.reader-layout {
  position: relative; z-index: 1;
  display: flex; flex-direction: row;
  width: 100%; max-width: none;
  padding: 0 0 100px;
  /* 减去 toolbar(48px) + peek-counter(~36px) + bottom-nav(52px) 的近似值 */
  min-height: calc(100vh - 140px);
}
```

替换为：

```css
.reader-layout {
  position: relative; z-index: 1;
  display: flex; flex-direction: row;
  width: 100%; max-width: none;
  padding: 0 0 60px;
}
```

- [ ] **Step 2: 修改 `.reader-pane` 去掉 overflow-y**

找到第 138-145 行：

```css
/* 阅读区：flex-basis 百分比由 JS 动态控制 */
.reader-pane {
  flex: 0 0 70%;   /* 默认 70%，JS 可覆盖 */
  min-width: 25%;   /* 最小 25% */
  max-width: 85%;   /* 最大 85% */
  overflow-y: auto;
  padding-left: 16px; padding-right: 8px;
}
```

替换为：

```css
/* 阅读区：flex-basis 百分比由 JS 动态控制 */
.reader-pane {
  flex: 0 0 70%;   /* 默认 70%，JS 可覆盖 */
  min-width: 25%;   /* 最小 25% */
  max-width: 85%;   /* 最大 85% */
  padding-left: 16px; padding-right: 8px;
}
```

- [ ] **Step 3: 修改 `.detail-panel` 加 sticky**

找到第 159-167 行：

```css
/* 详情面板 */
.detail-panel {
  flex: 1;                    /* 自动填满剩余空间 */
  min-width: 0;               /* 允许收缩 */
  overflow-y: auto;
  /* 注意：无 transition！拖拽需要即时响应 */
}
```

替换为：

```css
/* 详情面板 */
.detail-panel {
  flex: 1;                    /* 自动填满剩余空间 */
  min-width: 0;               /* 允许收缩 */
  position: sticky; top: 0; align-self: flex-start;
  max-height: 100vh; overflow-y: auto;
  /* 注意：无 transition！拖拽需要即时响应 */
}
```

- [ ] **Step 4: 提交**

```bash
git add reader.html
git commit -m "fix: detail panel sticky scroll + remove pane overflow"
```

---

### Task 2: CSS — 底栏瘦身 + 悬浮工具栏 + 关闭按钮样式

**Files:**
- Modify: `reader.html` CSS 部分（底部导航、新增浮动工具栏、新增关闭按钮）

- [ ] **Step 1: 修改底部导航栏 CSS**

找到第 316-329 行：

```css
/* ─── 底部导航 ─── */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between;
  background: rgba(10,10,20,0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--border); padding: 8px 16px; z-index: 90; min-height: 52px;
}
.nav-btn {
  padding: 8px 18px; border: 1px solid var(--glass-border); border-radius: 10px;
  color: var(--accent); text-decoration: none; font-size: 14px; cursor: pointer;
  background: var(--glass); transition: all 0.15s; font-family: inherit;
}
.nav-btn:hover { background: var(--glass-hover); }
.nav-btn:active { transform: scale(0.95); }
.nav-btn.disabled { color: var(--text-dim); opacity: 0.4; pointer-events: none; }
```

替换为：

```css
/* ─── 底部导航 ─── */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between;
  background: rgba(10,10,20,0.5);
  border-top: 1px solid var(--border); padding: 0 16px; z-index: 90; min-height: 36px;
}
.nav-btn {
  padding: 4px 12px; border: 1px solid var(--glass-border); border-radius: 8px;
  color: var(--text-secondary); text-decoration: none; font-size: 13px; cursor: pointer;
  background: var(--glass); transition: all 0.15s; font-family: inherit;
}
.nav-btn:hover { background: var(--glass-hover); color: var(--accent); }
.nav-btn:active { transform: scale(0.95); }
.nav-btn.disabled { color: var(--text-dim); opacity: 0.3; pointer-events: none; }
.nav-info { font-size: 12px; color: var(--text-dim); }
```

- [ ] **Step 2: 新增悬浮工具栏和关闭按钮 CSS**

在 `/* ─── 底部导航 ─── */` 块之前插入以下新 CSS：

```css
/* ─── 悬浮工具栏 ─── */
.floating-toolbar {
  position: fixed; top: 12px; left: 12px; z-index: 150;
  display: flex; flex-direction: column; gap: 6px;
}
.floating-toolbar .ft-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--glass); border: 1px solid var(--glass-border);
  color: var(--text-secondary); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.4; transition: opacity 0.2s, background 0.2s;
}
.floating-toolbar .ft-btn:hover { opacity: 0.95; background: var(--glass-hover); }
.floating-toolbar .ft-btn:active { transform: scale(0.92); }

/* ─── 面板关闭按钮 ─── */
.detail-close {
  position: sticky; top: 0; right: 0; z-index: 10;
  float: right;
  width: 28px; height: 28px; line-height: 28px; text-align: center;
  border-radius: 50%; cursor: pointer;
  color: var(--text-dim); font-size: 14px;
  background: var(--glass); border: 1px solid var(--glass-border);
  transition: all 0.15s;
}
.detail-close:hover { color: var(--text); background: var(--glass-hover); }
```

- [ ] **Step 3: 提交**

```bash
git add reader.html
git commit -m "style: floating toolbar + slim bottom nav + close button CSS"
```

---

### Task 3: HTML — 阅读视图模板重构

**Files:**
- Modify: `reader.html` `renderChapter` 函数中的 HTML 模板（约第 985-997 行）

- [ ] **Step 1: 替换阅读视图模板**

找到 `document.getElementById('app').innerHTML =` 赋值（约第 985-997 行）。

当前代码：

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

替换为：

```javascript
  document.getElementById('app').innerHTML =
    '<div class="floating-toolbar">' +
    '<button class="ft-btn" onclick="cycleTheme()" title="切换主题">🎨</button>' +
    '<button class="ft-btn" onclick="cycleFont()" title="字号">Aa</button>' +
    '<button class="ft-btn" onclick="toggleSearch()" title="搜索 (Ctrl+F)">🔍</button>' +
    '<button class="ft-btn" onclick="showChapters(\'' + escapeHtml(curBook.id) + '\')" title="目录">☰</button>' +
    '</div>' +
    '<div class="peek-counter">👁 查看原文: <span id="peekCnt">0</span> / <span id="totalParas">' + visibleCount + '</span> 段</div>' +
    '<div class="reader-layout" id="readerLayout">' +
    '<div class="reader-pane" id="readerPane"><div class="chapter-content">' +
    '<div class="chapter-header"><h1>Глава ' + (curCh + 1) + '</h1><h2>' + escapeHtml(data.title || '') + '</h2></div>' +
    parts.join('') + exercisesHtml + '</div></div>' +
    '<div class="resize-handle" id="resizeHandle"></div>' +
    '<div class="detail-panel" id="detailPanel"><div class="detail-panel-inner" id="detailInner">' +
    '<div class="detail-close" onclick="event.stopPropagation();closeDetailPanel()" title="关闭">✕</div>' +
    '<div class="detail-placeholder">👆 点击俄语单词查看详情</div>' +
    '</div></div>' +
    '</div>' +
    '<nav class="bottom-nav">' + navP + '<span class="nav-info">第 ' + (curCh + 1) + ' / ' + curBook.chapters + ' 章</span>' + navN + '</nav>';
```

关键变化：
- `toolbar(...)` 替换为 inline `<div class="floating-toolbar">` + 4 个 ft-btn
- 面板内部 `<div class="detail-placeholder">` 之前加了 `<div class="detail-close" ...>✕</div>`
- 其余结构不变

- [ ] **Step 2: 提交**

```bash
git add reader.html
git commit -m "feat: floating toolbar + close button in reading view"
```

---

### Task 4: JS — 去掉外部点击关闭面板逻辑

**Files:**
- Modify: `reader.html` click 处理器（约第 1269-1271 行）

- [ ] **Step 1: 删除外部点击关闭面板**

找到第 1269-1271 行：

```javascript
  // 3. 点到了外部 → 关闭弹窗 + 面板（拖拽分割线不触发关闭）
  if (popup) popup.classList.remove('visible');
  if (_detailWord && !e.target.closest('#resizeHandle')) closeDetailPanel();
```

替换为：

```javascript
  // 3. 点到了外部 → 关闭弹窗（面板不关闭，用户主动点 ✕ 关闭）
  if (popup) popup.classList.remove('visible');
```

- [ ] **Step 2: 验证**

确认 `_detailWord` 仍在 `openDetailPanel` 中设置、`toggleDetailPanel` 中正确使用（同一单词重复点击关闭的逻辑不变）。确认点 ✕ 按钮时 `onclick="event.stopPropagation();closeDetailPanel()"` 不会触发 click 处理器。

- [ ] **Step 3: 提交**

```bash
git add reader.html
git commit -m "fix: remove click-outside-close-panel — use ✕ button instead"
```

---

### Task 5: 手动验证

- [ ] **Step 1: 点空白不丢面板**

打开 reader.html → 进入章节 → 点击单词 → 右侧面板显示释义 → 点击阅读区空白处 → 面板内容保持，不消失。

- [ ] **Step 2: ✕ 按钮关闭**

面板显示释义时 → 点面板顶部 ✕ 按钮 → 面板恢复占位提示"👆 点击俄语单词查看详情"。

- [ ] **Step 3: 重复点同一单词关闭**

点单词 A → 面板显示 → 再点单词 A → 面板关闭恢复占位。点单词 A → 点单词 B → 面板切换为 B 的释义。

- [ ] **Step 4: 面板跟随滚动**

进入较长章节 → 点单词显示释义 → 往下滚动页面 → 右侧面板始终在视口可见区域，不随内容滚出屏幕。

- [ ] **Step 5: 悬浮工具栏**

确认左上角有 4 个半透明圆形按钮（🎨 Aa 🔍 ☰），默认半透明，hover 变亮。点击各按钮功能正常。

- [ ] **Step 6: 底栏瘦身**

确认底栏比之前更窄（36px），背景更透明，按钮更小。

- [ ] **Step 7: 分割线拖拽**

拖拽分割线 → 面板内容不丢失 → 松开后比例正常。

- [ ] **Step 8: 书架/目录视图**

返回书架 → 确认原 toolbar 正常显示（不受影响）。进入目录 → 确认 toolbar 正常。

- [ ] **Step 9: 提交**

```bash
git add reader.html
git commit -m "test: manual verification — all 8 checks passed"
```

---

## 预期最终 diff 统计

| 区块 | 删除行 | 新增行 |
|------|--------|--------|
| CSS sticky/overflow 修复 | ~3 | ~3 |
| CSS 底栏瘦身 | ~3 | ~4 |
| CSS 浮动工具栏 + 关闭按钮（新增） | 0 | ~28 |
| HTML 模板重构 | ~2 | ~9 |
| JS 删除外部关闭 | ~1 | ~1 |
| **合计** | **~9** | **~45** |
