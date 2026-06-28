﻿---
type: import-dry-run-report
created: 2026-06-06 01:11
---

# Source Package 导入 Dry-Run 报告

## Package 信息

| 项目 | 内容 |
|------|------|
| source_id | diag-0011 |
| source_title | f93b28109d3747471dbeb3eae49c8b32 (俄语前置词用法) |
| package_version | 1 |

## Package 全量统计

| 指标 | 数值 |
|------|------|
| package_records | 84 |
| package_needs_review | 84 |
| package_low_risk | 0 |
| package_medium_risk | 0 |
| package_high_risk | 0 |

## 实际导入统计

| 指标 | 数值 |
|------|------|
| would_add | 84 |
| skipped_duplicate | 0 |
| skipped_high_risk | 0 |
| would_add_needs_review | 84 |
| would_add_medium_risk | 0 |

## 详细分析

### sources.json

将新增 source_id `diag-0011`。

### sentences.json

**将新增 84 条记录：**

- d11-0002
- d11-0006
- d11-0009
- d11-0011
- d11-0012
- d11-0017
- d11-0019
- d11-0025
- d11-0029
- d11-0034
- d11-0039
- d11-0040
- d11-0041
- d11-0042
- d11-0043
- d11-0046
- d11-0055
- d11-0056
- d11-0061
- d11-0063
- d11-0067
- d11-0068
- d11-0075
- d11-0076
- d11-0077
- d11-0084
- d11-0086
- d11-0088
- d11-0091
- d11-0095
- d11-0096
- d11-0097
- d11-0098
- d11-0099
- d11-0102
- d11-0105
- d11-0106
- d11-0107
- d11-0109
- d11-0110
- d11-0111
- d11-0112
- d11-0113
- d11-0114
- d11-0115
- d11-0116
- d11-0117
- d11-0118
- d11-0119
- d11-0120
- d11-0122
- d11-0127
- d11-0128
- d11-0129
- d11-0130
- d11-0131
- d11-0133
- d11-0136
- d11-0137
- d11-0138
- d11-0139
- d11-0140
- d11-0141
- d11-0143
- d11-0146
- d11-0147
- d11-0149
- d11-0150
- d11-0152
- d11-0153
- d11-0154
- d11-0158
- d11-0159
- d11-0160
- d11-0163
- d11-0165
- d11-0166
- d11-0168
- d11-0169
- d11-0170
- d11-0171
- d11-0173
- d11-0174
- d11-0175

### lexeme_index / grammar_index

正式导入时会全量重建 lexeme_index.json 和 grammar_index.json。

### examples.json

不更新 examples.json（兼容文件，内容相同）。

## 对背单词页的影响

正式导入后，背单词页将新增 **84** 条可查询的资料例句。

当前 vocabulary.html 通过 lexeme_index.json 查询例句，导入后重建索引即可生效。

## 结论

可导入：84 条新句子 + source 注册。

正式导入时需执行：
1. 备份 data/ 目录
2. 写入 sources.json
3. 写入 sentences.json
4. 全量重建 lexeme_index.json
5. 全量重建 grammar_index.json
6. 运行 verify 验证
