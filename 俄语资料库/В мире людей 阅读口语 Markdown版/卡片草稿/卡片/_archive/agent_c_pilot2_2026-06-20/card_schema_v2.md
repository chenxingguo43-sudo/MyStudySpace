---
type: "card-schema"
source_project: "В мире людей 阅读口语 Markdown版"
agent: "Agent C2"
execution_mode: "pilot"
generated_at: "2026-06-20"
status: "draft"
tags:
  - 俄语/阅读
  - Obsidian/卡片草稿
  - agent-c/schema
---

# Card Schema V2: Real Translation Insertion

## Purpose

This second pilot keeps the first Agent C card pattern but replaces empty translation slots with real reviewed Agent B pilot translation for:

- source text: `Текст 2.1.1 — Новая российская столица как национальный проект`
- source file: `章节/раздел2-начало.md`
- source page: `56`
- source anchor: `^vm-b2-001`
- translation file: `翻译版/agent_b_pilot_2026-06-20/Текст_2.1.1_Новая_российская_столица_aligned.md`

## Shared Frontmatter

Every card includes:

```yaml
type: "reading-card | theme-card | vocabulary-card | task-card"
source_project: "В мире людей 阅读口语 Markdown版"
source_file: "章节/раздел2-начало.md"
source_pages: "56"
source_section: "Текст 2.1.1 — Новая российская столица как национальный проект"
source_anchor: "^vm-b2-001"
translation_source: "翻译版/agent_b_pilot_2026-06-20/Текст_2.1.1_Новая_российская_столица_aligned.md"
status: "draft"
generation_status: "candidate_high | needs_review"
tags:
  - 俄语/阅读
  - ВМЛ/2.1.1
```

Vocabulary cards also include:

```yaml
lemma: "<dictionary form>"
matched_form: "<form in source example>"
source_example_file: "_data/source_examples/agent_a_batch_2026-06-20/batch_matches.json"
```

## Real Translation Insertion Rule

The `Chinese Translation` section must contain real text copied or tightly excerpted from the Agent B aligned translation. It must not contain empty-marker language, requests to add translation later, or provisional gloss-only text.

For article cards, the Chinese section preserves the paragraph order from Agent B:

1. title;
2. paragraph 1;
3. paragraph 2;
4. paragraph 3;
5. paragraph 4;
6. paragraph 5;
7. source note.

For theme cards, each Chinese quote must correspond to a visible Russian evidence quote.

For vocabulary cards, the Chinese translation must be the matching sentence or phrase from the same Agent B block as the Russian source example.

For task cards, Agent B translation may be used for the article instruction and evidence. If a full exercise option translation is not present in Agent B, the card must state that limitation instead of inventing a full exercise translation.

## Required Sections

Each card uses these section roles:

- `Learning Action`: one clear learner action.
- `Original Russian`: sealed source Russian, excerpted or full depending on card type.
- `Chinese Translation`: reviewed Agent B Chinese translation only.
- `Source Example`: used on vocabulary cards for exact match metadata.
- `Generated Notes`: agent-created learning prompts, strategy, or structure.
- `Source`: traceability block.

## Source Caution Rule

Cards using page 56 quotation material must keep this warning visible:

> Page 56 is marked good, but right-column quotations and comments containing `<…>` may need source-image checking before formal publication.

The warning does not block draft card generation, but it keeps affected cards at `needs_review` when the selected sentence includes or sits next to `<…>`.

## Output Set

| Type | Folder | Count | Purpose |
|---|---:|---:|---|
| Article | `article/` | 1 | Full reading context with real Chinese translation. |
| Theme | `theme/` | 1 | Argument map using bilingual evidence. |
| Vocabulary | `vocabulary/` | 3 | Reusable vocabulary/example pattern with source examples and translation. |
| Task | `task/` | 1 | Reading strategy card using evidence-first answer selection. |
