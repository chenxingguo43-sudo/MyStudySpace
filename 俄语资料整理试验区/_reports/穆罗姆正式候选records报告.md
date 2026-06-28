---
type: murom-sentence-records-candidate-report
source_id: diag-0020
created: 2026-06-06 00:15
---

# 穆罗姆正式候选 records 报告

## 概览

| 项目 | 数值 |
|------|------|
| source_id | diag-0020 |
| source_title | 《穆罗姆学习手册》：语法详解与单词清单 |
| record 数量 | **25** |
| sentence_id 重复 | 0 |
| page_number 覆盖 | 25/25（100%） |
| candidate_id 覆盖 | 25/25（100%） |
| high risk | 0 |
| needs_review=true | 3 |

---

## 风险分布

| 风险等级 | 数量 | 说明 |
|----------|------|------|
| low | 16 | 可直接入库 |
| medium | 9 | 需轻度确认 |
| high | 0 | 无 |
| **合计** | **25** | |

---

## page_number 覆盖

| 页码 | record 数量 |
|------|-------------|
| 1 | 1 |
| 2 | 2 |
| 3 | 1 |
| 4 | 1 |
| 5 | 1 |
| 6 | 1 |
| 7 | 3 |
| 9 | 1 |
| 11 | 2 |
| 12 | 1 |
| 13 | 1 |
| 14 | 1 |
| 15 | 2 |
| 16 | 2 |
| 17 | 4 |
| 45 | 1 |

共覆盖 16 个页面。

---

## needs_review=true 的 3 条

| sentence_id | reason |
|-------------|--------|
| ex-000001 | зна́менит的词性标注不确定 |
| ex-000004 | поменьше的原形归属不确定 |
| ex-000005 | богоугодные的翻译不确定 |

---

## Record 结构示例

```json
{
  "sentence_id": "ex-000008",
  "source_id": "diag-0020",
  "source_title": "《穆罗姆学习手册》：语法详解与单词清单",
  "source_path": "E:\\Desktop\\俄语资料文档整理\\《穆罗姆学习手册》：语法详解与单词清单.pdf",
  "page_number": 7,
  "ru": "Муромчане гордятся своими знаменитыми земляками.",
  "zh": "穆罗姆人为他们著名的同乡感到骄傲。",
  "grammar_tags": ["动词接格", "工具格"],
  "surface_forms": ["гордятся", "земляками"],
  "lexeme_tags": ["гордиться", "земляк"],
  "possible_lexemes": [],
  "confidence": "high",
  "needs_review": false,
  "note": "гордиться кем-чем为B1必考动词搭配",
  "extraction": {
    "method": "pymupdf",
    "candidate_id": "cand-0087",
    "match_type": "exact_normalized",
    "score": 1.0,
    "risk": "low",
    "candidate_ru": "Муромчане гордятся своими знаменитыми земляками."
  }
}
```

---

## 与现有 sentences.json 的对比

| 维度 | 现有 sentences.json | 本 records |
|------|---------------------|------------|
| 来源 | examples.json（手工标注） | PyMuPDF 提取 + 自动匹配 |
| source_id | src-0001 | diag-0020 |
| page_number | 有 | 有（来自 PDF 提取） |
| extraction 字段 | 无 | 有（method/candidate_id/match_type/score/risk） |
| 语法标注 | 有 | 有（继承自 examples.json） |
| 可直接合并 | — | 需要统一 source_id |

---

## 是否适合成为正式写入 data/sentences.json 的输入？

**是。** 全部 25 条 record 满足：

| 检查项 | 状态 |
|--------|------|
| sentence_id 无重复 | ✅ |
| page_number 全部非空 | ✅ |
| candidate_id 全部非空 | ✅ |
| high risk = 0 | ✅ |
| needs_review 标记 | ✅ 3 条已标记 |
| ru/zh 完整 | ✅ |
| 语法标注完整 | ✅ |

### 建议的写入方式

1. 统一 source_id 为 `src-0002`（新来源）
2. 将 source_title/source_path 写入 sources.json
3. 将 25 条 record 写入 sentences.json
4. 重建 lexeme_index.json 和 grammar_index.json

### 注意事项

- 这 25 条与现有 sentences.json 的 25 条**内容相同**（同一批 examples）
- 差别在于：本 records 有 `extraction` 字段和更准确的 `page_number`
- 如果合并，需要去重（sentence_id 相同）

---

## 产出文件

| 文件 | 说明 |
|------|------|
| `_data/diag-0020-sentence-records-candidate.json` | 25 条候选 records |
| `_reports/穆罗姆正式候选records报告.md` | 本报告（UTF-8 BOM） |
