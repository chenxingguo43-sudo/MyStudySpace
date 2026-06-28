# 阅读器 ↔ 背单词联动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通 reader.html / reader-prototype.html 与 vocabulary.html 的双向联动，形成"阅读→存词→复习→跳回原文"的学习闭环。

**Architecture:** 统一使用 `vocabulary-review-records`（localStorage）作为唯一的 SM-2 数据源。阅读器保存生词时直接写入该 key 并附加来源字段；背单词页读取来源字段显示标签和"查看原文"按钮。reader.html 新增 URL 参数支持跳转。全靠 localStorage，不新增 server API。

**Tech Stack:** 纯前端 HTML/CSS/JS，localStorage，Wiktionary REST API（已接入）

---

## 文件结构

| 文件 | 变更类型 | 职责 |
|------|----------|------|
| `reader.html:318-324` | 修改 | 选词浮层：布局改为释义自动显示 + ⭐主按钮 + 📖🤖小图标 |
| `reader.html:669-693` | 修改 | 高亮：从 server 端改为读 `vocabulary-review-records` |
| `reader.html:807-831` | 修改 | 保存：改为写入 `vocabulary-review-records`（附 source 字段） |
| `reader.html:460-510` | 修改 | 页面初始化：支持 URL 参数 `?book=&ch=` |
| `reader-prototype.html:215-234` | 修改 | 选词浮层：同 reader.html 布局调整 |
| `reader-prototype.html:558-600` | 修改 | 保存：改为写入 `vocabulary-review-records` |
| `vocabulary.html` | 修改 | 词卡背面：新增来源标签 + 📖查看原文按钮 |

---

### Task 1: reader.html — 选词浮层改为"选词即查 + ⭐主按钮"

**Files:**
- Modify: `reader.html:318-324`（浮层 HTML）
- Modify: `reader.html:777-805`（autoLookup 逻辑）
- Modify: `reader.html:813-831`（doSaveWord 逻辑）

- [ ] **Step 1: 修改浮层 HTML 布局**

将 `reader.html:318-324` 的浮层替换为：

```html
<div class="selection-popup" id="selPopup">
  <div class="popup-header" id="selWord">—</div>
  <div class="dict-preview" id="dictPreview" style="display:none"></div>
  <div class="popup-actions">
    <button class="btn-save-vocab" onclick="doSaveWord()"><span class="icon">⭐</span> 加入背单词</button>
    <button class="btn-icon" onclick="doLookup()" title="Wiktionary 详情"><span class="icon">📖</span></button>
    <button class="btn-icon" onclick="doAskAI()" title="复制AI提问"><span class="icon">🤖</span></button>
  </div>
</div>
```

- [ ] **Step 2: 添加浮层按钮样式**

在 `reader.html` 的 `<style>` 区域（找到 `.selection-popup button` 相关样式附近）添加：

```css
.popup-actions { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.btn-save-vocab {
  flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
  background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1));
  color: #fbbf24; font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.btn-save-vocab:hover { background: rgba(251,191,36,0.4); }
.btn-save-vocab.saved { background: rgba(34,197,94,0.3); color: #22c55e; border-color: rgba(34,197,94,0.3); }
.btn-icon {
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06); color: var(--text-dim); font-size: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.btn-icon:hover { background: rgba(255,255,255,0.12); }
```

- [ ] **Step 3: 修改 autoLookup，选词后自动加载释义并检查已保存状态**

在 `autoLookup` 函数末尾（`reader.html:804` 附近），在查询完成后检查已保存状态：

```javascript
// 在 autoLookup 的 fetch .then 链末尾追加：
// 检查是否已保存
var records = {};
try { records = JSON.parse(localStorage.getItem('vocabulary-review-records') || '{}'); } catch(e) {}
var saveBtn = document.querySelector('.btn-save-vocab');
if (saveBtn) {
  if (records[clean]) {
    saveBtn.classList.add('saved');
    saveBtn.innerHTML = '<span class="icon">✓</span> 已在背单词中';
  } else {
    saveBtn.classList.remove('saved');
    saveBtn.innerHTML = '<span class="icon">⭐</span> 加入背单词';
  }
}
```

注意：需要把 `autoLookup` 中的 `clean` 变量提取出来，以便在回调中使用。在 `autoLookup` 开头将 clean 存到一个模块级变量：

```javascript
var _lastLookupWord = '';
function autoLookup(word) {
  var clean = word.replace(/[^a-zA-Zа-яА-ЯёЁ-]/g, '');
  if (!clean) return;
  _lastLookupWord = clean;
  // ... 原有逻辑不变
}
```

- [ ] **Step 4: 重写 doSaveWord，写入统一存储**

替换 `reader.html:813-831` 的 `doSaveWord` 函数：

```javascript
function doSaveWord() {
  if (!selText) return;
  var preview = document.getElementById('dictPreview');
  if (preview && preview.querySelector('.dict-loading')) { toast('⏳ 释义加载中，请稍候'); return; }
  var clean = selText.replace(/[^a-zA-Zа-яА-ЯёЁ-]/g, '').trim();
  if (!clean) { toast('❌ 无效'); hidePopup(); return; }

  // 读取统一存储
  var records = {};
  try { records = JSON.parse(localStorage.getItem('vocabulary-review-records') || '{}'); } catch(e) {}

  // 重复检查
  if (records[clean]) { toast('⭐ 已存在: ' + clean); hidePopup(); return; }

  // 获取释义
  var meaning = '', posEl = document.querySelector('#dictPreview .dict-pos'), defEl = document.querySelector('#dictPreview .dict-meaning');
  if (posEl) meaning += posEl.textContent + ' ';
  if (defEl) meaning += defEl.textContent;

  // 写入统一存储
  var today = new Date().toISOString().slice(0, 10);
  records[clean] = {
    mastery: 0,
    nextReview: today,
    interval: 1,
    easeFactor: 2.5,
    count: 0,
    source: 'novel',
    sourceBook: curBook ? curBook.id : null,
    sourceChapter: curCh,
    context: selContext ? selContext.substring(0, 300) : ''
  };
  localStorage.setItem('vocabulary-review-records', JSON.stringify(records));

  // 更新高亮
  savedWords.push(clean.toLowerCase());
  highlightSavedWords();
  toast('⭐ 已加入背单词: ' + clean);

  // 可选：同步到 server（Obsidian 备份）
  var source = curBook ? (curBook.title + ' 第' + (curCh + 1) + '章') : '';
  try {
    fetch('/api/novel-vocab', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: clean, meaning: meaning.trim(), type: posEl ? posEl.textContent : '', source: source, context: selContext ? selContext.substring(0, 300) : '' })
    });
  } catch(e) {}
  hidePopup();
}
```

- [ ] **Step 5: 测试**

1. 打开 `http://localhost:3000/reader.html`，进入任意小说章节
2. 选中一个俄语词 → 浮层弹出，释义自动加载
3. 点 ⭐ → toast 显示"已加入背单词: xxx"
4. 再次选中同一词 → 星标变绿，显示"已在背单词中"
5. 再次点 ⭐ → toast 显示"已存在: xxx"
6. 打开 localStorage 查看 `vocabulary-review-records`，确认新记录包含 source/sourceBook/sourceChapter/context 字段

- [ ] **Step 6: Commit**

```bash
git add reader.html
git commit -m "feat(reader): unify vocab save to vocabulary-review-records with source tracking"
```

---

### Task 2: reader.html — 高亮改为读统一存储

**Files:**
- Modify: `reader.html:669-693`（loadSavedWords + highlightSavedWords）

- [ ] **Step 1: 替换 loadSavedWords 函数**

替换 `reader.html:669-677`：

```javascript
function loadSavedWords() {
  try {
    var records = JSON.parse(localStorage.getItem('vocabulary-review-records') || '{}');
    savedWords = Object.keys(records).map(function(w) { return w.toLowerCase(); }).filter(Boolean);
  } catch(e) { savedWords = []; }
}
```

- [ ] **Step 2: 验证 highlightSavedWords 无需改动**

`highlightSavedWords`（679-693行）使用的是 `savedWords` 数组，不关心数据来源，无需修改。

- [ ] **Step 3: 测试**

1. 在 localStorage 的 `vocabulary-review-records` 中手动添加一个测试词（如 "тест"）
2. 打开 reader.html 任意章节，确认该词在正文中高亮
3. 通过 Task 1 的 ⭐ 按钮保存一个词，确认保存后该词立即高亮

- [ ] **Step 4: Commit**

```bash
git add reader.html
git commit -m "feat(reader): highlight saved words from unified vocabulary-review-records"
```

---

### Task 3: reader.html — 支持 URL 参数跳转

**Files:**
- Modify: `reader.html` 页面初始化区域（约 460-510 行，showBookshelf / 书架加载逻辑）

- [ ] **Step 1: 在页面初始化时解析 URL 参数**

在 `reader.html` 的 `<script>` 区域、书架加载逻辑之前（约 `var NOVEL_ID` 定义之后）添加：

```javascript
/* ─── URL 参数解析（从背单词跳转） ─── */
var _urlParams = new URLSearchParams(window.location.search);
var _jumpBook = _urlParams.get('book');
var _jumpCh = _urlParams.get('ch');
```

- [ ] **Step 2: 在书架加载完成后自动跳转**

找到书架加载完成的回调（`fetch('/api/novel/index')` 的 `.then` 里，`data.forEach` 之后），添加跳转逻辑：

```javascript
// 在书架渲染完成后
if (_jumpBook) {
  var target = books.find(function(b) { return b.id === _jumpBook; });
  if (target) {
    curBook = target;
    var chIdx = _jumpCh ? parseInt(_jumpCh, 10) : 0;
    if (isNaN(chIdx) || chIdx < 0) chIdx = 0;
    loadChapter(chIdx);
    return; // 跳过书架渲染
  }
}
```

- [ ] **Step 3: 测试**

1. 打开 `http://localhost:3000/reader.html?book=boss_yin&ch=3`
2. 应直接进入 boss_yin 的第 4 章（索引从 0 开始），不显示书架
3. 打开 `http://localhost:3000/reader.html`（无参数）→ 正常显示书架

- [ ] **Step 4: Commit**

```bash
git add reader.html
git commit -m "feat(reader): support ?book=&ch= URL params for jump-from-vocab"
```

---

### Task 4: reader-prototype.html — 同步浮层和保存逻辑

**Files:**
- Modify: `reader-prototype.html:215-234`（浮层 HTML）
- Modify: `reader-prototype.html:558-600`（doSaveWord）

- [ ] **Step 1: 修改浮层 HTML**

将 `reader-prototype.html:215-234` 的浮层按钮区域改为与 reader.html 一致的布局：

```html
<!-- 按钮 -->
<div class="popup-actions">
  <button class="btn-save-vocab" onclick="doSaveWord()"><span class="icon">⭐</span> 加入背单词</button>
  <button class="btn-icon" onclick="doWiktionary()" title="Wiktionary"><span class="icon">📖</span></button>
  <button class="btn-icon" onclick="doAskAI()" title="复制AI提问"><span class="icon">🤖</span></button>
</div>
```

- [ ] **Step 2: 添加相同样式**

在 `reader-prototype.html` 的 `<style>` 中添加与 Task 1 Step 2 相同的 `.popup-actions`、`.btn-save-vocab`、`.btn-icon` 样式。

- [ ] **Step 3: 重写 doSaveWord**

替换 `reader-prototype.html:558-600` 的 `doSaveWord`：

```javascript
function doSaveWord() {
  if (!selText) return;
  var clean = selText.replace(/[^a-zA-Zа-яА-ЯёЁ-]/g, '');
  if (!clean) { toast('❌ 无效单词'); hidePopup(); return; }

  // 读取统一存储
  var records = {};
  try { records = JSON.parse(localStorage.getItem('vocabulary-review-records') || '{}'); } catch(e) {}

  // 重复检查
  if (records[clean]) { toast('⭐ 已存在: ' + clean); hidePopup(); return; }

  // 获取释义（从 vocabulary.json 查到的）
  var meaning = '';
  var vocabMatch = lookupVocab(clean);
  if (vocabMatch) meaning = vocabMatch.meaning || '';

  // 写入统一存储
  var today = new Date().toISOString().slice(0, 10);
  records[clean] = {
    mastery: 0,
    nextReview: today,
    interval: 1,
    easeFactor: 2.5,
    count: 0,
    source: 'novel',
    sourceBook: null,
    sourceChapter: null,
    context: selContext ? selContext.substring(0, 300) : ''
  };
  localStorage.setItem('vocabulary-review-records', JSON.stringify(records));
  toast('⭐ 已加入背单词: ' + clean);
  hidePopup();
}
```

- [ ] **Step 4: 测试**

1. 打开 `http://localhost:3000/reader-prototype.html`
2. 加载资料，选中一个词 → 浮层弹出，释义自动显示
3. 点 ⭐ → 写入 `vocabulary-review-records`（用 DevTools 确认）
4. 重复点 → toast "已存在"

- [ ] **Step 5: Commit**

```bash
git add reader-prototype.html
git commit -m "feat(reader-prototype): unify vocab save to vocabulary-review-records"
```

---

### Task 5: vocabulary.html — 词卡来源标签 + 查看原文按钮

**Files:**
- Modify: `vocabulary.html`（词卡背面 HTML 和渲染逻辑）

- [ ] **Step 1: 找到词卡背面渲染位置**

在 vocabulary.html 中搜索 `card-back` 的 innerHTML 赋值处（词卡背面内容的构建逻辑）。在背面内容末尾、评分按钮之前，插入来源标签和按钮的 HTML。

- [ ] **Step 2: 添加来源标签渲染逻辑**

在词卡渲染函数中（构建 card-back innerHTML 的位置），在评分按钮区域之前插入：

```javascript
// 来源标签 + 查看原文
var sourceHtml = '';
var rec = records[currentWord];
if (rec) {
  var src = rec.source || '';
  if (src === 'novel') {
    var bookName = rec.sourceBook || '';
    var chNum = rec.sourceChapter != null ? ('第' + (rec.sourceChapter + 1) + '章') : '';
    sourceHtml = '<div class="vocab-source-tag">📖 ' + escapeHtml(bookName) + ' ' + chNum + '</div>';
    if (rec.sourceBook) {
      sourceHtml += '<button class="btn-go-source" onclick="goToSource()">📖 查看原文</button>';
    }
  } else if (src === 'manual') {
    sourceHtml = '<div class="vocab-source-tag">✏️ 手动添加</div>';
  } else if (src === 'auto') {
    sourceHtml = '<div class="vocab-source-tag">🤖 自动生成</div>';
  }
  // 无 source 字段的旧数据不显示
}
```

将 `sourceHtml` 插入到 card-back 的 innerHTML 中，评分按钮之前。

- [ ] **Step 3: 添加 goToSource 函数**

在 vocabulary.html 的 `<script>` 区域添加：

```javascript
function goToSource() {
  var records = getRecords();
  var rec = records[currentWord];
  if (!rec || rec.source !== 'novel' || !rec.sourceBook) {
    toast('该词非来自阅读');
    return;
  }
  var url = 'reader.html?book=' + encodeURIComponent(rec.sourceBook);
  if (rec.sourceChapter != null) url += '&ch=' + rec.sourceChapter;
  window.open(url, '_blank');
}
```

- [ ] **Step 4: 添加样式**

在 vocabulary.html 的 `<style>` 区域添加：

```css
.vocab-source-tag {
  font-size: 12px; color: var(--text-dim, #94a3b8);
  margin: 8px 0 4px; padding: 4px 8px;
  background: rgba(255,255,255,0.05); border-radius: 6px;
  display: inline-block;
}
.btn-go-source {
  font-size: 13px; padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(99,102,241,0.3);
  background: rgba(99,102,241,0.12); color: #818cf8;
  cursor: pointer; margin: 4px 0; transition: all 0.2s;
}
.btn-go-source:hover { background: rgba(99,102,241,0.25); }
```

- [ ] **Step 5: 测试**

1. 先通过 reader.html 保存一个生词（带 source=novel）
2. 打开 vocabulary.html，找到该词的卡片
3. 翻转卡片 → 背面应显示 "📖 bookId 第X章" 标签 + "📖 查看原文" 按钮
4. 点击"查看原文" → 新标签页打开 reader.html 对应章节
5. 翻到一个手动添加的旧词 → 不显示来源标签（兼容旧数据）

- [ ] **Step 6: Commit**

```bash
git add vocabulary.html
git commit -m "feat(vocab): add source tags and 'go to source' button on card back"
```

---

### Task 6: 端到端验证

- [ ] **Step 1: 完整闭环测试**

1. 打开 reader.html，进入一个小说章节
2. 选中一个不认识的俄语词 → 释义自动弹出
3. 点 ⭐ → toast "已加入背单词"
4. 确认该词在正文中高亮
5. 打开 vocabulary.html → 进入"小说词汇"模式（如果有的话）或搜索该词
6. 翻转卡片 → 看到来源标签 "📖 bookId 第X章"
7. 点"📖 查看原文" → 新标签页打开 reader.html 对应章节
8. 确认旧的背单词数据（无 source 字段）不受影响

- [ ] **Step 2: 重复保存测试**

1. 在 reader 中选中已保存的词 → 星标变绿，显示"已在背单词中"
2. 再次点击 → toast "已存在"

- [ ] **Step 3: reader-prototype 测试**

1. 打开 reader-prototype.html
2. 重复 Step 1-2 的流程

- [ ] **Step 4: Commit 最终确认**

```bash
git status
# 确认只有 reader.html, reader-prototype.html, vocabulary.html 被修改
# 确认没有意外修改 server.js, index.html 等
```
