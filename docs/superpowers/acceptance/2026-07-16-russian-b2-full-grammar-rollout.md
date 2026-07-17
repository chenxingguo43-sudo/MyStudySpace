# Russian B2 full grammar rollout acceptance

## Published scope

| Part | Published independent questions | Reader units | Original evidence |
| --- | --- | ---: | --- |
| P1 | 1–60 | 6 | PDF-006–PDF-018 |
| P2 | 1–70 | 7 | existing verified ledger |
| P3 | 1–50 | 5 | PDF-036–PDF-047 |
| P4 | 1–50 | 5 | PDF-047–PDF-059 |
| P5 | 1–50 | 5 | PDF-059–PDF-066 |
| P6 | 1–8, 27–36 | 2 | PDF-066–PDF-072 |

P6 exclusions are recorded in `part-06-exclusion-report.json`: 9–26 depend on a biography or short source text; 37–50 depend on the layout and context of an application or explanatory letter.

## Automated acceptance

On 2026-07-16:

- `npm run test:russian-b2`: 35 passing, 0 failing.
- `node scripts/russian-b2/verify-source-ledger.js`: all published source ledgers verified.
- `node scripts/russian-b2/build-book.js`: regenerated reader JSON, Obsidian learning units, range map, and quality report.

## Browser acceptance

- Loaded P1, P3, P4, P5, and P6 reader chapters; each first unit showed ten independently selectable questions.
- In P6, verified the answer remains hidden until confirmation; after confirming Q001, source answer, verified original explanation, AI reference explanation, and original PDF pages appeared only after manually expanding the explanation.
- Verified the P6 filtered title is `独立语法题（1–8、27–28）`; Q008 displays only its four original options, with no imported material heading.
