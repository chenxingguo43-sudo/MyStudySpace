# 映射层

第 1 章文件：

- `section-to-exercises.json`：理论小节到练习 ID；
- `exercise-to-rules.json`：练习 ID 到规则单元 ID；
- `mapping-review.json`：不确定边界、跨规则题和原书无独立理论讲解的项目。

第 2 章文件：

- `chapter-02-section-to-exercises.json`：理论小节到练习 ID 的反向索引；
- `chapter-02-exercise-to-rules.json`：逐题的规则、来源页、理由和 REVIEW 状态；
- `chapter-02-mapping-review.json`：不确定边界、原书无独立理论讲解的项目，以及 PDF 核对位置。

第 3 章文件：

- `chapter-03-section-to-exercises.json`：理论小节到练习 ID 的反向索引；3.1 总览保留全章 99 题，3.1.1/3.1.2 保留其细规则反查。
- `chapter-03-exercise-to-rules.json`：逐题规则、候选规则、练习与理论页码、映射理由和 REVIEW 状态。
- `chapter-03-mapping-review.json`：63 条 source-exercise-only、`GL3-Q039` 的被动构造原书答案／规则冲突，以及 PDF 核对位置。

第 4 章文件：

- `chapter-04-section-to-exercises.json`：理论小节到练习 ID 的反向索引；`exerciseSectionId` 同时保留原书练习的 §4.5 和直接—间接引语范围。
- `chapter-04-exercise-to-rules.json`：逐题规则、练习与理论页码、映射理由和 REVIEW 状态。
- `chapter-04-mapping-review.json`：9 条 PDF 答案修复、102 条题页元数据修复、6 条开放改写答案核验，以及明确未被理论区说明的练习范围。

每章的全部练习 ID 都必须出现在该章的 `*-exercise-to-rules.json` 中，不能静默遗漏。`mapped` 练习必须有有效规则 ID 和映射理由；`needs-review` 必须有候选规则及风险说明；`source-exercise-only` 不得伪造规则 ID。

- 第 1 章：107/107，106 `mapped`、0 `needs-review`、1 `source-exercise-only`；数据修复记录在 `quality-reports/chapter-01-data-repair.json`。
- 第 2 章：150/150，126 `mapped`、13 `needs-review`、11 `source-exercise-only`；PDF 题页和答案表修复记录在 `quality-reports/chapter-02-data-repair.json`。`GL2-Q098` 以 2.4.2 的 `над + Тв. п.` 表格规则归档，`GL2-Q107` 以 2.6 的 `куда?` 方向规则归档。
- 第 3 章：99/99，35 `mapped`、1 `needs-review`、63 `source-exercise-only`；PDF 答案和题页修复记录在 `quality-reports/chapter-03-data-repair.json`。`GL3-Q039` 必须保留为 `needs-review`：PDF 答案选择被动／反身式构造，而 3.1.2 明确禁止被动构造中的动名副词。
- 第 4 章：102/102，39 `mapped`、0 `needs-review`、63 `source-exercise-only`；PDF 答案和题页修复记录在 `quality-reports/chapter-04-data-repair.json`。§4.5 没有独立理论标题，GL4-Q087–Q102 必须保留为 `source-exercise-only`。
