# 《语法词汇》理论资料来源层

本目录保存《语法词汇（同一本书）》第二部分“理论资料”的来源副本和后续清洗结果。

- 原 PDF：`E:\Desktop\语法词汇（同一本书）.pdf`
- 理论区：PDF 093-124，对应印刷页 91-122。
- 原始 OCR 位于 `raw-ocr/`，只作来源保存；不要直接作为 reader 学习卡正文。
- 后续结构化规则、例句和表格会保存到本目录的独立数据文件，并保留 `printedPages`、`pdfPages` 与 `reviewStatus`。

当前来源状态是 `review`：网页端 agent 的 OCR 已覆盖全部页面，但仍需针对表格、页间续文、标点和可能混淆的俄文字形进行视觉核对。

跨窗口继续时先读 `NEXT_SESSION.md` 和 `_automation/goal_state.json`，然后运行：

```powershell
node D:\MyStudySpace\scripts\validate-zlatoust-grammar-project.js
```

项目框架入口：

- `coverage-map.json`：五章、32 个理论小节和 597 题覆盖状态；
- `_harness/WORKFLOW.md`：来源、映射、规则、学习卡和前端接入顺序；
- `_harness/CONTENT_CONTRACT.md`：规则单元的数据与来源要求；
- `quality-reports/`：每一阶段的验证报告；
- `mappings/`：双向题目映射；
- `rule-units/`：最终规则单元。
