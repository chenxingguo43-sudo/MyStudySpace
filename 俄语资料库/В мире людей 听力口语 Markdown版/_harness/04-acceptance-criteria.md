# Acceptance Criteria

The project can pass only when:

- The intended root path is used.
- Near-duplicate roots are checked.
- Every declared source page has an OCR page file or explicit missing-page note.
- Generated learning units use the writing-speaking profile (adapted for listening-speaking).
- Original tasks are preserved before explanations.
- Generated answers are labeled as generated study support.
- Normal Russian prose is not formatted as code.
- OCR uncertainty remains visible.
- Completion claims are verified by reading files.
- Chinese translations are in `翻译/`, not inside `> [!note] 原书内容`.

Verdicts:

- `PASS`: complete and verified.
- `REVIEW`: usable with named risks.
- `FAIL`: wrong root, missing source, missing sections, or unlabeled generated material.
