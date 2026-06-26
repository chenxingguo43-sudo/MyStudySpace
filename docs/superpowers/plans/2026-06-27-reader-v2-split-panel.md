# Reader v2 — 分屏布局 + 详细单词卡片 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 reader.html 从弹出式去弹窗改为分屏布局，右侧详情面板按词性展示完整词汇卡片。

**Architecture:** CSS flex 布局实现阅读区 + 详情面板；@media query 切换横屏分屏 / 竖屏叠加；pointer events 拖拽分界线；_raw 字段保留原始词条引用供面板渲染。

**Tech Stack:** Vanilla JS (ES5), CSS3 (flex, media queries, transitions), existing reader.html (~1,500 行)。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `reader.html` CSS 区 (~L127-350) | 修改+新增 | 分屏布局 flex、面板样式、过渡动画、横竖屏 @media |
| `reader.html` HTML 区 (~L348-390) | 修改 | 将 `selPopup` 改为 `detailPanel` 侧边面板 |
| `reader.html` JS：loadLocalLookupData (~L1058-1095) | 修改 | 加 `_raw` 字段 |
| `reader.html` JS：renderLocalLookup (~L1134-1170) | 替换 | 改为 `renderDetailPanel` 按词性渲染富卡片 |
| `reader.html` JS：查词入口 (~L960-1004) | 修改 | `_showPopupForWord` 改为 `_openDetailPanel` |
| `reader.html` JS：renderChapter (~L863-871) | 修改 | 加 `reader-layout` 包装容器 |

---

### Task 1：分屏布局 CSS（横屏 flex + 竖屏叠加）

**Files:**
- Modify: `D:\MyStudySpace\reader.html` CSS 区 (`.main-container` 附近 ~L127, `@media` ~L352)

- [ ] **Step 1：新增分屏布局 CSS**

在 `.main-container` 定义之后（~L127-128）新增：

```css
/* ─── 分屏布局容器 ─── */
.reader-layout {
  position: relative; z-index: 1;
  max-width: 1100px; margin: 0 auto;
  display: flex; align-items: flex-start;
  padding: 0 16px 100px;
}
/* 阅读区 */
.reader-pane { flex: 1; min-width: 0; overflow-y: visible; }

/* ─── 详情面板 ─── */
.detail-panel {
  width: 0; flex-shrink: 0; overflow: hidden;
  background: var(--surface-solid);
  border: 1px solid var(--glass-border); border-radius: 16px;
  margin-left: 16px;
  transition: width 0.25s ease, opacity 0.2s ease;
  opacity: 0;
}
.detail-panel.open { width: 380px; opacity: 1; overflow-y: auto; }
.detail-panel-inner { padding: 20px; min-width: 340px; max-height: calc(100vh - 160px); overflow-y: auto; }

/* ─── 拖拽分界线 ─── */
.resize-handle {
  display: none; width: 6px; flex-shrink: 0; cursor: col-resize;
  background: transparent; border-radius: 3px; transition: background 0.15s;
  align-self: stretch; min-height: 200px;
}
.resize-handle:hover, .resize-handle.active { background: var(--accent); }
.detail-panel.open + .resize-handle,
.detail-panel.open ~ .resize-handle { display: block; }

/* ─── 叠加遮罩（竖屏）─── */
.detail-overlay { display: none; }
```

- [ ] **Step 2：新增竖屏叠加模式 CSS**

在 `@media (max-width: 600px)` 块之后新增 `@media (max-width: 767px)`：

```css
@media (max-width: 767px) {
  .reader-layout { max-width: 100%; padding: 0 12px 80px; }
  .detail-panel {
    position: fixed; top: 96px; right: 0; bottom: 56px;
    z-index: 200; width: 0; border-radius: 12px 0 0 12px;
    box-shadow: -4px 0 24px rgba(0,0,0,0.4);
    margin-left: 0; transition: width 0.3s ease;
  }
  .detail-panel.open { width: 65vw; min-width: 280px; }
  .resize-handle { display: none !important; }
  .detail-overlay {
    display: none; position: fixed; inset: 0; z-index: 199;
    background: rgba(0,0,0,0.3); backdrop-filter: blur(2px);
  }
  .detail-overlay.visible { display: block; }
}
```

- [ ] **Step 3：横屏时缩小 .main-container 宽度**

当前 `.main-container` 的 `max-width: 720px` 在书架/目录/无面板时保持。面板打开时阅读区用 `.reader-layout` 替代 `.main-container`。在 CSS 中加：

```css
/* 书架和目录视图保持原宽度 */
/* 阅读视图的 .reader-layout 已在上面定义 */
```

- [ ] **Step 4：Commit**

```bash
git add reader.html
git commit -m "feat(v2): add split-panel layout CSS — flex + media query for desktop/tablet/phone"
```

---

### Task 2：阅读视图改用 reader-layout 容器

**Files:**
- Modify: `D:\MyStudySpace\reader.html` renderChapter 函数 (~L863-871)

- [ ] **Step 1：修改 renderChapter 的 HTML 结构**

将第 868-871 行的 `.main-container` 包住全部阅读内容改为 `.reader-layout` 包住阅读+面板：

```javascript
// 替换第 868-871 行：
// '<div class="main-container"><div class="chapter-content">' +
// '<div class="chapter-header"><h1>Глава ' + (curCh + 1) + '</h1>...

// 改为：
'<div class="reader-layout">' +
  '<div class="reader-pane">' +
    '<div class="chapter-content">' +
    '<div class="chapter-header"><h1>Глава ' + (curCh + 1) + '</h1><h2>' + escapeHtml(data.title || '') + '</h2></div>' +
    parts.join('') + exercisesHtml +
    '</div>' +
  '</div>' +
  '<div class="detail-panel" id="detailPanel"><div class="detail-panel-inner" id="detailInner"></div></div>' +
  '<div class="resize-handle" id="resizeHandle"></div>' +
  '<div class="detail-overlay" id="detailOverlay" onclick="closeDetailPanel()"></div>' +
'</div>' +
'<nav class="bottom-nav">' + navP + '<span class="nav-info">第 ' + (curCh + 1) + ' / ' + curBook.chapters + ' 章</span>' + navN + '</nav>';
```

- [ ] **Step 2：Commit**

```bash
git add reader.html
git commit -m "feat(v2): wrap reading view in .reader-layout + .reader-pane + detail panel skeleton"
```

---

### Task 3：面板开关 + 拖拽分界线

**Files:**
- Modify: `D:\MyStudySpace\reader.html` JS 区（在 `_showPopupForWord` 附近 ~L960）

- [ ] **Step 1：添加面板开关函数**

在 `_showPopupForWord` 函数定义之前新增：

```javascript
/* ─── 详情面板开关 ─── */
var _detailWord = '';

function openDetailPanel(word) {
  _detailWord = word;
  var panel = document.getElementById('detailPanel');
  var overlay = document.getElementById('detailOverlay');
  var handle = document.getElementById('resizeHandle');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('visible');
  if (handle) handle.style.display = 'block';
}

function closeDetailPanel() {
  _detailWord = '';
  var panel = document.getElementById('detailPanel');
  var overlay = document.getElementById('detailOverlay');
  var handle = document.getElementById('resizeHandle');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
  if (handle) handle.style.display = 'none';
}

function toggleDetailPanel(word) {
  if (_detailWord === word) { closeDetailPanel(); return; }
  openDetailPanel(word);
}
```

- [ ] **Step 2：修改 `_showPopupForWord` 改用面板**

将 `_showPopupForWord` 函数内对 `selPopup` 的操作替换为调用 `openDetailPanel` + 填充 `detailInner`：

```javascript
function _showPopupForWord(word, span) {
  hidePopup();
  selText = word;
  var paraBlock = span.closest('.para-block');
  if (paraBlock) {
    var ruEl = paraBlock.querySelector('.ru-text');
    var zhEl = paraBlock.querySelector('.cn-text');
    selContext = ruEl ? ruEl.textContent : '';
    selTranslationContext = zhEl ? zhEl.textContent : '';
  }
  // 打开详情面板
  toggleDetailPanel(word);
  // 填充面板内容
  var inner = document.getElementById('detailInner');
  if (inner) {
    inner.innerHTML = '<div class="dict-loading">查询中...</div>';
    autoLookup(word); // autoLookup 现在填充 #detailInner 而非 #selPopup
  }
}
```

- [ ] **Step 3：添加拖拽逻辑**

在面板开关函数之后新增：

```javascript
/* ─── 拖拽分界线 ─── */
(function() {
  var handle = null, panel = null, startX = 0, startW = 0;
  document.addEventListener('pointerdown', function(e) {
    handle = e.target.closest('#resizeHandle');
    if (!handle) return;
    panel = document.getElementById('detailPanel');
    if (!panel) return;
    handle.classList.add('active');
    startX = e.clientX; startW = panel.offsetWidth;
    handle.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', function(e) {
    if (!handle) return;
    var delta = startX - e.clientX;
    var w = Math.max(280, Math.min(520, startW + delta));
    panel.style.width = w + 'px';
  });
  document.addEventListener('pointerup', function(e) {
    if (!handle) return;
    handle.classList.remove('active');
    handle = null; panel = null;
    // 保存偏好
    if (e.target.closest('#resizeHandle')) {
      try { localStorage.setItem('rr_panel_width', document.getElementById('detailPanel').style.width); } catch(err) {}
    }
  });
})();
```

- [ ] **Step 4：Commit**

```bash
git add reader.html
git commit -m "feat(v2): panel open/close toggle + resize handle drag logic"
```

---

### Task 4：`_raw` 字段扩展 + 富数据面板渲染

**Files:**
- Modify: `D:\MyStudySpace\reader.html`：`loadLocalLookupData` (~L1076-1080), `renderLocalLookup` (~L1134-1165)

- [ ] **Step 1：loadLocalLookupData 添加 `_raw` 字段**

在 `localVocabLookup[key] = { ... }` 处（约 L1076-1080），新增 `_raw`：

```javascript
// 原代码（主词典）：
localVocabLookup[key] = {
  meaning: w.meaning,
  type: w.type || '',
  source: '本地词库'
};

// 改为：
localVocabLookup[key] = {
  meaning: w.meaning,
  type: w.type || '',
  source: '本地词库',
  _raw: w  // 保留原始词条，含 detailZh/collocations/pair/case_gov/aspect/gender/examples/grammarTable
};
```

外部词库（extVocab）没有富数据，不需要加 `_raw`。

- [ ] **Step 2：新写 `renderDetailPanel(word, result)` 函数**

替换原有 `renderLocalLookup` 函数，改为渲染完整面板卡片：

```javascript
/* ─── 详情面板渲染（按词性展示富字段）─── */
function renderDetailPanel(word, result) {
  if (!result || result.meaning === '暂未收录' || !result.meaning) {
    return '<div class="dict-word">' + escapeHtml(word) + '</div>' +
      '<div class="dict-meaning" style="color:var(--text-dim)">暂未收录</div>';
  }

  var raw = result._raw || {};
  var posType = (raw.type || result.type || '').toLowerCase();

  var html = '';
  // ── 头部：单词 + 词性 ──
  html += '<div class="dp-head">';
  html += '<div class="dp-word">' + escapeHtml(word) + '</div>';
  html += '<div class="dp-pos">' + escapeHtml(raw.type || result.type || '') + '</div>';
  html += '</div>';

  // ── 释义 ──
  html += '<div class="dp-section">';
  html += '<div class="dp-meaning">' + escapeHtml(result.meaning) + '</div>';
  html += '</div>';

  // ── 体 / 性 ──
  if (posType === 'verb') {
    if (raw.aspect) {
      var aspectLabel = (raw.aspect.indexOf('несов') >= 0 || raw.aspect.indexOf('нсв') >= 0) ? '未完成体' :
                        (raw.aspect.indexOf('сов') >= 0 && raw.aspect.indexOf('несов') < 0) ? '完成体' : raw.aspect;
      html += '<div class="dp-section"><span class="dp-label">体</span> <span class="dp-tag">' + escapeHtml(aspectLabel) + '</span>';
      if (raw.pair) html += ' <span class="dp-pair">→ ' + escapeHtml(raw.pair) + '</span>';
    }
    if (raw.case_gov) {
      html += '<div class="dp-meta"><span class="dp-label">接格</span> ' + escapeHtml(raw.case_gov) + '</div>';
    }
    html += '</div>';
  } else if (posType === 'noun' || posType === 'adj' || posType === 'adjective') {
    if (raw.gender) {
      var genLabel = raw.gender === 'masculine' || raw.gender === 'm' ? '阳性' :
                     raw.gender === 'feminine' || raw.gender === 'f' ? '阴性' :
                     raw.gender === 'neuter' || raw.gender === 'n' ? '中性' : raw.gender;
      html += '<div class="dp-section"><span class="dp-label">性</span> <span class="dp-tag">' + escapeHtml(genLabel) + '</span></div>';
    }
  }

  // ── 常用搭配 ──
  var colls = raw.collocations || raw.examples || [];
  if (colls.length > 0) {
    html += '<div class="dp-section">';
    html += '<div class="dp-section-title">✍️ 常用搭配</div>';
    for (var c = 0; c < Math.min(colls.length, 4); c++) {
      var col = colls[c];
      html += '<div class="dp-coll">';
      html += '<div class="dp-coll-phrase">' + escapeHtml(col.phrase || col.word || '') + '</div>';
      if (col.ru) html += '<div class="dp-coll-ru">' + escapeHtml(col.ru) + '</div>';
      if (col.zh) html += '<div class="dp-coll-zh">' + escapeHtml(col.zh) + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ── 详细释义（折叠）───
  if (raw.detailZh && raw.detailZh.length > 5 && raw.detailZh !== '（待补充）') {
    html += '<div class="dp-section">';
    html += '<div class="dp-collapse-toggle" onclick="this.nextElementSibling.classList.toggle(\'open\');this.classList.toggle(\'expanded\')">📖 详细释义 ▸</div>';
    html += '<div class="dp-collapse-body"><div class="dp-detail">' + escapeHtml(raw.detailZh) + '</div></div>';
    html += '</div>';
  }

  // ── 例句（折叠）───
  if (raw.examples && raw.examples.length > 0) {
    html += '<div class="dp-section">';
    html += '<div class="dp-collapse-toggle" onclick="this.nextElementSibling.classList.toggle(\'open\');this.classList.toggle(\'expanded\')">📚 例句 ▸</div>';
    html += '<div class="dp-collapse-body">';
    for (var e = 0; e < Math.min(raw.examples.length, 5); e++) {
      var ex = raw.examples[e];
      html += '<div class="dp-example">';
      if (ex.ru) html += '<div class="dp-ex-ru">' + escapeHtml(ex.ru) + '</div>';
      if (ex.zh) html += '<div class="dp-ex-zh">' + escapeHtml(ex.zh) + '</div>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  // ── 变位/变格表（折叠）───
  if (raw.grammarTable && raw.grammarTable.length > 10 && raw.grammarTable !== '（待补充）') {
    html += '<div class="dp-section">';
    html += '<div class="dp-collapse-toggle" onclick="this.nextElementSibling.classList.toggle(\'open\');this.classList.toggle(\'expanded\')">📐 变位/变格表 ▸</div>';
    html += '<div class="dp-collapse-body" style="white-space:pre-wrap;font-size:13px">' + escapeHtml(raw.grammarTable) + '</div>';
    html += '</div>';
  }

  // ── 备选原形 ──
  if (result._alternatives && result._alternatives.length) {
    html += '<div class="dp-section">';
    html += '<span class="dp-alt-label">也作：</span>';
    html += result._alternatives.map(function(a) { return '<span class="dp-alt-word">' + escapeHtml(a) + '</span>'; }).join('、');
    html += '</div>';
  }

  // ── 🤖 AI 解析按钮 ──
  html += '<div class="dp-ai-section">';
  html += '<button class="dp-ai-btn" id="dpAiBtn" onclick="requestAiAnalysis()">🤖 AI 深度解析</button>';
  html += '<div class="dp-ai-result" id="dpAiResult"></div>';
  html += '</div>';

  // ── 来源标注 ──
  html += '<div class="dp-source">来源：' + escapeHtml(result.source || '本地词库') + '</div>';
  if (result._guessed) html += '<div class="dict-guess-label">⚡ 形态推测还原</div>';

  return html;
}
```

- [ ] **Step 3：修改 autoLookup 填充 `#detailInner` 而非 `#selPopup`**

将 `autoLookup` 函数末尾的 `preview.innerHTML = renderLocalLookup(clean, result)` 改为调用 `renderDetailPanel` 并填充 `detailInner`：

```javascript
// return 前（约 L1305）：
// 替换 preview.innerHTML = renderLocalLookup(clean, result);
var inner = document.getElementById('detailInner');
if (inner) inner.innerHTML = renderDetailPanel(clean, result);
```

- [ ] **Step 4：废弃 `renderLocalLookup`（保留但标记废弃）**

原函数改名为 `renderLocalLookup_legacy`，加注释 `/* @deprecated v2 面板替代弹窗 */`。不删除——其他代码可能引用。同时 `selPopup` HTML 保留不动（书架/目录视图不会触发查词面板，弹窗仅在非阅读视图显示）。

- [ ] **Step 5：Commit**

```bash
git add reader.html
git commit -m "feat(v2): _raw field + renderDetailPanel with POS-aware rich card rendering"
```

---

### Task 5：面板卡片 CSS

**Files:**
- Modify: `D:\MyStudySpace\reader.html` CSS 区

- [ ] **Step 1：新增面板卡片样式**

在 `.detail-panel` CSS 之后新增：

```css
/* ─── 面板卡片内容 ─── */
.dp-head { margin-bottom: 16px; }
.dp-word { font-size: 1.4em; font-weight: 700; color: var(--accent); margin-bottom: 4px; font-family: 'Noto Serif', serif; }
.dp-pos { font-size: 13px; color: var(--text-dim); }
.dp-section { margin-bottom: 16px; }
.dp-meaning { font-size: 1.1em; color: var(--text); line-height: 1.6; }
.dp-label { font-size: 12px; color: var(--text-dim); margin-right: 6px; }
.dp-tag { font-size: 12px; background: var(--accent-dim); color: var(--accent); padding: 1px 8px; border-radius: 4px; }
.dp-pair { font-size: 13px; color: var(--text-secondary); margin-left: 8px; }
.dp-meta { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
.dp-section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }

/* 搭配 */
.dp-coll { margin-bottom: 8px; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 6px; }
.dp-coll-phrase { font-size: 14px; color: var(--accent); font-weight: 500; }
.dp-coll-ru { font-size: 13px; color: var(--ru-text); margin-top: 2px; }
.dp-coll-zh { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

/* 折叠 */
.dp-collapse-toggle { font-size: 13px; color: var(--text-secondary); cursor: pointer; padding: 4px 0; user-select: none; }
.dp-collapse-toggle:hover { color: var(--accent); }
.dp-collapse-toggle.expanded::after { content: ' ▾'; }
.dp-collapse-body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.dp-collapse-body.open { max-height: 600px; overflow-y: auto; }
.dp-detail { font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin-top: 6px; }

/* 例句 */
.dp-example { margin-bottom: 8px; padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; }
.dp-ex-ru { font-size: 13px; color: var(--ru-text); line-height: 1.6; }
.dp-ex-zh { font-size: 12px; color: var(--text-dim); margin-top: 4px; }

/* 备选原形 */
.dp-alt-label { font-size: 12px; color: var(--text-dim); }
.dp-alt-word { font-size: 12px; color: var(--text-secondary); margin-left: 4px; }

/* 🤖 AI */
.dp-ai-section { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--border); }
.dp-ai-btn { width: 100%; padding: 10px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 14px; font-family: inherit; transition: all 0.2s; }
.dp-ai-btn:hover { background: var(--glass-hover); color: var(--accent); }
.dp-ai-btn.loading { opacity: 0.6; pointer-events: none; }
.dp-ai-result { margin-top: 12px; font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
.dp-ai-result:empty { display: none; }

/* 来源 */
.dp-source { margin-top: 12px; font-size: 11px; color: var(--text-dim); }
```

- [ ] **Step 2：Commit**

```bash
git add reader.html
git commit -m "feat(v2): panel card CSS — collocation cards, collapsible sections, AI btn"
```

---

### Task 6：🤖 AI 解析接入 AgentChat

**Files:**
- Modify: `D:\MyStudySpace\reader.html` JS 区

- [ ] **Step 1：添加 requestAiAnalysis 函数**

在面板开关函数附近新增：

```javascript
/* ─── AI 深度解析 ─── */
var _aiRequesting = false;

function requestAiAnalysis() {
  if (_aiRequesting) return;
  _aiRequesting = true;
  var btn = document.getElementById('dpAiBtn');
  var result = document.getElementById('dpAiResult');
  if (btn) { btn.classList.add('loading'); btn.textContent = '⏳ AI 分析中...'; }
  if (result) result.innerHTML = '';

  // 构建 prompt
  var context = selContext ? selContext.substring(0, 500) : '';
  var zhContext = selTranslationContext ? selTranslationContext.substring(0, 500) : '';
  var prompt = '分析俄语单词 "' + selText + '" 在以下上下文中的用法。' +
    '俄语原文：' + context + ' 中文翻译：' + zhContext +
    ' 请用中文回答：这个词的原形、词性、在此处的语法形式、接格关系、以及为什么使用这个形式。';

  // 通过 AgentChat 发给 Gemini（后台 CDP）
  // 暂时用 clipboard + 手动发送的过渡方案
  navigator.clipboard.writeText(prompt).then(function() {
    if (btn) { btn.classList.remove('loading'); btn.textContent = '✅ 已复制到剪贴板 — 粘贴到 Gemini/豆包'; }
    _aiRequesting = false;
  }).catch(function() {
    if (btn) { btn.classList.remove('loading'); btn.textContent = '❌ 失败'; }
    _aiRequesting = false;
  });
}
```

*注：完整 AgentChat 后台调用（node subprocess）需后续架构，当前版本用 clipboard 过渡。*

- [ ] **Step 2：Commit**

```bash
git add reader.html
git commit -m "feat(v2): AI analysis button — clipboard prompt for Gemini/Doubao (AgentChat integration phase 1)"
```

---

### Task 7：端到端集成测试

**Files:**
- Modify: `D:\MyStudySpace\tests\verify-reader-morphology.js`

- [ ] **Step 1：新增 v2 面板集成测试**

在现有测试文件末尾追加：

```javascript
console.log('\n=== v2 Split Panel Integration Tests ===\n');

// 1. 分屏布局结构
assert(
  readerPage.includes('reader-layout'),
  'reader.html has .reader-layout container'
);
assert(
  readerPage.includes('reader-pane'),
  'reader.html has .reader-pane reading area'
);
assert(
  readerPage.includes('detail-panel'),
  'reader.html has .detail-panel for word cards'
);
assert(
  readerPage.includes('detail-panel-inner'),
  'reader.html has .detail-panel-inner for card content'
);

// 2. 面板开关函数
assert(
  /function openDetailPanel\(/.test(readerPage),
  'openDetailPanel function exists'
);
assert(
  /function closeDetailPanel\(/.test(readerPage),
  'closeDetailPanel function exists'
);
assert(
  /function toggleDetailPanel\(/.test(readerPage),
  'toggleDetailPanel function exists'
);

// 3. 拖拽分界线
assert(
  readerPage.includes('resize-handle'),
  'resize-handle element exists'
);
assert(
  readerPage.includes('resizeHandle'),
  'resizeHandle id exists in JS'
);

// 4. 富卡片渲染
assert(
  /function renderDetailPanel\(/.test(readerPage),
  'renderDetailPanel function exists'
);
assert(
  readerPage.includes('detailZh'),
  'mock detailZh field referenced somewhere' 
  // Note: detailZh 来自 _raw 字段，代码中应有 _raw.detailZh 引用
);

// 5. _raw 字段
assert(
  /_raw:\s*w/.test(readerPage) || /_raw\s*:\s*w/.test(readerPage),
  '_raw field stored in localVocabLookup entry'
);

// 6. 响应式
assert(
  readerPage.includes('@media (max-width: 767px)'),
  '@media query for portrait mode exists'
);
assert(
  readerPage.includes('@media (max-width: 600px)'),
  '@media query for phone exists'
);

// 7. ✓ 标记不再填充 selPopup（面板替代弹窗）
assert(
  readerPage.includes('detailInner'),
  'autoLookup fills detailInner instead of dictPreview'
);

// 8. 旧弹窗保留但可能不用于阅读视图
assert(
  readerPage.includes('selPopup'),
  'selPopup HTML kept (shelf view only)'
);

console.log('\n=== All v2 integration tests passed ===');
```

- [ ] **Step 2：运行测试**

```bash
cd D:\MyStudySpace && node tests/verify-reader-morphology.js
```

- [ ] **Step 3：Commit**

```bash
git add tests/verify-reader-morphology.js
git commit -m "test: add v2 split panel + card rendering integration tests (8 checks)"
```

---

### Task 8：iPad 手动验收

- [ ] **Step 1：横屏分屏**

iPad 横屏打开 `https://chenxingguo43-sudo.github.io/MyStudySpace/reader.html` → 点一本教材 → 点击俄语词：
- ✅ 右侧面板滑入，宽度 ~380px
- ✅ 头部显示单词 + 词性
- ✅ 释义显示
- ✅ 体/接格/搭配等富数据显示（如果有）
- ✅ 折叠区块（📖详释/📚例句/📐变位）可展开
- ✅ 阅读区保持可读，不抖动
- ✅ 🤖 按钮存在
- ✅ 拖拽分界线可调面板宽度

- [ ] **Step 2：竖屏叠加**

iPad 转竖屏：
- ✅ 卡片改为从右侧滑出叠加
- ✅ 遮罩半透明，点遮罩关闭

- [ ] **Step 3：翻转切换**

面板打开状态下旋转 iPad：
- ✅ 面板不关闭
- ✅ 布局平滑切换，无白屏/闪烁

- [ ] **Step 4：关闭**

点已选中词或关闭按钮：
- ✅ 面板滑出关闭
- ✅ 阅读区恢复全宽

---

## 实施顺序

```
Task 1 (CSS) → Task 2 (容器) → Task 3 (开关+拖拽) → Task 4 (_raw+卡片) → Task 5 (卡片CSS) → Task 6 (🤖) → Task 7 (测试) → Task 8 (验收)
```

全部改动在同一个文件 `reader.html`，必须严格按序执行。

---
