# 1.4.8 独立教学页质量记录

## 范围

- 主题：否定命令式中的未完成体和完成体。
- 原书规则：印刷页 98 / PDF 100；PDF 页混有第 2 章，页界已视觉复核。
- 页面入口：`gl1-4-8-negative-imperative`；独立页：`learning-pages/gl1/section-1.4.8.json`。

## 教学结构

1. 一般请求、建议、命令或禁止一类活动：未完成体。
2. 警告或提醒避免一次具体后果：完成体。
3. 可改写为 `если бы` 的反事实条件：完成体，不能误判为普通禁令。

每阶段包含语境入口、原书逐字规则和例句、最小对比、信号边界、两道即时判断与再练；页面有独立学习路线、三分支判断导图、总表和四项迁移任务。

## 正式题与风险

- 正式题复用 `GL1-Q085`–`Q088`、`GL1-Q106`–`Q107`；继续使用 `rr_b2_progress_v1`。
- 随堂题只使用 `rr_zlatoust_learning_v1`。
- OCR 风险保留为 `needs-review`，可见界面显示“待复核”。中文教辅不冒充原书内容。

## 验收项

- `node scripts/validate-zlatoust-grammar-project.js`：0 failures；保留已有的 1 条 `source-exercise-only` 全章提示。
- `node --test tests/russian-b2/reader-static.test.js`：60/60 通过。
- 浏览器抽查：章节卡片可进入 1.4.8 独立页；三条判断支、三组折叠正式题、随堂反馈与同类再练均可见；390×844 下 `scrollWidth === clientWidth`，复习控件均有独立中文无障碍名称；页面控制台无错误。
