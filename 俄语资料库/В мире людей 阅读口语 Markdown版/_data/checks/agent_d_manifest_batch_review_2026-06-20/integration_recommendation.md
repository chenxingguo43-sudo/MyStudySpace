# Integration Recommendation: Manifest Batch Card Output

## Decision

**REVIEW** -- Proceed with bounded draft integration into Obsidian vault, but do not merge as formal learner-facing cards.

## Integration Tiers

### Tier 1: Ready for Draft Vault Integration (17 of 29 cards)

Cards from `PASS` and `repaired_pass` sources that carry `candidate_high` generation status and visible source cautions. These are structurally sound and can be placed in the Obsidian vault as draft study aids.

| Manifest ID | Card IDs | Card Count |
|---|---|---|
| vml-2-1-1 | article, theme, vocabulary (nagruzka), task | 4 |
| vml-3-beginning | article, theme (dream-image), theme (east-west-bridge), vocabulary (most), vocabulary (provintsial), task | 6 |
| vml-3-ending | article, theme, vocabulary (neobkhodimost), vocabulary (svyazi), task (abstract-noun), task (heritage) | 6 |
| vml-2-1-1 | vocabulary (klaster) | 1 |

**Integration conditions for Tier 1:**
- Preserve visible `[!warning] Source Caution` / `[!warning] OCR-Risk Caution` callouts in Obsidian.
- Tag all cards with `status/draft` and `status/needs_review` where applicable.
- Keep `source_file`, `source_pages`, and `manifest_id` properties intact for traceability.

### Tier 2: Draft Vault Integration With Strong Review Warnings (12 of 29 cards)

Cards from `review_allowed` sources. These must remain clearly flagged as needing human review before any formal learner-facing use.

| Manifest ID | Card IDs | Card Count | Primary Risk |
|---|---|---|---|
| vml-1-1-1 | article, theme | 2 | Double-column OCR/layout, proper names |
| vml-1-1-2 | article, theme, vocabulary (zapovednik) | 3 | Proper names, place names, OCR/layout |
| vml-1-4-1 | article, theme, vocabulary (raketostroenie), vocabulary (vzaimodeistvovat) | 4 | Aerospace terminology, institution names |
| vml-1-4-2 | article, theme, vocabulary (belletristika) | 3 | Medical terminology, sensitive science wording |

**Integration conditions for Tier 2:**
- All Tier 1 conditions apply.
- Additionally, add a visible vault-level note or tag indicating `review_allowed` source status.
- Do not cross-link these cards to formal vocabulary databases or graded curriculum until reviewed.

### Not Ready for Integration (0 cards)

No cards in this batch are blocked from draft integration. All cards meet the minimum structural requirements.

## Integration Protocol

### Pre-Integration Checks
1. Run base validator to confirm sealed library has not been modified since Agent C generation: **PASS (done)**
2. Verify all 29 card files are present and have valid UTF-8 encoding: **PASS (done)**
3. Confirm no forbidden content (pages 167-186, unrecoverable matrices): **PASS (done)**

### During Integration
1. Place all 29 card files in the Obsidian vault under `卡片草稿/manifest_batch_2026-06-20/` (or a vault-appropriate path).
2. Preserve all YAML frontmatter fields that provide source traceability.
3. Keep all `[!warning]` callout blocks visible -- do not suppress or collapse them.
4. Ensure Obsidian renders the Cyrillic and Chinese text correctly (preview check).

### Post-Integration
1. Update the card generation manifest status from `draft` to `integrated_draft` for Tier 1 cards.
2. Leave Tier 2 cards at `draft_needs_review` until human review completes.
3. Schedule a follow-up review of the review_allowed source blocks when OCR/layout/terminology issues are resolved.

## Alignment With Pilot2 Recommendation

The Agent D pilot2 recommendation (2026-06-20) specified:

> "Start a small broader draft batch from PASS/repaired translation sections only, with a manifest-first workflow. Include a limited number of explicitly allowed REVIEW sections only if their cautions are preserved in card frontmatter and visible warning blocks."

This batch complies: all 29 cards preserve source cautions in frontmatter (`status`, `generation_status`) and visible warning blocks (`[!warning]`). The manifest explicitly defined `review_allowed` items with review reasons and OCR cautions. Agent C correctly carried those into the card output.

## Veto Conditions

Do NOT integrate if:
1. The sealed library (`章节/`, `原始OCR/`, `README.md`, `封版说明.md`) has been modified without authorization.
2. Any card is missing `source_file` or `source_pages` frontmatter.
3. Any card presents AI appendix (pages 167-186) content as original reading text.
4. Any card's `[!warning]` blocks have been removed or edited to downplay source risks.

**None of these veto conditions apply to this batch.**

## Recommended Decision

**APPROVE for draft Obsidian vault integration only.** Cards are structural PASS but carry unresolved source risks that the manifest explicitly declared and Agent C correctly preserved. Formal learner-facing promotion requires resolution of the review_allowed items listed above.
