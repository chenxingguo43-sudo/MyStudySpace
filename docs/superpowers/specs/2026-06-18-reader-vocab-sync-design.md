# 阅读器 ↔ 背单词联动设计

## 概述

打通 reader.html / reader-prototype.html 与 vocabulary.html 的双向联动，形成"阅读→存词→复习→跳回原文"的学习闭环。

## 核心决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 联动范围 | reader.html + reader-prototype.html 都做 | 覆盖小说阅读和资料阅读两个场景 |
| 联动方向 | 双向同时 | 阅读→存词 和 背单词→跳转 同等重要 |
| 数据存储 | 统一写入 `vocabulary-review-records` | SM-2 要求一个词一份记录，避免冲突 |
| AI 提问 | 保留，降级为小图标 | 本质是复制提示词，不影响主流程 |

---

## 数据结构变更

### `vocabulary-review-records` 新增字段

```json
{
  "благода́рный": {
    "mastery": 0,
    "nextReview": "2026-06-18",
    "interval": 1,
    "easeFactor": 2.5,
    "count": 1,
    "source": "novel",
    "sourceBook": "boss_yin",
    "sourceChapter": 5,
    "context": "Он был благодарный человек..."
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `source` | string | `"novel"` / `"manual"` / `"auto"` — 标记词的来源 |
| `sourceBook` | string? | 小说 bookId，仅 source=novel 时有值 |
| `sourceChapter` | number? | 章节索引，仅 source=novel 时有值 |
| `context` | string? | 保存时的上下文句子（前 300 字符），用于背单词时展示 |

**兼容性**：现有记录如果没有 `source` 字段，默认视为 `"manual"`。不破坏已有数据。

---

## 阅读器端变更（reader.html + reader-prototype.html）

### 选词浮层交互

**现状**：
```
选词 → 浮层弹出 → 点按钮查词/保存
```

**目标**：
```
选词 → 浮层弹出 → 释义自动加载 → 一键保存
```

#### 浮层布局

```
┌────────────────────────────────┐
│  сло́во          [📖] [🤖]     │  ← 词 + 右侧小图标
│  ──────────────────────────── │
│  сущ. 单词，话语               │  ← Wiktionary 释义自动显示
│                                │
│  [ ⭐ 加入背单词 ]              │  ← 主按钮
└────────────────────────────────┘
```

- **选词即查**：浮层弹出时自动调用 Wiktionary API，释义直接展示（不需额外点击）
- **⭐ 加入背单词**：写入 `vocabulary-review-records`，附带 source/sourceBook/sourceChapter/context
- **📖 Wiktionary**：小图标，点击在新标签页打开 Wiktionary 详情页
- **🤖 AI 提问**：小图标，点击复制提示词到剪贴板（保持现有行为）
- **已保存状态**：如果该词已在 `vocabulary-review-records` 中 → 星标变实心，tooltip 显示"已在背单词中"
- **重复保存**：已存在的词再点 → toast 提示"已存在"，不重复添加

#### 保存逻辑（伪代码）

```javascript
function doSaveWord() {
  var clean = normalizeWord(selText);
  var records = JSON.parse(localStorage.getItem('vocabulary-review-records') || '{}');

  if (records[clean]) {
    toast('⭐ 已存在: ' + clean);
    return;
  }

  records[clean] = {
    mastery: 0,
    nextReview: todayString(),
    interval: 1,
    easeFactor: 2.5,
    count: 0,
    source: 'novel',
    sourceBook: curBook ? curBook.id : null,
    sourceChapter: curCh,
    context: selContext.substring(0, 300)
  };

  localStorage.setItem('vocabulary-review-records', JSON.stringify(records));
  toast('⭐ 已加入背单词: ' + clean);
  savedWords.push(clean);
  highlightSavedWords();
}
```

### 阅读时高亮已保存的词

**现状**：reader.html 已有 `highlightSavedWords()` 功能，从 server 端读取 `novel-vocab-list`。

**变更**：改为从 `vocabulary-review-records` 读取（统一数据源），高亮正文中所有已保存的词。

```javascript
function highlightSavedWords() {
  var records = JSON.parse(localStorage.getItem('vocabulary-review-records') || '{}');
  var words = Object.keys(records).map(w => w.toLowerCase());
  // ... 遍历正文，匹配并高亮
}
```

---

## 背单词端变更（vocabulary.html）

### 新增"查看原文来源"按钮

在词卡背面（翻转后）增加一个按钮：

```
┌─────────────────────────────────────┐
│  сло́во́  →  单词，话语               │
│                                     │
│  例句：...                           │
│                                     │
│  [不认识]  [模糊]  [认识]            │
│  [📖 查看原文]                       │  ← 新增
└─────────────────────────────────────┘
```

#### 按钮行为

```javascript
function goToSource() {
  var record = currentCard; // 当前卡片的 review record
  if (record.source === 'novel' && record.sourceBook) {
    // 打开 reader.html，传入 bookId 和 chapter
    var url = 'reader.html?book=' + record.sourceBook + '&ch=' + record.sourceChapter;
    window.open(url, '_blank');
  } else {
    toast('该词非来自阅读');
  }
}
```

- `source === "novel"` 且有 sourceBook → 按钮可点击，打开 reader.html 对应位置
- 其他来源 → 按钮灰色，tooltip "该词非来自阅读"

### 词卡来源标签

在词卡上显示来源标记，让用户知道这个词从哪来：

| source | 显示 |
|--------|------|
| `novel` | 📖 + 书名 + 章节 |
| `manual` | ✏️ 手动添加 |
| `auto` | 🤖 自动生成 |
| 无字段（旧数据） | 不显示 |

---

## reader.html 接收参数

新增 URL 参数支持，用于从背单词页跳转回来：

```
reader.html?book=boss_yin&ch=5
```

| 参数 | 说明 |
|------|------|
| `book` | bookId，对应 `data/novel/index.json` 中的 id |
| `ch` | 章节索引（从 0 开始） |

**处理逻辑**：
1. 页面加载时检查 URL 参数
2. 如果有 `book` 参数 → 直接进入该书的该章节
3. 如果有 `ch` 参数 → 自动滚动到对应段落（或章节开头）

---

## 不改动的部分

| 组件 | 原因 |
|------|------|
| `POST /api/novel-vocab` | 保留，作为 Obsidian 备份导出通道，不再是主数据源 |
| SM-2 调度逻辑 | 不变，统一存储后自然复用 |
| `study-stats.html` | 已读取 `vocabulary-review-records`，无需改动 |
| `server.js` | 无需新增 API，联动全靠 localStorage |

---

## 验收标准

1. reader.html 选词 → 释义自动显示 → 点⭐ → 写入 `vocabulary-review-records`
2. reader-prototype.html 同上
3. vocabulary.html 背单词 → 词卡显示来源标签 → 点"📖 查看原文" → 打开 reader 对应章节
4. reader 打开时，已保存的词在正文中高亮
5. 重复保存同一词 → toast "已存在"，不产生重复记录
6. 旧数据（无 source 字段）正常显示，不影响背单词功能
7. `POST /api/novel-vocab` 仍可选调用（Obsidian 备份）
