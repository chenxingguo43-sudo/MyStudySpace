# OCR 扫描件处理收尾报告

生成时间：2026-06-06

## 已完成导入

| source_id | 资料 | 处理结果 | records | translated | vocabulary_card_eligible | 说明 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| raw-0025 | 写作（同一本书）.pdf | 已正式导入 | 1374 | 1374 | 1374 | OCR 抽取质量稳定，已翻译并进入 lexeme_index。 |

## 已跳过

| source_id | 资料 | 处理结果 | 原因 |
| --- | --- | --- | --- |
| raw-0024 | 写作2.pdf | 跳过导入 | OCR 文本噪声比例高，含大量错字、表格碎片和不可展示片段；不适合作为背词页真实例句。 |
| raw-0028 | 词汇-语法.pdf | 跳过导入 | OCR 可读，但内容主要是选择题、挖空题、选项表和词汇语法表；严格过滤后可展示 records 为 0。 |

## 验证摘要

- pending 翻译队列：0
- done 翻译结果：2596 条
- raw-0013 / raw-0014 / raw-0025：无中文混入 ru、无 `�`、无空 surface_forms、无 `match_risk=high`
- 全部正式数据 validator 已通过；`validate_translation_queue.py` 仅提示 pending 目录为空，退出码为 0。
