---
title: "10 Learning Unit Standard"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v1.0-learning-units"
tags:
  - harness
  - learning-unit
  - obsidian
---

# 10 Learning Unit Standard

This file defines the target format for article-centered learning units under `学习单元/`.

The purpose is to turn the sealed book conversion and derived agent outputs into readable study notes: one reading text, one complete Markdown learning unit.

## Core Principle

A learning unit is not a data dump, a translation-only file, or a card batch.

It must let the learner study one full article in context:

1. what the original task asks;
2. what the full Russian text says;
3. how the Chinese translation aligns with it;
4. what the article is about;
5. which grammar and long sentences matter;
6. which vocabulary items match real book examples;
7. which Obsidian cards continue the review work.

## Scope Rule

Always collect the full article scope, not only the article's first page.

For example:

- if the text body is on page 56;
- but post-text multiple-choice questions are on page 57;
- and activation exercises are on page 58;
- then the learning unit scope is pages 56-58.

Do not silently omit exercises because they appear after the article page.

## Required Sections

Use this section order by default:

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

If a source article has no speaking task or no activation exercise, keep the section only when useful and explicitly state that no such task was found in the source pages.

## Metadata

Every learning unit must include frontmatter with at least:

```yaml
title: "<text number and title>"
type: "learning-unit"
project: "В мире людей 阅读口语 Markdown版"
source_file: "章节/<chapter-file>.md"
source_pages: "<full page range>"
source_anchor: "<chapter anchor if available>"
translation_source: "<translation file or none>"
example_source: "<source-example file or none>"
card_source: "<card directory or none>"
status: "draft" # or sample_learning_unit / reviewed
review_status: "draft_needs_review" # or pass / needs_review
tags:
  - 俄语/阅读
  - learning-unit
```

## Markdown Style

The output is a readable Obsidian Markdown note.

Required style:

- Russian sentences and vocabulary should normally use plain text or bold Markdown.
- Matched vocabulary forms inside examples must be highlighted with bold Markdown.
- Use callouts for source risk, OCR risk, and review notes.
- Use tables only when they improve readability.
- Use wikilinks for stable local references.

Forbidden style:

- Do not wrap normal Russian sentences or words in code formatting.
- Do not use code blocks for grammar explanation.
- Do not create oversized catch-all tables when prose is clearer.
- Do not hide source risk in completion reports only.

## Original Exercises

Learning units must include original post-text exercises when present.

Minimum exercise coverage:

- original task instruction;
- multiple-choice comprehension questions;
- activation exercises;
- vocabulary or word-formation exercises;
- paraphrase tasks;
- speaking tasks.

When OCR and the cleaned chapter disagree, check the raw OCR and page image if available.

If page images contain handwriting, treat handwriting as learner notes, not original book content. Do not copy handwritten answers unless explicitly asked.

## Chinese Translation

Use aligned Chinese translation when available.

Translation expectations:

- preserve paragraph or task-block alignment;
- do not merge unrelated paragraphs;
- keep source uncertainty visible;
- retain `<…>` or other omission markers when the Russian source is incomplete;
- mark missing translation blocks as `needs_review`.

If no translation exists, the learning unit may still be created, but the translation section must state that translation is missing and must not pretend to be complete.

## Long Sentences And Grammar

The grammar section should support reading, not become a textbook chapter.

Each item should include:

- the original sentence in readable Markdown;
- the core structure;
- a short Chinese explanation;
- the reading value of the structure in this article.

Prefer this pattern:

```markdown
### 5.1 Москву надо не расширять, а расселять.

**原句：** **Москву надо не расширять, а расселять.**

**结构：**

- **надо + инфинитив**：需要/应该做某事。
- **не A, а B**：不是 A，而是 B。

**理解：**

不是“扩大莫斯科”，而是“疏解莫斯科”。这句话是全文立场的压缩表达。
```

## Vocabulary And Real Examples

Use Agent A output when available.

Requirements:

- every example must keep source traceability;
- matched forms must be highlighted in bold;
- exact matches can be high confidence;
- morphology-expanded matches must show method and confidence;
- uncertain matches must be marked `needs_review`;
- pages `167-186` must not be used as original reading examples.

## Card Links

Use Agent C outputs when stable card files exist.

Link cards by type:

- article card;
- theme card;
- vocabulary cards;
- task cards.

Do not fabricate links to missing cards. If useful cards are missing, list them under `9. 后续待完善`.

## PASS Criteria

A learning unit can pass review only if:

- full source page range is captured;
- original task and exercises are included or explicitly marked absent;
- Russian original is complete for the selected text;
- Chinese translation is aligned or missing blocks are marked;
- grammar notes use readable Markdown;
- vocabulary examples highlight matched forms;
- source metadata is present;
- OCR risks and generated-note risks are visible;
- no sealed base files were modified.

Use `REVIEW`, not `PASS`, when the unit is useful but has incomplete exercise recovery, OCR uncertainty, translation uncertainty, or missing card links.
