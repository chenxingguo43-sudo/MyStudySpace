# Chapter 3 映射与 PDF 数据核对

**状态：REVIEW。** 本批完成 `GL3-Q001`—`GL3-Q099` 的逐题显式归档、PDF 答案核对、题目页码修复、双向映射和三个规则单元；来源扫描的总体状态仍为 `REVIEW`。

## PDF 核对范围

- 题面与选项：PDF 042—057，对应印刷页 40—55。
- 原书答案表：PDF 126，对应印刷页 124，标题为 `Ключи к третьей главе`。
- 理论来源：`cleaned-source/chapter-03.md`，PDF 110—113 / 印刷页 108—111。PDF 113 上半页延续 3.1.2，下半页开始第 4 章，已按语义标题拆分并在两章保留页面标记。

## 题库修复

- 已修复 11 条导入答案键差异：`GL3-Q014`、`GL3-Q017`、`GL3-Q022`、`GL3-Q034`、`GL3-Q039`、`GL3-Q048`、`GL3-Q054`、`GL3-Q057`、`GL3-Q060`、`GL3-Q084`、`GL3-Q094`。
- 已按 PDF 修复所有 99 题的题目页码元数据；`GL3-Q099` 额外确认位于印刷页 55 / PDF 057，并补入章节页码范围。
- 所有现有题目 ID 保持不变；答案合同已验证为 `answer === sourceAnswer`，且答案键仍属于选项集。
- 完整差异账本：`quality-reports/chapter-03-data-repair.json`。历史 localStorage 正确性重算仍被 reader 接入门槛禁止。

## 映射结果

| 状态 | 数量 | 处理方式 |
| --- | ---: | --- |
| `mapped` | 35 | 仅在题面、PDF 答案和 3.1—3.1.2 原书条件一致时连接规则。 |
| `needs-review` | 1 | `GL3-Q039` 保留。PDF 答案 A 使用被动／反身式 `строится`，而 3.1.2 第 3 条明确禁止被动结构中的动名副词。 |
| `source-exercise-only` | 63 | 分词、关系从句和教材理论区未独立说明的转换题保持显式无规则状态。 |
| 合计 | 99 | 无静默遗漏。 |

`GL3-Q039` 不是可接受的“已解决例外”：它是原书答案与原书规则的表面冲突，必须继续显示为 `needs-review`，不能以学习辅助解释升级为 verified。

## 规则单元与来源覆盖

- `rule-units/gl3/section-3.1.json`：逻辑主体与语法主体的总入口，链接 99 题。
- `rule-units/gl3/section-3.1.1.json`：同一主体的允许条件，保留 3 幅原书图式和 13 个原书例句。
- `rule-units/gl3/section-3.1.2.json`：多主体、低动词性无主句和被动构造的禁止条件，保留 2 幅原书图式、14 个原书例句和 Q039 风险。
- 账本：`quality-reports/chapter-03-source-coverage.md`；内容复核：`quality-reports/chapter-03-content-quality-review.md`。

## 执行的验证

```powershell
node D:\MyStudySpace\scripts\build-zlatoust-theory-source.js
node D:\MyStudySpace\scripts\build-zlatoust-chapter-03-mapping.js
node D:\MyStudySpace\scripts\build-zlatoust-chapter-03-units.js
node D:\MyStudySpace\scripts\validate-zlatoust-grammar-project.js
```

最后一条验证命令返回 `REVIEW`、`failures: []`。全书仍只有 356/597 题完成显式映射；本批通过不代表可接入 `reader.html`。
