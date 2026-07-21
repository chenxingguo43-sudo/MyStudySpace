# 统一阅读模块体验 + 升级 В мире людей 为 B2 标准模块

**日期**: 2026-07-21  
**范围**: `reader.html`（单文件，~3500 行）  
**总改动量**: ~410 行新增 + ~40 行修改 + 0 行删除

---

## 1. 问题

reader.html 现有两套渲染逻辑：
- **B2 标准模块**（语法/阅读/听力等）：统一仪表盘 + 悬浮导航栏 + 标准答题 + 分屏词典
- **小说阅读模式**（boss_yin、russian_tales）：旧 toolbar + 简陋答案按钮

`reading_speaking`（В мире людей，30 篇阅读文章）走小说阅读旧逻辑，缺仪表盘、缺标准答题、无分屏词典。
B2 阅读模块（10 篇文章）单栏居中，无分屏词典。

## 2. 约束

1. 不动 B2 语法词汇模块（P1-P6 quiz 系统保持原样）
2. 不破坏小说阅读（boss_yin、russian_tales 的小说阅读保持原样）
3. 纯前端单文件，零框架依赖
4. 方案 A（增量添加）：独立函数，不并入 B2 体系

## 3. 架构

### 3.1 路由修改

`renderChapter` 开头新增一个分支：

```
data.format === 'reading-practice' → renderReadingPracticeChapter  (← 加分屏，不改路由)
curBook.id === 'reading_speaking' → renderReadingSpeakingChapter   (← 新增)
否则 → 小说阅读旧逻辑（原样保留）
```

书架点击 `reading_speaking` → `showReadingSpeakingDashboard()`（不再直接 `goChapter(0)`）。

### 3.2 新增函数

| 函数 | 用途 |
|---|---|
| `showReadingSpeakingDashboard()` | 加载进度 → 渲染仪表盘 |
| `renderReadingSpeakingDashboard()` | 30 章 grid + 继续上次学习 + 进度条 |
| `renderReadingSpeakingChapter(data, restoreState)` | 章节阅读（分屏 + quiz） |
| `renderReadingSpeakingExercise(ex, chapterIdx)` | 单题渲染 |
| `submitReadingSpeakingOption(exId, key, evt)` | 答题交互 |
| `toggleReadingSpeakingExplanation(exId)` | 解析展开/收起 |
| `getReadingSpeakingRecord(exId)` | 读取单题记录 |
| `saveReadingSpeakingProgress(progress)` | 持久化进度 |
| `rerenderReadingSpeakingChapter()` | 交互后重渲染保滚动 |

### 3.3 修改函数

| 函数 | 改动 |
|---|---|
| `renderReadingPracticeChapter` | HTML 包裹 `.reader-layout` 分屏结构 |
| `renderChapter` | 加 `reading_speaking` 路由分支 |
| `showBreadcrumb` | 加 `reading_speaking` 路径（仪表盘作为中间页） |
| 书架/`goChapter` | 判断 `reading_speaking` → 跳仪表盘 |

### 3.4 不复用的部分

- B2 `renderQuizItem` / `submitQuizOption` — 数据格式差异大，不复用
- B2 `renderKnowledgePointNav` — reading_speaking 没有知识点结构
- `finishQuizChapter` — 手动标记完成替代检查全部提交

### 3.5 复用的部分

- `b2FloatingNavigation` 导航栏
- `showBreadcrumb` / `closeBreadcrumb` 面包屑
- `.reader-layout` / `.reader-pane` / `.resize-handle` / `.detail-panel` CSS + 拖拽逻辑
- `dictionaryController` 查词系统
- `markChapterDone` / `closeSummary` 完成弹窗
- `renderRuText` + `lookupContext` 俄语文本渲染
- `highlightSavedWords` / `applyStressMarks` 词汇增强
- `cycleTheme` / `cycleFont` 主题字号
- `toggleBookmark` 段落收藏
- `goChapter` 章节跳转 + 缓存 + 加载态

---

## 4. UI 设计

### 4.1 B2 阅读模块（加分屏）

```
┌─ b2FloatingNavigation ──────────────────┐
│  🎨  Aa  ←仪表盘  ☰                    │
├─ .main-container ───────────────────────┤
│  标题 · 出处                            │
├─ .reader-layout ────────────────────────┤
│  ┌─ .reader-pane ───┐  ┌─ 词典面板 ───┐ │
│  │ 段落 + 学习辅助 + │  │              │ │
│  │ 题目 + 翻页导航   │  │              │ │
│  └──────────────────┘  └──────────────┘ │
│              .resize-handle              │
└─────────────────────────────────────────┘
```

改动：`renderReadingPracticeChapter` 中，标题保留在 `.main-container` 居中，段落/题目/导航移入 `.reader-pane`，右侧加词典面板。

### 4.2 В мире людей 仪表盘

```
┌─ b2FloatingNavigation ──────────────┐
│  🎨  Aa  ←书架                      │
├─────────────────────────────────────┤
│  📖 В мире людей — 阅读口语          │
│  30 篇阅读文章 · ТРКИ-2 教材         │
├─────────────────────────────────────┤
│  ▶ 继续上次学习（如有记录）          │
├─────────────────────────────────────┤
│  ████████░░ 8/30 已完成             │
├─────────────────────────────────────┤
│  ✓1 ✓2 3 4 5 6 7 ...    ←30格grid  │
└─────────────────────────────────────┘
```

### 4.3 В мире людей 章节阅读页

分屏布局同 B2 阅读模块。左侧 pane：
- 段落（ru-text 点击展开翻译，单词点击查词，☆ 收藏）
- 练习题（choice 格式适配为 `.b2-option-row`，单击选中/双击确认）
- 底部：← 上一章 | 第 N/30 章 | ✓ 标记完成 | 下一章 →

---

## 5. 数据格式适配

### 5.1 reading_speaking exercises 格式

```json
{
  "type": "choice",
  "num": 1,
  "question": "...",
  "zhQuestion": "中文问题",
  "options": ["а) ...", "б) ...", "в) ..."],
  "zhOptions": ["а) ...", "б) ...", "в) ..."],
  "answer": "в",
  "explanation": "简短解析",
  "detailed_explanation": "【定位原文】\n【分析错误选项】\n..."
}
```

### 5.2 选项 key 提取

从 `"а) специалистов..."` 提取 `"а"` 作为内部 key，用于匹配 `answer` 和存储选中项。

```js
function extractOptionKey(optionText) {
  var m = optionText.match(/^([а-я]+)\)/i);
  return m ? m[1].toLowerCase() : '';
}
```

### 5.3 题目 ID

格式：`rs-{chapterIdx}-ex{num}`，例如 `rs-5-ex3`。

### 5.4 进度存储

```js
localStorage key: 'rr_reading_speaking_progress_v1'
// { "rs-5-ex3": { selected: "в", submitted: true, wrong: false, expOpen: true } }
```

错题写入统一错题本（`_wrongAnswerItems`），格式对齐 B2：
```js
{ id: "rs-5-ex3", partId: "reading_speaking", bookId: "reading_speaking",
  chapter: 5, question: "...", selectedAnswer: "в", correctAnswer: "в",
  wrong: false, status: "pending", addedAt: "..." }
```

### 5.5 章节完成

复用 `markChapterDone()` → `readStats['reading_speaking'][chapterIdx]`，仪表盘读取后显示 ✓。

---

## 6. CSS

新增一条规则：
```css
.reader-pane .chapter-content { max-width: none; }
```

其余样式完全复用已有 CSS。

---

## 7. 实施顺序

1. **B2 阅读模块加分屏** (~30 行) — 渲染 HTML 包裹 `.reader-layout`
2. **В мире людей 仪表盘** (~150 行) — 新建入口 + grid
3. **В мире людей 章节阅读页** (~250 行) — 分屏 + quiz + 进度
4. **面包屑适配** (~5 行) — 加 reading_speaking 路径
5. **回归测试** — `node tests/russian-b2/reader-static.test.js` + 手动验证

## 8. 验证清单

- [ ] B2 阅读模块 → 有分屏布局 + 右侧词典面板
- [ ] B2 阅读模块 → 拖拽分割线可调整比例，刷新后保持
- [ ] B2 阅读模块 → 点击单词查词正常
- [ ] 书架 → 点击 В мире людей → 仪表盘（30 章 grid）
- [ ] 仪表盘 → 点击章节 → 分屏阅读页
- [ ] 章节页 → 段落点击展开翻译
- [ ] 章节页 → 单击选项选中，双击同一选项提交
- [ ] 章节页 → 答对/答错显示正确 + 解析可展开
- [ ] 章节页 → 标记完成 → 弹窗（时长、段落数、查阅词数）
- [ ] 章节页 → 回到仪表盘 → 对应章节显示 ✓
- [ ] 面包屑：书架 → В мире людей 仪表盘 → 当前章节
- [ ] boss_yin 小说阅读 → 旧逻辑完好
- [ ] B2 语法词汇 quiz → 不受影响
- [ ] `reader-static.test.js` → 全部通过
