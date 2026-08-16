# 持续任务：编写豪华标准俄语词条（本窗口范围 21-25）

## 任务目标

为 `input/` 中批次文件里的俄语词条编写**学习型词条**（豪华标准），每个词一个 JSON，包含：
meaning（中文释义）、explainZh（中文定义解释）、collocations（搭配+例句+翻译，≥3）、
synonyms（近义词+区别，≥1，不得与 confusions 重复）、antonyms（真反义词或 "—"）、
related（关联词，≥2）、confusions（易混淆词提醒）、special（特殊用法或 "—"）。

## 字段硬约束

- collocations 每个必须配完整俄语句子 + 中文翻译；用最常用最简单的表达，宁短勿炫
- antonyms 必须是真正反义词（работа↔отдых）；**没有就写 "—"，严禁编造 "не + 词" 伪反义词**
- synonyms 与 confusions 不得重复同一个词
- 例句用真实自然俄语，不要生造怪异句子
- 词元用词典原形（完成体动词用完成体原形）

## 批次与输出

| 批次 | 词数 | 输出 |
| --- | --- | --- |
| 21 | 150 | `output/luxury-batch-21.json` + `output/REPORT-21.md` |
| 22 | 150 | `output/luxury-batch-22.json` + `output/REPORT-22.md` |
| 23 | 150 | `output/luxury-batch-23.json` + `output/REPORT-23.md` |
| 24 | 150 | `output/luxury-batch-24.json` + `output/REPORT-24.md` |
| 25 | 150 | `output/luxury-batch-25.json` + `output/REPORT-25.md` |

每批：`output/luxury-batch-NN.json`（数组，含该批全部词条）+ `output/REPORT-NN.md`。

## 自检

- 每批完成后运行 `node validate-luxury-batch.js NN`，验证通过才能进入下一批
- 验证只检查结构与字段完整性，不代表内容已被正式接受
- 不得把输出复制回正式词典（`data/dictionary/` 或 Reader），本工作区只是候选稿
