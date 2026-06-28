---
title: В мире людей 写作口语 Markdown版
status: source-sealed-base
source_id: raw-0015
---

# В мире людей 写作口语 Markdown版

这是 `В мире людей 写作与口语` 的正式整理底座，目前状态是 **source-sealed-base**。

本项目还不是完成版学习单元库。当前只完成了从 `raw-0015` 句子级 OCR 包到页级 Markdown 的重建，目的是给后续 Claude/Codex/多 agent 工作提供稳定、可追溯的原始材料。

## Source

- Source package: `raw-0015`
- Title: В мире людей 写作与口语
- PDF: `E:/Desktop/俄语资料文档整理\В мире людей写作与口语.pdf`
- Declared pages: 292
- OCR sentence records: 2958
- Pages with OCR records: 291
- Missing OCR pages: 292

## Project Structure

- `原始OCR/`: reconstructed page-level OCR files, `page_001.md` through `page_292.md`
- `索引/页码索引.md`: page coverage index
- `质量报告/底座检查报告.md`: base validation report
- `_data/source_manifest.json`: machine-readable source manifest
- `_harness/`: workflow and acceptance notes for later agents
- `章节/`: reserved for cleaned chapter Markdown
- `学习单元/`: reserved for writing/speaking learning units

## Next Stage

Recommended next stage: build a `writing-speaking` profile before generating learning units. This book should be organized around tasks, prompts, reusable expressions, response frames, model answers, speaking variants, and scoring risks rather than only around reading articles.
