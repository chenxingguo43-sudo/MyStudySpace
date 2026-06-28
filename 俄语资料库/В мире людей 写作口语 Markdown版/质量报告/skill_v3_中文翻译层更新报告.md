# Skill v3 中文翻译层更新报告

日期：2026-06-21

## 背景

对比“В мире людей 阅读口语 Markdown版”，当前“写作口语 Markdown版”的自动化流程缺少一个正式的中文翻译 / 中文对照阶段。

本次将中文翻译作为 `ocr-book-to-learning-units` 的可选但正式 derived layer 接入 v3 自动目标模式。

## 更新内容

- 新增 `references/translation-layer.md`
  - 定义中文翻译是 derived layer，不是原书内容。
  - 规定输出目录为 `翻译/`。
  - 规定每个主题/单元生成独立中文对照文件。
  - 要求 AI 翻译默认标记 `needs_review`。
  - 明确不得把完整翻译放入 `原始OCR/`、`章节/` 或 `> [!note] 原书内容`。

- 更新 `SKILL.md`
  - 当目标包含 Chinese translation / bilingual reading / 中文对照 / 中文精译 / translation polish 时，必须读取 `translation-layer.md`。

- 更新 `autonomous-goal-mode.md`
  - 若用户目标要求中文翻译，则将翻译覆盖视为必需 derived layer。
  - 在 finalization 前生成 `翻译/` 文件与 translation batch report。

- 更新 `project-flow.md`
  - Stage 4 Derived Layers 中明确中文翻译需单独成层。

- 更新 `claude-dispatch-prompts.md`
  - Whole-Book Autonomous Goal 提示词加入翻译层要求。

- 更新 `acceptance-checklist.md`
  - 新增 Translation Layer 验收项。

## 验证

Skill 结构验证：

```text
Skill is valid!
```

新增引用检查：

```text
SKILL.md -> references/translation-layer.md
autonomous-goal-mode.md -> translation layer required when requested
claude-dispatch-prompts.md -> Whole-Book Autonomous Goal includes translation condition
acceptance-checklist.md -> Translation Layer checklist exists
```

## 后续用法

以后若需要全流程带翻译，目标可以写为：

```text
Use the installed skill `ocr-book-to-learning-units`.

Project root:
D:\MyStudySpace\俄语资料库\[项目名]

Goal:
Complete this OCR/PDF book project as an Obsidian learning-unit library, including a separate Chinese bilingual translation layer, until final seal.

Read skill/references/autonomous-goal-mode.md and skill/references/translation-layer.md. Follow the planner/validator loop until sealed or genuinely blocked.
```

## 结论

中文翻译层已成为 skill v3 的正式可选目标。若用户明确要求中文对照/中文精译，Codex 或 Claude 应在封板前生成并验收 `翻译/` 层。
