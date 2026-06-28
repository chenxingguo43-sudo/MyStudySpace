---
type: conversion-test-report
tool: markitdown
date: 2026-06-05
---

# MarkItDown 三文件试验报告

## 结论

MarkItDown 可以作为资料导入流水线的第一层，但只能处理“本身带可抽取文本”的 PDF。对扫描型、图片型、或文本层异常的 PDF，离线 MarkItDown 会输出空文件，必须接 OCR 或另一个 PDF 诊断分支。

本轮最重要的发现：

- `《穆罗姆学习手册》：语法详解与单词清单.pdf` 可以转换出 Markdown，但质量需要清洗。
- `词汇-语法.pdf` 转换为空，底层 PDF 文本抽取也几乎为空。
- `В мире людей写作与口语.pdf` 前 10 页样本转换为空，底层 PDF 文本抽取也几乎为空。

## 环境

- 虚拟环境：`D:\MyStudySpace\.codex\markitdown-venv`（临时环境，试验后已删除）
- MarkItDown 版本：`0.1.6`
- 辅助库：`pypdf 6.13.0`
- 输出目录：`D:\MyStudySpace\俄语资料整理试验区\_converted`

## 样本与输出

| 样本 | 原始文件 | 输出文件 | 结果 |
|---|---|---|---|
| 已知对照组 | `E:\Desktop\俄语资料文档整理\《穆罗姆学习手册》：语法详解与单词清单.pdf` | `_converted\murom-study-guide.md` | 成功，162229 bytes |
| 中型语法样本 | `E:\Desktop\俄语资料文档整理\词汇-语法.pdf` | `_converted\lexicon-grammar.md` | 空输出，0 bytes |
| 大型压力样本 | `E:\Desktop\俄语资料文档整理\В мире людей写作与口语.pdf` 前 10 页 | `_converted\v-mire-lyudey-first10.md` | 空输出，0 bytes |

大型样本先切出前 10 页：

`_converted\_samples\v-mire-lyudey-first10.pdf`

原书共 292 页，前 10 页样本大小约 14 MB。

## 穆罗姆样本质量

`murom-study-guide.md` 有可用内容：

- 字符数约 116604
- 俄文字母约 15779
- 中文字符约 10278
- 可以找到 `Гуляя по городу`
- 可以找到 `Муромчане`、`гордятся`、`земляками`

但它不能直接进入正式坐标系：

- 有大量 `NUL` 空字符。
- 中文出现重复字符，例如“穆穆罗罗”。
- PDF 表格被转成 Markdown 表格后，会把同一句俄文拆散。
- 俄中对照混排导致句子边界不稳定。
- 没有稳定标题层级，Markdown heading 数量为 0。

判断：穆罗姆这类 PDF 可以用 MarkItDown 做“粗抽取”，但后面必须接清洗器和句子重组器。

## 两个空输出样本

`词汇-语法.pdf`：

- MarkItDown 输出 0 bytes。
- 使用 pypdf 检查前 5 页，抽取文本只有换行，几乎无字符。
- 判断为扫描型、图片型，或文本层不可用 PDF。

`В мире людей写作与口语.pdf` 前 10 页：

- MarkItDown 输出 0 bytes。
- 使用 pypdf 检查前 5 页，抽取文本只有换行，几乎无字符。
- 判断为扫描型、图片型，或文本层不可用 PDF。

这两类资料不能只靠 MarkItDown，需要 OCR 路线。

## 对项目的建议

资料导入流水线应分成两条路：

1. 文本型 PDF / DOCX / HTML / EPUB：
   - MarkItDown 转 Markdown
   - 清洗 Markdown
   - 分句
   - 翻译
   - 坐标化

2. 扫描型 PDF / 图片型 PDF：
   - PDF 诊断
   - OCR
   - OCR 文本清洗
   - 分句
   - 翻译
   - 坐标化

第一阶段不要全量转换 30 个资料。应该先做“资料诊断器”：

- 遍历资料文件夹。
- 对每个 PDF 抽前 3 页文本。
- 统计可抽文字数量、俄文字母数量、中文数量。
- 自动分类为 `text_pdf` 或 `needs_ocr`。
- 只把 `text_pdf` 交给 MarkItDown。

## 下一步推荐

下一步优先做一个 `source_diagnosis` 小工具，而不是继续手工转换：

- 输入：`E:\Desktop\俄语资料文档整理`
- 输出：`俄语资料整理试验区\_reports\资料导入诊断报告.md`
- 产出 JSON：`俄语资料整理试验区\_data\source_diagnosis.json`

这样以后新增资料时，可以先跑诊断，再决定走 MarkItDown 还是 OCR。
