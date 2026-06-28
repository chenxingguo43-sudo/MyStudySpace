# Card Pilot 2 Integration Recommendation

## Decision

Proceed with **bounded broader draft generation** using the Agent C2 card schema, but do not run full generation across all translation REVIEW sections.

## Schema Approval

Approved with guardrails:

- The schema has the required source metadata fields.
- The schema keeps original Russian, Chinese translation, source examples/evidence, and generated notes visibly separated.
- The schema supports one clear learning action per card.
- The schema preserves `needs_review` status and page/source cautions.
- Vocabulary cards correctly connect lemma, matched form, exact source-example metadata, Russian evidence, Chinese translation, and a small learner drill.

This is enough for a controlled draft batch.

## Translation Scope Recommendation

Full generation should include:

1. Translation sections with `PASS` or equivalent reviewed status.
2. Repaired sections that passed Agent D repair review.
3. Explicitly selected `REVIEW` sections only when the generation manifest carries the review reason into card metadata and visible notes.

Full generation should not include:

1. All translation `REVIEW` sections by default.
2. Sections with unresolved `MT failed`, `empty translation response`, `TODO`, or placeholder markers.
3. OCR-risk matrix or unrecoverable pages as confident learning content.
4. Pages `167-186` as original reading text or real source examples.

## Recommended Manifest Rule

Before broader generation, create a manifest with these fields per source block:

| Field | Requirement |
|---|---|
| `source_file` | sealed chapter source path |
| `source_pages` | page or page range |
| `source_anchor` | stable block anchor if available |
| `translation_file` | reviewed or repaired translation source |
| `translation_status` | `PASS`, `repaired_pass`, or `review_allowed` |
| `review_reason` | required for any `review_allowed` item |
| `ocr_caution` | required for page/image risk |
| `allowed_card_types` | article, theme, vocabulary, task |

## Pilot-Specific Notes

- `Текст 2.1.1` page `56` remains valid as a pilot, but formal learner-facing promotion should wait for page 56 source-image review of the quotation zones containing omission markers.
- The task-card pattern is acceptable when it states translation coverage limits. Do not silently translate exercise options that Agent B did not translate.
- The `нагрузка` vocabulary card is the cleanest candidate for the pattern because it uses an intact source sentence and real aligned Chinese translation.
- The `кластер` and `омолодить` vocabulary cards are acceptable draft examples but must remain `needs_review` because of nearby or included page 56 omission markers.

## Recommended Next Step

Start a small broader draft batch from PASS/repaired translation sections only, with a manifest-first workflow. Include a limited number of explicitly allowed REVIEW sections only if their cautions are preserved in card frontmatter and visible warning blocks.
