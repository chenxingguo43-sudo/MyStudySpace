# Chapter 2 来源覆盖账本

本账本由 `D:\MyStudySpace\scripts\build-zlatoust-chapter-02-units.js` 从 `cleaned-source/chapter-02.md`、已核对题库和 Chapter 2 映射生成。原书内容、题目内容和中文学习说明分层保存；全章来源仍为 `REVIEW`。

| 小节 | 关联练习 | 原书表格行 | 原书例项块 | needs-review 练习 | source-exercise-only 练习 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2.1 | 25 | 21 | 21 | 0 | 3 |
| 2.2 | 12 | 12 | 12 | 0 | 1 |
| 2.3 | 17 | 0 | 12 | 1 | 4 |
| 2.4 | 22 | 18 | 21 | 1 | 0 |
| 2.4.1 | 7 | 13 | 14 | 0 | 0 |
| 2.4.2 | 16 | 5 | 7 | 1 | 0 |
| 2.5 | 27 | 4 | 19 | 1 | 2 |
| 2.6 | 18 | 2 | 16 | 0 | 1 |
| 2.7 | 15 | 0 | 16 | 0 | 0 |
| 2.8 | 14 | 0 | 2 | 10 | 0 |

## 覆盖原则

- 每个单元的 `sourceRules` 保留该小节的完整 cleaned-source 片段。
- `tables` 逐表保留表头、行列和 Markdown 原文；`sourceCoverage.tables` 记录表格行数。
- `examples` 保存每个表格例项及正文破折号例项，全部标记为 `source-example`。
- 所有关联练习均有题干、选项、原书答案页和独立的 `learning-note` 选项分析。
- needs-review 与 source-exercise-only 维持原状，不因生成学习说明而升级。
