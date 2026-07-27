# 2.4.1 独立教学页验收记录

日期：2026-07-26
状态：`REVIEW`（结构、桌面与移动端专项交互已验收；OCR 风险保留）

- 内容：5 个连续阶段处理无介词入口、属格的领域/对象/承担者关系、部分整体与数量、质量特征、无介词第五格的比较描写。
- 来源：原书 2.4.1 表，印刷页 101 / PDF 103。原书表格和例项均标注来源页；语义判断、自编语境和反馈明确为教辅层。
- 正式题：嵌入全部 7 道已映射题 `GL2-Q054`、`GL2-Q065–Q069`、`GL2-Q138`，仅使用 `rr_b2_progress_v1`。
- 边界：介词短语转入 2.4.2；动词后的方式第五格转入 2.3；属格多种意义不被呈现为唯一分类器。
- 迁移：覆盖新语境判断、改变关系后的改写、中文关系解释和与 2.3/2.4.2 的边界判断。
- 兼容性：随堂、补救与迁移任务仅使用 `rr_zlatoust_learning_v1`；原有正式题、错题、收藏和统计记录不变。

```powershell
node scripts/validate-zlatoust-grammar-project.js
node --test tests/russian-b2/reader-static.test.js
npx playwright test tests/reader-zlatoust-navigation.spec.js --grep "Zlatoust 2\\.4\\.1" --reporter=line
```

专项浏览器回归结果：2/2 通过，覆盖章节卡片入口、7 道正式题、错因反馈与补救、`GL2-Q065` 的正式题存储、以及 390×844 下无横向溢出和唯一复习复选框名称。
