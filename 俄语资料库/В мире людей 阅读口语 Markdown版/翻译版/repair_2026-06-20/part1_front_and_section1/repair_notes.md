# Repair Notes: Agent B-R1 Part 1 Recovery

## Repaired Files

| File | Source | Repaired sections |
|---|---|---|
| `предисловие.zh.md` | `章节/предисловие.md` | `Текст 1.1.1 — Достопримечательности Мурома`; `Текст 1.1.2 — Красноярские Столбы — заповедник скалолазов` |
| `раздел1-продолжение.zh.md` | `章节/раздел1-продолжение.md` | `Текст 1.4.1 — Отец Байконура`; `Текст 1.4.2 — Пересадка головы: от фантастики к реальности` |

## What Was Repaired

- Replaced structure-only summaries for pages 8-10, 11-13, 26-28, and 29-31 with full paragraph-aligned RU/ZH translation blocks.
- Restored exact task wording for `Текст 1.4.1` and `Текст 1.4.2` from the sealed source instead of the earlier generalized task summaries.
- Preserved source metadata, page ranges, anchors, and original Russian paragraph order.
- Changed the affected section metadata from `status: needs_review` to `status: repaired_needs_review` to show that the incomplete-body issue was repaired while review cautions remain.

## Remaining Review-Only Items

- `предисловие.zh.md` pages 8-10 and 11-13 still keep `needs_review` warnings because the source chapter notes double-column/OCR risk on pages 8 and 11. The repaired translation should be checked for names, museum-item terms, and climbing-culture terms before formal promotion.
- `раздел1-продолжение.zh.md` pages 26-31 still keep `needs_review` warnings for manual terminology review: aerospace design bureau names, proper names, medical transplant terms, and sensitive scientific phrasing.
- Inherited review markers outside the repair focus were not changed:
  - `предисловие.zh.md` page 4/front-matter warning.
  - `раздел1-продолжение.zh.md` pages 38-40 answer-key/OCR warning.
- No source text was invented. All repaired Russian blocks were taken from the sealed `章节/` files.
