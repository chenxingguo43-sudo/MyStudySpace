# B2 即点即答、二刷与错题复习 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 B2 练习默认单击作答，并支持全量、错题和知识点三种重刷。

**Architecture:** 在现有 `rr_b2_progress_v1` 题目记录上加入累计历史字段和当前轮次状态。阅读器根据作答模式提交选项，并通过筛选后的 `currentQuizExercises` 渲染重刷题集。

**Tech Stack:** 静态 HTML/CSS/JavaScript，Node `node:test`。

## Global Constraints

- 不自动展开任何答案或解析。
- 单击提交后不可在同轮改答；历史错误不被删除。
- 不暂存 `package-lock.json` 或现有未跟踪资源。

---

### Task 1: 作答模式与题目历史

**Files:**
- Modify: `tests/russian-b2/reader-static.test.js`
- Modify: `reader.html`

- [ ] Write failing static tests for `getQuizSettings`, `submitQuizOption`, and an `everWrong` record field.
- [ ] Run `node --test tests/russian-b2/reader-static.test.js`; expect failure for missing symbols.
- [ ] Implement `rr_b2_quiz_settings_v1` with `{ confirmBeforeSubmit: false }`; change option `onchange` to `submitQuizOption(questionId,key)`, which selects and submits immediately unless confirmation mode is enabled.
- [ ] Extend each record with `everWrong`, `lastResult`, and `lastAnsweredAt`; set them in `submitQuizQuestion` without opening explanations.
- [ ] Re-run the static test; expect PASS.

### Task 2: 三种重刷

**Files:**
- Modify: `tests/russian-b2/reader-static.test.js`
- Modify: `reader.html`

- [ ] Write failing tests for `restartQuiz(mode)` and `renderQuizRetryActions`.
- [ ] Run the reader static test; expect failure.
- [ ] Implement `restartQuiz('all')`, `restartQuiz('wrong')`, and `restartQuiz('knowledge', exerciseIds)`. All creates fresh current-round records but retains cumulative fields; wrong filters `everWrong`; knowledge filters matching IDs.
- [ ] Add the three buttons below the completed-section message and add a knowledge-card secondary action that starts its question group.
- [ ] Re-run `npm run test:russian-b2`; expect all tests PASS.

### Task 3: Acceptance

**Files:**
- Create: `docs/superpowers/acceptance/2026-07-16-b2-retry-and-wrong-answer.md`

- [ ] Verify P2 option click shows correctness with no confirm button in default mode.
- [ ] Verify enabling confirm mode restores the two-step behavior.
- [ ] Verify an incorrect answer appears in `只重做错题`; after a correct retry it remains historically recorded and is marked mastered.
- [ ] Commit source, tests, and acceptance evidence with `feat: add B2 retry practice flow`.
