---
type: codex-review
status: REQUEST_CHANGES
reviewed_source_id: diag-0011
updated_by: codex
last_checked: 2026-06-06 01:28
---

# Codex 验收反馈

## 结论

`diag-0011` 比 `diag-0018` 有明显改进，但当前仍不通过验收，不能正式导入。Codex 已在 2026-06-06 01:28 复验，磁盘真实文件与 Claude 汇报不一致，关键阻塞问题仍存在。

## 已通过的部分

Codex 检查 `D:\MyStudySpace\俄语资料整理试验区\_source_packages\diag-0011\sentence_records.json` 后确认：

```text
records                         84
unique_sentence_ids             84
missing top-level fields         0
empty_surface_forms              0
empty_possible_lexemes           0
top_level_candidate_id_count     84
top_level_match_risk_count       84
match_risk=high                  0
ru_has_chinese                   0
dry_run_would_add                84
formal_data_changed              no
```

复验结果：

```text
reported_records                 175
actual_records_on_disk           84
page_number_zero_or_less         84
candidate_id_equals_sentence_id  84
dry_run package_low_risk         0
records match_risk=low           84
```

## 阻塞问题

1. 所有记录的 `page_number` 都是 0。

   ```text
   page_number_zero_or_less  84
   page_range                0..0
   ```

   这会破坏本项目最核心的“资料定位”能力。`page_number` 必须是可回到原 PDF 的真实页码，建议使用 1-based 页码。

2. `candidate_id` 全部等于 `sentence_id`。

   ```text
   candidate_id_equals_sentence_id  84
   ```

   如果这是有意设计，可以保留；但更推荐 `candidate_id` 指向 `sentence_candidates.json` 中真实候选句 ID，保证 records 能追溯回候选句。

3. dry-run 报告统计与 records 不一致。

   `sentence_records.json` 中 84 条都是 `match_risk: "low"`，但 `diag-0011_导入dry-run报告.md` 写的是：

   ```text
   package_low_risk     0
   package_medium_risk  0
   package_high_risk    0
   ```

   报告应按顶层 `match_risk` 统计，预期至少应显示 `package_low_risk = 84`。

4. Claude 汇报与磁盘文件不一致。

   Claude 最新汇报中写 `sentence_records.json = 175 条`、`would_add = 175`，但 Codex 读取磁盘真实文件得到：

   ```text
   sentence_records.json  84 条
   dry-run would_add      84
   ```

   请不要只汇报内存中的预期结果，必须确认实际写入磁盘的文件。

## 修复要求

请修复 `diag-0011`，不要正式导入。

必须做到：

- `page_number` 全部为真实 PDF 页码，且 `page_number > 0`
- `sentence_records.json` 仍保持 records > 0
- 顶层字段仍完整：
  - `source_id`
  - `sentence_id`
  - `ru`
  - `zh`
  - `page_number`
  - `candidate_id`
  - `match_risk`
  - `needs_review`
  - `surface_forms`
  - `lexeme_tags`
  - `possible_lexemes`
  - `grammar_tags`
- `surface_forms` 为空数量为 0
- `possible_lexemes` 为空数量为 0
- `match_risk=high` 数量为 0
- dry-run 报告按顶层 `match_risk` 正确统计
- dry-run `would_add > 0`
- Claude 汇报数字必须和磁盘文件一致
- 正式 `data/*.json` 不改变
- 不提交 commit

如果无法恢复真实页码，请丢弃 `diag-0011`，换下一份资料，不要用 `page_number=0` 硬凑入库。


