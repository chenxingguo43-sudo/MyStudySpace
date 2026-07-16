# 俄语 B2 剩余语法题库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** 发布第 1、3、4 部分全部语法题和第 6 部分可独立作答的语法题。

**Architecture:** 使用同一份发布清单和通用构建器。来源台账校验器按 `part` 验证 `P<part>-Qnnn`，每部分拥有独立的题号范围与证据台账。

**Tech Stack:** Node.js、node:test、静态 HTML、JSON、Poppler。

## Global Constraints

- 原书唯一依据为 `E:\\Desktop\\俄语B2.pdf`；OCR 只用于定位。
- 发布题目必须有题页、规则页、答案页、原书答案、原书解析、译文和 `verified` 状态。
- 不改 `package-lock.json`、原书/页图资源、`data/textbook/russian_b2/pages/`、`tmp/`。
- P6 只发布有完整独立题干、四个选项和单一答案的题。

### Task 1: 泛化台账校验器

**Files:** `scripts/russian-b2/verify-source-ledger.js`、`tests/russian-b2/contracts.test.js`。

- [ ] 写测试：用 `part: 1`、`P1-Q001` 的台账和单元调用 `verifySourceLedger`，期望空错误数组；把题目改为 `P2-Q001`，期望错误含 `P1-Qnnn`。
- [ ] 运行 `node --test tests/russian-b2/contracts.test.js`；确认当前硬编码 `P2-Qnnn` 使测试失败。
- [ ] 实现：从 `ledger.part` 生成 `new RegExp('^P' + part + '-Q\\d{3}$')`，并拒绝 `unit.part !== part`。
- [ ] 运行 `npm run test:russian-b2`，期望 PASS；提交 `feat: generalize B2 source ledger verification`。

### Task 2: 发布第 1 部分（题 1–60）

**Files:** 新增 `part-01-source-ledger.json`、`p1-q001-q010.json` 至 `p1-q051-q060.json`；修改语法词汇 `index.json` 与 `tests/russian-b2/contracts.test.js`。

- [ ] 写测试：发布 P1 题号扁平化后严格等于 `Array.from({length: 60}, (_, i) => i + 1)`，且 `verifySourceLedger({ledger: p1Ledger, units: p1Units})` 为空数组。
- [ ] 运行测试，预期因缺 `part-01-source-ledger.json` 失败。
- [ ] 运行 `pdftoppm -f 1 -l 80 -jpeg -r 180 "E:\\Desktop\\俄语B2.pdf" "tmp\\pdfs\\b2-remaining\\PDF"`；从题页、规则页和答案页逐题写台账。
- [ ] 创建 6 个连续单元。每题使用 `P1-Qnnn`、原书四选项、`answer === sourceAnswer`、`sourceExplanation` 含原书解析和译文、`reviewStatus: "verified"`。
- [ ] 运行 `node scripts/russian-b2/build-book.js; npm run test:russian-b2; git diff --check`，预期 PASS；提交 `feat: publish verified B2 part 1 grammar units`。

### Task 3: 发布第 3 部分

**Files:** 新增 `part-03-source-ledger.json`、`p3-q*.json`；修改语法词汇 `index.json` 和契约测试。

- [ ] 写失败测试：P3 发布题号严格等于 P3 台账的完整声明范围，且台账校验无错误；运行并确认缺台账失败。
- [ ] 用 `P3_questions.md`、`P3_answers.md` 定位，然后逐页核对 PDF，建立题页、规则页、答案页、原书答案、解析和译文。
- [ ] 每 10 题生成一个连续 P3 单元；无法可靠核对的题写入第 3 部分审查报告，不发布。
- [ ] 运行构建、`npm run test:russian-b2` 和 `git diff --check`，预期 PASS；提交 `feat: publish verified B2 part 3 grammar units`。

### Task 4: 发布第 4 部分

**Files:** 新增 `part-04-source-ledger.json`、`p4-q*.json`；修改语法词汇 `index.json` 和契约测试。

- [ ] 写失败测试：P4 单元 ID 无重复、题号完全匹配 P4 台账范围、台账校验为空；运行并确认缺台账失败。
- [ ] 逐页核对 PDF，保持关系词和复句题原书选项顺序；记录所有规则页和答案页。
- [ ] 每 10 题生成一个连续 P4 单元，重建并验证；提交 `feat: publish verified B2 part 4 grammar units`。

### Task 5: 审核并发布第 6 部分独立题

**Files:** 新增 `质量报告/part-06-scope-review.json`、`part-06-source-ledger.json`、`p6-q*.json`；修改语法词汇 `index.json` 和契约测试。

- [ ] 写失败测试：范围报告中每项都有整数 `printedNumber` 和 `publish`/`exclude` 决定；P6 发布单元通过台账验证。
- [ ] 逐题审核原书；排除理由仅为 `reading-context`、`document-template`、`open-response`、`source-uncertain`。
- [ ] 只为 `publish` 题建立台账和单元。如存在题号跳跃，将连续块分为独立台账，不让范围覆盖排除题。
- [ ] 重建、测试、格式检查均通过后，提交 `feat: publish independent B2 part 6 grammar units`。

### Task 6: 跨部分验收

**Files:** 新增 `docs/superpowers/acceptance/2026-07-16-russian-b2-remaining-grammar-rollout.md`；修改契约测试。

- [ ] 写失败测试：对每个发布部分 P1、P2、P3、P4、P6 加载清单、台账和规范单元，均通过 `verifySourceLedger`。
- [ ] 运行 `node scripts/russian-b2/build-book.js; npm run test:russian-b2; git diff --check`，预期退出码 0。
- [ ] 浏览器抽查每部分首、末单元；至少一次选错、确认、展开解析、刷新，检查答案隐藏、原书解析/译文/PDF 页码、进度持久化和滚动位置。
- [ ] 写报告，列出发布范围、P6 排除理由、命令结果和已知风险；提交 `docs: record remaining B2 grammar rollout acceptance`。
