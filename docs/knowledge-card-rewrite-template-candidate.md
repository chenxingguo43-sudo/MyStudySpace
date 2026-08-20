# 知识点卡片改写模板（候选模板 v0.1 · 草稿）

> **状态：候选模板，未定稿。**
> 仅作为 `gl1/section-1.1` 实学验收期间的并行起草物，**不启动全局推广，不改任何其他卡片**。
> 待 admin 完成 1.1 实学验收后，根据真实卡点修订并定稿。
> 依据真实文件：`data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.1.json`（schemaVersion 1）。
> 本轮明确**不涉及**：`mindMap` 布局与宽度调整；正式题库改动。

---

## 0. 总原则

1. 教学表达服务于"打开就能学懂"，语法内容以原书为准，**不改证据、不加强结论**。
2. 教学阅读顺序固定为：一句话结论 → 直观例子 → 做题步骤 → 常见误区及纠正 → 随堂练习与反馈 → 可查原书证据（页码）。
3. 任何改动都必须能被 `git diff` 定位到"教学层字段"；证据与题库层一行都不能动。
4. 卡片分级先行：先判"简单 / 需调模板 / 复杂"，再决定是否机械套模板。

---

## 1. 教学卡片标准结构

一张卡片（`section-X.Y.json`）由「卡片级」与「stage 级」两层组成。

### 1.1 卡片级（整卡）

| 字段 | 作用 | 本轮 1.1 状态 |
|---|---|---|
| `schemaVersion` / `sectionId` / `chapterId` | 结构标识 | 不变 |
| `titleZh` / `titleRu` | 卡片标题 | 已定稿 |
| `problem` | 一句话点破难点 | 教学层 |
| `scopeNote` | 边界说明（管什么、不管什么） | 教学层 |
| `estimatedMinutes` | 学习用时 | 展示层 |
| `objectives` | 学习目标（≤3 条） | 教学层 |
| `mindMapIntro` / `mindMap[]` | 思维导图导语 + 节点 | **本轮不动布局与宽度**；节点文案属教学层但暂不纳入本轮 |
| `diagnostic` | 前置诊断题（prompt/options/feedback） | 教学层（1.1 本轮未改，推广时单独审） |
| `stages[]` | 4 个 stage，见 1.2 | 核心改写对象 |
| `summaryTable` + `summaryTableHeaders` | 汇总对照表 | 教学层 |
| `finalCheck` | 收官检查题 | 教学层 |
| `transferTasks[]` | 迁移应用题 | 教学层 |
| `sources[]` | 原书来源清单 | **证据层** |
| `reviewStatus` / `riskRecord[]` | 审查状态与风险记录 | 只读，记录不动 |

### 1.2 Stage 级（每个 stage 的标准骨架）

教学顺序对应字段顺序（文案层允许重排理解顺序，但字段保留）：

1. `question` —— 一句话结论（先问"题目究竟要你判断哪个词"）
2. `entry`（`ru` + `prompt`）—— 直观例子引入
3. `teacherExplanation[]` —— 大白话讲解（按"词类 → 语体/结构 → 举例"展开）
4. `sourceRule` / `sourceEvidence` / `sourceExamples[]` —— 原书证据（只读锚点，穿插引用）
5. `contrasts[]` —— 易混对（左/右 + 逐句分析）
6. `signals[]`（`words` / `validWhen` / `failsWhen`）+ `signalLabels` —— 判断信号
7. `commonErrors[]` —— 常见误区（每条须含"纠正："）
8. `checks[]`（`prompt` / `options` / `feedback` / `retry`）—— 随堂判断
9. `exerciseIds[]` —— 正式练习映射（只读）
10. `id` / `number` / `title` —— stage 标识与标题

---

## 2. 可改字段 / 证据保护字段映射

### 2.1 可改（教学表达层）

| 位置 | 字段 |
|---|---|
| stage 级 | `question`、`entry.prompt`、`teacherExplanation[]`、`sourceExamples[].analysis`、`contrasts[].analysis`、`signals[].validWhen` / `failsWhen`、`commonErrors[]`、`checks[].feedback`（correct/misconception/review/contrast） |
| stage 级（附带） | `entry.ru` 仅用于配 `prompt` 展示时允许增补展示例句，但**不得与 evidence 冲突**；`checks[].retry` 的 `prompt` / `options` 文案可调整（须同时核对 `answer`，见 2.2） |
| 卡片级 | `problem`、`scopeNote`、`objectives`、`titleZh/Zh 表达`、`mindMapIntro`（若日后单独立项） |

### 2.2 保护（证据与题库层，一行不动）

| 位置 | 字段 | 说明 |
|---|---|---|
| stage 级 | `sourceRule` 全文（含 `sourceType`/`label`/`ru`/`zh`） | 原书整理条目 |
| stage 级 | `sourceEvidence` 全文 | 原书证据引文 |
| stage 级 | `sourceExamples[].ru` / `zh` / `source` | 例句原文、翻译、页码（`analysis` 除外） |
| stage 级 | `source`（`printedPages` / `pdfPages`） | 原书印刷页与 PDF 页码 |
| stage 级 | `checks[].answer`、`checks[].retry.answer` | 答案键；改选项文本后必须复查答案仍指向正确项 |
| stage 级 | `exerciseIds[]` | 正式练习映射 |
| 卡片级 | `sources[]`、`reviewStatus`、`riskRecord[]` | 来源与审查记录 |
| 题库 | 正式题 `GL1-Qxxx` 的题面、选项、答案、题目 ID、题库映射、学习进度数据 | 不在卡片内改动 |
| 结构 | `schemaVersion`、`sectionId`、`chapterId`、stage `id`/`number` | 标识字段 |

> 判定口诀：**改"怎么说"，不改"事实是什么"**。`ru/zh/source/answer/exerciseIds` 属于事实层。

---

## 3. 三档判定标准

推广前先给卡片分级，**分级决定处理方式**，不做一刀切。

### 3.1 简单（可直接套模板，参照 1.1 Stage 1/2）

- 原书条目一段话能讲清，规则单一；
- 无跨 stage 分支、无例外清单；
- 随堂题与正式题判断点一致；
- `riskRecord` 为空或仅记录过非阻断建议；
- 卡片结构字段与模板完全一致（stage 数、信号、对比数量在模板覆盖内）。

处理：Codex 按模板改写 → Claude 五项审查 → 数据巡检。

### 3.2 需调模板（参照 1.1 Stage 3/4）

满足以下任一项：

- 原书条目含两段以上规则或明显例外（如复合职称的"整体固定"）；
- 需要新增 3 个以上 `contrasts` 或两级以上 `signals` 分支；
- stage 数量/顺序与模板不同（如需要先谓语后定语）；
- 需要新的 `signalLabels` 文案或新的随堂题判断点；
- 教学表达上存在"名词本身 vs 修饰词 vs 谓语"的横向整合需求。

处理：Codex 在模板基础上调整结构 → 调整项书面说明 → Claude 专项审查 → 数据巡检（重点核对答案键与契约测试同步更新）。

### 3.3 复杂（需单独讨论，不进批量）

满足以下任一项：

- 原书证据不足、翻译有歧义或需跨章节引用；
- 涉及"绝对化"风险（如"永远只有阳性""全部判定不规范"类表述诱惑）；
- 需要新增正式题、改动 `exerciseIds` 或题库映射；
- `riskRecord` 有未关闭风险项；
- 表达上难以在不加强原书结论的前提下讲清。

处理：暂停排期，先在群里单独讨论方案 → 共识后再进入实施通道。

---

## 4. 审查与巡检清单

### 4.1 Claude 五项正式审查（教学层）

1. **原书证据不变**：`sourceRule` / `sourceEvidence` / `sourceExamples[].ru|zh|source` 与 `git diff` 前逐字一致，页码未变；
2. **讲解准确**：词类分支正确（称谓名词本身 / 定语代词 / 谓语·短形容词·短分词），不混淆语体与自然性别；
3. **大白话易懂**：打开即懂，无术语堆砌；术语首现处给白话解释；
4. **无超证据绝对化**：全文无"永远 / 全部 / 任何 / 绝对错误 / 一律"等无证据断言，结论不强于原书；
5. **做题顺序清楚**：一句话结论 → 例子 → 步骤 → 误区纠正 → 随堂练习 → 证据页码，可独立走通。

### 4.2 数据完整性巡检（DeepSeek）

1. `git diff` 只触及教学层字段（2.1 清单），证据与题库层零改动；
2. `tests/russian-b2/zlatoust-learning-card-quality.test.js` 全量通过（当前 9/9）；
3. `sourceRule`/`sourceEvidence` 的 ru/zh 原文、`printedPages`/`pdfPages` 未变；
4. 所有 `checks[].answer` / `retry.answer` 与选项文本自洽；若改过选项文本，契约测试已同步更新；
5. `exerciseIds`、题库文件、学习进度数据未被触碰；
6. JSON 可解析、UTF-8 无乱码、无尾逗号；
7. `riskRecord` / `reviewStatus` 未被教学改写破坏；
8. `mindMap`、`diagnostic`、`finalCheck`、`transferTasks` 本轮未被意外改动；
9. 全卡无"永远/全部/任何/绝对错误/一律"命中（与 Claude 第 4 项交叉验证）。

---

## 5. 每批推广的验收门槛

- **批次规模**：每批 3～5 张卡，优先同一章节/同一语法族的卡（便于对照审查）。
- **流程门槛**（顺序执行，缺一不可）：
  1. 分级通过（简单 / 需调模板 / 复杂讨论完毕）；
  2. Codex 实施完成，`git diff` 仅含本批卡片教学层改动；
  3. Claude 五项审查**全部通过**（未通过项不回退上批，在本批闭环）；
  4. DeepSeek 数据巡检 9 项全过、契约测试全绿；
  5. admin 实学验收通过（见下）。
- **admin 实学验收标准**：
  - 实际读完本批每张卡的全部 stage；
  - 完成全部随堂判断与正式练习；
  - **不再需要截图询问外部 AI**；
  - 无卡住点；若有，须记录具体 stage/句子/术语/做题步骤。
- **批次闭环**：卡点记录 → 修订模板与分级清单 → 下一批执行；未决问题不跨批累积。
- **纪律**：推广全程不 push、不改题库映射、不机械套模板；每批结束向群里提交"分级表 + 审查记录 + 巡检报告"。

---

## 附：与 1.1 的对应关系（溯源用）

- Stage 1 `stage-title`（称谓名词）→ 模板"简单"档参照；
- Stage 2 `stage-attribute`（定语代词语体）→ 模板"简单"档参照；
- Stage 3 `stage-compound`（复合职称）→ 模板"需调模板"档参照（新增整体固定概念 + 横向整合）；
- Stage 4 `stage-predicate`（谓语/短形容词/短分词）→ 模板"需调模板"档参照（新增词类三分 + 横向整合）。

**待 admin 1.1 实学验收后**：本模板按真实卡点修订、转正，再进入 32 张卡的分级排期。
