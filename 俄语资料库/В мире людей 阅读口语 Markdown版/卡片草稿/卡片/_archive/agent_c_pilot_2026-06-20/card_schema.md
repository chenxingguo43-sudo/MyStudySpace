---
type: "card-schema"
source_project: "В мире людей 阅读口语 Markdown版"
agent: "Agent C"
execution_mode: "pilot"
generated_at: "2026-06-20"
status: "draft"
tags:
  - 俄语/阅读
  - Obsidian/卡片草稿
  - agent-c/schema
---

# Card Schema: Agent C Pilot

## Purpose

This pilot validates a small Obsidian card system for one complete reading text:

- source text: `Текст 2.1.1 — Новая российская столица как национальный проект`
- source file: `章节/раздел2-начало.md`
- source pages: `56-58`
- text anchor: `^vm-b2-001`
- exercise anchors: `^vm-b2-ex-001`, `^vm-b2-ex-002`

The pilot does not attempt full-book generation and does not depend on a complete translation layer.

## Shared Frontmatter

Every card uses this metadata pattern:

```yaml
---
type: "reading-card | theme-card | vocabulary-card | task-card"
source_project: "В мире людей 阅读口语 Markdown版"
source_file: "章节/раздел2-начало.md"
source_pages: "56"
source_section: "Текст 2.1.1 — Новая российская столица как национальный проект"
source_anchor: "^vm-b2-001"
status: "draft"
generation_status: "candidate_high | needs_review"
tags:
  - 俄语/阅读
  - ВМЛ/2.1.1
---
```

## Required Sections

### Original

Russian source excerpt only. This section never contains generated commentary or Chinese translation.

### Translation Placeholder

Reserved for Agent B or later human translation. This pilot may include only a placeholder or short provisional gloss labeled `needs_review`.

### Learning Action

One concrete action the learner should perform. Examples:

- retell the article stance in three sentences;
- sort arguments by function;
- use one source sentence to remember a word;
- answer a task by locating evidence.

### Generated Notes

Agent-generated summaries, reading hints, or structure notes. These must not be presented as original book content.

### Source

Traceability block with:

- source file;
- page or page range;
- section title;
- anchor when available;
- derived inputs if used, such as Agent A source-example matches.

## Card Types

| Type | Folder | Learning Action |
|---|---|---|
| Article card | `article/` | Read and retell the complete text structure. |
| Theme card | `theme/` | Reuse one argument or discourse pattern. |
| Vocabulary card | `vocabulary/` | Attach one word or expression to a real source sentence. |
| Task card | `task/` | Practice a reading strategy from the book exercises. |

## Naming Pattern

Files use ASCII-safe prefixes plus a short Russian title:

- `article/vml-2-1-1-article-capital-project.md`
- `theme/vml-2-1-1-theme-argument-map.md`
- `vocabulary/vml-2-1-1-vocab-perenos.md`
- `task/vml-2-1-1-task-evidence-scan.md`

## Pilot Constraint

This pilot is structurally complete but content-light by design. Full card generation should wait until Agent B aligned translation and a reviewed vocabulary source-example layer are both accepted for integration.
