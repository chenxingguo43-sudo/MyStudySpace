# Vocabulary 页面重构实施文件

对应计划：`docs/VOCABULARY_REDESIGN_PLAN.md`
状态：阶段 C 已完成，等待用户验收后进入阶段 D

## 阶段 A 基线记录（2026-07-26）

阶段 A 已完成，以下结果来自当前工作区状态，未在本阶段修改页面视觉或学习逻辑：

- 内联 JavaScript 解析通过，共检测到 1 个内联脚本块。
- `node --test tests/vocabulary-*.test.js`：18 项全部通过。
- `node tests/novel-vocab-loader.test.js`：通过，当前保存的小说词汇为 2 条。
- `node tests/novel-context-fields.test.js`：通过。
- `http://127.0.0.1:3000/vocabulary.html`：HTTP 200。
- `http://127.0.0.1:3000/data/vocabulary.json`：HTTP 200，响应约 13.3 MB。
- `http://127.0.0.1:3000/api/novel-vocab-list`：HTTP 200。
- 桌面端 `1440x900`：词卡区域约 `716x763`，无横向溢出。
- 移动端 `390x844`：词卡区域约 `354x596`，底部操作栏约 `75px`，无横向溢出。

基线截图：

- `tmp/vocabulary-baseline/desktop-1440x900.png`
- `tmp/vocabulary-baseline/mobile-390x844.png`

注意：`vocabulary.html`、`tests/vocabulary-audio-fallback.test.js` 等文件在本任务开始前已经存在用户修改，阶段 A 保留这些差异，没有将其重置或覆盖。

## 阶段 B 记录（2026-07-26）

阶段 B 已完成，修改范围仅限视觉骨架：

- 浏览器主题色从深色改为 `#c5f5ec`。
- 浅薄荷到乳白背景、白色主卡、青绿色主色和柔和阴影已统一。
- 视觉令牌补齐 `--radius-card: 30px` 与 `--radius-control: 14px`。
- 未修改评分、回炉、收藏、跳过、音频和 localStorage 逻辑。
- 桌面端 `1440x900`：主卡约 `680x590`，无横向溢出。
- 移动端 `390x844`：主卡约 `338x540`，底部操作栏 `75px`，无横向溢出。
- 内联 JavaScript 解析通过，vocabulary 相关 18 项测试全部通过。

阶段 B 截图：

- `tmp/vocabulary-baseline/stage-b-desktop-1440x900.png`
- `tmp/vocabulary-baseline/stage-b-mobile-390x844.png`

## 阶段 C 记录（2026-07-26）

阶段 C 已完成，现有 `brush` 模式已改造为参考图中的“极速刷词”体验：

- 专注模式顶部栏显示“极速刷词”、当前进度、菜单和设置；隐藏 Reader/Vocabulary 通用切换。
- 词卡正面补齐左上角语言标识、右上角收藏、大号俄语单词、词性标签和查看释义提示。
- 答案面统一为白底深色排版，保留释义、体貌/词性/搭档、语法、例句和来源例句折叠区。
- 移动端底部固定“没想起 / 想起了（确认想起）”操作；正面点击只翻到答案面，不写入复习记录。
- 收藏按钮已验证只更新收藏状态，不推进当前词卡；取消收藏后仍停留在原词。
- 长来源内容展开后在词卡内部滚动：`390x844` 下答案区可视高度约 `538px`，展开后的内容高度约 `1866px`，可滚动至末尾。
- 桌面端旧版紫色全宽备份条已收敛为右下角白色通知；移动端通知位于底部操作栏上方，功能保持不变。
- 移动端 `390x844`：顶部栏 `64px`，主卡约 `338x540`，底部操作栏约 `75px`，无横向溢出。
- 桌面端 `1440x900`：主卡约 `662x575`，无横向溢出；全屏桌面工作区的进一步展开保留在阶段 F。
- 实际交互验证：正面翻卡不写记录；确认想起后恰好新增一条记录并推进到下一词；收藏切换不推进卡片。
- 内联 JavaScript 解析通过；`node --test tests/vocabulary-*.test.js` 共 18 项全部通过；小说词汇两项兼容测试通过；`git diff --check -- vocabulary.html tests docs` 无错误。

阶段 C 截图：

- `tmp/vocabulary-baseline/stage-c-brush-front-mobile-390x844.png`
- `tmp/vocabulary-baseline/stage-c-brush-answer-mobile-390x844.png`
- `tmp/vocabulary-baseline/stage-c-brush-front-desktop-1440x900.png`

## 1. 实施原则

1. 先建立页面状态清单和可执行行为测试，再改视觉。
2. 只增量修改现有原生 HTML/CSS/JS，不迁移框架。
3. 保持现有 localStorage key、词库字段和刷词状态机兼容。
4. 每完成一个阶段就运行对应测试和截图检查。
5. 不修改 `cloudsync-config.js`，不自动 push。

## 2. 阶段拆分

### 阶段 A：基线与状态清单

目标：记录当前行为，避免视觉重构掩盖逻辑回归。

工作内容：

- 检查 `vocabulary.html` 的所有渲染入口：刷词首页、普通卡、答案面、列表、详情、完成页、设置和弹层。
- 建立移动端和桌面端目标视口截图基线。
- 添加或整理行为测试：翻面前不评分、翻面后评分、回炉、收藏、跳过、撤销、空筛选结果。
- 检查现有测试是否受工作区已有改动影响，避免覆盖用户变更。

验收：内联脚本可解析，现有测试基线结果被记录。

### 阶段 B：视觉令牌与页面骨架

目标：完成参考图的基础视觉语言。

工作内容：

- 在 `vocabulary.html` 的现有样式末尾建立统一视觉令牌。
- 将背景调整为浅薄荷到乳白渐变。
- 将顶部栏、内容块、卡片、弹层统一为白底、柔和边框和 28-32px 圆角。
- 统一字体、字号层级、间距和青绿色主色。
- 保留用户自定义背景能力，并确保自定义背景仍有可读性遮罩。

验收：移动端首屏与参考图的背景、顶部栏、卡片轮廓和主色一致；桌面端无横向溢出。

### 阶段 C：刷词模式复刻

目标：把现有 `brush` 模式转换为参考图的极速刷词体验。

工作内容：

- 重构刷词首页的标题、词书进度、模式选项和开始操作。
- 重构刷词卡正面：大单词、音标/重音、发音、收藏、当前进度。
- 重构答案面：释义、词性、例句、来源和折叠区。
- 将评分动作映射为参考图的单一主色按钮、弱橙色不认识和灰色模糊。
- 移动端将评分栏固定在底部；桌面端将其放入工作区底部。
- 不改变 `rate()`、`flipCard()`、`toggleBrushAnswer()`、回炉队列和撤销逻辑。

验收：刷词正面不能直接评分；答案面评分一次只推进一次；不认识/模糊按现有规则回炉；收藏和跳过不退出错误模式。

### 阶段 D：列表、详情和学习数据视图

目标：在同一个 `vocabulary.html` 内补齐参考图的非刷词状态。

工作内容：

- 建立页面视图状态，不拆分新的 HTML 页面。
- 复用现有词条数据渲染单词小结列表。
- 增加或整理单词详情视图，支持返回、发音、收藏、例句和来源。
- 将统计数据整理为今日成就、记忆曲线、学习进度、学习记录四类视图。
- 确保视图切换不会重建或覆盖当前刷词会话。

验收：进入详情后返回，当前卡和会话位置保持不变；列表无数据时显示真实空状态；统计数字来源于现有记录。

### 阶段 E：AI 问答与弹层

目标：实现参考图的 AI 问答页面，并为后端接入留出稳定契约。

工作内容：

- 建立 AI 问答弹层的打开、关闭、loading、成功、失败、重试和保存笔记状态。
- 从当前词条传入单词、释义、例句和用户问题。
- 预留 `POST /api/ai/ask`，默认允许本地 mock adapter。
- 不在浏览器端保存或暴露 API Key。
- 重学确认弹层采用参考图的遮罩、圆角和按钮层级。

验收：AI 页面不阻塞刷词；关闭后能回到原状态；失败可重试；mock 和真实接口返回结构一致。

### 阶段 F：响应式与无障碍修正

目标：完成手机和桌面端的稳定布局。

工作内容：

- 验证 `360x800`、`390x844`、`412x915`、`430x932`。
- 验证 `1280x720`、`1440x900`。
- 检查底部评分栏、备份提醒和 toast 的 z-index 与安全区。
- 检查长释义、长例句和长单词的内部滚动。
- 为弹层补齐 dialog 语义、Esc 关闭、初始焦点和返回焦点。
- 为折叠内容、按钮、菜单补齐键盘和屏幕阅读器状态。

验收：无横向溢出、无底部遮挡、所有主要按钮至少 44px、长内容可达。

### 阶段 G：回归与交付

目标：确认视觉改造没有破坏学习数据和现有能力。

执行：

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('vocabulary.html','utf8');const scripts=[...h.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).filter(Boolean);for(const s of scripts)new Function(s);console.log('inline JS parse OK')"
node --test tests/vocabulary-*.test.js
node tests/novel-vocab-loader.test.js
node tests/novel-context-fields.test.js
git diff --check -- vocabulary.html tests docs
```

浏览器验收必须使用隔离测试数据，不得污染用户真实 localStorage。完成六个目标视口截图后，记录截图路径和残余风险。

## 3. 修改边界

预计主要修改：

- `vocabulary.html`
- `tests/` 中与 vocabulary 状态和响应式行为直接相关的测试
- `docs/VOCABULARY_REDESIGN_PLAN.md`
- `docs/VOCABULARY_REDESIGN_IMPLEMENTATION.md`

可能新增但需单独确认：

- `js/vocabulary-ai-adapter.js`：AI 请求和 mock adapter
- `server.js`：仅当需要提供本地 `/api/ai/ask` mock 路由时修改

不修改：

- `data/vocabulary.json` 及其字段结构
- `cloudsync-config.js`
- 与本任务无关的 reader、俄语知识库和番茄钟文件

## 4. 风险控制

- 用 CSS 视觉层覆盖替代大规模删除现有规则，避免隐藏行为样式。
- 对刷词状态机先写行为测试，再调整按钮和渲染器。
- AI 接口先定义 adapter，避免把具体供应商绑定在页面代码中。
- 桌面端增加宽度时限制阅读列，避免例句变成难读的长行。
- 每次修改后使用 `git diff -- vocabulary.html` 检查是否误触数据和敏感配置。
