# 词典 C 方案：大规模扩充至 PDF 阅读级覆盖 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 vocabulary.json 从 6,147 条扩充至 ~10,000 条，补全例句/语法/主题/频率，统一字段，重建 morphology-map.json，达到 PDF 阅读器俄语点查的覆盖水平。

**Architecture:** 4 个阶段顺序执行。阶段 1 修复现有数据（AI 批量补全）→ 阶段 2 拉取外部频率词表去重 → 阶段 3 批量生成新词 Markdown 文件 → 阶段 4 重建 morphology-map.json。核心脚本均为 Node.js，AI 调用通过 Gemini API。

**Tech Stack:** Node.js, fs/path, Gemini API (gemini-2.5-flash for batch), Obsidian Markdown format

---

## 文件改动总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/enrich-vocabulary.js` | 新建 | AI 批量补全主脚本 |
| `scripts/fetch-frequency-list.js` | 新建 | 拉取外部频率词表 |
| `scripts/rebuild-morphology.js` | 新建 | 重建形态映射表 |
| `build-vocabulary.js` | 修改 | 增加 type 统一 + 字段校验 |
| `俄语笔记库/词汇/` | 新增 ~3,000 .md 文件 | 新词条 |
| `data/vocabulary.json` | 重建 | 重新 build |
| `data/morphology-map.json` | 重建 | 阶段 4 重建 |

---

### 阶段 1：修复现有 6,147 条数据

#### Task 1.1: 修改 build-vocabulary.js — 统一 type 字段

**Files:**
- Modify: `build-vocabulary.js` — 在 extractVocab 函数输出处加 type 规范化

- [ ] **Step 1: 添加 type 规范化函数**

在 `build-vocabulary.js` 的 `unquote()` 函数之后添加：

```javascript
// ─── type 字段规范化 ────────────────────────────────────────────────────
function normalizeType(type) {
  const map = {
    'adj': 'adjective',
    'adv': 'adverb',
    'n': 'noun',
    'v': 'verb',
    '高频词': 'vocab',
    'prep': 'preposition',
    'conj': 'conjunction',
  };
  return (map[type] || type).toLowerCase();
}
```

- [ ] **Step 2: 在 extractVocab 的输出处应用**

搜索 `type: fm.type ||` 这样的赋值逻辑，将 `fm.type` 改为 `normalizeType(fm.type)`。

具体查找：

```javascript
// 在 extractVocab 函数返回对象前，添加归一化
```

在返回对象的 `type` 字段赋值处应用：

```javascript
type: normalizeType(fm.type || 'vocab'),
```

- [ ] **Step 3: 重建并验证**

```bash
node build-vocabulary.js
jq 'group_by(.type) | map({type: .[0].type, count: length}) | sort_by(-.count)' data/vocabulary.json
```

验证不再出现 "adj"/"adjective" 并存、"adv"/"adverb" 并存。

- [ ] **Step 4: 提交**

```bash
git add build-vocabulary.js data/vocabulary.json data/vocabulary-manifest.json data/vocabulary-quality-report.json
git commit -m "fix: normalize type field — adj→adjective, adv→adverb, etc."
```

#### Task 1.2: 创建 AI 批量补全脚本 — 补例句

**Files:**
- Create: `scripts/enrich-vocabulary.js`

- [ ] **Step 1: 创建脚本骨架**

```javascript
#!/usr/bin/env node
// enrich-vocabulary.js — AI 批量补全词典字段
// 用法：node scripts/enrich-vocabulary.js --field examples --batch-size 50

const fs = require('fs');
const path = require('path');

const VOCAB = path.join(__dirname, '..', 'data', 'vocabulary.json');
const VAULT = path.join(__dirname, '..', '俄语笔记库');
const VOCAB_DIR = path.join(VAULT, '词汇');

// 读取当前词典
const entries = JSON.parse(fs.readFileSync(VOCAB, 'utf-8'));

// 筛选待处理条目
function findEntriesMissing(field) {
  return entries
    .filter(e => e.type !== 'sentence' && e.type !== 'tip' && e.type !== 'vocab')
    .filter(e => {
      if (field === 'examples') return !e.examples || e.examples.length === 0;
      if (field === 'theme') return !e.theme || e.theme === '';
      if (field === 'case_gov') return e.type === 'verb' && (!e.case_gov || e.case_gov === '');
      if (field === 'pair') return e.type === 'verb' && (!e.pair || e.pair === '');
      if (field === 'gender') return (e.type === 'noun') && (!e.gender || e.gender === '');
      return false;
    });
}

// 主入口
const field = process.argv.includes('--field') 
  ? process.argv[process.argv.indexOf('--field') + 1] 
  : 'examples';
const batchSize = parseInt(
  process.argv.includes('--batch-size') 
    ? process.argv[process.argv.indexOf('--batch-size') + 1] 
    : '50'
);

const missing = findEntriesMissing(field);
console.log(`Found ${missing.length} entries missing "${field}"`);
console.log(`Will process in batches of ${batchSize}`);
```

> 注意：AI API 调用部分在后续 step 中补充。骨架先跑通 `findEntriesMissing` 函数。

- [ ] **Step 2: 添加 AI 调用逻辑**

```javascript
// AI API 配置（从环境变量或配置文件读取）
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function askAI(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
    })
  });
  const json = await response.json();
  return json.candidates[0].content.parts[0].text;
}
```

- [ ] **Step 3: 添加例句生成 prompt**

```javascript
function buildExamplesPrompt(entry) {
  return `你是俄语教学专家。为以下俄语单词生成 2 个自然、地道的场景例句。
格式要求：返回 JSON 数组，每项含 ru（俄语句子）和 zh（中文翻译）。
不要使用复杂从句，例句应为日常对话或 B2 难度。

单词：${entry.word}
词性：${entry.type}
释义：${entry.meaning}
${entry.case_gov ? '接格：' + entry.case_gov : ''}
${entry.pair ? '体偶：' + entry.pair : ''}

返回格式（严格JSON数组，不含markdown代码块）：
[{"ru":"...","zh":"..."},{"ru":"...","zh":"..."}]`;
}
```

- [ ] **Step 4: 添加 Markdown 文件更新逻辑**

```javascript
// 解析 frontmatter，修改 examples 字段，写回 .md 文件
function updateExamplesInFile(entry, newExamples) {
  const filePath = path.join(VAULT, entry.file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ⚠ File not found: ${filePath}`);
    return false;
  }
  
  let src = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已有 examples 字段
  if (/^examples:\s*$/m.test(src) || /^examples:\s*\[/m.test(src)) {
    // 替换现有 examples
    const examplesYaml = newExamples.map(ex => `\n  - ru: "${ex.ru}"\n    zh: "${ex.zh}"`).join('');
    src = src.replace(
      /^examples:[\s\S]*?(?=^\w[\w-]*:|^---)/m,
      `examples:${examplesYaml}\n`
    );
  } else {
    // 在 frontmatter 中合适位置插入
    src = src.replace(
      /(\n)(\w[\w-]*:)/,
      `$1examples:${newExamples.map(ex => `\n  - ru: "${ex.ru}"\n    zh: "${ex.zh}"`).join('')}$1$2`
    );
  }
  
  fs.writeFileSync(filePath, src, 'utf-8');
  return true;
}
```

- [ ] **Step 5: 添加批量处理主循环**

```javascript
async function main() {
  const missing = findEntriesMissing(field);
  console.log(`Total to process: ${missing.length}`);
  
  for (let i = 0; i < Math.min(missing.length, 20); i++) {  // 先跑 20 条测试
    const entry = missing[i];
    console.log(`[${i + 1}/${Math.min(missing.length, 20)}] ${entry.word}`);
    
    try {
      const prompt = buildExamplesPrompt(entry);
      const response = await askAI(prompt);
      const examples = JSON.parse(response.replace(/```json\n?/g, '').replace(/```/g, '').trim());
      
      if (Array.isArray(examples) && examples.length >= 2) {
        updateExamplesInFile(entry, examples);
        console.log(`  ✅ Added ${examples.length} examples`);
      } else {
        console.log(`  ⚠ Invalid response format, skipping`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
    
    // 避免 API 限流
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log('\nDone! Run `node build-vocabulary.js` to rebuild vocabulary.json');
}

main();
```

- [ ] **Step 6: 运行测试（20 条）**

```bash
node scripts/enrich-vocabulary.js --field examples --batch-size 20
```

随机检查 3 个生成的例句是否地道的俄语。

- [ ] **Step 7: 提交**

```bash
git add scripts/enrich-vocabulary.js 俄语笔记库/词汇/
git commit -m "feat: add AI batch enrich script — examples field MVP"
```

#### Task 1.3: AI 批量补全 — 主题归类 + 频率标注

**Files:**
- Modify: `scripts/enrich-vocabulary.js` — 扩展 `field` 支持 theme/frequency/case_gov/pair/gender

- [ ] **Step 1: 添加主题分类 prompt**

```javascript
const THEMES = [
  '自然时空特征', '生活物品出行', '动作位移控制', '思维情感社交',
  '逻辑评估管理', '文化符号休闲', '社会人际', '宇宙地理科学',
  '创造改变生存', '人的品质态度', '科学艺术社会', '抽象概念'
];

function buildThemePrompt(entry) {
  return `你是一个俄语词汇分类专家。请将以下俄语单词归入最合适的一个主题类别。

单词：${entry.word}
词性：${entry.type}
释义：${entry.meaning}

可选主题：
${THEMES.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请只返回主题名称（精确匹配），不要加任何其他文字。`;
}
```

- [ ] **Step 2: 添加频率标注逻辑**

频率标注使用本地规则引擎（不用调用 AI）：
- 对照公开频率词表（文件路径：`data/frequency-list.json`）
- 批量匹配标注 A1/A2/B1/B2/C1

```javascript
function annotateFrequency(entry, frequencyData) {
  const word = entry.word.toLowerCase().trim();
  const match = frequencyData.find(f => f.word === word);
  return match ? match.level : null;
}
```

- [ ] **Step 3: 添加语法字段补全 prompt**

```javascript
function buildGrammarPrompt(entry) {
  return `你是俄语语法专家。请为以下俄语单词补充语法信息。

单词：${entry.word}
词性：${entry.type}
释义：${entry.meaning}

请返回JSON：
${entry.type === 'verb' ? `{
  "pair": "完成体对偶词",
  "aspect": "несов.或сов.",
  "case_gov": "接格关系，如 на + что (Вин.)"
}` : ''}
${entry.type === 'noun' ? `{
  "gender": "masculine/feminine/neuter",
  "animate": true或false
}` : ''}
${entry.type === 'adjective' ? `{
  "short_form": "短尾形式",
  "gender_forms": {"m":"","f":"","n":"","pl":""}
}` : ''}

仅返回JSON对象，不含markdown代码块。`;
}
```

- [ ] **Step 4: 运行并验证**

```bash
# 主题归类
node scripts/enrich-vocabulary.js --field theme --batch-size 50

# 语法补全
node scripts/enrich-vocabulary.js --field case_gov --batch-size 50
node scripts/enrich-vocabulary.js --field pair --batch-size 50
node scripts/enrich-vocabulary.js --field gender --batch-size 50
```

每次运行后抽查 3-5 个结果。

- [ ] **Step 5: 提交**

```bash
git add scripts/enrich-vocabulary.js 俄语笔记库/词汇/
git commit -m "feat: AI batch enrich — theme, frequency, grammar fields"
```

---

### 阶段 2：拉取外部频率词表去重

#### Task 2.1: 创建频率词表拉取脚本

**Files:**
- Create: `scripts/fetch-frequency-list.js`

- [ ] **Step 1: 拉取 OpenRussian 词表**

```javascript
#!/usr/bin/env node
// fetch-frequency-list.js — 拉取俄语频率词表

const fs = require('fs');
const path = require('path');

// OpenRussian 公开词典 API (CC0 许可)
const SOURCES = [
  {
    name: 'openrussian',
    url: 'https://raw.githubusercontent.com/Badestrand/russian-dictionary/master/words.csv',
    parser: 'csv',
  }
];

async function main() {
  console.log('Fetching frequency word lists...');
  
  // 拉取 words.csv
  const response = await fetch(SOURCES[0].url);
  const text = await response.text();
  
  // 解析 CSV (word,translation,pos,level,...)
  const lines = text.split('\n').slice(1); // skip header
  const words = [];
  
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 4) continue;
    words.push({
      word: parts[0].trim().toLowerCase(),
      translation: parts[1].trim(),
      pos: parts[2].trim(),
      level: parts[3].trim(),
    });
  }
  
  const outFile = path.join(__dirname, '..', 'data', 'frequency-openrussian.json');
  fs.writeFileSync(outFile, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`Saved ${words.length} words to ${outFile}`);
}

main();
```

- [ ] **Step 2: 运行并去重**

```bash
node scripts/fetch-frequency-list.js
```

输出：`data/frequency-openrussian.json`

- [ ] **Step 3: 与现有词典比对去重**

```bash
node -e "
const vocab = JSON.parse(require('fs').readFileSync('data/vocabulary.json','utf-8'));
const freq = JSON.parse(require('fs').readFileSync('data/frequency-openrussian.json','utf-8'));
const existing = new Set(vocab.map(e => e.word.toLowerCase().trim()));
const missing = freq.filter(f => !existing.has(f.word) && f.word.length >= 2);
require('fs').writeFileSync('data/missing-words.json', JSON.stringify(missing.slice(0, 5000), null, 2));
console.log('Missing words:', missing.length);
"
```

- [ ] **Step 4: 提交**

```bash
git add scripts/fetch-frequency-list.js data/frequency-openrussian.json data/missing-words.json
git commit -m "feat: fetch OpenRussian frequency list + dedup against vocabulary"
```

---

### 阶段 3：批量生成新词 Markdown 文件

#### Task 3.1: 创建新词批量生成脚本

**Files:**
- Create: `scripts/generate-new-words.js`

- [ ] **Step 1: 创建脚本**

```javascript
#!/usr/bin/env node
// generate-new-words.js — 批量为缺失词生成 Obsidian markdown

const fs = require('fs');
const path = require('path');

const VAULT = path.join(__dirname, '..', '俄语笔记库', '词汇');
const MISSING = path.join(__dirname, '..', 'data', 'missing-words.json');

// 词性到目录的映射
const POS_DIR_MAP = {
  noun: '名词',
  verb: '动词', 
  adjective: '形容词',
  adverb: '副词',
};

function generateFrontmatter(word, pos, translation, theme) {
  const type = POS_DIR_MAP[pos] ? pos : 'vocab';
  const dirName = POS_DIR_MAP[pos] || '其他';
  const safeName = word.replace(/[/\\:*?"<>|]/g, '_').substring(0, 50);
  const fileName = `${VAULT}/${dirName}/${safeName}.md`;
  
  return {
    fileName,
    frontmatter: `---
word: "${word}"
type: ${type}
theme: "${theme || ''}"
meaning: "${translation}"
mastery: 1
tags: ["${type}", "新词"]
frequency: "${''}"
---

# ${word}
## 📖 释义
${translation}
## ✍️ 例句
| 俄语 | 中文 |
|------|------|
| | |
`,
  };
}
```

- [ ] **Step 2: 添加 AI 批量生成逻辑**

每批 20 条，用 Gemini 一次性生成释义+例句+语法信息：

```javascript
function buildBatchPrompt(batch) {
  const wordList = batch.map((w, i) => 
    `${i + 1}. ${w.word} (${w.pos})`
  ).join('\n');
  
  return `你是俄语教学专家。为以下俄语单词批量生成学习卡片信息。
返回一个JSON数组，每项格式为：
{
  "word": "原词",
  "type": "noun/verb/adjective/adverb",
  "meaning": "中文释义",
  "examples": [{"ru":"俄语句子","zh":"中文翻译"}],
  "theme": "主题分类（自然时空特征/生活物品出行/动作位移控制/思维情感社交/逻辑评估管理/文化符号休闲/社会人际/宇宙地理科学/创造改变生存/人的品质态度/科学艺术社会/抽象概念）",
  "frequency": "A1/A2/B1/B2/C1（根据词的使用频率判断）"
}
${wordList}`;
}
```

- [ ] **Step 3: 批量运行**

```bash
# 先试 50 个
node scripts/generate-new-words.js --batch-size 50 --limit 50

# 验证抽查 5 个生成的 .md 文件
# 确认通过后逐步扩大
node scripts/generate-new-words.js --batch-size 50 --limit 500
node scripts/generate-new-words.js --batch-size 50 --limit 1000
```

- [ ] **Step 4: 每次批次提交**

```bash
git add 俄语笔记库/词汇/
git commit -m "feat: generate new vocab entries — batch N"
```

---

### 阶段 4：重建 morphology-map.json

#### Task 4.1: 创建形态映射重建脚本

**Files:**
- Create: `scripts/rebuild-morphology.js`

- [ ] **Step 1: 创建脚本**

利用 pymorphy2（Python）或 OpenRussian 的变格数据生成屈折形式→原形映射。

```javascript
#!/usr/bin/env node
// rebuild-morphology.js — 为 vocabulary.json 中的所有词生成屈折形式→原形映射

const fs = require('fs');
const path = require('path');

const VOCAB = path.join(__dirname, '..', 'data', 'vocabulary.json');
const OUT = path.join(__dirname, '..', 'data', 'morphology-map.json');

async function main() {
  const entries = JSON.parse(fs.readFileSync(VOCAB, 'utf-8'));
  console.log(`Total entries: ${entries.length}`);
  
  // 只处理有明确词性的实词（名词/动词/形容词）
  const contentWords = entries.filter(e => 
    ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral'].includes(e.type)
  );
  console.log(`Content words: ${contentWords.length}`);
  
  // 调用 pymorphy2 批量生成屈折形式
  // ...（具体实现取决于调用方式）
  
  const map = {};
  // map = { "книгу": ["книга"], "читал": ["читать"], ... }
  
  fs.writeFileSync(OUT, JSON.stringify({ version: Date.now(), map }), 'utf-8');
  console.log(`Morphology map saved: ${Object.keys(map).length} entries`);
}

main();
```

> 注意：pymorphy2 的调用可以通过 Python 子进程 `child_process.execSync`，或通过已有的 OpenRussian JSON 数据库（该数据库包含完整的变格变位表）。

- [ ] **Step 2: 重建并重建 vocabulary.json 验证**

```bash
node scripts/rebuild-morphology.js
node build-vocabulary.js

# 验证 morphology 覆盖率
node -e "
const vocab = JSON.parse(require('fs').readFileSync('data/vocabulary.json','utf-8'));
const morph = JSON.parse(require('fs').readFileSync('data/morphology-map.json','utf-8'));
const contentWords = vocab.filter(e => ['noun','verb','adjective'].includes(e.type));
const covered = contentWords.filter(e => morph.map[e.word.toLowerCase()]);
console.log('Covered:', covered.length, '/', contentWords.length);
"
```

- [ ] **Step 3: 提交**

```bash
git add data/morphology-map.json data/morphology-version.json data/vocabulary.json
git commit -m "feat: rebuild morphology-map for all ~10k words"
```

---

### 最终验证

- [ ] **阶段1验证：** `vocabulary.json` 无空例句、type 统一、theme 覆盖率 >95%
- [ ] **阶段2验证：** `missing-words.json` 包含 3,000+ 词
- [ ] **阶段3验证：** `俄语笔记库/词汇/` 新增 ~3,000 个 .md 文件
- [ ] **阶段4验证：** `morphology-map.json` 覆盖所有动/名/形词的屈折形式
- [ ] **全量重建：** `node build-vocabulary.js` 无报错，vocabulary.json ~10,000 条

---

## 执行策略

阶段 1-4 必须严格顺序执行，每个阶段完成后验证再进入下一阶段。

每个 Task 内的脚本需先小批测试（20-50 条），确认 AI 返回质量后再大批运行。
