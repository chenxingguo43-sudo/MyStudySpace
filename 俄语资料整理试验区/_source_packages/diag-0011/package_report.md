---
type: source-package-report
source_id: diag-0011
package_version: 1
created: 2026-06-06 02:00
---

# Source Package: diag-0011

## 来源信息

| 项目 | 内容 |
|------|------|
| source_id | diag-0011 |
| source_title | f93b28109d3747471dbeb3eae49c8b32 (俄语前置词用法) |
| source_path | E:\Desktop\俄语资料文档整理\f93b28109d3747471dbeb3eae49c8b32.pdf |
| category | text_pdf |
| recommended_pipeline | pymupdf |
| page_count | 28 |
| package_version | 1 |

---

## 包内容

| 文件 | 条目数 | 说明 |
|------|--------|------|
| source.json | — | 来源元数据 |
| pages.json | 28 | PyMuPDF 逐页提取文本 |
| sentence_candidates.json | 175 | 分句候选（过滤前） |
| sentence_records.json | 84 | 正式候选 records（严格过滤后） |
| package_report.md | — | 本报告 |

---

## 数据统计

| 指标 | 数值 |
|------|------|
| 页数 | 28 |
| 候选句子数（过滤前） | 175 |
| 候选句子数（过滤后） | 84 |
| 过滤掉 | 91（过短/乱码/中文混入） |

---

## 匹配质量

| 风险等级 | 数量 |
|----------|------|
| low | 84 |
| medium | 0 |
| high | 0 |
| **合计** | **84** |

| 检查项 | 状态 |
|--------|------|
| page_number 全部非空 | ✅ |
| candidate_id 全部非空 | ✅ |
| surface_forms 全部非空 | ✅ |
| match_risk 全部非空 | ✅ |
| high risk = 0 | ✅ |
| needs_review=true | 84 条（全部） |
| ru_has_chinese | 0 |
| very_short_ru (<15) | 0 |

---

## Codex 验收标准检查

| 标准 | 结果 |
|------|------|
| records > 0 | ✅ 84 |
| unique_sentence_ids = records | ✅ |
| missing_required = 0 | ✅ |
| empty_surface_forms = 0 | ✅ |
| top_candidate_id = records | ✅ |
| top_match_risk = records | ✅ |
| package_high_risk = 0 | ✅ |
| package_indexable = records | ✅ |
| would_add > 0 | ✅ 84 |

**全部通过。**

---

## Dry-Run 结果

| 指标 | 数值 |
|------|------|
| would_add | 84 |
| skipped_duplicate | 0 |
| skipped_high_risk | 0 |

---

## 样例记录

```json
{
  "sentence_id": "d11-0001",
  "source_id": "diag-0011",
  "ru": "безо всякой причины",
  "zh": "",
  "surface_forms": ["безо", "всякой", "причины"],
  "possible_lexemes": ["безо", "всякой", "причины"],
  "candidate_id": "d11-0001",
  "match_risk": "low",
  "needs_review": true
}
```

---

## 产出文件

| 文件 | 说明 |
|------|------|
| `_source_packages/diag-0011/source.json` | 来源元数据 |
| `_source_packages/diag-0011/pages.json` | 28 页 PyMuPDF 提取 |
| `_source_packages/diag-0011/sentence_candidates.json` | 175 条分句候选 |
| `_source_packages/diag-0011/sentence_records.json` | 84 条正式候选 records |
| `_source_packages/diag-0011/package_report.md` | 本报告 |
| `_reports/diag-0011_导入dry-run报告.md` | Dry-run 报告 |
