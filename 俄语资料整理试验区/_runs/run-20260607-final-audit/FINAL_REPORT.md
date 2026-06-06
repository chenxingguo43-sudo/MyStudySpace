# FINAL_REPORT — run-20260607-final-audit

**状态: 完成 ✅**

---

## 本轮修了什么

### 阶段 A: 修复背单词页联动 49→50
- **失败原因**: src-0001 的 25 条旧记录 `surface_forms`/`possible_lexemes` 为空
- **修复**: 从 lexeme_index 反查，为 src-0001 的 25 条记录补全 surface_forms
- **结果**: 50/50 PASS ✅

### 阶段 B: 清理 translation_queue 状态
- pending/ 13 个 batch 文件删除已提交（已移入 processed_pending/）
- manifest.json 更新为 pending=0
- rejected_bad_translations/ 纳入跟踪
- validate_translation_queue.py: ✅ PASS
- validate_translation_results.py: ✅ PASS

### 阶段 C: translated 记录分类
- 为 652 条 translated 记录新增 example_type / display_priority / vocabulary_card_eligible
- 分类结果:
  - grammar_example: 399 条 (eligible)
  - natural_sentence: 161 条 (eligible)
  - vocabulary_table: 69 条 (not eligible)
  - metadata: 13 条 (not eligible)
  - fragment: 10 条 (not eligible)
- 总 eligible: 560/652 (86%)
- validate_example_display_quality.py: ✅ PASS

---

## 数据总览

| 指标 | 数值 |
|------|------|
| sources | 9 |
| sentences 总数 | 1103 |
| translated | 652 (59%) |
| untranslated/rejected | 451 (41%) |
| eligible examples | 560 (86% of translated) |
| natural_sentence | 161 |
| grammar_example | 399 |
| vocabulary_table | 69 |
| metadata | 13 |
| fragment | 10 |
| lexeme_index keys | 3327 |
| grammar_index keys | 22 |

---

## 五个 Validator 结果

| 脚本 | 结果 |
|------|------|
| validate_all_coordinate_data.py | ✅ PASS (0 errors, 0 warnings) |
| validate_translation_queue.py | ✅ PASS (0 errors, 1 warning) |
| validate_translation_results.py | ✅ PASS (0 errors, 0 warnings) |
| validate_vocabulary_examples.py | ✅ 50/50 PASS |
| validate_example_display_quality.py | ✅ PASS (0 errors, 0 warnings) |

---

## Git Commits

| commit | message |
|--------|---------|
| `0422ec5` | test(data): verify translated source examples for vocabulary cards |
| `8ffc313` | feat(data): import verified Chinese translations for source examples |
| `ae979ba` | feat(data): translate clean source example queue |
| `96bfc01` | fix(data): restore clean translation queue before translation |
| `1d5ecff` | fix(data): restore clean translation queue after interrupted translation |
| `f1cd9be` | fix(data): quarantine bad translations and rebuild clean translation queue |
| `f541695` | fix(data): repair translation queue validation and mojibake filtering |
| `8bfe18b` | chore(data): run-20260606-002 质量审计 + 翻译队列 + 验证脚本 |

---

## 剩余问题

1. **451 条 rejected 记录未翻译** — 这些是 fragment/vocabulary_table/metadata，质量不达标。部分 diag-0029 词汇表条目可能值得抢救。
2. **grammar_index 覆盖率 2.3%** — 只有 src-0001 的 25 条有语法标签，其余无标签。
3. **diag-0011 全部未翻译** — 84 条前置词短语被 rejected。
4. **src-0001 旧数据** — possible_lexemes 仍有多条为空（从 lexeme_index 反查只补了 surface_forms）。

---

## 下一轮建议

1. **grammar_tags 补全** — 为 399 条 grammar_example 和 161 条 natural_sentence 补充语法标签。
2. **rejected 记录抢救** — 从 diag-0029 的 451 条 rejected 中筛选可翻译的完整句子。
3. **背单词页集成** — 在 vocabulary.html 中利用 display_priority 和 vocabulary_card_eligible 控制展示。
4. **reader.html 集成** — 在阅读器中展示 translated examples 作为上下文例句。
5. **新资料导入** — 继续处理剩余 PDF（需 OCR 的 В мире люди 系列）。
