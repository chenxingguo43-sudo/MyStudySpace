# Skill v3 自动目标模式报告

日期：2026-06-21

## 目标

将 `ocr-book-to-learning-units` 从“下一步规划 + 批次验收”的 v2，升级为 Codex / Claude 都可读取并独立执行的 v3 自动目标模式。

v3 的核心目标是：用户给出整本书整理目标后，Agent 可以按照同一套 skill 规则持续推进，直到项目封板或遇到真实阻塞。

## 本次升级内容

- 更新 `SKILL.md`
  - 增加 Goal Mode 入口。
  - 明确本 skill 是 model-portable，Codex 和 Claude 都可使用。
  - 明确 whole-book goal 不应停在单批建议，而应持续执行到 sealed 或 blocked。

- 新增 `references/autonomous-goal-mode.md`
  - 定义自动状态循环：plan → execute → validate → repair → continue。
  - 定义各阶段动作：source base、range map、learning units、finalization、sealed。
  - 定义批次规则、验证命令、阻塞条件、跨 Agent 行为和完成标准。

- 更新 `references/claude-dispatch-prompts.md`
  - 新增 Whole-Book Autonomous Goal 提示词。
  - Claude 可用该提示词读取同一套 skill 并独立跑完整本书。

- 更新 `references/project-flow.md`
  - 增加 Stage 7: Autonomous Seal Check。

- 更新 `agents/openai.yaml`
  - 说明该 skill 可从 source intake 跑到 validation、repairs、final seal。

## 验证结果

### Skill 结构验证

命令：

```bash
python C:\Users\梅子\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\梅子\.codex\skills\ocr-book-to-learning-units
```

结果：

```text
Skill is valid!
```

### 当前项目 planner

命令：

```bash
python C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\scripts\plan_next_batch.py D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版 --json
```

结果：

```text
stage = sealed
topics_expected = 19
topic_units_found = 19
```

### 学习单元验证

命令：

```bash
python C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\scripts\validate_learning_units.py D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版 --pattern "Тема *.md"
```

结果：

```text
files_checked=19
findings_count=0
PASS
```

### Source base 验证

命令：

```bash
python C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\scripts\validate_source_base.py D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版
```

结果：

```text
declared_page_count=292
page_files=292
missing_pages=[]
extra_pages=[]
PASS
```

## 后续使用方式

给 Codex 或 Claude 的目标可以简化为：

```text
Use the installed skill `ocr-book-to-learning-units`.

Project root:
D:\MyStudySpace\俄语资料库\[项目名]

Goal:
Complete this OCR/PDF book project as an Obsidian learning-unit library until final seal.

Read skill/references/autonomous-goal-mode.md and follow the planner/validator loop until sealed or genuinely blocked.
```

## 当前结论

v3 已可作为跨模型自动化流程使用。

注意：真正的“无人值守”仍取决于当前 Agent 是否拥有文件系统访问、可运行脚本、可长期执行任务。skill 本身已经提供了自动循环规则和验收标准。
