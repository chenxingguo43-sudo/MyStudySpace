---
title: "02 Agent Roles"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - agents
---

# 02 Agent Roles

## Global Rule

Each agent owns one problem domain. An agent must not expand into another role unless the dispatch prompt explicitly assigns that extra work.

## Agent A: Real Source Example Matcher

**Goal:** Match vocabulary entries to real sentences from the sealed Russian base text.

**Inputs:**

- sealed chapter files under `章节/`;
- raw OCR only when needed for verification;
- external vocabulary data specified by the dispatch prompt.

**Allowed outputs:**

- `_data/source_examples/*.json`;
- `_data/source_examples/*.md`;
- `_data/source_examples/unmatched*.json`;
- `_data/source_examples/review*.md`.

**Required behavior:**

- highlight or otherwise mark the matched word form in every example;
- preserve lemma, matched form, source file, page, and title when available;
- exclude AI vocabulary appendix pages `167-186` from real example matching;
- separate high-confidence matches from review-needed matches;
- default to exact-only matching for pilot work unless the dispatch prompt explicitly allows morphology expansion;
- label every non-exact match with the matching method and confidence.

**Forbidden behavior:**

- do not modify `章节/*.md`;
- do not modify the formal vocabulary database unless explicitly assigned;
- do not use naive stemming as a confirmed match without review labeling.
- do not promote substring, rough-stem, or visually similar matches to high confidence without verification.

## Agent B: Chinese Translation Builder

**Goal:** Produce Chinese translation drafts for reading and later bilingual views.

**Inputs:**

- sealed Russian chapter files;
- quality reports and page notes for risk awareness.

**Allowed outputs:**

- `翻译版/*.md`;
- `翻译版/术语表*.md`;
- `翻译版/疑难句*.md`;
- `翻译版/翻译报告*.md`.

**Required behavior:**

- keep Russian original and Chinese translation aligned at paragraph or task-block level;
- preserve source page metadata;
- mark uncertain names, references, and OCR-risk passages;
- keep translation faithful before polishing style.

**Forbidden behavior:**

- do not mix Chinese translation into sealed Russian chapters;
- do not delete or condense original Russian text;
- do not silently translate unclear OCR as if it were certain.

## Agent C: Obsidian Card Builder

**Goal:** Convert the book and derived outputs into Obsidian study cards.

**Inputs:**

- sealed Russian base text;
- Agent A examples when available;
- Agent B translations when available;
- project tagging conventions if supplied.

**Allowed outputs:**

- `卡片草稿/文章卡/*.md`;
- `卡片草稿/主题卡/*.md`;
- `卡片草稿/词汇卡/*.md`;
- `卡片草稿/任务卡/*.md`;
- `卡片草稿/卡片报告*.md`.

**Required behavior:**

- every card must have a source link or source metadata;
- separate original text, translation, and agent summary;
- keep cards readable and not overloaded;
- use Obsidian-friendly Markdown, wikilinks, properties, and tags where appropriate;
- default to draft cards under `卡片草稿/` rather than formal vault integration;
- make each card serve one clear learning action.

**Forbidden behavior:**

- do not create source-less cards;
- do not present agent interpretation as original book content;
- do not overwrite existing user notes without explicit authorization.
- do not create large catch-all notes when smaller linked cards would support review better.

## Agent D: Quality Gate And Integration Reviewer

**Goal:** Verify outputs from Agents A/B/C and produce an integration recommendation.

**Inputs:**

- all relevant generated artifacts;
- harness files;
- formal base text and quality reports;
- validator or scripts when available.

**Allowed outputs:**

- `_data/checks/*.md`;
- `_data/checks/*.json`;
- `质量报告/*追加复核*.md` only when explicitly asked to append formal quality reports.

**Required behavior:**

- classify results as `PASS`, `REVIEW`, or `FAIL`;
- list checked files, sample size, findings, and residual risk;
- verify that read-only regions were not modified;
- recommend whether outputs are ready for integration;
- inspect actual artifacts, not only the producing agent's completion report;
- take a red-team stance: find blockers and quality risks before granting `PASS`.

**Forbidden behavior:**

- do not perform large creative generation;
- do not merge derived artifacts into formal systems without authorization;
- do not ignore known boundaries such as pages `167-186`.
- do not mark `PASS` when source traceability, sample quality, or read-only integrity was not checked.

## Agent E: Learning Unit Builder

**Goal:** Build one article-centered Obsidian learning unit per reading text.

Agent E is the synthesis role. It does not replace Agents A, B, or C. It integrates the sealed Russian text, original exercises, aligned Chinese translation, real example matches, and draft card links into one readable Markdown note.

**Inputs:**

- sealed Russian chapter files under `章节/`;
- raw OCR pages and page images when exercises or page boundaries need verification;
- Agent B aligned translations under `翻译版/`;
- Agent A source examples under `_data/source_examples/`;
- Agent C draft cards under `卡片草稿/`;
- `_harness/10-learning-unit-standard.md`.

**Allowed outputs:**

- `学习单元/*.md`;
- `学习单元/_reports/*.md`;
- optional local manifests under `学习单元/_manifests/`.

**Required behavior:**

- create one file per reading text;
- include the full article scope, not only the first source page;
- include original task instructions, post-text multiple-choice questions, activation exercises, vocabulary exercises, and speaking tasks when present;
- preserve complete Russian original text;
- provide aligned Chinese translation when available;
- add article theme explanation, difficult-sentence grammar analysis, and vocabulary/source-example matches;
- highlight matched vocabulary forms in examples with bold Markdown;
- use normal readable Markdown, not code formatting for Russian sentences or words;
- keep source page metadata and OCR risk notes visible;
- link related draft cards when stable card files exist;
- mark missing translation, uncertain OCR, or incomplete exercise recovery as `needs_review`.

**Forbidden behavior:**

- do not modify sealed chapters or raw OCR files;
- do not silently skip exercises because they are on the page after the article;
- do not use pages `167-186` as original reading examples;
- do not copy handwritten annotations from page images as book answers unless the dispatch explicitly asks for handwritten-note extraction;
- do not present generated grammar notes, answers, or summaries as original book content.
