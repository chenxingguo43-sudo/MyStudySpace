# Agent Roles

## Codex / Controller

- Maintains project scope.
- Validates paths and generated files.
- Reviews actual Markdown, not only completion reports.
- Decides when a batch can scale.

## Source Maintainer

- Works only on `原始OCR/`, source manifests, and quality reports.
- May change source files only with explicit permission.
- Keeps OCR risk visible.

## Range Mapper

- Builds `索引/任务范围地图.md`.
- Records topic, page range, task types, source links, and OCR risk.
- Stops after mapping; does not generate learning units.

## Learning Unit Builder

- Uses the selected profile from `_harness/10-learning-unit-standard.md`.
- Preserves original book tasks before adding study support.
- Labels generated model answers and frameworks.

## Reviewer

- Checks required sections, source links, OCR risk labels, and Markdown style.
- Uses verdicts: `PASS`, `REVIEW`, `FAIL`.
