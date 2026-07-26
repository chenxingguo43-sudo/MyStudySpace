# Chapter 2 规则单元内容复核

**结论：** `REVIEW`。十个 Chapter 2 单元都从 cleaned source 生成，含完整来源片段、原书表格、来源例项、中文定位、快速判断、对照、常见错误、逐题链接和选项分析。

## 已检查的结构

- 2.1–2.8 的十个目标小节均有独立 JSON 单元。
- 每个单元均保留原书来源页、PDF 页和 cleaned-source 路径。
- 每个关联练习均回链至映射中的 ruleId、candidateRuleId 或 source-exercise-only 说明。
- 题目正确项来自已修复的题库；其 PDF 答案来源保持为 PDF-125 / 印刷页 123。
- 中文层只使用 `learning-note`，未替代或篡改 source-rule/source-table/source-example。

## 保留风险

- 全部理论 OCR 页仍为 REVIEW；跨页表格、重音、标点和排版需要继续视觉复核。
- 2.8 的 ради、за、на 仅有目录性来源，不生成未保留条件的原书规则。
- 映射中的 needs-review 和 source-exercise-only 项必须在前端继续显式可见。
