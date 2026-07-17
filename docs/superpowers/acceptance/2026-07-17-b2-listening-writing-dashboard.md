# B2 Listening, Writing, and Unified Dashboard Acceptance

Date: 2026-07-17

## Scope accepted

- The shelf exposes one `russian_b2` textbook. Its dashboard contains grammar, reading, writing, listening, speaking, exam, and review modules.
- Listening publishes all 25 source-verified questions in five task families. The exam view keeps the transcript hidden; intensive listening exposes it with click lookup. Dialogue display labels remain visible while the TTS input uses label-free `speechText` and distinct voices.
- Writing publishes 13 source-backed task types. Each has printed/PDF page references, a source model, structured format blocks, rubric, separately-labelled learning support, local autosave, immutable saved versions, and recorded model unlocks.
- The recommendation task uses printed pages 90-92 / PDF-094-096. The full-book ledger maps all remaining applied-writing and listening ranges through PDF-112.
- Added 29 source-derived formal-writing lookup entries. Dictionary audit remains above the 98% structured-textbook threshold.

## Automated evidence

- `node scripts/russian-b2/build-full-book.js --strict`
- `npm run verify:russian-b2`
- `npm run verify:russian-dictionary`

## Browser evidence

- Desktop, 1440 px: unified shelf -> B2 dashboard -> application workbench. Verified Russian source instruction, document checklist, draft version action, model lock, and no fabricated time badges.
- Desktop, 1440 px: listening task 1-5 opens in exam mode. Verified questions are shown before the transcript; `精听这段材料` exposes speaker-labelled source text.
- Narrow, 390 px: application workbench and listening intensive view fit without horizontal scrolling.

Temporary Playwright screenshots are deliberately kept under `tmp/` and are not source artifacts.
