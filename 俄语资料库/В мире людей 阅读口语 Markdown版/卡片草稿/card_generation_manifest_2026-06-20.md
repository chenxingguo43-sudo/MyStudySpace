---
title: "Card Generation Manifest 2026-06-20"
type: "card-generation-manifest"
project: "В мире людей 阅读口语 Markdown版"
status: "draft"
tags:
  - 俄语/阅读
  - cards
  - manifest
---

# Card Generation Manifest 2026-06-20

## Purpose

This manifest defines a bounded broader card-generation batch after Agent C2 pilot review.

It intentionally avoids unbounded full-book card generation. Only listed source blocks may be used.

## Global Rules

- Output must remain under `卡片草稿/manifest_batch_2026-06-20/`.
- Do not modify sealed source files, translation files, or previous pilot folders.
- Preserve source metadata on every card.
- Separate original Russian, Chinese translation, source examples, and generated notes.
- Preserve visible caution blocks for all `review_allowed` items.
- Do not use pages `167-186` as original reading text.
- Do not create cards from unrecoverable matrix pages.

## Allowed Status Values

| Status | Meaning | Card Generation Rule |
|---|---|---|
| `PASS` | Reviewed and structurally clean enough for draft cards. | Generate normal draft cards. |
| `repaired_pass` | Repair reviewed and blocker removed. | Generate draft cards, keep source cautions. |
| `review_allowed` | Useful but not fully clean. | Generate only if caution is visible in card frontmatter and note block. |
| `blocked` | Not suitable for cards now. | Do not generate. |

## Included Source Blocks

| id | source_file | source_pages | source_anchor | translation_file | translation_status | review_reason | ocr_caution | allowed_card_types |
|---|---|---|---|---|---|---|---|---|
| vml-2-1-1 | `章节/раздел2-начало.md` | 56 | `Текст 2.1.1` | `翻译版/agent_b_pilot_2026-06-20/Текст_2.1.1_Новая_российская_столица_aligned.md` | `PASS` | Agent B pilot PASS; Agent C2 schema validated. | Page 56 quotation zones include `<…>` omission/source caution. | article, theme, vocabulary, task |
| vml-1-1-1 | `章节/предисловие.md` | 8-10 | `Текст 1.1.1` | `翻译版/repair_2026-06-20/part1_front_and_section1/предисловие.zh.md` | `review_allowed` | Repaired from incomplete/structure-only draft; still has OCR/layout risk. | Double-column page and source reconstruction cautions remain. | article, theme, vocabulary |
| vml-1-1-2 | `章节/предисловие.md` | 11-13 | `Текст 1.1.2` | `翻译版/repair_2026-06-20/part1_front_and_section1/предисловие.zh.md` | `review_allowed` | Repaired from incomplete/structure-only draft; proper names and source quality need review. | Double-column page and source reconstruction cautions remain. | article, theme, vocabulary |
| vml-1-4-1 | `章节/раздел1-продолжение.md` | 26-28 | `Текст 1.4.1` | `翻译版/repair_2026-06-20/part1_front_and_section1/раздел1-продолжение.zh.md` | `review_allowed` | Repaired from incomplete/structure-only draft; aerospace terminology needs review. | OCR/layout and terminology cautions remain. | article, theme, vocabulary |
| vml-1-4-2 | `章节/раздел1-продолжение.md` | 29-31 | `Текст 1.4.2` | `翻译版/repair_2026-06-20/part1_front_and_section1/раздел1-продолжение.zh.md` | `review_allowed` | Repaired from incomplete/structure-only draft; medical terminology needs review. | OCR/layout and medical-term cautions remain. | article, theme, vocabulary |
| vml-3-beginning | `章节/раздел3-начало.md` | 99-118 | `Раздел 3 начало` | `翻译版/repair_2026-06-20/part3_section3/section3-beginning-zh-aligned.md` | `repaired_pass` | Machine-translation failure markers removed; OCR-risk warnings remain. | Pages 99 and 117 retain needs_review cautions. | article, theme, vocabulary, task |
| vml-3-ending | `章节/раздел3-завершение.md` | 119-138 | `Раздел 3 завершение` | `翻译版/repair_2026-06-20/part3_section3/section3-ending-zh-aligned.md` | `repaired_pass` | Machine-translation failure markers removed; OCR-risk warnings remain. | Pages 125, 130, and 134 retain needs_review cautions. | article, theme, vocabulary, task |

## Excluded For This Batch

| source | reason |
|---|---|
| `章节/раздел2-тест.md` | Dense test/matrix material; alignment rules not yet card-safe. |
| `章节/раздел3-ключи-тест.md` | Keys and tests are dense; use later after task-card policy is stricter. |
| `章节/методический-комментарий.md` | Methodology comments need separate card strategy. |
| `章节/приложение-лексика.md` | AI vocabulary appendix layer, not original reading text. |
| pages 52-54, 95-98, 155-160 | Unrecoverable or matrix-heavy pages. |
| pages 167-186 | AI appendix; not original reading text. |

## Batch Size Guidance

For each included block:

- create at most 1 article card;
- create at most 2 theme cards;
- create at most 3 vocabulary/example cards using exact source examples where available;
- create task cards only when the source block includes a clear reading strategy or exercise pattern.

Target batch size: 25-45 cards total.

