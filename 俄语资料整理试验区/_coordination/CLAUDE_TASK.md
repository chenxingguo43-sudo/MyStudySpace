---
type: claude-task
status: active
updated_by: codex
---

# Claude Code 协作任务

## 当前目标

继续俄语资料坐标化项目。你每完成一个阶段后，必须读取并遵守：

`D:\MyStudySpace\俄语资料整理试验区\_coordination\CODEX_REVIEW.md`

如果其中状态为 `REQUEST_CHANGES`，必须先按 Codex 的验收意见修复，再重新自验。只有状态为 `PASS`，或明确没有新的 Codex 反馈时，才可以进入下一阶段。

## 当前需要修复

当前 `diag-0018` package 未通过 Codex 验收。请优先读取 `CODEX_REVIEW.md`，按其中问题修复或更换资料。

## 硬性规则

- 不要修改 `vocabulary.html`、`reader.html`、`reader-prototype.html`、`index.html`、`server.js`、`package.json`。
- 默认不要修改正式 `data/*.json`，只做 source package 和 dry-run。
- 如果需要正式导入，必须先 dry-run 通过并等待确认。
- 所有中文报告使用 UTF-8 BOM。
- 完成后更新 `CLAUDE_STATUS.md`，写清楚产物、验证结果、git status。


