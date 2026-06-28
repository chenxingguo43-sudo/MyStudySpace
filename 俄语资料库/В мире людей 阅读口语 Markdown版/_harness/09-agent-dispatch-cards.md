---
title: "09 Agent Dispatch Cards"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.1-dispatch-cards"
tags:
  - harness
  - dispatch
  - prompt
---

# 09 Agent Dispatch Cards

These cards are copy-ready prompts for external agents. Replace the bracketed fields before dispatch.

## Shared Startup Block

```markdown
You are working on:

`D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版`

Before doing any work, read:

1. `README.md`
2. `封版说明.md`
3. `_harness/00-project-charter.md`
4. `_harness/01-source-of-truth.md`
5. `_harness/02-agent-roles.md`
6. `_harness/03-workflows.md`
7. `_harness/04-acceptance-criteria.md`
8. `_harness/05-delivery-format.md`
9. `_harness/06-parallel-dispatch.md`
10. `_harness/07-recovery-policy.md`
11. `_harness/10-learning-unit-standard.md` when building or reviewing `学习单元/`

Hard rules:

- Do not modify `章节/`, `原始OCR/`, `README.md`, or `封版说明.md`.
- Do not overwrite existing notes or reports unless explicitly authorized.
- Do not treat pages `167-186` as original reading text.
- Keep source traceability for every generated item.
- Mark uncertainty as `needs_review`.
- Finish with a completion report using `_harness/05-delivery-format.md`.
```

## Agent A Dispatch Card: Real Source Examples

```markdown
Assigned role:

Agent A: Real Source Example Matcher

Execution mode:

<pilot | batch | recovery>

Task:

Match vocabulary entries against real examples from the sealed Russian base text.

Scope:

<sample size, vocabulary range, or full vocabulary>

Allowed output directory:

`_data/source_examples/`

Default method:

Use exact-only matching for pilot work. Use verified morphology only if this dispatch explicitly authorizes it. Rough-stem or substring matches must be marked `needs_review` and cannot be high-confidence by default.

Required outputs:

- machine-readable match file;
- human-readable review report with highlighted matched forms;
- unmatched list or count;
- suspected false-positive list or count;
- completion report with verdict.
```

## Agent B Dispatch Card: Chinese Translation

```markdown
Assigned role:

Agent B: Chinese Translation Builder

Execution mode:

<pilot | batch | recovery>

Task:

Produce a Chinese translation draft aligned with the Russian source.

Scope:

<chapter, page range, or full book section>

Allowed output directory:

`翻译版/`

Default method:

Use faithful paragraph-level or task-block-level alignment. Preserve Russian structure. Do not polish so freely that later card generation loses source alignment. Mark OCR-risk or translation-uncertain passages.

Required outputs:

- aligned translation Markdown;
- term list when recurring terms appear;
- difficult-sentence or uncertainty report;
- completion report with verdict.
```

## Agent C Dispatch Card: Obsidian Cards

```markdown
Assigned role:

Agent C: Obsidian Card Builder

Execution mode:

<pilot | batch | recovery>

Task:

Generate Obsidian card drafts from the sealed base text and available derived outputs.

Scope:

<chapter, theme, text, or derived-output range>

Allowed output directory:

`卡片草稿/`

Default method:

Create draft cards only. Every card must serve one clear learning action. Separate original text, translation, source examples, and agent notes. Add source metadata to every card.

Required outputs:

- card files grouped by card type;
- card-generation report with counts by type;
- list of cards needing review;
- completion report with verdict.
```

## Agent D Dispatch Card: Quality Review

```markdown
Assigned role:

Agent D: Quality Gate And Integration Reviewer

Execution mode:

review

Task:

Review generated artifacts and decide whether they are ready for the next workflow stage.

Scope:

<files or output directories to review>

Allowed output directory:

`_data/checks/`

Default method:

Take a red-team review stance. Inspect actual files, not only completion reports. Check read-only area integrity, source traceability, sample quality, output format, and residual risks.

Required outputs:

- quality report with findings ordered by severity;
- verdict: `PASS`, `REVIEW`, `FAIL`, or `BLOCKED`;
- recommended next action;
- completion report if separate from the quality report.
```

## Agent E Dispatch Card: Learning Units

```markdown
Assigned role:

Agent E: Learning Unit Builder

Execution mode:

<pilot | batch | recovery>

Task:

Build article-centered Obsidian learning units from the sealed Russian book text and available derived outputs.

Scope:

<one text, page range, chapter, or all reading texts>

Allowed output directory:

`学习单元/`

Mandatory extra file:

Read `_harness/10-learning-unit-standard.md` before generating any unit.

Default method:

For each reading text, create one complete readable Markdown note. Do not only process the article body page. Determine the full article scope, including post-text multiple-choice questions, activation exercises, vocabulary exercises, paraphrase tasks, and speaking tasks. If the cleaned chapter is incomplete, check raw OCR and page images when available.

Required content per unit:

- metadata with source file, full source pages, translation source, example source, card source, and review status;
- original task instructions;
- post-text multiple-choice questions when present;
- activation / vocabulary / speaking exercises when present;
- complete Russian original;
- aligned Chinese translation when available;
- theme explanation;
- difficult-sentence grammar analysis in readable Markdown;
- vocabulary/source-example table with matched forms highlighted in bold;
- links to existing draft cards;
- OCR and generated-content risk notes;
- follow-up list for missing translation, uncertain OCR, missing cards, or incomplete exercises.

Formatting rules:

- Use normal readable Markdown.
- Do not use code formatting for Russian sentences or words.
- Use bold Markdown for emphasis and matched forms.
- Use Obsidian wikilinks for stable local files.
- Do not copy handwritten annotations from page images as book answers unless explicitly assigned.

Required outputs:

- one Markdown file per reading text under `学习单元/`;
- batch report under `学习单元/_reports/` when scope is more than one text;
- list of units marked `needs_review`;
- completion report with verdict.
```
