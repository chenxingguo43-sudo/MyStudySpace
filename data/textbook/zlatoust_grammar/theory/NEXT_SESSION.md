# Zlatoust Grammar Knowledge System

**Current status:** 1.4.1 一体化独立教学页样板已实现并验收；全书批量推广尚未开始。来源 OCR 仍为 `REVIEW`，不得描述为无风险 PASS。

## Completed scope

- 597/597 exercises explicitly classified: 381 mapped, 14 needs-review, 202 source-exercise-only.
- 32/32 theory sections have source-traceable rule units.
- All five chapters have PDF data-repair ledgers; existing IDs and localStorage contracts are preserved.
- `reader.html` loads chapter theory navigation, rules, exercise links and weak-rule aggregation.
- Formal Chapter 1 mappings now contain ID, chapter, exercise and theory PDF/printed pages, mapping reason and review status; 37 stale unit exercise-page references were corrected.

## Evidence

- `full-book-index.md`
- `quality-reports/bidirectional-mapping-report.md`
- `quality-reports/content-quality-report.md`
- `quality-reports/data-quality-report.md`
- `quality-reports/localstorage-compatibility-regression-report.md`
- `ARCHIVE_SEAL.md`

## Pedagogy reinforcement (2026-07-26)

- 11 个此前缺少 `semanticAnalysis` 的单元已经补足：1.1–1.4、4.1–4.4、5.1、5.2、5.lexical。
- 每条新增解释均是 `learning-note`，用于说明近似形式之间的意义差异和判断前提；没有修改原书规则、题目、答案、映射、ID 或来源状态。
- `reader.html` 继续将该层显示为“语义说明与判断依据”；Playwright 覆盖了第 4 章时间连词和第 5 章不定代词两种数据形态。
- 继续审计其余卡片的教学闭环，优先补“学习者看到规则仍无法判断真实句子”的地方，而不是增加空泛定义。

## Integrated learning sample 1.4.1 (2026-07-26)

- 第 1 章只保留知识点卡片入口，不再单独显示“本章学习路线”或“第 1 章思维导图”；1.4.1 卡片进入独立、连续的长文教学页。
- 1.4.1 教学页内将学习路线与思维导图分开：路线表达六步学习顺序和自动进度，思维导图表达中心知识点与五组对立概念的关系。
- 英文外部资料已改为中文教辅整理：正文提供中文结论、用途和边界，英文原页只保留在可选核验折叠区，不要求学习者阅读。
- 页面包含 5 个教学阶段、10 道阶段随堂题、1 道综合判断和 13 道原书正式题。
- 随堂题使用 `rr_zlatoust_learning_v1`，正式题继续使用 `rr_b2_progress_v1`；两者不会互相污染。
- 错题反馈包含误判原因、回看规则、最小对比和同类再练；返回章节知识点卡片列表后会恢复滚动位置并显示真实状态。
- 390x844 手机布局和 1440x900 桌面布局已人工检查；项目验证器 0 failures，静态测试 53/53，Playwright 7/7。
- 下一步先让用户实际试学并调整样板，再决定是否推广到 1.4.2；不要直接批量生成其余知识点。

## Required verification after any future change

```powershell
node D:\MyStudySpace\scripts\validate-zlatoust-grammar-project.js
node --test tests\russian-b2\reader-static.test.js
npx playwright test --config=playwright.zlatoust.config.cjs
```

## Known risks

- OCR source remains REVIEW; do not erase this label without a visual proofing pass.
- GL1-Q076 remains source-exercise-only. GL3-Q039 remains needs-review.
- Existing historical result semantics after answer-key corrections require non-destructive re-evaluation from repair ledgers if a migration is requested.
