# 1.4.1 一体化教学页样板验收

日期：2026-07-26  
状态：`REVIEW`（实现与交互验收通过；原书 OCR 风险仍保留）

## 已实现

- 1.4.1 从章节知识点卡片进入独立连续教学页，返回时恢复卡片列表位置。
- 章节页不再重复显示“本章学习路线”和“第 1 章思维导图”。
- 知识点页包含 6 步自动进度路线，以及独立的中心节点 + 5 个概念分支思维导图。
- 路线阶段可自动显示未开始、学习中、已完成、需要复习，并允许手动标记复习。
- Yale 和 Russian For Everyone 等英文资料不再作为必读链接直接露出；页面先提供完整中文结论、学习用途和适用边界，英文原页仅供折叠核验。
- 五阶段均按“老师拆解 -> 原书规则中俄对照 -> 原书例句解析 -> 最小对比 -> 信号词边界 -> 常见错误 -> 随堂题 -> 原书题”组织。
- 10 道阶段随堂题和 1 道综合判断独立记录；错题提供误判解释、规则回看、最小对比和同类再练。
- 13 道原书题恰好出现一次，并继续复用原 ID 与 `rr_b2_progress_v1`。
- 路线状态支持未学习、学习中、已学习、已掌握和薄弱。
- 来源按 `source-rule/table/example`、`exercise-example`、`learning-note`、`external-note` 分层显示。

## 验证结果

- `node scripts\validate-zlatoust-grammar-project.js`：`REVIEW`，0 failures。
- `node --test tests\russian-b2\reader-static.test.js`：53/53 通过。
- `npx playwright test --config=playwright.zlatoust.config.cjs`：7/7 通过。
- 浏览器人工验证：随堂题局部刷新、正式题记录同步、路线状态回流、1440x900 桌面和 390x844 手机布局均正常。

## 尚未完成

- 未推广到 1.4.2 或其他知识点。
- 未把 OCR 来源状态升级为 PASS。
- 未提交或推送 Git。
