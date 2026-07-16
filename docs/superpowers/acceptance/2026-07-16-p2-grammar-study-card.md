# P2 grammar study card: acceptance record

Date: 2026-07-16

## Automated checks

- `npm run test:russian-b2`: 46 tests passed.
- `npm run build:russian-b2-study-cards`: passed.
- `node scripts/russian-b2/build-six-part-book.js`: passed, restoring the six-part reader output after the regression suite.
- `git diff --check`: passed.

## Browser acceptance (isolated local test server)

At `http://localhost:3001/reader.html`:

1. Opened **P2 → 持续、原因与时间关系** from the knowledge-point navigation.
2. Confirmed the card contains the intended study sections: what the question set tests, decision order, core rules, comparisons, grammar-book examples, and frequent pitfalls.
3. Confirmed every grammar-book rule/example is visibly source-labelled as `新编俄语语法 · 08 前置词.md`, with its matching section and page; B2-original coverage is visibly labelled `B2 原书考点`; the contrast `через неделю / за неделю` is labelled `学习补充`.
4. Confirmed the card does not contain answer choices, source answers, or per-question answer analysis.
5. Clicked **做本知识点全部题目** and confirmed the resulting exercise list is exactly `P2-Q051` through `P2-Q058`.
6. Recorded one wrong answer in this range, reopened the card, and confirmed **只重做本点错题** produced only `P2-Q051`.
7. Confirmed **查看错题本** opens with both filters preselected: `P2` and `持续、原因与时间关系`.
8. Returned to `P2-Q051` and confirmed the existing **查看答案与解析** source-analysis area remains available independently from the knowledge card.

## Regression prevention

The study-card builder now obtains the six-part P2 chapter directly from the six-part book generator, instead of consuming a transient `ch0001.json` file. This keeps the card validation stable even when the legacy regression suite temporarily regenerates its old 30-unit output.
