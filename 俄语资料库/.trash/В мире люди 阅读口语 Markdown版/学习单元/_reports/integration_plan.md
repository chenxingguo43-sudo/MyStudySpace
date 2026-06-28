# 学习单元 ↔ 背词系统集成方案

> 日期：2026-06-20
> 状态：方案设计阶段
> 目标：实现"阅读中遇到的词 → 自动加入复习"的闭环

---

## 1. 现状分析

### 1.1 学习单元数据结构

学习单元位于 `俄语资料库/В мире люди 阅读口语 Markdown版/学习单元/`，共 30 篇 Obsidian Markdown 文件。

**文件结构（基于模板）：**

```yaml
---
title: "Текст 1.1.1 — Достопримечательности Мурома"
type: "learning-unit"
project: "В мире людей 阅读口语 Markdown版"
source_file: "章节/предисловие.md"
source_pages: "8-10"
source_anchor: "^vm-b0-001"
translation_source: "翻译版/..."
status: "draft"
tags:
  - 俄语/阅读
  - learning-unit
---
```

**Section 6 — 词汇匹配与真实例句（核心集成点）：**

```markdown
| 词条 | 文中形式 | 匹配方法 | 置信度 | 真实例句 |
|------|----------|----------|--------|----------|
| достопримечательность | достопримечательности | exact-token | high | Муром славится своими **достопримечательностями**. |
```

**关键特征：**
- 纯 Markdown 文件，运行在 Obsidian 环境中
- 词汇数据以表格形式存储在 Section 6
- 每个词条包含：词条原形、文中形式、匹配方法、置信度、真实例句
- 文件通过 YAML frontmatter 关联到原书章节和页码

### 1.2 vocabulary.html 数据结构

**localStorage 键：**

| 键名 | 格式 | 用途 |
|------|------|------|
| `vocabulary-review-records` | `{wordId: {mastery, count, interval, easeFactor, nextReview, lastReview, ...}}` | SM-2 复习调度 |
| `vocabulary-extras` | `{fav: [], skip: [], report: []}` | 收藏/跳过/问题 |
| `vocabulary-settings` | `{dailyLimit, todayDate, newCardsToday, ...}` | 学习设置 |

**词汇条目格式（来自 vocabulary.json）：**

```json
{
  "id": "词汇/достопримечательность-a1b2c3d4",
  "word": "достопримечательность",
  "meaning": "名胜，景点",
  "type": "noun",
  "source": "vocab",
  "chapter": "词汇",
  "mastery": 1,
  "examples": [{"ru": "...", "zh": "..."}]
}
```

**SM-2 复习记录格式：**

```json
{
  "mastery": 3,
  "count": 5,
  "interval": 6,
  "easeFactor": 2.5,
  "nextReview": "2026-06-26T00:00:00.000Z",
  "lastReview": "2026-06-20T10:30:00.000Z"
}
```

**来源追踪（novel 模式已实现）：**

```json
{
  "source": "novel",
  "sourceBook": "boss_yin",
  "sourceChapter": 5
}
```

### 1.3 两端数据映射关系

| 学习单元字段 | vocabulary.html 字段 | 说明 |
|-------------|---------------------|------|
| 词条（原形） | `word` / `id` | 词条原形，作为唯一标识 |
| 文中形式 | `examples[0].ru` 中的高亮词 | 真实例句中的出现形式 |
| 真实例句 | `examples[0].ru` | 例句原文 |
| source_file | `sourceUnit`（新增） | 学习单元来源文件 |
| source_pages | `sourcePages`（新增） | 原书页码 |
| title | `sourceTitle`（新增） | 学习单元标题 |

**当前缺口：**
- 学习单元的词汇数据未进入 vocabulary.html 的复习队列
- vocabulary.html 没有"学习单元"来源类型
- `goToSource()` 函数仅支持 novel 来源，不支持学习单元

---

## 2. 集成方案

### 2.1 方案 A：静态链接（Markdown wikilink）

**思路：** 在学习单元的 Section 6 表格中添加 Obsidian wikilink，指向 vocabulary.json 中的对应词条文件。

**实现方式：**

```markdown
| 词条 | 文中形式 | 匹配方法 | 置信度 | 真实例句 |
|------|----------|----------|--------|----------|
| [[词汇/достопримечательность\|достопримечательность]] | достопримечательности | exact-token | high | Муром славится своими **достопримечательностями**. |
```

**优点：**
- 零代码改动，纯 Markdown 操作
- 在 Obsidian 中可直接点击跳转到词汇笔记
- 利用 Obsidian 的反向链接功能可查看哪些学习单元引用了该词

**缺点：**
- 不自动将词加入 vocabulary.html 的复习队列
- 用户需要手动在 vocabulary.html 中搜索并开始复习
- 无法携带例句和上下文信息
- 依赖词汇笔记文件已存在（需先运行 `build:vocab`）

**适用场景：** 作为临时方案或辅助方案，建立学习单元与词汇笔记之间的导航关系。

---

### 2.2 方案 B：学习单元查看器 + JavaScript 桥接

**思路：** 创建 `learning-unit.html` 页面，在 index.html 中作为 iframe 加载，通过 postMessage 与 vocabulary.html 通信。

**架构：**

```
┌─────────────────────────────────────────────┐
│  index.html — 调度中心                        │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  #vocab-frame                        │   │
│  │  vocabulary.html                     │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  #lu-frame (新增)                    │   │
│  │  learning-unit.html                  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         ↑ postMessage ↑
    LU_ADD_VOCAB ←→ VOCAB_ADDED
```

**learning-unit.html 功能：**
- 从 `学习单元/*.md` 加载 Markdown 内容（通过 server.js API）
- 解析 Section 6 的词汇表格
- 每个词条旁显示"加入背词"按钮
- 点击后通过 postMessage 发送到 vocabulary.html

**postMessage 协议扩展：**

```javascript
// 学习单元 → 背词系统
{
  type: 'LU_ADD_VOCAB',
  word: 'достопримечательность',
  meaning: '名胜，景点',
  context: 'Муром славится своими достопримечательностями.',
  sourceUnit: 'Текст 1.1.1 — Достопримечательности Мурома',
  sourcePages: '8-10',
  sourceFile: '章节/предисловие.md'
}

// 背词系统 → 学习单元（确认）
{
  type: 'VOCAB_ADDED',
  word: 'достопримечательность',
  success: true
}
```

**vocabulary.html 改动：**
- 监听 `LU_ADD_VOCAB` 消息
- 将词加入 `vocabulary-review-records`（同 novel 模式）
- 在卡片背面显示"📖 查看学习单元"按钮
- 扩展 `goToSource()` 支持学习单元来源

**server.js 改动：**
- 新增 `GET /api/learning-units` — 返回学习单元列表
- 新增 `GET /api/learning-unit/:id` — 返回单个学习单元 Markdown 内容

**优点：**
- 完整的阅读→复习闭环
- 保留真实例句和上下文
- 可扩展为完整的学习单元阅读界面
- 与现有 reader.html 架构一致

**缺点：**
- 需要新建 learning-unit.html（约 200-400KB）
- 需要 Markdown 解析器（引入 marked.js 或类似库）
- 需要扩展 server.js API
- 开发工作量大（2-3 天）

**适用场景：** 长期方案，提供完整的学习体验。

---

### 2.3 方案 C：共享 localStorage（轻量桥接）

**思路：** 不创建新的 HTML 页面，而是：
1. 在学习单元的 Markdown 中嵌入可复制的 JSON 代码块
2. 用户在 vocabulary.html 中粘贴导入
3. 或通过 server.js API 批量导入

**实现方式一：JSON 代码块**

在学习单元的 Section 6 末尾添加：

```markdown
> [!tip] 导入到背词系统
> 复制以下 JSON，在 vocabulary.html 的设置面板中点击"导入学习单元词汇"：
>
> ```json
> {
>   "type": "learning-unit-vocab",
>   "unit": "Текст 1.1.1 — Достопримечательности Мурома",
>   "pages": "8-10",
>   "words": [
>     {"word": "достопримечательность", "meaning": "名胜，景点", "context": "Муром славится своими достопримечательностями."},
>     {"word": "славиться", "meaning": "以…著称", "context": "Муром славится своими достопримечательностями."}
>   ]
> }
> ```
```

**实现方式二：server.js 批量导入 API**

```javascript
// POST /api/learning-unit-vocab
{
  "unit": "Текст 1.1.1",
  "words": [
    {"word": "достопримечательность", "meaning": "名胜", "context": "..."}
  ]
}
```

server.js 将词汇写入 `俄语笔记库/学习单元词汇/` 目录，vocabulary.html 通过 `loadNovelVocabulary()` 同样方式加载。

**vocabulary.html 改动：**
- 在设置面板添加"导入学习单元词汇"按钮
- 解析 JSON 格式，写入 `vocabulary-review-records`
- 扩展 `goToSource()` 支持学习单元来源

**优点：**
- 开发工作量最小（半天）
- 不需要新的 HTML 页面
- 利用现有导入机制
- 可批量导入整篇学习单元的词汇

**缺点：**
- 需要用户手动操作（复制粘贴或点击导入）
- 不是实时交互体验
- JSON 代码块会让 Markdown 文件变长
- 需要同步更新 JSON 和表格

**适用场景：** 快速实现最小可用版本，验证集成效果。

---

## 3. 推荐方案

**推荐：方案 C（共享 localStorage）作为第一阶段 + 方案 A（静态链接）作为辅助**

**理由：**

1. **快速验证**：方案 C 可在半天内完成，立即验证"学习单元词汇 → 复习队列"的效果
2. **零侵入**：不修改学习单元的 Markdown 文件结构，仅在末尾添加可选的 JSON 代码块
3. **渐进式**：验证效果后，可升级到方案 B 提供完整体验
4. **Obsidian 兼容**：不依赖 iframe 或 postMessage，规避 Obsidian CSP 限制

**第一阶段交付物：**
- server.js 新增 `/api/learning-unit-vocab` 端点
- vocabulary.html 新增"导入学习单元词汇"按钮
- 编写脚本从学习单元 Section 6 提取词汇生成 JSON
- `goToSource()` 支持学习单元来源

**第二阶段（可选）：**
- 创建 learning-unit.html 查看器
- 实现 postMessage 通信
- 提供实时"一键加入"体验

---

## 4. 实现路线图

### 第一阶段：批量导入（1 天）

**步骤 1：编写词汇提取脚本**

创建 `scripts/extract-lu-vocab.py`：
- 扫描 `学习单元/*.md`
- 解析 Section 6 的 Markdown 表格
- 提取词条、文中形式、真实例句
- 从 YAML frontmatter 读取 source_file、source_pages、title
- 输出 JSON 文件到 `data/learning-unit-vocab.json`

**步骤 2：扩展 server.js**

```javascript
// GET /api/learning-unit-vocab-list
// 返回 data/learning-unit-vocab.json

// POST /api/learning-unit-vocab
// 保存单个词到 俄语笔记库/学习单元词汇/
```

**步骤 3：扩展 vocabulary.html**

- 在设置面板添加"📥 导入学习单元词汇"按钮
- 新增 `loadLearningUnitVocabulary()` 函数（同 `loadNovelVocabulary()` 模式）
- 扩展卡片背面显示逻辑，支持 `source === 'learning-unit'`
- 扩展 `goToSource()` 支持学习单元来源

**步骤 4：数据格式定义**

学习单元词汇的 vocabulary.json 条目格式：

```json
{
  "id": "lu/Текст 1.1.1/достопримечательность",
  "word": "достопримечательность",
  "meaning": "名胜，景点",
  "type": "",
  "source": "learning-unit",
  "chapter": "Текст 1.1.1 — Достопримечательности Мурома",
  "extra": "pages 8-10",
  "examples": [
    {
      "ru": "Муром славится своими достопримечательностями.",
      "zh": "穆罗姆以其名胜古迹而闻名。"
    }
  ]
}
```

复习记录扩展字段：

```json
{
  "mastery": 1,
  "count": 0,
  "interval": 0,
  "easeFactor": 2.5,
  "nextReview": null,
  "source": "learning-unit",
  "sourceUnit": "Текст 1.1.1 — Достопримечательности Мурома",
  "sourcePages": "8-10",
  "sourceFile": "章节/предисловие.md"
}
```

### 第二阶段：一键加入（可选，2-3 天）

1. 创建 `learning-unit.html` 查看器
2. 扩展 postMessage 协议
3. 实现实时词汇加入
4. 添加学习单元阅读进度追踪

---

## 5. 风险与限制

### Obsidian CSP 限制

- Obsidian 的 CSP 禁止内联脚本和外部资源加载
- 学习单元 Markdown 文件不能直接运行 JavaScript
- **规避方案**：使用独立 HTML 页面（learning-unit.html）而非 Obsidian 内嵌

### localStorage 同源限制

- localStorage 仅限同源页面访问
- Obsidian 使用 `app://` 协议，与 `localhost:3000` 不同源
- **规避方案**：学习单元词汇通过 server.js API 中转，不直接访问 localStorage

### 数据同步问题

- 学习单元的词汇表格可能更新（添加新词、修改例句）
- 需要决定同步策略：覆盖 vs 增量
- **建议**：使用 word 作为唯一键，已存在的词不覆盖复习记录

### 词汇去重

- 同一个词可能出现在多篇学习单元中
- 同一个词可能已在 vocabulary.json 中存在
- **策略**：以 word 为键，优先保留已有复习记录，仅补充来源信息

### Markdown 表格解析

- 学习单元的 Section 6 使用 Markdown 表格格式
- 需要可靠的表格解析器（正则表达式可能不够健壮）
- **建议**：使用 Python 的 `markdown` 库或手动解析

### 学习单元文件尚未生成

- 当前 `学习单元/` 目录下只有模板文件，30 篇学习单元尚未创建
- **影响**：方案实施需要等待学习单元生成完成
- **建议**：先完成代码框架，待学习单元生成后批量导入

---

## 附录：技术细节

### A. 词汇 ID 生成规则

```
学习单元词汇 ID = "lu/" + 学习单元标题 + "/" + 词条原形
示例：lu/Текст 1.1.1 — Достопримечательности Мурома/достопримечательность
```

### B. goToSource() 扩展

```javascript
function goToSource(wordId, event) {
    if (event) event.stopPropagation();
    var records = getRecords();
    var rec = records[wordId];

    if (rec && rec.source === 'learning-unit' && rec.sourceFile) {
        // 打开 Obsidian 中的学习单元文件
        // 使用 obsidian:// URI scheme
        var obsidianUrl = 'obsidian://open?vault=俄语笔记库&file=' +
            encodeURIComponent(rec.sourceFile);
        window.open(obsidianUrl, '_blank');
    } else if (rec && rec.source === 'novel' && rec.sourceBook) {
        var url = 'reader.html?book=' + encodeURIComponent(rec.sourceBook) +
                  '&ch=' + (rec.sourceChapter != null ? rec.sourceChapter : 0);
        window.open(url, '_blank');
    } else {
        alert('该词无来源信息');
    }
}
```

### C. 卡片背面来源标签

```javascript
if (w.source === 'learning-unit' && tagCount < 2) {
    var luSrc = (rec && rec.sourceUnit) ? rec.sourceUnit : (w.chapter || '学习单元');
    metaTags += '<span class="tag">📘 ' + esc(luSrc) + '</span>';
    tagCount++;
}
```
