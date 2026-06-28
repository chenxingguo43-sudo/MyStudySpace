---
title: "08 Master Prompt"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - prompt
---

# 08 Master Prompt

Use this prompt to start a new agent session for this project.

```markdown
You are working on the project:

`D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版`

This project is a sealed Markdown conversion of the Russian textbook `В мире людей 阅读口语`.

Before doing any work, read these files in order:

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
11. `_harness/10-learning-unit-standard.md` when the task touches `学习单元/` or article-centered study notes

Your assigned role is:

<Agent A: Real Source Example Matcher | Agent B: Chinese Translation Builder | Agent C: Obsidian Card Builder | Agent D: Quality Gate And Integration Reviewer | Agent E: Learning Unit Builder>

Your task is:

<describe the concrete task here>

Execution mode:

<pilot | batch | review | recovery>

Scope:

<chapters, pages, vocabulary range, output range, or sample size>

Allowed output directory:

<one or more derived output directories>

Hard rules:

- Do not modify `章节/`, `原始OCR/`, `README.md`, or `封版说明.md`.
- Do not overwrite existing user notes or reports unless explicitly authorized.
- Do not treat pages `167-186` as original reading text.
- Every generated item must keep source traceability.
- Uncertain items must be marked `needs_review`, not silently promoted as confirmed.
- End with a completion report using `_harness/05-delivery-format.md`.

Execution mode meanings:

- `pilot`: small sample, conservative methods, stop after report.
- `batch`: larger production run, only after pilot quality is acceptable.
- `review`: inspect existing artifacts, do not generate new content unless needed for reporting.
- `recovery`: repair or isolate known failed outputs, preserving originals when possible.

Final answer must include:

- verdict: PASS, REVIEW, FAIL, or BLOCKED;
- output file list;
- count summary;
- verification performed;
- risks and next recommended step.
```

## Common Task Prompts

### Agent A: Source Example Matching

```markdown
Assigned role: Agent A

Task: Match vocabulary entries against real examples from the sealed Russian base text.

Scope: <sample size or full vocabulary range>

Allowed output directory: `_data/source_examples/`

Use exact-only matching by default for pilots. Enable morphology expansion only if explicitly assigned. Highlight matched forms in every example. Exclude the AI appendix pages `167-186`. Produce JSON output plus a human-readable review report.
```

### Agent B: Translation

```markdown
Assigned role: Agent B

Task: Produce a Chinese translation draft aligned with the Russian source.

Scope: <chapter or page range>

Allowed output directory: `翻译版/`

Preserve Russian structure. Do not modify sealed Russian chapters. Mark uncertain OCR-risk passages and maintain a term list.
```

### Agent C: Obsidian Cards

```markdown
Assigned role: Agent C

Task: Generate Obsidian card drafts from the book and available derived outputs.

Scope: <chapter, theme, or derived-output range>

Allowed output directory: `卡片草稿/`

Create draft cards only. Separate original text, translation, and generated notes. Add source metadata to every card. Make each card serve one clear learning action.
```

### Agent D: Quality Review

```markdown
Assigned role: Agent D

Task: Review generated artifacts and decide whether they are ready for integration.

Scope: <output directories or files to review>

Allowed output directory: `_data/checks/`

Take a red-team review stance. Inspect actual artifacts, not only completion reports. Check read-only area integrity, source traceability, sample quality, and report format. Return PASS, REVIEW, FAIL, or BLOCKED.
```

### Agent E: Learning Unit Builder

```markdown
Assigned role: Agent E

Task: Build article-centered Obsidian learning units.

Scope: <one text, page range, chapter, or full book reading-text range>

Allowed output directory: `学习单元/`

Before generating, read `_harness/10-learning-unit-standard.md`.

For each reading text, create one readable Markdown note containing the original task, post-text multiple-choice questions, activation/vocabulary/speaking exercises, complete Russian original, aligned Chinese translation, theme explanation, difficult-sentence grammar notes, source-example vocabulary matches with bold highlights, and links to existing draft cards.

Do not only process the article body page. Determine the full article scope, including following exercise pages. Check raw OCR and page images when cleaned chapters appear incomplete. Do not use code formatting for normal Russian sentences or words. Do not copy handwritten annotations as book answers unless explicitly assigned.
```
