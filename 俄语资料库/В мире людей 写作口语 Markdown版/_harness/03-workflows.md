# Workflows

## Source Base Workflow

1. Verify `原始OCR/page_XXX.md` coverage.
2. Verify `_data/source_manifest.json`.
3. Check missing or visually inspected pages.
4. Write findings in `质量报告/`.

## Range Map Workflow

1. Read table of contents and nearby OCR pages.
2. Identify topic start and next topic start.
3. Split pages into preparation, input text, writing task, speaking task, lexical-grammar test, keys/commentary.
4. Record source links and OCR risk.
5. Stop before learning-unit generation.

## Pilot Unit Workflow

1. Select one topic with a clear page range.
2. Preserve original tasks from source pages.
3. Add study support after source content.
4. Mark all OCR uncertainty.
5. Review against `_harness/04-acceptance-criteria.md`.

## Batch Workflow

Batch work is allowed only after one pilot unit is reviewed.
