# Quality Report: Manifest Batch Card Output

## Verdict

REVIEW

## Reviewed Scope

- **Target directory**: `卡片草稿/manifest_batch_2026-06-20/`
- **Files reviewed**: 29 card files (7 article + 8 theme + 10 vocabulary + 4 task) + 3 report files
- **Sampling method**: Strategic coverage across all 7 manifest items, all 4 card types, and all 3 source statuses (PASS, review_allowed, repaired_pass)
- **Cards read in full**: 21 of 29 (72% sample) plus grep-based structural checks on all 29
- **Review date**: 2026-06-20

## Findings

| Severity | File(s) | Issue | Recommendation |
|---|---|---|---|
| MEDIUM | All 10 `vocabulary/*.md` | `source_example_file` field from `card_schema_v2.md` is absent. Schema specifies `source_example_file: "_data/source_examples/agent_a_batch_2026-06-20/batch_matches.json"` for vocabulary card frontmatter. | Add `source_example_file` if Agent A data is available; otherwise document in the completion report that Agent A source examples were not used for this batch. Not blocking. |
| MEDIUM | `vocabulary/vml-1-4-2-vocab-belletristika.md` line 18 | Learning Action text has inconsistent quote closure: `"belonging to fiction/literature。` (period used instead of closing ASCII quote before CJK period). | Fix to `"belonging to fiction/literature"。` for typographic consistency. |
| LOW | `vocabulary/vml-2-1-1-vocab-nagruzka.md` | Only vml-2-1-1 card without `[!warning] Source Caution` for page 56. Pilot2 review documents this as the cleanest candidate using an intact source sentence. | Acceptable as documented exemption, but consider adding a brief note explaining why the caution is omitted on this card specifically. |
| LOW | `completion_report.md` | Agent C self-reports `PASS` verdict. Card-level statuses (draft / draft_needs_review) already account for source risks, but the completion verdict could clarify that 12 of 29 cards carry `needs_review` due to source status rather than card construction issues. | Clarify in completion report that PASS applies to structural construction; integration readiness of review_allowed cards depends on downstream review. |
| LOW | 4 `task/*.md` cards | Task cards for vml-3-beginning/ending are broad strategy cards referencing entire page ranges (e.g., 99-118) rather than targeting a specific exercise pattern. This is structurally acceptable but borders on catch-all. | Consider tighter task-card focus for future batches once task-card policy strictness increases, as noted in the manifest exclusions for test/keys sections. |

## Checklist Results

### 1. Read-Only Integrity: PASS
- `章节/*.md` timestamped May 2026; unchanged.
- `原始OCR/` contains 186 files; unchanged.
- `README.md`, `封版说明.md` timestamped May 2026; unchanged.
- No writes to sealed source areas detected.

### 2. Base Validator: PASS
- Output: `PASS: 186 OCR files (pages 1-186), 11 chapters ... FULL COVERAGE 1-186`
- Sealed library integrity confirmed.

### 3. Source Traceability: PASS
- All 29 cards have `source_file` and `source_pages` in frontmatter (grep-confirmed).
- All 29 cards have `manifest_id`.
- All 29 cards include a `## Source` section with manifest item reference.

### 4. Learning Action: PASS
- All 29 cards contain exactly one `## Learning Action` section (grep count = 29).
- Each action is a clear, focused learner task (not a passive description).

### 5. Section Separation: PASS
- All sampled cards clearly separate sections: `Original Russian`, `Chinese Translation`, `Source Evidence/Example`, `Generated Notes`, and `Source`.
- No card conflates original text with generated content.
- No card presents agent interpretation as original book content.

### 6. Caution Handling: PASS
- **review_allowed** (vml-1-1-1, vml-1-1-2, vml-1-4-1, vml-1-4-2): All 12 cards carry `status: draft_needs_review`, `generation_status: needs_review`, and visible `[!warning] Review Allowed Source` block with specific risk notes (OCR/layout, proper names, terminology, sensitive science).
- **repaired_pass** (vml-3-beginning, vml-3-ending): All 12 cards carry `[!warning] OCR-Risk Caution` block preserving page-specific OCR risks (99, 117, 125, 130, 134).
- **PASS** (vml-2-1-1): 4 of 5 cards carry `[!warning] Source Caution` about page 56 quotation/omission zones. The nagruzka card exemption is documented and justified via pilot2 review.

### 7. Pages 167-186: PASS
- No card file references pages 167-186 or the AI vocabulary appendix as original reading text.
- Report files (`skipped_items.md`, `completion_report.md`) correctly document these pages as excluded by manifest.

### 8. Page 56 Source-Image Caution: PASS
- vml-2-1-1 article, theme, task, and klaster vocabulary cards all carry page 56 source-image caution.
- Nagruzka vocabulary card is exempt per pilot2: "the cleanest candidate for the pattern because it uses an intact source sentence and real aligned Chinese translation."

### 9. Encoding: PASS
- Russian Cyrillic characters render correctly across all sampled cards.
- Chinese characters render correctly across all sampled cards.
- Zero mojibake detected in 21 fully-read cards; grep of all 29 card files found no encoding anomalies.

### 10. Card Count vs Manifest: PASS
- Reported: 29 cards (7 article + 8 theme + 10 vocabulary + 4 task) across 7 manifest entries.
- Verified: 29 card files exist and match reported types.
- Per-block counts are within manifest `batch_size_guidance` limits:
  - Max 1 article per block: 7 blocks, 7 cards. Within limit.
  - Max 2 theme per block: vml-3-beginning has 2; all others have 0 or 1. Within limit.
  - Max 3 vocabulary per block: max actual is 2 (vml-1-4-1, vml-2-1-1, vml-3-beginning, vml-3-ending). Within limit.
  - Total batch 29 within target 25-45.

### 11. Translation Placeholders: PASS
- Grep for `TODO|placeholder|待翻译|TBD|empty|translate here|待补充|отсутствует` across all card files: zero matches.
- All Chinese Translation sections contain real translated text from the referenced Agent B translation files.

## Residual Risk

1. **review_allowed cards (12 of 29)**: The underlying translation and source quality issues (OCR/layout, proper names, aerospace terminology, medical terminology, sensitive science wording) that prompted `review_allowed` status remain unresolved. These cards are structurally correct drafts but must not be promoted to formal learner-facing material without human review of the flagged content.

2. **Page 56 quotation zones**: Cards using quotations near `<…>` omission markers remain at `needs_review` for formal publication, as the source-image verification has not been performed.

3. **Section 3 excerpts**: The 99-118 and 119-138 page ranges are broad repaired-pass blocks. Cards select short anchors, not exhaustive coverage. Missing literary excerpts from these ranges is by design and not a defect.

4. **Agent A source examples**: Vocabulary cards use lemma/matched-form metadata without Agent A verified source-example matches. If Agent A data becomes available, vocabulary cards should be enriched with `source_example_file` links.

## Recommended Next Step

Proceed with Obsidian vault integration as **draft cards only**, with the following guardrails:

1. Cards from `review_allowed` sources must remain tagged/visible as `needs_review` in the vault.
2. Cards from `repaired_pass` sources should display OCR-risk caution callouts.
3. Page 56 cards should carry source-image caution until page 56 quotation zones are verified against the original image.
4. Do not integrate as formal learner-facing material without resolving the review items flagged in this report.
