# Claude Handoff: В мире людей 阅读口语 Markdown Sample

## Role

You are taking over a Codex task. The user wants to turn the scanned/OCR PDF `В мире людей 阅读口语` into an Obsidian-friendly Markdown reading library. The user has Superpowers skills installed in Claude and wants you to continue using that workflow.

Use the existing implementation plan:

`D:\MyStudySpace\docs\superpowers\plans\2026-06-19-v-mire-lyudei-markdown-sample.md`

## User Goal

Build a 5-10 page sample first, not the full 186-page book yet. The sample should prove the final style before batch processing the full PDF.

The desired result is similar in spirit to:

`D:\MyStudySpace\俄语资料库\新编俄语语法 Markdown版`

That existing library is the style reference: cleaned Obsidian Markdown, clear chapter structure, indexes, source links, and readable text rather than raw OCR dumping.

## Key Requirements

1. Main reading layer should be organized by article/topic, not mechanically by PDF page.
2. Preserve page traceability. Every section or major paragraph should link back to raw OCR page files.
3. Use Russian paragraph + Chinese translation alternation.
4. Exercises, task instructions, tables, and prompts should be preserved but moved into collapsible Obsidian callouts so they do not interrupt reading.
5. Chinese text should remain faithful to the original book. Only fix OCR errors, broken lines, punctuation, and layout. Do not freely rewrite or polish the translation.
6. Russian text may be conservatively corrected. If a correction is inferred rather than obvious, record the original OCR fragment in the quality report.
7. Keep clean reading text clean. OCR doubts should go in a quality report, not scattered inline.
8. Produce a complete mini-library structure for the sample:
   - `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\章节\样章.md`
   - `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\原始OCR\page_XXX.md`
   - `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\质量报告\样章质量报告.md`
   - `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\索引\样章索引.md`
9. Add validation script:
   - `D:\MyStudySpace\俄语资料整理试验区\_data\validate_v_mire_sample_library.py`
10. First choose sample pages from good OCR pages. Prefer 5-10 coherent pages with typical reading + exercise content.

## Existing OCR Inputs

OCR root:

`D:\MyStudySpace\俄语资料整理试验区\_ocr\v_mire_lyudei_reading_speaking_full`

Important files:

- `full_ocr_combined.md`
- `full_ocr_summary.json`
- `quality_report.md`
- `text\page_001.txt` through `text\page_186.txt`
- `markdown\page_001.md` through `markdown\page_186.md`
- `images\page_XXX.png`
- `images\page_XXX_prep.png`

Known OCR summary:

- PDF pages: 186
- Good: 116 pages
- Needs review: 54 pages
- Poor: 16 pages

## Existing Plan

Read this before implementation:

`D:\MyStudySpace\docs\superpowers\plans\2026-06-19-v-mire-lyudei-markdown-sample.md`

The plan tasks are:

1. Create `select_v_mire_sample_pages.py` to choose the best sample window.
2. Create raw OCR traceability files for selected pages.
3. Draft cleaned reading sample.
4. Write sample quality report.
5. Create sample index.
6. Create and run validator.
7. Final review against success criteria.

## Success Criteria

The sample is ready for user review only when:

- It covers at least 5 and at most 10 pages.
- Reading flow is coherent and article/topic based.
- Russian and Chinese alternate clearly.
- Exercises are preserved in collapsible callouts.
- Each section can trace back to raw OCR.
- Raw OCR pages exist for every selected sample page.
- Quality report lists uncertain corrections and unresolved OCR issues.
- Index links to the sample, raw OCR pages, and quality report.
- Validator passes.

## Suggested Claude Workflow

Use Superpowers:

1. Use `superpowers:executing-plans` or equivalent to execute the saved plan.
2. Do not jump directly to the whole book.
3. Start by selecting sample pages and show the user which pages were chosen.
4. Then build the sample library.
5. Verify with the validator and manual file checks.
6. Ask the user to read the sample in Obsidian before scaling to all 186 pages.

## Notes From Codex

- The user cares more about final reading quality than token cost.
- They liked the previous `新编俄语语法 Markdown版` result because it reads smoothly and has strong Obsidian organization.
- Do not make a pure OCR dump.
- Do not over-polish or rewrite the Chinese translation.
- For Russian corrections, be conservative and document uncertainty.
- The current Codex session already fixed vocabulary card UI issues and OCR example matching; this handoff is only for the Markdown reading-library sample task.

