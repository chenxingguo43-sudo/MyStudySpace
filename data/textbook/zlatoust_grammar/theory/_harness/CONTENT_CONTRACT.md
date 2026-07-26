# 规则单元内容合同

每个规则单元必须包含：

```json
{
  "id": "gl1-1.4.1-result-vs-process",
  "chapterId": "gl1",
  "sectionId": "1.4.1",
  "titleRu": "",
  "titleZh": "",
  "orientationZh": "",
  "quickDecision": [],
  "rules": [],
  "tables": [],
  "examples": [],
  "contrasts": [],
  "exerciseIds": [],
  "source": {
    "printedPages": [],
    "pdfPages": []
  },
  "reviewStatus": "needs-review"
}
```

内容来源类型只允许：

- `source-rule`
- `source-table`
- `source-example`
- `exercise-example`
- `learning-note`
- `external-note`

`learning-note` 和 `external-note` 不能伪装成原书规则。原书 OCR 未核对时使用 `needs-review`，不得强行标记 `verified`。

中文层必须帮助理解，但不能缩小或扩大俄文规则的适用范围。条件、例外、否定结构、语体限制和反例均属于必需内容。
