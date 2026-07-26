# 独立知识点教学页数据层

本目录保存经过用户确认的连续教学页面数据，不替代 `rule-units/` 中的原书规则单元。

- `rule-units/`：原书规则、表格、例句、映射与来源覆盖账本。
- `learning-pages/`：老师式拆解、阶段编排、最小对比、信号词边界、随堂题和反馈。
- 原书正式题只保存现有 `exerciseId` 引用；页面运行时从正式题库读取并复用 `rr_b2_progress_v1`。
- 随堂题写入独立的 `rr_zlatoust_learning_v1`，不得污染原书题记录。
- 教辅内容使用 `learning-note`，外部补充使用 `external-note`；两者都不能写成 `source-rule`。

当前仅有用户已确认的样板：`gl1/section-1.4.1.json`。其他知识点仍使用现有通用规则页，样板验收前不批量复制。
