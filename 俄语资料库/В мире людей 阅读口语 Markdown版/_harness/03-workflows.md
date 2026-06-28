---
title: "03 Workflows"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - workflow
---

# 03 Workflows

## Universal Workflow

Every task follows this sequence:

1. read mandatory harness and source files;
2. restate the assigned role, scope, input, output, and forbidden areas;
3. inspect the current output directory;
4. run a small sample when the task is new or risky;
5. produce artifacts in the assigned derived directory;
6. run available validation checks;
7. write a completion report;
8. stop and wait for review before formal integration.

## Agent A Workflow: Source Example Matching

1. Load the vocabulary source requested by the dispatch prompt.
2. Load chapter text from `章节/`.
3. Exclude `章节/приложение-лексика.md` and all AI appendix pages `167-186` from real example matching.
4. Extract candidate sentences from original reading passages and relevant prose.
5. Filter out task instructions when the goal is reading examples.
6. Match vocabulary entries with a conservative method first.
7. Mark each matched form in the Russian sentence.
8. Save machine-readable output under `_data/source_examples/`.
9. Save a human-readable review report under `_data/source_examples/`.
10. Report unmatched words and suspected false positives separately.

Default matching ladder:

1. `exact-only`: required for pilots and safest for first production passes.
2. `verified-morphology`: allowed only when the agent can explain the form relationship.
3. `rough-stem` or substring matching: review-only, never high-confidence by default.

Recommended confidence labels:

- `candidate_high`: exact or verified morphological match;
- `needs_review`: possible match but not safe enough;
- `rejected`: identified false match;
- `manual_verified`: checked by human or source image.

## Agent B Workflow: Translation

1. Select the chapter or page range assigned by the dispatch prompt.
2. Preserve the Russian original structure.
3. Translate in aligned blocks.
4. Keep names, titles, quotations, and task labels traceable.
5. Build or update a local term list.
6. Mark uncertain OCR-risk passages.
7. Save translation Markdown under `翻译版/`.
8. Save a translation report with coverage, risks, and open questions.

Default translation mode:

- faithful and readable Chinese;
- no full stylistic rewrite unless requested;
- no deletion of exercise instructions;
- no hidden merging of multiple Russian paragraphs into one Chinese paragraph.

## Agent C Workflow: Obsidian Cards

1. Read the assigned source chapters and available derived outputs.
2. Decide card type: article, theme, vocabulary, task, or mixed index.
3. Create cards in the relevant `卡片草稿/` subfolder.
4. Add source metadata and tags.
5. Use callouts or sections to separate original text, translation, notes, and generated summary.
6. Link related cards with wikilinks where stable names are available.
7. Save a card-generation report.

Card size guidance:

- one card should support one focused learning action;
- long passages should become article cards with links to smaller theme or vocabulary cards;
- do not turn the whole book into one giant note.

Default card philosophy:

- create drafts first, then let the human or Agent D approve integration;
- article cards preserve reading context;
- theme cards capture reusable ideas;
- vocabulary cards connect words to real examples;
- task cards capture exercise patterns and answer strategies.

## Agent D Workflow: Quality Gate

1. Read the dispatch prompt and all relevant harness files.
2. Inspect changed or generated files.
3. Check whether any read-only areas were modified.
4. Validate source traceability.
5. Sample content quality according to task type.
6. Run available scripts or validators when code-capable.
7. Write `PASS`, `REVIEW`, or `FAIL`.
8. Include exact blockers and recommended next action.

Agent D should not fix major issues silently. It reports them so the owning agent or coordinator can decide the next step.

Default review stance:

- start by looking for blockers, not by trusting the producing agent's summary;
- inspect generated files directly;
- check a representative sample of content, source links, and formatting;
- mark `REVIEW` when output is useful but not ready for integration;
- reserve `PASS` for outputs that meet both content and process requirements.

## Agent E Workflow: Learning Unit Builder

1. Read `_harness/10-learning-unit-standard.md`.
2. Identify the complete source scope for the assigned text, including article body pages and following exercise pages.
3. Read the sealed chapter section from `章节/`.
4. Check raw OCR and page images when the cleaned chapter appears incomplete, especially for post-text questions and exercises.
5. Load available aligned translation from `翻译版/`.
6. Load available source-example matches from `_data/source_examples/`.
7. Load available card files from `卡片草稿/`.
8. Build one readable Markdown note under `学习单元/`.
9. Preserve complete Russian original text and original exercise tasks.
10. Add aligned Chinese translation, theme explanation, difficult-sentence grammar notes, vocabulary examples, and card links.
11. Use normal Markdown formatting; do not use code formatting for Russian sentences or words.
12. Mark missing translation, uncertain OCR, missing cards, or incomplete exercise recovery as `needs_review`.
13. Write a local report under `学习单元/_reports/` when running more than one unit or when risks are found.

Learning Unit Builder should stop with `REVIEW` when it cannot confidently recover exercises or page boundaries. It should not pretend a partial unit is complete.
