# 词汇例句扩充最终报告

生成时间: 2026-06-07

## 1. 起始数量和结束数量

| 指标 | 起始 | 结束 | 变化 |
|------|------|------|------|
| sources | 10 | 13 | +3 |
| sentences | 1127 | 1179 | +52 |
| translated | 676 | 728 | +52 |
| vocabulary-card eligible | 577 | 629 | +52 |
| lexeme keys | 3394 | 3538 | +144 |

## 2. 新增 sources

| source_id | 文件名 | 类型 | 说明 |
|-----------|--------|------|------|
| raw-0017 | 《В_мире_людей》1.1写作错误修正版.pdf | text_pdf | 写作考试例句，37 条 |
| raw-0018 | 《В_мире_людей》写作1.1_全考点精讲初版.pdf | text_pdf | 写作考试例句，9 条（去重后） |
| raw-0007 | b6f031462fd3d376fe004cb285f58038.pdf | text_pdf | 商务信函例句，6 条 |

## 3. 新增数据

- 新增 sentences: 52 条
- 新增 translated: 52 条
- 新增 vocabulary-card eligible: 52 条
- 新增 lexeme keys: 144

## 4. 跳过的资料及原因

| source_id | 文件名 | 原因 |
|-----------|--------|------|
| raw-0019 | 《克拉斯诺亚尔斯克石柱》逐句精讲学习手册.docx | 仅 11 句，8 句为填空练习残句 |
| raw-0005 | 65bc80862b220c74a07de0beb2c0d125.pdf | 仅 2 句俄语，不值得处理 |
| raw-0021 | 俄语A2高频词完整版.pdf | 词汇表，无例句 |
| raw-0022 | 俄语B1高频词完整版.pdf | 词汇表，无例句 |
| raw-0023 | 俄语B2高频词完整版.pdf | 词汇表，无例句 |
| raw-0027 | 荧光笔标黄单词全拆解记忆表.pdf | 词汇表，无例句 |
| raw-0026 | 总结我不认识的单词.pdf | 词汇表，无例句 |
| raw-0030 | 黄色荧光笔标记.pdf | 仅 2 页词汇表 |
| raw-0004 | 6000俄语高频词汇.pdf | 词库，无例句 |

## 5. OCR 可行性结果

**不可用。** 以下工具均不可用：
- tesseract: 未安装
- pytesseract: 未安装
- easyocr: 未安装
- paddleocr: 未安装
- Windows OCR: 不可用

扫描件 PDF 全部产出空文本（0 字符）。

### 受阻的 OCR 候选

| source_id | 文件名 | 页数 | 说明 |
|-----------|--------|------|------|
| raw-0013 | В мире люди 阅读口语文档提取.pdf | 53 | 需 OCR |
| raw-0014 | В мире людей写作1.1.pdf | 16 | 需 OCR |
| raw-0015 | В мире людей写作与口语.pdf | 292 | 需 OCR |
| raw-0016 | В_МИРЕ_ЛЮДЕЙ_выпуск_2_Аудирование_говорение.pdf | 250 | 需 OCR |
| raw-0024 | 写作2.pdf | 39 | 需 OCR |
| raw-0025 | 写作（同一本书）.pdf | 94 | 需 OCR |
| raw-0028 | 词汇-语法.pdf | 134 | 需 OCR |

**Blocker**: 安装 tesseract 或 easyocr 后可继续处理这些文件。

## 6. 覆盖率审计

| 指标 | 数值 |
|------|------|
| vocabulary.json 总词数 | 2273 |
| translated 记录 | 728 |
| eligible 记录 | 629 |
| lexeme eligible keys | 2656 |
| vocabulary 覆盖率 | 1.9% (43/2273) |

**覆盖率说明**: 1.9% 看起来很低，但这是因为 vocabulary.json 中的词条多为短语/多词表达（如 "в общем"、"на мой взгляд"），而 lexeme_index 是按单词形式索引的。实际可匹配的独立词汇形式有 2656 个。

### Source 贡献排名

| source_id | eligible 记录 |
|-----------|--------------|
| diag-0029 | 168 |
| diag-0006 | 114 |
| diag-0002 | 112 |
| diag-0008 | 70 |
| diag-0001 | 60 |
| raw-0017 | 37 |
| src-0001 | 25 |
| diag-0012 | 17 |
| raw-0018 | 9 |
| diag-0010 | 7 |
| raw-0007 | 6 |
| diag-0009 | 4 |

### Top 20 高匹配词

| 词汇 | 可用例句数 |
|------|-----------|
| на | 63 |
| не | 61 |
| что | 44 |
| как | 38 |
| для | 36 |
| по | 28 |
| он | 24 |
| это | 23 |
| мы | 20 |
| из | 20 |
| например | 20 |
| от | 19 |
| был | 18 |
| только | 18 |
| мне | 17 |
| работы | 16 |
| слов | 15 |
| слова | 15 |
| его | 14 |
| при | 14 |

## 7. Validator 输出摘要

| Validator | 结果 |
|-----------|------|
| validate_all_coordinate_data.py | ✅ PASS |
| validate_translation_queue.py | ✅ PASS |
| validate_translation_results.py | ✅ PASS |
| validate_example_display_quality.py | ✅ PASS |
| validate_vocabulary_examples.py | ✅ PASS |
| validate_vocabulary_ui_examples.py | ✅ PASS |

## 8. Commit 列表

| Commit | 消息 |
|--------|------|
| 89b1d23 | feat(data): translate raw-0017, raw-0018, raw-0007 examples |
| 6344bdd | feat(data): import raw-0007 business letter examples |
| 55dbbf5 | feat(data): import raw-0017 and raw-0018 writing exam examples |

## 9. 剩余问题

1. **OCR Blocker**: 7 个扫描件 PDF 需要安装 OCR 工具才能处理
2. **覆盖率低**: vocabulary.json 覆盖率 1.9%，需要更多阅读材料类型的例句
3. **词汇表类文件**: 9 个文件为纯词汇表/词库，不包含例句
4. **短语匹配**: vocabulary.json 中的短语无法通过 lexeme_index 的单词级索引匹配

## 10. 下一步建议

1. **安装 OCR**: 安装 tesseract 或 easyocr，处理 7 个扫描件（特别是 В мире люди 系列，预计可新增 200-500 句）
2. **短语索引**: 建立短语级索引，支持 "в общем" 等多词表达的例句匹配
3. **更多阅读材料**: 导入更多俄语阅读材料（小说、新闻、教材课文），提高自然句子占比
4. **词汇表整合**: 将 A2/B1/B2 高频词表中的例句提取出来（如果有的话）
