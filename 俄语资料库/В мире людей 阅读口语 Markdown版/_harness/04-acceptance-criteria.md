---
title: "04 Acceptance Criteria"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - acceptance
---

# 04 Acceptance Criteria

## Status Labels

Use these labels consistently:

| Status | Meaning |
|---|---|
| `PASS` | Meets requirements and is ready for the next workflow stage. |
| `REVIEW` | Usable draft, but specific items need human or agent review. |
| `FAIL` | Does not meet requirements or may corrupt downstream work. |
| `BLOCKED` | Cannot proceed because required input, permission, or tool access is missing. |

## Universal PASS Criteria

A task can pass only if:

- output files exist in the assigned directory;
- formal base text was not modified;
- each artifact has source traceability appropriate to its type;
- unresolved uncertainty is documented;
- the completion report lists input range, output files, counts, and risks;
- no forbidden source area was used as confirmed evidence.

## Agent A PASS Criteria

Source-example matching passes when:

- every example has Russian sentence text;
- every example highlights or marks the matched word form;
- every example records lemma, matched form, source file, and page or page range when available;
- AI appendix pages `167-186` are excluded from real examples;
- suspected false positives are marked `needs_review` or removed;
- report includes matched count, unmatched count, review-needed count, and matching method.

Agent A should receive `REVIEW` if the output is useful but contains unverified morphological expansion, long noisy examples, or uncertain source boundaries.

Agent A should receive `FAIL` if false matches are treated as confirmed, source metadata is missing at scale, or sealed text was modified.

## Agent B PASS Criteria

Translation passes when:

- Russian source structure is preserved;
- Chinese translation aligns with the Russian at paragraph or task-block level;
- source pages or chapter anchors are retained;
- names, terms, and recurring labels are handled consistently;
- OCR-risk passages are marked;
- the translation report lists coverage and unresolved questions.

Agent B should receive `REVIEW` if some difficult passages need human checking but the overall structure is usable.

Agent B should receive `FAIL` if content is skipped silently, Russian text is rewritten, or translation is mixed into sealed chapters.

## Agent C PASS Criteria

Obsidian cards pass when:

- every card has source metadata;
- cards are placed under `卡片草稿/`;
- original text, translation, and agent-generated notes are visibly separated;
- tags and titles are consistent;
- cards are not overloaded beyond their learning purpose;
- a card-generation report lists counts by card type.

Agent C should receive `REVIEW` if card design is structurally sound but needs naming, tagging, or granularity cleanup.

Agent C should receive `FAIL` if cards lack sources, overwrite user notes, or present generated summaries as original text.

## Agent D PASS Criteria

Quality review passes when:

- reviewed files and sample sizes are listed;
- read-only area integrity is checked;
- findings are ordered by severity;
- each issue has a recommended next action;
- final verdict is one of `PASS`, `REVIEW`, `FAIL`, or `BLOCKED`;
- residual risk is stated plainly.

Agent D should not mark `PASS` if it did not inspect the relevant artifacts.

## Agent E PASS Criteria

Learning units pass when:

- every generated unit follows `_harness/10-learning-unit-standard.md`;
- the full source page range is captured, not only the article body page;
- original task instructions and post-text exercises are included or explicitly marked absent;
- Russian original text is complete for the selected article;
- Chinese translation is aligned when available, with missing or uncertain blocks marked;
- difficult-sentence notes use readable Markdown, not code formatting;
- vocabulary/source-example matches highlight matched forms in bold;
- source metadata, OCR risk, and generated-note risk are visible;
- card links point only to existing files or are listed as missing follow-up work;
- sealed base files were not modified.

Agent E should receive `REVIEW` if the unit is useful but has unresolved OCR risk, missing translation blocks, incomplete exercise recovery, or missing card links.

Agent E should receive `FAIL` if it silently skips exercises, uses pages `167-186` as original reading examples, loses source traceability, or presents generated content as original book content.

## Base Text Validator

When a task claims that the formal base text remains valid, code-capable agents should run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python 'D:\MyStudySpace\俄语资料整理试验区\_data\validate_v_mire_sample_library.py'
```

Expected output includes:

```text
PASS: 186 OCR files (pages 1-186), 11 chapters
=== FULL COVERAGE 1-186 ===
```

If the validator cannot be run, the agent must state that limitation.
