---
type: "report"
project: "В мире людей 阅读口语 Markdown版"
agent: "Agent C"
report_type: "skipped_items"
generated_at: "2026-06-20"
---

# Skipped Items Report

## Items Intentionally Skipped

### 1. Already-Carded Texts (29 cards in manifest_batch_2026-06-20)

These texts were covered by the earlier manifest batch and are NOT duplicated:

| Text | Existing Cards | Reason |
|------|---------------|--------|
| Текст 1.1.1 Достопримечательности Мурома | article, theme (vml-1-1-1) | Covered by manifest_batch |
| Текст 1.1.2 Красноярские Столбы | article, theme, vocab (vml-1-1-2) | Covered by manifest_batch |
| Текст 1.4.1 Отец Байконура | article, theme, 2 vocab (vml-1-4-1) | Covered by manifest_batch |
| Текст 1.4.2 Пересадка головы | article, theme, vocab (vml-1-4-2) | Covered by manifest_batch |
| Текст 2.1.1 Новая российская столица | article, theme, 2 vocab, task (vml-2-1-1) | Covered by manifest_batch |
| Текст 3.1.1 Алмазная колесница | article, 2 theme, 2 vocab, task (vml-3-beginning) | Covered by manifest_batch |
| Текст 3.5.1 Шестой дозор | theme, 2 vocab (vml-3-ending) | Covered by manifest_batch |
| Текст 3.5.2 Альтист Данилов | article, 2 task (vml-3-ending) | Covered by manifest_batch |

### 2. Excluded Chapters (per manifest specification)

| Chapter | Reason |
|---------|--------|
| методический-комментарий.md | Methodology commentary — not reading text; excluded per manifest |
| приложение-лексика.md | AI vocabulary appendix (pages 167-186) — not original book text; excluded per manifest |

### 3. Excluded Page Ranges

| Pages | Reason |
|-------|--------|
| 52-54 | Unrecoverable matrix pages — only graphic noise |
| 95-98 | Unrecoverable matrix pages — only graphic noise |
| 155-160 | Unrecoverable matrix pages — only graphic noise |
| 167-186 | AI vocabulary appendix — not original reading text |

### 4. Excluded Text Sections (within included chapters)

| Section | Chapter | Reason |
|---------|---------|--------|
| Лексико-грамматический тест Раздел 1 (pages 41-51) | раздел2-начало.md | Test belongs to Section 1, not to the Section 2 carding scope; individual test items not carded — only the section 2 test framework is included under full-05 |
| Текст 3.1.2 Обыкновенная история | раздел3-начало.md | Not listed in manifest item full-06; belongs to texts not explicitly requested |
| Текст 3.3.2 Герой нашего времени | раздел3-завершение.md | Not listed in manifest item full-07; belongs to texts not explicitly requested |
| Текст 2.3.2 Деловая переписка | раздел2-завершение.md | Article carded as part of 2.2.2 (combined business documents theme); no separate article |
| Текст 2.4.2 Информационные письма | раздел2-завершение.md | Combined with business documents theme; no separate article |
| Текст 2.5.2 Письмо-благодарность | раздел2-завершение.md | Combined with business documents theme; no separate article |

### 5. Deprecated Translation Files (NOT used)

Per translation_manifest_2026-06-20.json:

| Deprecated File | Reason |
|-----------------|--------|
| full_run_2026-06-20/part3_section3/section3-beginning-zh-aligned.md | Replaced by repair version |
| full_run_2026-06-20/part3_section3/section3-ending-zh-aligned.md | Replaced by repair version |
| full_run_2026-06-20/part3_section3/section3-keys-test-zh-aligned.md | Replaced by repair version |
| full_run_2026-06-20/part1_front_and_section1/предисловие.zh.md | Replaced by repair version |
| full_run_2026-06-20/part1_front_and_section1/раздел1-продолжение.zh.md | Replaced by repair version |

All deprecated files were correctly excluded. Only canonical (repair) versions were used for those chapters.

## Summary

| Category | Count |
|----------|-------|
| Already-carded texts (not duplicated) | 8 texts |
| Excluded chapters | 2 |
| Excluded page ranges | 3 ranges |
| Omitted text sections within included chapters | 6 |
| Deprecated translation files avoided | 5 |
| **Total items skipped for valid reasons** | **24** |
