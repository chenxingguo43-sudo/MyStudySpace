# 10 Learning Unit Standard (Reading Profile)

适用于：阅读模块（Чтение）的学习单元。

## 核心原则

一个学习单元让学习者在一个完整上下文中学习一篇阅读文章：
1. 原书任务要求什么
2. 完整俄语原文是什么
3. 中文翻译如何对齐
4. 文章主题是什么
5. 哪些语法和长难句重要
6. 哪些词汇匹配了真实例句
7. 哪些 Obsidian 卡片可以继续复习

## 范围规则

始终收集完整文章范围，不仅仅是文章第一页。例如：
- 正文在第 56 页
- 选择题在第 57 页
- 激活练习在第 58 页
→ 学习单元范围 = 第 56-58 页

## 必需章节

1. `0. 元信息`
2. `1. 原书任务`
3. `1.1 选择题`
4. `1.2 激活练习 / 词汇练习 / 口语任务`
5. `2. 俄语原文`
6. `3. 中俄对照`
7. `4. 主题理解`
8. `5. 长难句与语法解析`
9. `6. 词汇匹配与真实例句`
10. `7. 学习卡片入口`
11. `8. 本文学习建议`
12. `9. 后续待完善`

## 元数据 Frontmatter

```yaml
title: "<text number and title>"
type: "learning-unit"
profile: "reading"
project: "俄语B2 全模块 Markdown版"
module: "阅读"
source_file: "章节/<file>.md"
source_pages: "<page range>"
status: "draft"
review_status: "draft_needs_review"
tags:
  - 俄语/阅读
  - learning-unit
  - B2/ТРКИ-II
```

## Markdown 风格

- 俄语句子和词汇用普通文本或粗体，不用代码格式
- 匹配词形在例句中用粗体高亮
- 使用 callout 标注风险
- 表格仅在提高可读性时使用

## PASS 标准

- 完整源页面范围
- 原书任务和练习已包含
- 俄语原文完整
- 中文翻译对齐或缺失标注
- 语法笔记可读
- 源元数据存在
- OCR 风险可见
- 未修改密封文件
