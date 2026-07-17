# 俄语离线词典来源

## FreeDict zho-rus 2025.11.23

`freedict-rus-zh.json` 由 FreeDict 的中俄词典反向索引生成，保留独立来源标识，不会冒充项目自有词典。

- 项目：https://freedict.org/
- 下载：https://download.freedict.org/dictionaries/zho-rus/2025.11.23/
- 版本：2025.11.23
- 许可：GPL-3.0-or-later
- 构建时会下载相邻的 SHA-512 文件并在解包前验证归档文件。

## pymorphy3

`corpus-morphology.json` 使用本机 pymorphy3 对项目内俄语教材语料中实际出现的词形进行分析。它只保存词形、候选原形、语法标签和分类，不包含第三方词典释义。

## 项目 Markdown 已核对词汇表

`markdown-glossary.json` 只抽取 `俄语资料库/` 现有 Markdown 学习单元中明确写成“俄语词条—中文释义”的表格或项目符号，并为每条记录保留来源文件路径。它不会从普通段落或平行翻译中猜测词义。

`reviewed-function-entries.json` 收录少量旧式、口语功能词，由 Russian Wiktionary 释义人工核对并补写中文学习释义；运行时和审计中均保留“人工核对”来源标签。

## OpenRussian

`openrussian-en.json` 来自 OpenRussian 的公开俄语词典 CSV，用于中文来源均未收录时的现代词汇英文释义兜底。

- 项目：https://en.openrussian.org/dictionary-data
- 源码：https://github.com/Badestrand/russian-dictionary
- 固定提交：`50e210c4803237779cb562bc1abcea529066031c`
- 许可：CC BY-SA 4.0
- 构建清单记录四个 CSV 的 SHA-256，且英文释义始终明确标注，不会冒充中文释义。

## Русский Викисловарь

`wiktionary-ru.json` 只针对严格覆盖审计中仍未命中的教材词形查询俄语 Wiktionary，保存页面“Значение”小节中的俄文释义、页面地址和具体修订号。没有俄语定义的页面、OCR 残片和空词条不会进入资源。

- 项目：https://ru.wiktionary.org/
- 接口：https://ru.wiktionary.org/w/api.php
- 许可：CC BY-SA 4.0
- 运行时明确显示“俄文释义”，不会冒充中文释义；正式资源可由清单中的页面修订号追溯。
