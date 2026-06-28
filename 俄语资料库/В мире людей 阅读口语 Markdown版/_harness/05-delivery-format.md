---
title: "05 Delivery Format"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - delivery
---

# 05 Delivery Format

## Required Completion Report

Every agent must finish with a Markdown report containing these sections:

```markdown
# Completion Report: <Agent Name> - <Task Name>

## Verdict

PASS | REVIEW | FAIL | BLOCKED

## Scope

- Assigned role:
- Input files or ranges:
- Output directory:
- Forbidden areas checked:

## Outputs

| File | Type | Purpose |
|---|---|---|

## Counts

- Processed items:
- Generated items:
- Skipped items:
- Review-needed items:
- Failed items:

## Verification

- Commands or checks run:
- Result:
- Limitations:

## Risks And Open Questions

- ...

## Recommended Next Step

...
```

The report should be saved in the same derived area as the task output unless the dispatch prompt specifies another location.

## Agent A Output Shape

Recommended JSON fields for source examples:

```json
{
  "metadata": {
    "project": "В мире людей 阅读口语 Markdown版",
    "agent": "Agent A",
    "generated_at": "ISO-8601 timestamp",
    "matching_method": "exact | morphology | hybrid",
    "excluded_ranges": ["167-186"]
  },
  "matches": [
    {
      "lemma": "провести",
      "display_word": "провести́",
      "source_entry": "词汇/动词/провести.md",
      "status": "candidate_high",
      "examples": [
        {
          "sentence": "Russian sentence with matched form",
          "highlighted_sentence": "Russian sentence with **matched form**",
          "matched_form": "провести",
          "source_file": "章节/раздел2-начало.md",
          "page": "56",
          "section_title": "Текст 2.1.1",
          "confidence": "candidate_high"
        }
      ]
    }
  ]
}
```

Human reports should show the highlighted matched form so the user can visually confirm match quality.

## Agent B Output Shape

Translation Markdown should use stable block structure:

```markdown
## <Section Title>

%% source: 章节/example.md; pages: 10-12 %%

### RU

Original Russian paragraph.

### ZH

Chinese translation.

> [!note] 译注
> Optional note for uncertainty, term, or source issue.
```

If the task is full-book translation, each chapter should be a separate file unless the dispatch prompt asks otherwise.

## Agent C Output Shape

Card files should include Obsidian-friendly metadata:

```markdown
---
type: "reading-card"
source_project: "В мире людей 阅读口语 Markdown版"
source_file: "章节/example.md"
source_pages: "10-12"
status: "draft"
tags:
  - 俄语/阅读
---

# Card Title

## 原文

...

## 学习要点

...

## 来源

- `章节/example.md`
```

## Agent D Output Shape

Quality reports should start with the verdict:

```markdown
# Quality Report: <Target>

## Verdict

PASS | REVIEW | FAIL | BLOCKED

## Findings

| Severity | File | Issue | Recommendation |
|---|---|---|---|
```

Findings should be ordered by severity. Do not bury blockers at the end.

