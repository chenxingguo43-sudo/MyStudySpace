# 2.4.2 独立教学页验收记录

日期：2026-07-26
状态：`REVIEW`（结构、桌面与移动端专项交互已验收；OCR 风险保留）

- 内容：五阶段分别处理 `из/по` 的材料、构成、来源与领域，`в/на + 第四格`的特征/量/方向/用途，`с`、空间介词和 `о` 的特征/位置/内容，名词 + 不定式，以及来源边界。
- 来源：原书 2.4.2 表和“请注意”，印刷页 102–103 / PDF 104–105。逐字表格证据、例项和教辅解释严格分层。
- 正式题：嵌入 15 道已映射题 `GL2-Q050–Q061`（不含 Q062）、`Q063`、`Q064`、`Q098`、`Q144`，仅使用 `rr_b2_progress_v1`。
- 边界：`GL2-Q062` 保持 `needs-review`，不被渲染为正式题；不从 `традиция + 不定式` 的单题答案扩写原书范围。
- 迁移：覆盖新语境、关系改变改写、中文解释和待复核来源判断；随堂/补救/迁移仅写入 `rr_zlatoust_learning_v1`。

```powershell
node scripts/validate-zlatoust-grammar-project.js
node --test tests/russian-b2/reader-static.test.js
npx playwright test tests/reader-zlatoust-navigation.spec.js --grep "Zlatoust 2\\.4\\.2" --reporter=line
```

专项浏览器回归结果：2/2 通过，覆盖章节卡片入口、15 道正式题、`GL2-Q062` 不被渲染为正式题、错误反馈与补救、`GL2-Q050` 的正式题存储，以及 390×844 下无横向溢出和唯一复习复选框名称。
