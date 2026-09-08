# B2 P3 知识点卡片 1-4 实施文档

日期：2026-09-06

状态：`计划 4 verified`（2026-09-06）

对应总计划：`docs/READER_B2_P3_KNOWLEDGE_CARDS_1234_PLAN.md`

## 1. 实施边界

本文件说明每个阶段读取什么、生成什么、改哪些文件、运行哪些检查，以及中断后怎样继续。本轮已按顺序完成 Gate 0、计划 1、计划 2、计划 3 和计划 4；本文件顶部状态与末尾结果记录是当前执行真相。

`p3-gerund-subject` 是已经接受的第二版样板，本轮把它当结构和交互基线，不重新定义它的知识范围。

### 本次执行结果

- Gate 0：50 题映射审计完成，47 题 `confirmed`、3 题 `needs-review`、0 题 `blocked`，不需要拆分稳定卡片 ID。
- 计划 1：`p3-gerund-meanings` 已接入 7 个新版分支和 Q024–Q044 映射。
- 计划 2：`p3-active-participles` 已接入 6 个新版分支和 Q001–Q015 映射。
- 计划 3：`p3-passive-participles` 已接入 7 个新版分支和 Q016–Q023 映射。
- 计划 4：自动检查 24/24、浏览器检查 8/8 通过；最终记录见 [READER_B2_P3_KNOWLEDGE_CARDS_ACCEPTANCE.md](READER_B2_P3_KNOWLEDGE_CARDS_ACCEPTANCE.md)。

## 2. 当前真相来源

### 2.1 题目与解析

- `data/textbook/russian_b2/ch0002.json`：Reader 当前 P3 的 50 道题、解析和知识点入口；
- `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/p3-q001-q010.json` 至 `p3-q041-q050.json`：规范题目数据；
- `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-03-source-ledger.json`：来源、答案和纠错记录；
- `俄语资料库/俄语B2 全模块 Markdown版/章节/01-语法和词汇.md`：B2 原书文字来源。

### 2.2 卡片源文件

生产卡片的权威源文件位于：

`俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/`

对应四个文件：

- `p3-active-participles.json`
- `p3-passive-participles.json`
- `p3-gerund-meanings.json`
- `p3-gerund-subject.json`

`scripts/russian-b2/lib/study-cards.js` 会读取这些源文件，验证后生成：

`data/textbook/russian_b2/study-cards/`

因此正式接入时必须先改权威源，再通过生成器同步 Reader 文件，不能只修改生成结果。

### 2.3 知识点导航与题目范围

- `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-study-navigation.json`：六部分知识点目录的生成来源；
- `data/textbook/russian_b2/ch0002.json`：生成后的 P3 知识点与 `exerciseIds`；
- `data/textbook/russian_b2/study-cards/index.json`：Reader 卡片入口。

### 2.4 教学界面

- `js/russian-b2/study-teaching.js`：第二版 B2 连续微课渲染；
- `js/reader-mind-map.js`：B2 与《В мире людей》共用的新版思维导图；
- `css/b2-study-teaching.css`：B2 教学页面的局部布局；
- `reader.html`：Reader 入口、卡片加载、共用知识卡 CSS 和学习记录接入。

## 3. 自动批处理前置限制

当前 `config/reader-book-pipeline/russian-b2-grammar.json` 的主要契约是：

- `requiredSkill: reader-question-explainer`
- `outputField: answerAnalysis`

它适合逐题解析，但当前配置本身不能证明任务会按下列依赖顺序运行：

```text
概念目录与卡片边界
→ 独立知识卡草稿
→ 逐题解析
→ 分支级映射
→ 卡片接入
```

因此不能直接把现有 `russian-b2-grammar` 自动运行命令当作本计划的卡片生产命令。

Gate 0 评审通过后，执行者必须先做一次只读 `plan` 和底层 `verify`。如果任务清单仍不能表达上述依赖，应新增一个专用 P3 知识卡 profile 及其合同测试，而不是削弱顺序。专用 profile 的名称和恢复命令只有在实际文件建立并验证后才能写入完成记录，本实施文档不预先伪造一个可运行命令。

## 4. Gate 0 实施：建立 P3 映射审计

### 4.1 只读盘点

先确认：

- P3 恰好有 P3-Q001 至 P3-Q050；
- 当前四张卡的粗映射数量为 15、8、21、6；
- 50 道题无遗漏和重复主要归属；
- `p3-gerund-subject` 的 6 个 `teachingMapping` 与其 6 道题一致；
- 其余三张卡还没有被误标为第二版完成。

### 4.2 先做四张概念覆盖账本

每张卡先形成以下目录，不能先把题目依次塞入小节：

```text
cardId
learningTarget
coreIdea
necessaryBranches[]
allowedCases[]
disallowedCases[]
limits[]
repairOrProductionUse[]
neighborHandoffs[]
sourceEvidence[]
unresolvedRisks[]
```

### 4.3 再做 50 题映射表

审计文档为 `docs/READER_B2_P3_MAPPING_AUDIT.md`。建议按卡片分四节，每节先放概念覆盖账本，再放题目表。

题目表必须包含总计划规定的八个字段。主要分支还未正式建立时可用临时审计 ID，但在写入生产数据前必须冻结成稳定 ID。

### 4.4 Gate 0 的确定性检查

增加或扩展测试，至少验证：

- P3 题号集合精确等于 P3-Q001 至 P3-Q050；
- 每题恰好一个主要卡片；
- 所有 `primaryBranchId` 能在目标卡片找到；
- `secondaryBranchIds` 不含自身重复、无失效目标；
- 题目映射不会改变原 `exerciseIds`；
- 隐藏全部正式题后，四张卡的概念覆盖账本仍完整。

### 4.5 Gate 0 完成记录

审计完成时在 `READER_B2_P3_MAPPING_AUDIT.md` 顶部记录：

- 50 题的 `confirmed / needs-review / blocked` 数量；
- 四张卡最终边界；
- Q024 至 Q044 保持一张卡或提出兼容性拆分的结论；
- 用户是否接受进入计划 1；
- 哪些变化会使这次边界确认失效。

## 5. 计划 1 实施：`p3-gerund-meanings`

### 5.1 草稿阶段

1. 只读取 Gate 0 已确认的本卡概念覆盖账本和教材证据。
2. 冻结概念优先的连续微课目录。
3. 做“拿掉 Q024 至 Q044”检查，补齐没有正式题覆盖但教材必需的分支。
4. 再把 21 道题映射到主要分支和必要补看分支。
5. 把题目特有的选项争议留在逐题解析，不写成卡片规则。
6. 形成可阅读的第二版教学稿，先评审教学质量，不直接改 JSON。

### 5.2 接入阶段

教学稿接受后：

- 在权威源卡中新增第二版 `teachingNarrative` 和稳定子记录键；
- 在导航源中新增对应 `teachingMapping`；
- 通过现有生成器同步 Reader 卡片和 P3 章节；
- 使用 `ReaderMindMap.renderRetrievalMap(...)`，不复制 SVG 或 CSS；
- 原 `lessons`、`checks` 和历史成绩放入兼容折叠区。

### 5.3 单卡检查

- 权威源和生成结果深度一致；
- 21 题映射无遗漏、无重复主要位置；
- 每个必要分支有完整讲解、诊断反馈和换境重试；
- 从目录和映射题进入都打开新版；
- 1280×844、390×844 页面通过；
- 用户能说明不同逻辑关系的判断依据。

只有以上全部通过，计划 2 才能开始。

## 6. 计划 2 实施：`p3-active-participles`

沿用计划 1 的“草稿→映射→接入→检查”流程，范围改为 Q001 至 Q015。

本阶段额外检查：

- 每个分支先说明中心名词和动作执行者，再讲词尾；
- 关系从句改写不能改变原来的动作人和相对时间；
- 性、数、格与主动现在时／过去时不混成一个选择步骤；
- 与被动形动词卡的交接点明确。

权威源卡、导航源、生成结果和测试文件的处理方式与计划 1 相同。

## 7. 计划 3 实施：`p3-passive-participles`

沿用相同流程，范围改为 Q016 至 Q023。

本阶段额外检查：

- 施事者和承受者的角色没有颠倒；
- 体、完成结果、过程性和性数格各自承担的判断步骤可见；
- 长形与短形只在教材证据允许的范围内讲解；
- 与主动形动词卡、谓语短形式等相邻知识的边界明确。

## 8. 计划 4 实施：P3 整体验收

### 8.1 数据检查

至少运行：

```powershell
node --test tests/russian-b2/study-teaching.test.js
node --test tests/russian-b2/study-cards.test.js
node --test tests/russian-b2/grammar-content-integrity.test.js
node --test tests/reader-b2-grammar-pipeline.test.js
node --test tests/reader-mind-map.test.js
```

如果共享数据格式、生成器或 Reader 入口发生变化，再扩大到对应 Reader 内容清单和静态检查。不要运行会无关地批量改写整本教材数据的命令。

### 8.2 浏览器检查

扩展 `tests/reader-b2-study-teaching.spec.js`，覆盖四张卡：

- 从 P3 知识卡目录进入；
- 从每道题的“补看知识”入口进入；
- 分支跳转到正确小节；
- 返回刚才题目；
- 返回 P3 目录；
- 保存并恢复阅读位置；
- 保留原题成绩和旧卡记录；
- 桌面与手机无页面级横向溢出。

### 8.3 内容验收报告

新增 `docs/READER_B2_P3_KNOWLEDGE_CARDS_ACCEPTANCE.md`，记录：

- 四张卡和 50 道题完成状态；
- 映射数量和所有阻断项；
- 使用的教学结构版本、思维导图版本和记录版本；
- 自动检查和浏览器检查结果；
- 学习者试读结论；
- 以后需要重新验收的条件。

## 9. 状态与恢复

每个阶段只允许以下状态：

```text
pending -> drafting -> review -> accepted -> integrated -> verified
                         \-> needs-review / blocked
```

阶段完成后立即更新本文件顶部状态和对应验收文档。后续阶段只读取已经 `accepted` 或 `verified` 的前置结果。

中断时：

- 已接受的教学稿不重写；
- 已验证的卡片不重新生成；
- 未完成题目回到当前阶段待办；
- 阻断项保留原因和所需证据；
- 不通过 Git 回退用户其他改动。

在专用生产 profile 尚未建立前，恢复点以文档中的阶段状态为准。专用 profile 建立后，以流水线状态为唯一执行状态，文档只记录阶段结果和恢复命令。

## 10. 计划启动时的第一项工作

正式开始执行时，只做 Gate 0：创建 `docs/READER_B2_P3_MAPPING_AUDIT.md`，完成四张概念覆盖账本和 50 题逐题映射审计。Gate 0 没有通过前，不改写剩余三张卡，也不启动自动生成。本次执行已完成该门槛，后续阶段结果见 [P3 知识点卡片验收记录](READER_B2_P3_KNOWLEDGE_CARDS_ACCEPTANCE.md) 和实时状态文档。
