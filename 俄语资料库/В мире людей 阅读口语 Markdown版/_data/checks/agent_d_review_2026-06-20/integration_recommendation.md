# Integration Recommendation: Nightly Run 2026-06-20

## Decision

Proceed with **translation repair first**.

Do not start Agent C full generation from the entire Agent B full translation run yet. Agent C may run a narrow second pilot using the reviewed Agent B pilot translation for `Текст 2.1.1`, but full-card generation should wait until the Section 3 translation failure markers and part 1 incomplete-body notes are repaired or explicitly excluded from scope.

## Recommended Stage Order

1. **Agent B translation repair: REQUIRED**
   - Repair all `RuntimeError: empty translation response` and `MT failed` blocks in `翻译版/full_run_2026-06-20/part3_section3/`.
   - Repair or explicitly exclude part 1 sections reported as incomplete in `part1_front_and_section1/疑难句.md`.
   - Re-scan for `needs_review`, `MT failed`, `empty translation response`, `TODO`, `FIXME`, and `未翻译`.

2. **Agent C second pilot: ALLOWED**
   - Use only `翻译版/agent_b_pilot_2026-06-20/Текст_2.1.1_Новая_российская_столица_aligned.md`.
   - Replace translation placeholders in the existing pilot pattern for one reading text.
   - Keep page 56 OCR/source cautions visible.

3. **Agent A morphology pass: ALLOWED IN PARALLEL**
   - Agent A exact batch can be accepted as the conservative baseline.
   - A morphology pass should target the 500 exact-unmatched items and label non-exact matches as `needs_review` unless manually verified.

4. **Agent C full generation: WAIT**
   - Start only after translation repair is reviewed, or define a reduced scope that excludes unrepaired sections and appendix pages 167-186 as original reading material.

## Stream Readiness

| Stream | Ready For Next Stage? | Next Stage |
|---|---|---|
| Agent A exact source examples | Yes | Verified morphology pass or downstream exact-example consumption |
| Agent B full translation | No, repair first | Translation repair and focused review |
| Agent B pilot translation | Yes, pilot-only | Agent C second pilot with real translation insertion |
| Agent C pilot cards | Yes, schema/pilot only | Second pilot after B pilot translation insertion |

## Integration Guardrails

- Do not use pages `167-186` as original reading text or real source-example evidence.
- Do not feed Agent B full Section 3 into card automation until failure markers are removed or excluded.
- Preserve `needs_review` markers when consuming draft translations or cards.
- Keep every card linked to source file, source pages, and source section/anchor where available.
