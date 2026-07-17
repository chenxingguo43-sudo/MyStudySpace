# B2 错题本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在书架提供可筛选、可跳回原题的 B2 错题本。

**Architecture:** 从现有 localStorage 进度记录和六部分 JSON 提取错题元数据；错题本只保存筛选状态，点击时回到原有题目页面。

**Tech Stack:** 静态 HTML/JavaScript、Node `node:test`。

## Global Constraints

- 仅使用稳定题号和已有 `everWrong`、`lastResult`、`lastAnsweredAt`。
- 不复制题目或解析；不删除历史错误。

---

### Task 1: 可测试的错题聚合

**Files:** Modify `reader.html`, `tests/russian-b2/reader-static.test.js`.

- [ ] Write a failing static test requiring `getWrongAnswerItems()` and `showWrongAnswerBook()`.
- [ ] Run `node --test tests/russian-b2/reader-static.test.js`; expect FAIL.
- [ ] Implement `getWrongAnswerItems()` to join local progress with `currentQuizData`/cached six-part chapter metadata, returning `{exerciseId, partId, knowledgePointId, status, lastAnsweredAt}`; status is `pending` for `everWrong && lastResult === 'wrong'`, otherwise `mastered`.
- [ ] Re-run the static test; expect PASS.

### Task 2: 书架入口、筛选与跳转

**Files:** Modify `reader.html`, `tests/russian-b2/reader-static.test.js`.

- [ ] Write failing tests requiring `renderWrongAnswerBook()` and `openWrongAnswerItem(partId, exerciseId)`.
- [ ] Run the reader test; expect FAIL.
- [ ] Add the bookshelf card, P1–P6 and knowledge-point selects, pending/mastered tabs, empty state, and rows that call `openWrongAnswerItem`.
- [ ] Make `openWrongAnswerItem` load the part then call `jumpToQuizExercise(exerciseId)` after rendering.
- [ ] Run `npm run test:russian-b2`; expect all tests PASS.

### Task 3: Acceptance and commit

- [ ] Verify one wrong P2 item appears as pending, is filterable by its knowledge point, opens its original question, and changes to mastered after a correct retry.
- [ ] Record evidence in `docs/superpowers/acceptance/2026-07-16-b2-wrong-answer-book.md`.
- [ ] Commit with `feat: add B2 wrong-answer book`.
