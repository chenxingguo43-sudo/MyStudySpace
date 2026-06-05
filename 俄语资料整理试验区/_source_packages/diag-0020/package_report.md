---
type: source-package-report
source_id: diag-0020
package_version: 1
created: 2026-06-06 00:20
---

# Source Package: diag-0020

## 来源信息

| 项目 | 内容 |
|------|------|
| source_id | diag-0020 |
| source_title | 《穆罗姆学习手册》：语法详解与单词清单 |
| source_path | E:\Desktop\俄语资料文档整理\《穆罗姆学习手册》：语法详解与单词清单.pdf |
| category | text_pdf |
| recommended_pipeline | pymupdf |
| page_count | 52 |
| package_version | 1 |

---

## 包内容

| 文件 | 条目数 | 说明 |
|------|--------|------|
| source.json | — | 来源元数据 |
| pages.json | 52 | PyMuPDF 逐页提取文本 |
| sentence_candidates.json | 711 | v2 分句候选 |
| example_matches.json | 25 | v2.1 匹配结果 |
| sentence_records.json | 25 | 正式候选 records |
| package_report.md | — | 本报告 |

---

## 数据统计

| 指标 | 数值 |
|------|------|
| 页数 | 52 |
| 候选句子数 | 711 |
| 匹配记录数 | 25 |
| 正式 records 数 | 25 |

---

## 匹配质量

| 风险等级 | 数量 |
|----------|------|
| low | 16 |
| medium | 9 |
| high | 0 |
| **合计** | **25** |

| 检查项 | 状态 |
|--------|------|
| page_number 全部非空 | ✅ |
| candidate_id 全部非空 | ✅ |
| high risk = 0 | ✅ |
| needs_review=true | 3 条 |

---

## 是否可进入正式导入？

**是。** 全部 25 条 record 通过验证，可写入正式 data/sentences.json。

---

## 文件说明

### source.json
来源元数据，包含 source_id、title、path、category、pipeline 等。

### pages.json
PyMuPDF 逐页提取的原始文本，每条包含 page_number、text、char_count、cyrillic_count、han_count、nul_count。

### sentence_candidates.json
v2 分句候选，711 条。包含 candidate_id、page_number、ru、ru_normalized、char_count。

### example_matches.json
v2.1 匹配结果，25 条。包含 example_id、matched、candidate_id、match_type、score、risk。

### sentence_records.json
正式候选 records，25 条。包含 sentence_id、source_id、page_number、ru、zh、grammar_tags、lexeme_tags、extraction 等完整字段。

---

## 使用方式

### 写入正式坐标系

```python
# 1. 添加来源
sources.append({
    'source_id': 'src-0002',
    'source_title': '《穆罗姆学习手册》：语法详解与单词清单',
    'source_path': '...',
    'chapters': ['课文逐句精讲']
})

# 2. 添加 sentences
for rec in sentence_records:
    sentences.append({
        'sentence_id': rec['sentence_id'],
        'source_id': 'src-0002',
        'page_or_location': str(rec['page_number']),
        'ru': rec['ru'],
        'zh': rec['zh'],
        ...
    })

# 3. 重建 lexeme_index 和 grammar_index
```
