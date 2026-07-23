# 05 Delivery Format

## 完成报告模板

每个 agent 完成任务后必须输出以下格式的报告：

```markdown
## Completion Report

**Agent:** <A/B/C/D/E>
**Scope:** <范围描述>
**Date:** <YYYY-MM-DD>

### Verdict
<PASS | REVIEW | FAIL | BLOCKED>

### Output Files
| File | Type | Status |
|------|------|--------|
| ... | ... | ... |

### Count Summary
- 总数:
- 通过:
- 需审核:
- 失败:

### Verification Performed
- [ ] 源追溯性检查
- [ ] 格式检查
- [ ] 只读区域完整性
- [ ] 内容抽样检查

### Risks
- ...

### Next Recommended Step
- ...
```

## 文件命名规范

| 文件类型 | 命名格式 | 示例 |
|---------|---------|------|
| 学习单元（阅读） | `Текст X.X.X — Название.md` | `Текст 1.1.1 — Достопримечательности Мурома.md` |
| 学习单元（写作/口语） | `Тема X.X — Название.md` | `Тема 1.1 — Наш дом столица или провинция.md` |
| 学习单元（听力） | `Аудирование X.X — Название.md` | |
| 翻译文件 | `模块名-翻译.md` | `阅读模块-翻译.md` |
| 例句匹配 | `模块名-examples.json` | |
| 卡片 | `卡片类型 — 标题.md` | |
| 报告 | `报告主题-YYYY-MM-DD.md` | |
