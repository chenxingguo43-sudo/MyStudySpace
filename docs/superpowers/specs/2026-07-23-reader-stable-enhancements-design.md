# Russian Reader Stable Enhancements Design

**Date:** 2026-07-23

**Status:** Approved design, pending written-spec review

## Goal

Improve the Russian reader in one coordinated batch while preserving existing learning data and completed module behavior. The batch covers lemma-based vocabulary identity, compact morphology display, context cloze review, reading-error review, and adaptive iPad layouts.

## Scope

### Included

- Save reliable vocabulary under `lemma + part of speech` while retaining encountered surface forms and source contexts.
- Back up and safely migrate existing `vocabulary-review-records` entries.
- Show compact, offline morphology information when the analysis is reliable.
- Generate deterministic context-cloze cards from saved source sentences.
- Add reading questions to a unified wrong-answer review flow with hybrid error classification.
- Add explicit iPad portrait and landscape layouts for the reader and dictionary.
- Add automated regression tests and browser verification for desktop, phone, and iPad viewports.

### Excluded

- OCR, watermark, line-break, and stress-mark cleanup for unfinished textbook imports.
- Live AI grammar parsing or live AI error classification.
- Full sentence-level syntactic disambiguation.
- New exam-mode behavior for the unfinished B2 reading module.
- Article-derived grammar exercises, recording-based retelling, and listening expansion.
- Refactoring the whole monolithic reader or changing completed P1-P6 answer confirmation behavior.

## Architecture

The implementation will extend the existing vanilla HTML, CSS, JavaScript, and localStorage architecture. It will add small focused helper modules rather than rewrite `reader.html` or `vocabulary.html`.

The work is divided into three implementation tracks that can be tested independently:

1. Vocabulary identity, migration, compact morphology, and context cloze.
2. Reading wrong-answer records and hybrid classification.
3. Responsive iPad reader and dictionary layouts.

All runtime behavior remains local and offline-capable. Heavy morphology generation, when needed, happens during data preparation; browsers only read compact JSON data.

## Vocabulary Identity

### Canonical identity

A saved vocabulary item uses a canonical key only when the resolver returns a reliable lemma and part of speech:

```text
<normalized lemma>|<normalized part of speech>
```

Example:

```text
написать|verb
```

The record retains all encountered forms rather than discarding the clicked form.

```json
{
  "lemma": "написать",
  "partOfSpeech": "verb",
  "forms": ["написаны", "написанного"],
  "contexts": [
    {
      "surfaceForm": "написаны",
      "sentenceRu": "Эти произведения написаны известным художником.",
      "sentenceZh": "这些作品由一位著名画家创作。",
      "bookId": "russian_b2",
      "chapter": 0
    }
  ]
}
```

Existing SM-2 fields remain on the canonical record. The vocabulary UI may continue to expose a display word, but storage identity no longer depends solely on the clicked surface form.

### Confidence policy

Canonicalization is allowed for these resolver outcomes:

- reviewed function-word form;
- corpus morphology map with a matching dictionary entry;
- exact dictionary lemma with a known part of speech.

Rules-only guesses, missing entries, ambiguous candidates without a selected dictionary entry, and unknown parts of speech remain surface-form records. The system must prefer a duplicate over an incorrect merge.

### Duplicate handling

When a reliable canonical record already exists:

- append a new surface form only when it is not already present;
- append a context only when the same sentence and surface form are not already stored;
- retain the more conservative mastery state;
- retain the earliest due review date;
- retain the larger review count;
- preserve source metadata from both records.

The merge must never mark a card as mastered merely because one source record had a higher mastery value.

## Safe Migration

Migration is versioned and idempotent. Before the first migration, the original `vocabulary-review-records` value is copied to a dedicated backup key with the migration version and timestamp.

The migration processes existing records as follows:

1. Resolve the old key through the same confidence policy used for new saves.
2. Merge only reliable results into canonical records.
3. Leave uncertain records under their existing key.
4. Record aliases from migrated surface forms to canonical keys.
5. Mark the migration version only after the transformed record set is successfully written.

If parsing, quota, or write errors occur, the current records remain active and the migration version is not advanced. A restore action can replace the active records with the migration backup.

The migration does not change Obsidian notes or delete any server-side vocabulary data.

## Compact Morphology Display

The dictionary's first screen adds one compact morphology summary when reliable data exists.

Example:

```text
написаны -> написать
动词 | 完成体 | 过去时 | 短尾被动形动词 | 复数
```

The summary may include:

- lemma;
- part of speech;
- aspect for verbs;
- tense, person, number, gender, case, voice, and short/full form when applicable;
- confidence label when multiple analyses remain possible.

The UI must not display a guessed feature as a definite result. When no reliable feature analysis exists, the current dictionary panel remains unchanged.

Collocations, examples, full inflection tables, alternate lemmas, and detailed definitions remain progressively disclosed below the compact summary.

The browser does not run Python or a large morphology model. Existing corpus data is reused first; additional feature data is generated ahead of time and published as compact JSON scoped to the study corpus.

## Context Cloze Review

### Eligibility

A saved vocabulary context becomes eligible for a cloze card when:

- the exact surface form occurs once in the Russian source sentence;
- the sentence is neither empty nor excessively long;
- the token is not excluded as a trivial function word;
- the context has a reliable canonical lemma or a safe surface-form identity.

Ineligible contexts remain normal vocabulary cards.

### Card behavior

The card replaces the encountered surface form with a blank and shows the lemma as a hint.

```text
Эти произведения ______ известным художником.
提示：написать
```

The learner answers mentally, selects `显示答案`, then rates the card with the existing three outcomes: `不认识`, `模糊`, or `认识`. The card uses the existing SM-2 scheduling path; it does not create a second independent scheduler.

No Russian keyboard input is required. Stress marks and `е/ё` do not affect this reveal-and-rate flow.

## Reading Wrong-Answer Review

### Record model

Reading progress records are extended without invalidating existing records. A wrong-answer record contains:

- question ID, unit ID, and module ID;
- selected and correct answer;
- attempt count and timestamps;
- latest result and whether the question was ever wrong;
- review status (`pending` or `mastered`);
- optional error category;
- source pages and available evidence metadata.

Existing records with only `selected`, `answered`, and `answerOpen` remain readable and receive defaults when next written.

### Hybrid classification

Error classification follows this order:

1. Use a reviewed distractor tag when the selected option has one.
2. Otherwise offer a lightweight, skippable selection: `没找到原文`, `词义不懂`, `逻辑判断错`, `不确定`.
3. If skipped, save the wrong answer without an error category.

The runtime does not call AI to infer error categories.

### Review behavior

Reading wrong answers appear in a unified review entry alongside grammar wrong answers, with a visible module label. Reopening an item presents the unanswered question before revealing prior choices.

A correct retry changes the latest status to `mastered` but retains `everWrong` and attempt history. A later incorrect retry returns the item to `pending`.

The first release does not require evidence-sentence authoring or distractor tags for every question. Missing metadata degrades to the skippable learner classification without blocking review.

## iPad Adaptive Layout

### Breakpoint behavior

The existing phone breakpoint remains. A dedicated tablet range is added so an 11-inch iPad is not treated as a desktop solely because its portrait width exceeds 760 CSS pixels.

Target verification viewports:

- phone: `390 x 844`;
- iPad portrait: `834 x 1194`;
- iPad landscape: `1194 x 834`;
- desktop: `1280 x 720` or larger.

### Portrait

- Reading content uses the available width with readable horizontal padding.
- The dictionary opens as a bottom sheet.
- The half state shows lemma, compact morphology, meaning, and save action.
- The full state shows the existing detailed dictionary content.
- Closing the sheet restores the unobscured reading surface without rerendering the chapter.
- The clicked word remains visible above the sheet when practical.

### Landscape

- Reading and dictionary use a side-by-side layout with an initial ratio near 65:35.
- The existing resize interaction remains available.
- The selected ratio is stored separately from desktop when necessary.
- Closing the dictionary returns space to the reading pane.

### Rotation and fallback

Changing orientation updates layout without losing the selected word, current question, scroll position, or dictionary content. Phones continue using the bottom sheet and desktops continue using side-by-side behavior.

No runtime device detection is required; layout is based on viewport and input-friendly CSS media queries.

## Error Handling

- Storage parse failures fall back to empty safe objects without overwriting the unreadable source value.
- Migration write failures retain active records and the backup.
- Morphology data load failures preserve the current dictionary display.
- Missing error tags never block reading-question submission or review.
- Missing cloze eligibility falls back to the standard vocabulary card.
- Layout transitions must not rerender the chapter or rewrite learning progress.

## Testing Strategy

### Automated tests

- Canonical key generation for reliable and unreliable resolver results.
- Idempotent migration and backup creation.
- Conservative SM-2 field merging.
- Surface-form and context deduplication.
- Cloze eligibility and exact token replacement.
- Backward-compatible reading progress migration.
- Automatic distractor tags and skipped manual classification.
- Reading wrong-answer pending/mastered transitions.
- Static contracts for tablet breakpoints and dictionary states.
- Existing dictionary, reading, quiz-first, listening, writing, speaking, and archive tests.

Every behavior change follows a failing-test-first cycle before production code is edited.

### Browser verification

At each target viewport, verify:

- article and controls do not overlap;
- Russian text remains readable;
- dictionary open, half, full, and closed states;
- rotation-equivalent viewport changes preserve state;
- long lemmas, long Chinese definitions, and long morphology labels fit;
- question selection and dictionary clicks do not interfere;
- no blank reader or dictionary panel appears.

## Delivery and Rollback

Implementation is performed in small internally verified tracks, but delivered as one coordinated enhancement batch. No automatic push is performed.

Rollback paths are:

- restore vocabulary records from the migration backup;
- disable morphology summaries while retaining existing dictionary lookup;
- leave reading error categories empty while retaining wrong-answer records;
- fall back to the existing desktop/phone layouts if tablet CSS verification fails.

The unfinished textbook content remains untouched throughout this batch.
