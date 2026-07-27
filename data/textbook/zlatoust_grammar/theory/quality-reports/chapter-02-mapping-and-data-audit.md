# 第 2 章映射与数据核对报告

**日期：** 2026-07-26
**状态：** `REVIEW`，不是无风险 PASS。

## 结论

- 150/150 道 Chapter 2 练习已显式归档：125 `mapped`、14 `needs-review`、11 `source-exercise-only`。
- PDF 020–042（印刷页 18–40）的题干和选项已视觉核对；未发现题面或选项差异。
- PDF 125 / 印刷页 123 的原书答案表核对出 18 条导入答案键差异，均已修复到 `ch0001.json`，且所有 ID 不变。
- `GL2-Q149`、`GL2-Q150` 位于原书印刷页 40 / PDF-042；导入 `sourcePages.questions` 原先仅到页 39，现已补全。

## 可追溯输出

- `mappings/chapter-02-exercise-to-rules.json`：每题的页码、规则 ID、状态、映射理由和 REVIEW 标记。
- `mappings/chapter-02-section-to-exercises.json`：规则到练习的反向索引。
- `mappings/chapter-02-mapping-review.json`：25 条非 `mapped` 项目的具体原因。
- `quality-reports/chapter-02-data-repair.json`：18 条答案修复、1 条来源元数据修复及兼容性处理。

## 数据修复

PDF 答案表将以下导入答案修正为正确选项；每条的导入值、PDF 原文、修复值、页码、ID 兼容性和验证结果均已保存在数据账本：

`GL2-Q010`、`GL2-Q015`、`GL2-Q017`、`GL2-Q020`、`GL2-Q036`、`GL2-Q041`、`GL2-Q043`、`GL2-Q046`、`GL2-Q051`、`GL2-Q065`、`GL2-Q087`、`GL2-Q088`、`GL2-Q094`、`GL2-Q113`、`GL2-Q115`、`GL2-Q129`、`GL2-Q137`、`GL2-Q150`。

答案与 `sourceAnswer` 现完全一致，且每个答案字母都存在于该题原有选项中。没有改动题目 ID、题目顺序、收藏、进度或任何 localStorage 键。

## 后续工作

下一批是 2.1–2.8 的完整规则单元和来源覆盖账本。规则单元需保留原书表格、例句、条件、限制、逐题理由和选项分析；`needs-review` 与 `source-exercise-only` 不能被隐藏或伪装为已验证规则。
