---
type: import-dry-run-report
created: 2026-06-06 00:30
---

# Source Package 导入 Dry-Run 报告

## Package 信息

| 项目 | 内容 |
|------|------|
| source_id | diag-0020 |
| source_title | 《穆罗姆学习手册》：语法详解与单词清单 |
| package_version | 1 |

## Package 全量统计

| 指标 | 数值 |
|------|------|
| package_records | 25 |
| package_needs_review | 3 |
| package_low_risk | 16 |
| package_medium_risk | 9 |
| package_high_risk | 0 |

## 实际导入统计

| 指标 | 数值 |
|------|------|
| would_add | 0 |
| skipped_duplicate | 25 |
| skipped_high_risk | 0 |
| would_add_needs_review | 0 |
| would_add_medium_risk | 0 |

> **说明：** 本包包含 needs_review=3、medium risk=9，但因 sentence_id 重复，本次 dry-run 实际新增为 0。

## 详细分析

### sources.json

将新增 source_id `diag-0020`。

### sentences.json

**跳过 25 条重复记录：**

- ex-000001
- ex-000002
- ex-000003
- ex-000004
- ex-000005
- ex-000006
- ex-000007
- ex-000008
- ex-000009
- ex-000010
- ex-000011
- ex-000012
- ex-000013
- ex-000014
- ex-000015
- ex-000016
- ex-000017
- ex-000018
- ex-000019
- ex-000020
- ex-000021
- ex-000022
- ex-000023
- ex-000024
- ex-000025

**无新增记录。**（全部重复）

### lexeme_index / grammar_index

正式导入时会全量重建 lexeme_index.json 和 grammar_index.json。

### examples.json

不更新 examples.json（兼容文件，内容相同）。

## 对背单词页的影响

正式导入后，背单词页**不会新增**可查询的资料例句。（全部重复）

但会确保 source_id 在 sources.json 中注册，保持数据一致性。

## 结论

无新数据导入，但建议注册 source_id 以保持一致性。

正式导入时需执行：
1. 备份 data/ 目录
2. 写入 sources.json
3. 写入 sentences.json
4. 全量重建 lexeme_index.json
5. 全量重建 grammar_index.json
6. 运行 verify 验证
