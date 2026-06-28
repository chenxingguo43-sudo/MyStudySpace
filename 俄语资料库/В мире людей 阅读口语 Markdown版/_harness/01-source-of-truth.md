---
title: "01 Source Of Truth"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - source-of-truth
---

# 01 Source Of Truth

## Formal Base Text

The following areas are formal source material and are read-only by default:

| Path | Role | Default Permission |
|---|---|---|
| `章节/*.md` | curated chapter text | read-only |
| `原始OCR/page_*.md` | page-level OCR trace | read-only |
| `索引/样章索引.md` | navigation and page index | read-only |
| `质量报告/*.md` | historical quality reports | append-only |
| `README.md` | project entry point | read-only |
| `封版说明.md` | sealed-state statement | read-only |
| `_harness/*.md` | operating protocol | read-only except harness-update tasks |

## Derived Artifact Areas

Agents may write only to their assigned derived areas:

| Area | Intended Owner | Purpose |
|---|---|---|
| `_data/source_examples/` | Agent A | vocabulary-to-source-example matching |
| `翻译版/` | Agent B | Chinese translation and bilingual drafts |
| `卡片草稿/` | Agent C | Obsidian card drafts |
| `_data/checks/` | Agent D or validators | automated check outputs |
| `_work/` | any agent | temporary work products and scratch reports |

If an area does not exist, code-capable agents may create it.

## Page and Content Boundaries

Pages `1-166` are the original book material, including front matter, reading passages, tasks, tests, keys, and methodological comments.

Pages `167-186` are an AI vocabulary appendix layer. They may be useful as a vocabulary aid, but they must not be cited as original reading text or used as real source examples from the book.

Known unrecoverable or weak-source pages must remain marked as such. Agents may use them for metadata or cautionary notes, but must not silently rewrite them into confident prose.

## Citation Requirements

Every derived item should include as much source metadata as available:

- source chapter file;
- page or page range;
- section or text title;
- original Russian quote or anchor;
- generation status such as `candidate_high`, `needs_review`, `manual_verified`, or `blocked`.

If exact page information is unavailable, the agent must say so in the report instead of inventing a page number.

## Base Text Corrections

Base text corrections are a separate source-maintenance task. They require:

1. explicit authorization;
2. clear evidence from the PDF or raw OCR;
3. a localized edit;
4. updated quality notes;
5. validator run after the edit.

Normal Agent A/B/C/D tasks must not perform source-maintenance edits.

