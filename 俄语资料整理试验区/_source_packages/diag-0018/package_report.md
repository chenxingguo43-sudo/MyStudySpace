---
type: source-package-report
source_id: diag-0018
package_version: 1
created: 2026-06-06 01:00
---

# Source Package: diag-0018

## 来源信息

| 项目 | 内容 |
|------|------|
| source_id | diag-0018 |
| source_title | 《В_мире_людей》写作1.1_全考点精讲初版 |
| source_path | E:\Desktop\俄语资料文档整理\《В_мире_людей》写作1.1_全考点精讲初版.pdf |
| category | text_pdf |
| recommended_pipeline | pymupdf |
| page_count | 22 |
| package_version | 1 |

---

## 包内容

| 文件 | 条目数 | 说明 |
|------|--------|------|
| source.json | — | 来源元数据 |
| pages.json | 22 | PyMuPDF 逐页提取文本 |
| sentence_candidates.json | 403 | 分句候选 |
| sentence_records.json | 403 | 正式候选 records |
| package_report.md | — | 本报告 |

---

## 数据统计

| 指标 | 数值 |
|------|------|
| 页数 | 22 |
| 候选句子数 | 403 |
| 正式 records 数 | 403 |
| 俄文字母总数 | 9,451 |
| 中文字符总数 | 5,322 |

---

## 匹配质量

| 风险等级 | 数量 |
|----------|------|
| low | 403 |
| medium | 0 |
| high | 0 |
| **合计** | **403** |

| 检查项 | 状态 |
|--------|------|
| page_number 全部非空 | ✅ |
| candidate_id 全部非空 | ✅ |
| high risk = 0 | ✅ |
| needs_review=true | 403 条（全部） |

---

## 是否可进入正式导入？

**是。** 全部 403 条 record 通过验证，可写入正式 data/sentences.json。

**注意：** 所有记录标记为 needs_review=true，因为这是自动提取的新数据，需要人工复核中文翻译和语法标注。

---

## Dry-Run 结果

| 指标 | 数值 |
|------|------|
| would_add | 403 |
| skipped_duplicate | 0 |
| skipped_high_risk | 0 |

---

## 产出文件

| 文件 | 说明 |
|------|------|
| `_source_packages/diag-0018/source.json` | 来源元数据 |
| `_source_packages/diag-0018/pages.json` | 22 页 PyMuPDF 提取 |
| `_source_packages/diag-0018/sentence_candidates.json` | 403 条分句候选 |
| `_source_packages/diag-0018/sentence_records.json` | 403 条正式候选 records |
| `_source_packages/diag-0018/package_report.md` | 本报告 |
| `_reports/diag-0018_导入dry-run报告.md` | Dry-run 报告 |
