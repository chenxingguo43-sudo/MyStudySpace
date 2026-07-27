# 教辅质量加固：语义辨析补全

**日期：** 2026-07-26
**状态：** REVIEW。原书来源 OCR 继续保持 REVIEW；本批只增加与原书分层的中文学习辅助。

## 本批范围

补足此前没有 `semanticAnalysis` 的 11 个规则单元：

- 第 1 章：`1.1`、`1.2`、`1.3`、`1.4`
- 第 4 章：`4.1`、`4.2`、`4.3`、`4.4`
- 第 5 章：`5.1`、`5.2`、`5.lexical`

每条内容均以 `{ "sourceType": "learning-note", "text": "..." }` 保存。它们解释选择形式时应比较的语义焦点，例如信息状态、时间线、逻辑关系、词义边界和句法成分的实际一致对象；它们不是原书规则，也不会改变练习映射。

## 验证

- `node scripts\validate-zlatoust-grammar-project.js`：REVIEW，0 failures。
- 静态和兼容性测试：64/64 通过。
- `npx playwright test --config=playwright.zlatoust.config.cjs`：6/6 通过。
- 新增浏览器回归从第 4 章 `4.3` 与第 5 章 `5.2` 实际打开规则页，确认“语义说明与判断依据”在页面可见。

## 发现并修复

第 1 章生成器原先按题库页数组推算练习印刷页。重建时会与 PDF 修复后的正式映射页码不一致。现已改为直接使用正式映射的 `exercisePrintedPage` 和 `exercisePdfPage`，主验证器恢复为 0 failures。

## 保留风险

- 原书理论层仍由 OCR 清洗来源构建，继续标记 REVIEW。
- `source-exercise-only` 与 `needs-review` 状态不因新增中文解释而升级。
- 本批没有重新进行 PDF 视觉校对，也没有修改题目 ID、答案或 localStorage 契约。
