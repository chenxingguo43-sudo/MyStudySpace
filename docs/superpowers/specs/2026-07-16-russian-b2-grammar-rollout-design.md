# Russian B2 Grammar Quiz Rollout Design

**Date:** 2026-07-16
**Status:** Revised after self-review; awaiting user approval

## Goal

Expand the proven Russian B2 quiz-first reader from its current ten-question pilot to the book's full grammar-and-vocabulary multiple-choice section. The web reader remains the learning surface; generated Markdown remains the searchable Obsidian archive.

## Scope and order

Only the six grammar-and-vocabulary parts are in scope. Other B2 modules are excluded.

The rollout order is:

1. Part 2, case government: extend the verified Q001-Q010 pilot through the remainder of the part.
2. Part 1, subject-predicate agreement.
3. Parts 3 through 6 in original-book order.

Each part is released independently. A later part never blocks study of a verified earlier part.

## Source and verification policy

`E:\Desktop\俄语B2.pdf` is the source of truth. Existing OCR and the earlier Markdown library may only be used to locate candidate questions and answers.

For every released question, the canonical data must contain:

- the question and all four options;
- the answer exactly as given in the source book;
- the original-book grammar explanation and the sentence's Chinese translation;
- question, rule, and answer/explanation page references;
- a separately labelled AI reference explanation and pitfalls.

If the question number, answer, explanation, or translation cannot be unambiguously matched to the PDF, its candidate unit is blocked from release until the source gap is resolved. AI text must never fill a missing original-book explanation.

## Unit structure and generated outputs

Each source-book part is divided into units of 8 to 12 questions. Every unit has a permanent ID such as `p2-q001-q010`; every exercise has a book-wide ID such as `P2-Q001` plus its original printed question number. IDs never depend on the unit's current position in reader navigation.

Canonical JSON is the only hand-maintained learning-content source. The current pilot-only builder is replaced by a book-level builder that reads a canonical unit manifest and generates, from that data:

- reader chapter JSON under `data/textbook/russian_b2/`;
- an Obsidian Markdown unit under `俄语资料库/俄语B2·原书复刻与学习版/学习单元/语法词汇/`;
- a page-range mapping and a machine-readable quality report.

The reader book index and chapter navigation must reflect every released unit. Published chapter files are append-only during this rollout: existing chapter numbers are not reused for different content. No reader JSON or Markdown file is edited as an independent content source.

## Progress compatibility

Quiz answers and unit completion must be stored by permanent unit ID, not by numeric chapter position. The first reader update includes a one-time migration from the pilot key `russian_b2:0` and question IDs `Q001` through `Q010` to unit `p2-q001-q010` and exercise IDs `P2-Q001` through `P2-Q010`.

The migration must be idempotent: refreshing the page or running a later release cannot duplicate, erase, or remap an existing attempt. Numeric chapter positions remain navigation details only.

## Reader behavior

Every generated unit uses the established quiz-first flow:

`choose option -> confirm -> correct/wrong state -> manually expand explanation`.

Expanded content is always ordered as:

1. Original-book answer (verified)
2. Original-book explanation (verified, including rule and translation)
3. AI reference explanation (pending review)
4. Pitfalls
5. Source-page identifiers

The reader stays a single-column learning page. It has no original-page viewer or PDF page-switching controls. Question selection, answer confirmation, and explanation expansion preserve the current scroll position; navigating to a different unit returns to its top.

## Quality gates

Before releasing a unit:

- permanent unit and exercise IDs are unique, while original printed question numbers remain traceable;
- every question has four complete options;
- `answer` equals `sourceAnswer`;
- every question includes original-book explanation, translation, and page mapping;
- the generated reader JSON and Markdown agree on questions, options, answers, and page identifiers;
- progress migration and stable-ID regression tests pass before any new unit changes chapter navigation;
- automated contract tests and reader regression tests pass;
- a browser check confirms answers and explanations are hidden initially, manual expansion works, and the page does not jump to the top during quiz actions.

Any failed gate blocks that entire unit from release and records the unresolved source question for manual resolution. A question is not silently omitted from a supposedly complete part.

## Out of scope

- Other B2 modules and non-multiple-choice exercises.
- Browser PDF/source-page panels.
- Cloud sync, accounts, spaced repetition, or redesign of the existing novel reader.
- Treating unverified OCR or AI wording as original-book evidence.
