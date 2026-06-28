# Quality Report: Nightly Multi-Agent Outputs 2026-06-20

## Verdict

REVIEW

Overall, the nightly outputs are useful drafts, but they are not ready for full downstream integration. Agent A's exact-only example batch is ready as a conservative source-example dataset. Agent B's full translation run requires repair before it is used as a broad input to Agent C full card generation. Agent B's pilot and Agent C's pilot are usable pilot artifacts with clearly marked review risks.

## Findings

| Severity | Target | File | Issue | Recommendation |
|---|---|---|---|---|
| HIGH | Agent B full translation | `翻译版/full_run_2026-06-20/part3_section3/section3-beginning-zh-aligned.md`, `section3-ending-zh-aligned.md`, `section3-keys-test-zh-aligned.md` | Full-run Section 3 contains explicit machine-translation failure markers: 16 failure lines across three aligned files, including `RuntimeError: empty translation response` and one `MT failed` block. | Run translation repair on these blocks before using the full translation set for full card generation or bilingual views. |
| HIGH | Agent B full translation | `翻译版/full_run_2026-06-20/part1_front_and_section1/疑难句.md` | Agent B reports incomplete or structure-only translation for some body sections, including pages 8-13 and 26-31, because the current batch did not fully read those bodies. | Treat part 1 as REVIEW only; repair from source/PDF or sealed chapter text before promotion. |
| MEDIUM | Agent B full translation | `翻译版/full_run_2026-06-20/part2_section2/раздел2-начало.zh.md`, `раздел2-тест.zh.md` | RU/ZH heading counts are not always one-to-one in task-heavy files (`25/26` and `2/7`). This may be intentional task-block grouping, but it means automated paragraph-pair consumers cannot assume strict pair parity. | Before card automation, define how task blocks should be consumed; sample dense exercises manually. |
| MEDIUM | Agent C pilot cards | `卡片草稿/agent_c_pilot_2026-06-20/*/*.md` | All 8 card files contain translation placeholders rather than inserted Chinese translations. This is clearly labeled, but not ready as final learner-facing bilingual cards. | Use the schema as a pilot template; run a second pilot that consumes the reviewed Agent B pilot translation before full generation. |
| MEDIUM | Read-only integrity | repository root `D:/MyStudySpace` | Git status is not a clean proof source because the project subtree appears untracked from the repository root. Run-specific read-only integrity cannot be conclusively proven from git. | Keep relying on write-scope discipline plus the base validator; consider adding checksum manifests for sealed areas before future multi-agent runs. |
| LOW | Agent A exact examples | `_data/source_examples/agent_a_batch_2026-06-20/batch_matches.json` | Exact-only output is valid and conservative, but coverage is intentionally low: 97 matched entries / 124 examples, with 500 unmatched exact-token items. | Accept as exact baseline; run a separate verified-morphology pass for high-value unmatched lemmas. |
| LOW | Agent A exact examples | `_data/source_examples/agent_a_batch_2026-06-20/batch_report.md` | Some examples are long multi-sentence blocks, which are traceable but may be heavy for vocabulary-card UX. | Downstream card generation should shorten examples only after preserving source quote and page metadata. |
| LOW | Agent B full appendix translation | `翻译版/full_run_2026-06-20/part4_commentary_appendix/приложение-лексика.zh-aligned.md` | Appendix translation correctly warns pages 167-186 are AI vocabulary layer, but the output still translates this layer and could be misused by downstream tooling. | Keep appendix artifacts segregated; do not feed them into real reading-example or original-text card pipelines. |

## Review Coverage

| Stream | Files inventoried | Content sample checked | Machine checks |
|---|---:|---:|---|
| Agent A source-example batch | 4 files | `batch_report.md`, `unmatched_or_low_coverage.md`, `completion_report.md`, JSON structure and counts | JSON parsed via Python: 97 matches, 124 examples, 0 missing highlights, 0 missing page values, 0 examples from page 167+ |
| Agent B full translation | 23 Markdown files | Pilot-style samples from parts 1, 3, 4; failure-marker extraction across all files; RU/ZH count scan across all translation files | 16 failure lines found across Section 3; base validator PASS |
| Agent B pilot translation | 4 files | Aligned translation file, terms, uncertainty report, completion report | Source metadata and OCR-risk markers present |
| Agent C pilot cards | 11 Markdown files | All card files scanned for source metadata and sections; article card read directly; completion report read | 8/8 card files include `source_file`, `source_pages`, original text, learning action/notes, and translation placeholder |

## Read-Only Area Integrity

Practical checks performed:

- Ran the base validator successfully from `D:\MyStudySpace\俄语资料整理试验区\_data\validate_v_mire_sample_library.py`.
- Validator result: `PASS: 186 OCR files (pages 1-186), 11 chapters` and `=== FULL COVERAGE 1-186 ===`.
- Checked git status scoped to read-only paths, but the project subtree appears untracked from `D:/MyStudySpace`, so git cannot establish a clean before/after diff for this run.
- No Agent D writes were made outside `_data/checks/agent_d_review_2026-06-20/`.

Conclusion: sealed source coverage remains validator-valid, but run-specific read-only integrity cannot be proven conclusively from git in the current repository state.

## Stream Verdicts

| Stream | Verdict | Rationale |
|---|---|---|
| Agent A source-example batch | PASS | Meets exact-only requirements: parseable JSON, highlighted matched forms, source metadata, appendix excluded as evidence, unmatched report present. |
| Agent B full translation drafts | REVIEW | Useful draft coverage exists, but explicit translation failures and incomplete/review-only sections block promotion. |
| Agent B pilot translation | PASS | Pilot preserves RU/ZH alignment, source metadata, OCR-risk warnings, and uncertainty report; usable for a second card pilot. |
| Agent C pilot cards | PASS | Structurally sound pilot cards with source traceability and separated original/generated/placeholder content; not final bilingual cards. |

## Residual Risk

- The base source itself contains mojibake in this environment, so translation and card consumers should preserve traceability and avoid silent cleanup.
- Agent B full translation is mixed quality by part; treating the whole full run as uniformly card-ready would propagate known failures.
- Agent C full generation has not started and should not be inferred from the pilot.
