# Task 1 report — B2 dashboard progress aggregation

## Changed files

- `js/russian-b2/dashboard.js`
  - Exported `safeObject` and the pure `buildDashboardProgress` aggregator.
  - Added module-specific completion rules, resilient unavailable-inventory results, validated continuation data, timestamp handling, and the four required archive keys.
- `tests/russian-b2/dashboard-progress.test.js`
  - Added coverage for empty/partial/complete records, corrupt data, manual drafts/notes, exam completion, inventory degradation, timestamps, and last-read validation.
- `tests/russian-b2/dashboard-sync.test.js`
  - Added archive-key and backwards-compatible archive validation coverage.

## TDD evidence

1. Ran `node --test tests/russian-b2/dashboard-progress.test.js` before implementation.
   - Failed as expected because `safeObject` and `buildDashboardProgress` were not exported (6 failing tests).
2. After implementation, ran:
   - `node --test tests/russian-b2/dashboard-progress.test.js tests/russian-b2/dashboard-sync.test.js`
   - Result: 10 passing, 0 failing.
3. Ran `git diff --check` successfully.

## Self-review

- The aggregator is DOM/localStorage-free and sanitizes all object-shaped input boundaries.
- Progress counts are bounded by totals; review uses a null percentage and an honest summary.
- Writing/speaking completion requires explicit manual completion records; drafts and notes remain secondary-only.
- Timestamps are emitted only from parseable record timestamp fields.
- Existing archive merge and validation behaviour remains intact; archives without the new keys continue to validate.

## Commit

`feat: aggregate B2 dashboard progress`

## Review-fix report

### Findings fixed

1. Chapter inventory entries that declare non-array `questionIds` or `taskIds` now make that module unavailable. The resulting entry has `progressAvailable: false`, `completed: 0`, and `secondaryLabel: '进度暂不可用'`; it cannot be completed through vacuous array checks.
2. Exam writing tasks now require both `completed === true` and a parseable `updatedAt`, matching the writing/speaking manual-completion contract.

### TDD and verification

- Added regression assertions before the fix and ran `node --test tests/russian-b2/dashboard-progress.test.js`.
  - The new malformed-inventory and missing-exam-timestamp checks failed as expected (2 failures).
- Ran `node --test tests/russian-b2/dashboard-progress.test.js tests/russian-b2/dashboard-sync.test.js` after the fix.
  - Result: 11 passing, 0 failing.
- Ran `git diff --check` successfully.

### Self-review

- Validation applies uniformly to all module inventories, including optional objective-only exam chapters (where absent fields remain valid).
- The exam timestamp gate is intentionally limited to manual writing completion; objective answer records retain their existing completion rule.
- The changes do not alter archive behavior or touch reader/user data.

### Fix commit

`fix: validate B2 progress records`
