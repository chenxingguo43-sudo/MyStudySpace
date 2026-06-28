# Repair Integration Recommendation: 2026-06-20

## Decision

Proceed with a **second Agent C card pilot** using reviewed repair inputs.

Do **not** start Agent C full generation from the full Agent B translation corpus yet. The high-priority repair blockers have been cleared, but the translation set still carries review-only OCR, terminology, and dense-test risks that should be bounded before broad automation.

## Recommended Next Stage

| Stage | Decision | Scope |
|---|---|---|
| Agent C second pilot | ALLOWED | Use a narrow, explicitly sourced selection from the repaired translation outputs. Prefer one repaired Part 1 text or one repaired Section 3 text/task block. Preserve `needs_review` warnings in card metadata or notes. |
| Agent C full generation | WAIT | Begin only after the coordinator defines a repaired-only input manifest and either excludes or resolves remaining `needs_review` areas. |
| Formal bilingual/learner-facing promotion | WAIT | Requires human/PDF review for OCR-risk pages and terminology-sensitive texts. |

## Approved Inputs For Pilot-Only Use

- `翻译版/repair_2026-06-20/part1_front_and_section1/предисловие.zh.md`
- `翻译版/repair_2026-06-20/part1_front_and_section1/раздел1-продолжение.zh.md`
- `翻译版/repair_2026-06-20/part3_section3/section3-beginning-zh-aligned.md`
- `翻译版/repair_2026-06-20/part3_section3/section3-ending-zh-aligned.md`
- `翻译版/repair_2026-06-20/part3_section3/section3-keys-test-zh-aligned.md`

## Guardrails

- Consume repaired files, not the original `翻译版/full_run_2026-06-20/` copies for the previously blocked sections.
- Preserve source metadata, page ranges, anchors, and `needs_review` status in generated cards.
- Do not treat pages 155-158 matrix material as reconstructed; keep it excluded or explicitly review-only.
- Do not use this recommendation as approval for full-card generation across all translation folders.

## Final Recommendation

Agent C second pilot may proceed. Agent C full generation should still wait.
