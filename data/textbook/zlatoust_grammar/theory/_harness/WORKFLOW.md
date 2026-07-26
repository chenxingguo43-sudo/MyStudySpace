# 工作流

## 1. 来源层

`raw-ocr/` 是只读 OCR 来源副本。`cleaned-source/` 是按章切分的可读原书层。任何中文解释、规则归纳和模型补充都不能写回这两个目录。

## 2. 映射层

使用 `coverage-map.json` 作为总入口。每个练习至少应有一种明确状态：

- `mapped`：已映射到一个或多个规则单元；
- `source-exercise-only`：原书有题，但理论区没有独立规则；
- `needs-review`：边界或规则归属仍不确定。

不能用“未分类”掩盖缺口。

## 3. 规则层

规则单元写入 `rule-units/<chapterId>/`。一个原书小节可以拆成多个规则单元；一个练习也可以连接多个规则单元。

## 4. 学习层

学习卡默认显示中文定位、快速判断和最小示例；完整规则、条件、例外、表格、语体差异和原书例句逐层展开。折叠只负责组织，不允许省略内容。

## 5. 前端层

只有映射与规则单元通过验证后才修改 `reader.html`。接入时保留现有题目 ID、进度和错题数据。

## 6. 验证

每一批完成后运行：

```powershell
node D:\MyStudySpace\scripts\validate-zlatoust-grammar-project.js
```

来源仍为 `review` 时，项目不能标记为无风险完成。
