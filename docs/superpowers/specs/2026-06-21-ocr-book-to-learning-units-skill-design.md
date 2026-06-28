---
title: "OCR Book To Learning Units Skill Design"
date: "2026-06-21"
status: "draft-for-user-review"
scope: "Codex skill + Claude-compatible workflow pack"
---

# OCR Book To Learning Units Skill Design

## 1. 目标

把这次《В мире людей 阅读口语 Markdown版》的经验沉淀为一套可复用流程，用于以后处理新的 OCR 书籍。

目标不是只做一个 Codex 私有 skill，而是做一套 **跨模型可执行的研究型工作流**：

- Codex 可以通过本地 skill、脚本、模板和验收工具执行；
- Claude 可以通过同一套 Markdown 指令包、模板和派发提示词执行；
- 用户可以把一本新书交给模型，按固定流程从 OCR 材料逐步生成 Obsidian 学习资料。

最终产物应支持：

1. 从 OCR / PDF / 页图 / 已清洗 Markdown 建立书籍项目；
2. 封版原始正文和原始 OCR，避免后续 agent 误改源文本；
3. 生成翻译、真实例句、学习卡片、学习单元等派生层；
4. 对每一步做可追踪验收；
5. 避免文件散落、近似重名目录、漏练习页、代码格式回潮等问题。

## 2. 背景经验

《В мире людей 阅读口语 Markdown版》项目证明了这条路线是可行的：

- 全书 OCR 和章节 Markdown 已封版；
- 30 篇阅读文本已生成学习单元；
- 每篇学习单元包含原书任务、选择题、练习、原文、中俄对照、主题理解、长难句、真实例句、卡片入口；
- 多 agent 可以承担大体力活，Codex 负责调控、验收和修正提示词；
- `learning-unit-template.md` 的格式思路可复用。

同时也暴露了问题：

- 模板被写进了近似重名目录 `В мире люди...`，而正式目录是 `В мире людей...`；
- 单纯模板无法保证流程正确；
- agent 容易只处理正文页，漏掉下一页选择题或激活练习；
- Claude/Codex 都可能把俄语句子错误包成代码格式；
- 完成报告不能替代实际验收。

因此，下一版必须同时包含 **流程、模板、验收、路径校验和跨模型提示词**。

## 3. 推荐形态

采用三层结构。

### 3.1 跨模型工作流包

这是所有模型都能读懂的核心。

放在每个书籍项目的 `_harness/` 目录下，包含：

- 项目总则；
- source of truth；
- agent 角色；
- 执行流程；
- 验收标准；
- 交付格式；
- 学习单元标准；
- Claude/Codex 派发提示词；
- 风险和恢复策略。

Claude 主要使用这一层。

### 3.2 Codex Skill

Codex skill 是“通用启动器”和“流程守门员”。

它不存放某一本书的具体内容，而是指导 Codex：

- 如何初始化新书项目；
- 如何复制 harness 模板；
- 如何检查路径；
- 如何派发 Claude/Codex agent；
- 如何运行验证脚本；
- 如何验收和修复。

### 3.3 项目内模板与脚本

每本书的项目内应有：

- `学习单元/_templates/learning-unit-template.md`
- `_harness/`
- `_data/`
- `质量报告/`
- `索引/`
- `原始OCR/`
- `章节/`
- `翻译版/`
- `卡片草稿/`
- `学习单元/`

模板是格式，harness 是流程，脚本是守门。

## 4. Skill 名称和触发

建议 Codex skill 名称：

`ocr-book-to-learning-units`

触发场景：

- 用户说“我导入了一本 OCR 书，帮我做成 Obsidian 学习资料”；
- 用户说“把这本 PDF/OCR 转成像 В мире людей 那样的学习单元”；
- 用户说“为一本书建立 agent harness / Claude prompt / 学习单元模板”；
- 用户说“让 Claude 批量生成学习单元，Codex 负责验收”；
- 用户说“复用上次俄语阅读书项目流程”。

## 5. Codex Skill 目录设计

建议目录：

```text
~/.codex/skills/ocr-book-to-learning-units/
├── SKILL.md
├── references/
│   ├── project-flow.md
│   ├── harness-files.md
│   ├── agent-roles.md
│   ├── acceptance-checklist.md
│   ├── claude-dispatch-prompts.md
│   └── failure-modes.md
├── assets/
│   ├── learning-unit-template.md
│   └── harness-template/
│       ├── 00-project-charter.md
│       ├── 01-source-of-truth.md
│       ├── 02-agent-roles.md
│       ├── 03-workflows.md
│       ├── 04-acceptance-criteria.md
│       ├── 05-delivery-format.md
│       ├── 06-parallel-dispatch.md
│       ├── 07-recovery-policy.md
│       ├── 08-master-prompt.md
│       ├── 09-agent-dispatch-cards.md
│       └── 10-learning-unit-standard.md
└── scripts/
    ├── check_project_root.py
    ├── find_near_duplicate_dirs.py
    ├── validate_learning_units.py
    ├── scan_markdown_style.py
    └── summarize_learning_units.py
```

## 6. SKILL.md 应保持简短

`SKILL.md` 不应塞入全部细节。它只负责：

1. 判断什么时候使用本 skill；
2. 说明总流程；
3. 指示 Codex 根据任务阶段读取哪个 reference；
4. 提醒必须运行路径校验和学习单元验收；
5. 强调 Claude 兼容模式。

详细规则放到 `references/`。

## 7. 跨模型流程

### Stage 0: Intake

目标：确认输入材料和唯一项目根目录。

输入可能包括：

- PDF；
- OCR markdown；
- 页图；
- 已清洗章节；
- 词库；
- 已有翻译；
- 用户想要模仿的样章。

必须生成：

- project root；
- 输入文件清单；
- source of truth；
- 禁止修改区；
- 初始风险清单。

关键校验：

- 项目根目录只能有一个；
- 检测近似重名目录；
- 所有 agent 必须使用绝对路径；
- 不允许创建近似拼写的新目录。

### Stage 1: Source Sealing

目标：把原始文本层封住。

标准目录：

```text
原始OCR/
章节/
索引/
质量报告/
README.md
封版说明.md
```

封版后：

- 不允许普通生成 agent 修改；
- 只允许 source-maintenance 任务在明确授权下修补；
- 所有派生资料必须引用 source，而不是改 source。

### Stage 2: Quality Map

目标：建立页码质量地图。

每页标记：

- GOOD；
- REVIEW；
- POOR；
- UNRECOVERABLE；
- AI / generated appendix；
- handwritten / user annotation。

用途：

- 生成学习单元时显示 OCR 风险；
- 指导人工复核优先级；
- 防止 agent 把不可靠 OCR 当确定正文。

### Stage 3: Text Range Map

目标：确定每篇文章的完整范围。

每篇阅读文本应记录：

- 正文页；
- 选择题页；
- 激活练习页；
- 词汇练习页；
- 转述练习页；
- 口语任务页；
- 是否有表格或双栏；
- 是否需要页图复核。

这是防止漏下一页练习的核心。

### Stage 4: Derived Layers

派生层可以并行生成，但必须彼此解耦。

推荐 agent：

- Agent A: Real Source Example Matcher；
- Agent B: Chinese Translation Builder；
- Agent C: Obsidian Card Builder；
- Agent D: Quality Gate；
- Agent E: Learning Unit Builder。

### Stage 5: Learning Unit Build

每篇文章一个 Markdown 文件。

必备结构：

1. `0. 元信息`
2. `1. 原书任务`
3. `1.1 选择题`
4. `1.2 激活练习 / 词汇练习 / 口语任务`
5. `2. 俄语原文`
6. `3. 中俄对照`
7. `4. 主题理解`
8. `5. 长难句与语法解析`
9. `6. 词汇匹配与真实例句`
10. `7. 学习卡片入口`
11. `8. 本文学习建议`
12. `9. 后续待完善`

格式要求：

- 普通俄语词句不用代码格式；
- 匹配词用加粗高亮；
- 风险用 callout；
- 不复制手写答案；
- 推断答案不得伪装为原书答案；
- 缺翻译、缺例句、OCR 不确定时标 `needs_review`。

### Stage 6: Review Gate

Codex 或 reviewer 必须实际检查文件，而不是只看完成报告。

最低检查：

- 文件是否存在；
- 必备章节是否齐全；
- source pages 是否覆盖练习页；
- 是否残留代码格式；
- 是否有 TODO / PLACEHOLDER；
- 是否错误使用 AI appendix；
- 是否写错项目目录；
- validator 是否通过；
- 高风险页是否显式标注。

### Stage 7: Cleanup And Final Index

收尾任务：

- 合并散落报告；
- 清理近似重名目录；
- 写项目总入口；
- 写成果地图；
- 写最终验收报告；
- 保留 `REVIEW` 风险，而不是强行 PASS。

## 8. Claude 兼容方式

Claude 不需要安装 Codex skill，也能执行这套流程。

为 Claude 提供：

1. `_harness/08-master-prompt.md`
2. `_harness/09-agent-dispatch-cards.md`
3. `_harness/10-learning-unit-standard.md`
4. `学习单元/_templates/learning-unit-template.md`
5. 当前批次的明确 scope；
6. 完成报告格式。

Claude 的工作方式：

- 读 harness；
- 按 dispatch card 工作；
- 只写指定输出目录；
- 生成 batch report；
- 停下来等待 Codex / 用户验收。

Codex 的工作方式：

- 制定 scope；
- 发 Claude prompt；
- 收报告；
- 直接验文件；
- 修 prompt；
- 决定下一批。

## 9. 必须防范的失败模式

### 9.1 近似重名目录

案例：

```text
В мире людей 阅读口语 Markdown版
В мире люди 阅读口语 Markdown版
```

解决：

- 所有 agent prompt 使用绝对路径；
- 每次批量前运行 `check_project_root.py`；
- 每次批量后运行 `find_near_duplicate_dirs.py`。

### 9.2 只抓正文页

解决：

- 强制建立 text range map；
- 学习单元必须覆盖正文 + 选择题 + 练习 + 口语任务；
- source pages 不完整时不能 PASS。

### 9.3 把手写答案当原书答案

解决：

- 页图中手写内容默认是用户批注；
- 除非明确要求提取手写批注，否则不得纳入原书题目。

### 9.4 代码格式回潮

解决：

- 俄语词句不用反引号；
- `scan_markdown_style.py` 扫描反引号；
- 风险标签用加粗或属性，不用代码格式。

### 9.5 完成报告幻觉

解决：

- Codex 验收必须读取实际文件；
- 抽样页图；
- 验证必备章节；
- 保存验收记录。

## 10. 最小可行版本

第一版不需要把所有脚本都做到完美。

MVP 应包含：

- Codex skill skeleton；
- `learning-unit-template.md`；
- harness template；
- Claude master prompt；
- `validate_learning_units.py`；
- `find_near_duplicate_dirs.py`；
- 一份从《В мире людей》抽象出的 example。

不进入 MVP：

- 自动 OCR；
- 自动 PDF 图像识别；
- 自动翻译模型集成；
- 自动生成答案；
- 自动导入 Obsidian 正式库。

## 11. 验收标准

这个 skill / workflow 设计通过验收，当它可以支持以下场景：

1. 用户给出一本已经 OCR 的书；
2. Codex 能初始化项目 harness；
3. Claude 能按 dispatch prompt 生成一批学习单元；
4. Codex 能用脚本和人工抽查验收；
5. 路径错误、漏练习页、代码格式、source 修改都能被发现；
6. 所有不确定性保留为 `REVIEW` / `needs_review`。

## 12. 建议下一步

下一步不是继续生成书籍内容，而是创建 skill 的第一版：

1. 创建 `~/.codex/skills/ocr-book-to-learning-units/`；
2. 写最小 `SKILL.md`；
3. 从当前项目复制并泛化 `10-learning-unit-standard.md`；
4. 把 Claude 派发提示词整理成 `references/claude-dispatch-prompts.md`；
5. 把 `learning-unit-template.md` 移入 skill assets；
6. 写两个基础脚本：
   - `find_near_duplicate_dirs.py`
   - `validate_learning_units.py`
7. 用《В мире людей》项目反向测试一次。

这套流程应当保持“研究型”：允许 REVIEW，保留风险，不为了漂亮报告牺牲可追溯性。
