# 《俄语 B2 全模块》同步《В мире людей》UI/UX —— 完整审计文档

> 生成日期：2026-08-28（第三轮扫描增补于同日）
> 来源：2026-08-27 至 08-28 只读审计会话（结构层 + 行为层两轮扫描合并）+ 第三轮支线扫描（模块级对比）
> 状态：审计完成，未动任何代码。第一、二部分行号基于 2026-08-27 的 `reader.html`（10034 行版本）；第三轮增补（第五部分）基于 2026-08-28 工作区（10288 行版本）。动手前均需按函数名重新定位。

## 背景

Reader 书架现有两本教材：

- **A =《В мире людей》**：UI/UX 已精修（阅读/练习双模式、词典生命周期、完成卡等）。
- **B =《俄语 B2 全模块》**：结构可用但界面停留在早期版本。

目标：**B 全面同步 A 的 UI/UX。**

## 会话中已定的方向性决策

1. **同步范围**：不做只读限制的方案挑选——B 的所有界面（含做题渲染）全部往 A 靠拢。
2. **实现底线**：视觉与信息架构照 A 抄，但 B 已有的两样东西**不能在同步时丢掉**：
   - 「门把手」——选项行的 `role="radio"` / `aria-checked` 语义标记（读屏与键盘可识别）；
   - 「水管过滤网」——`parseStoredObject` → `safeObject` 的存储读取校验（脏数据不崩页面）。
   即：抄 A 的长相，保留 B 的安全实现；不把 A 的工程债（内联 style、裸 `JSON.parse`）复制进 B。
3. **写作/口语保持纸笔模式**：页面不提供作文输入框是既定设计（A `reader.html:9365`），B 写作模块的 textarea 草稿框按 A 的方向收敛，此差异是有意为之，不属于待修复差距。
4. **GitHub 令牌泄露（会话中的紧急插曲，已处理）**：`cloudsync-config.js` 中的 `ghp_...` 令牌曾被提交进公开仓库（提交 54c8ef0e），用户已删除令牌。后续若恢复云同步，新令牌只放本地并确认 `.gitignore` 覆盖。

---

## 先说结论

两本教材的**视觉骨架已经共享**：`.b2-dashboard-hero`、`.b2-continue-card`、`.reader-workbench-index`、`b2FloatingNavigation`、面包屑树、toast 复用同一套（`css/reader-workbench.css:91-161` 同时命中两边类名）。所以"同步"大部分不是改样式，而是**补结构、补行为、统一数据口径**。

真正的差距分两层：

| 层 | 核心差距 |
|---|---|
| 结构层（页面骨架） | 书架进度口径错误、仪表盘模块卡缺 resume 行和操作区、模块目录页极简、B 阅读缺整套双模式架构、状态清理遗漏、死代码 |
| 行为层（点击之后发生什么） | 答题重渲染吞翻译状态（BUG）、AI 解析按钮、段落收藏、定位原文、查看原文计数器、完成卡与学习事件、词典生命周期 2 项 |

---

# 第一部分 · 结构层审计

## 一、书架层

| # | 差异 | 证据 | 实际问题 |
|---|---|---|---|
| 1.1 | A 的模块小卡显示「上次学习位置 + 进度」；B 只显示「描述 + 单元数」 | A `reader.html:3089`，B `reader.html:3050` | B2 书架卡没有"从哪继续"的信息，点小卡只能进目录 |
| 1.2 | **B 的总进度口径错误**：分子 `getBookProgress('russian_b2')` 数的是 readStats 完成条目，分母却是 `modules.length`（7 个模块） | `reader.html:3046-3047` | `russian_b2` 的 format 是 `b2-full` 不是 `quiz-first`（`data/textbook/russian_b2/book.json:4`），`getBookProgress` 走 readStats 分支（`reader.html:3006-3012`），分子分母不同单位，百分比失真。A 用 worldDone/worldTotal 同口径（`reader.html:3081-3085`） |
| 1.3 | A 书架卡硬编码在 `renderShelf` 内联；B 抽成 `renderB2ShelfCard()` | `reader.html:3091` vs `3044` | 结构一致；同步时反而应把 A 的也抽出来，统一成 `renderAggregateShelfCard(config)` |

## 二、总仪表盘

| # | 差异 | 证据 | 实际问题 |
|---|---|---|---|
| 2.1 | **B 的模块卡没有「上次学习位置」行** | A `reader.html:8566`（`world-module-resume`），B `reader.html:3291-3294` 无对应 | B2 用户在仪表盘看不到"上次学到哪"，只靠顶部继续卡 |
| 2.2 | **B 的模块卡没有卡内操作区**（打开目录 / 继续↗ / 导出） | A `reader.html:8567-8568`（`world-module-actions`），B 无 | B 模块卡是单个 `<button>`，**button 里不能再嵌 button**（无效 HTML）。要加操作区必须把 `b2-module-card` 改成 `<article onclick>`——见硬问题 ② |
| 2.3 | **B 仪表盘缺 `menuAction`，没有 ☰ 面包屑入口** | B `reader.html:3296`，A `reader.html:8571` | 面包屑树本身已支持 B2 分支（`reader.html:2553-2560`），只差传参。同类缺口：`renderB2ModuleChapters`（3388）、`showB2ArchivePanel`（3141）。注意：`goChapter` 的 B2 分支**有** menuAction（`reader.html:3458`，初稿探查曾误报，已人工核实） |
| 2.4 | **B 入口 `showB2Dashboard` 缺状态清理**：不 `stopTimer()`、不隐藏 searchBar、`renderB2Dashboard` 里 `curBook` 不清空 | B `reader.html:3347-3354, 3264`，A `reader.html:8538-8539` | 从 B2 阅读页带计时器进仪表盘，计时器继续跑；searchBar 残留。同样问题在 `renderB2ModuleChapters`（3383-3385）——对比 A 的 `showChapters`（3150-3153）全做了。`openB2Module`（3399）同病：不停计时器、不隐藏搜索栏、不保存上次位置 |
| 2.5 ✅ | ~~B 的继续卡直接读 `rr_lastread_`~~ | **已修（2026-08-29 用户验收，含二次返工）**：新增 B2 按模块分库 `rr_b2_module_resume_v1`（对齐 A 的 `rr_world_people_resume_v1`），`saveLastRead` 的 B2 分支写入各模块记录（含 chapterTitle）；`getB2ModuleResume` 优先分库、全局记录兜底。**推导兜底 `deriveB2ModuleResume`**（2026-08-29 二次验收补充）：分库记录只能从启用后积累，用户反馈既有模块仍显示"从目录开始"——新增从既有做题数据推导最后位置：阅读（答题记录 chapterIndex+时间戳）、语法（P1-P6 答题时间戳）无需清单直接推导；写作/会话/听力（草稿+完成表+进度，按 unitId）/真题（题目记录）经仪表盘清单（chapterInventory 的 id/questionIds/taskIds）映射回章节。**推导结果在仪表盘渲染时落分库（标记 derived，附章节标题 via `b2ModuleTitles` 缓存；整章命中不显示题目 id），目录页继续卡因此也能显示**。显示优先级：分库记录 > 推导 > 从目录开始；用户进过模块后真实记录覆盖推导。**真题模块数据当前为"已索引未核验"（无题目可答），推导与记录均无从建立，属数据状态而非功能缺失** | 六模块全部显示各自上次位置 |
| 2.6 | B 有「导师复盘」入口卡，A 仪表盘没有（A 放在书架工具栏） | B `reader.html:3298`，A `reader.html:3075` | **待定决策**：同步后这个卡留不留？留则 A 反向补齐，不留则 B 删 |
| 2.7 | B 的 loading 用裸 `main-container`，吃不到 workbench 的安静 loading 样式 | B `reader.html:3354`，CSS 作用域 `css/reader-workbench.css:495-510` | 视觉小瑕疵，加载页闪一下旧风格 |

**两套进度条并存**：A 用 `.progress-bar > .progress-fill`（`reader.html:8564`），B 用 `.b2-module-progress` 的 `--progress` 伪元素（`reader.html:3285`，定义在 441-448）。workbench CSS 把两边卡片都拍平成编辑风行，但 `.b2-module-progress` 没有任何 workbench 覆盖，桌面端 B 的卡里会出现一个孤立的胶囊条，与 A 的视觉不一致。

## 三、模块目录页（结构层差距最大）

B 的 `renderB2ModuleChapters`（`reader.html:3383-3397`）是 15 行极简渲染，对比 A 的 `showChapters`（3147-3213）：

| # | A 有 → B 缺 | 证据 | 实际问题 |
|---|---|---|---|
| 3.1 | **目录页继续学习卡** | A `renderWorldDirectoryResume` 2773-2780 | B2 进目录后没有任何"继续上次"入口 |
| 3.2 | **缺 `menuAction`** | 3388 | B2 模块目录没有 ☰ |
| 3.3 | **缺 `reader-workbench-index` / 目录容器类** | B 外层是裸 `<main class="main-container">`（3389） | 吃不到 workbench 的 `.chapter-grid` 紧凑样式（`css/reader-workbench.css:163-174`）。A 也游离在 workbench 外，但 A 有自己的 `world-chapter-*` 样式兜底（`reader.html:878-886`），B 什么都没有，用的还是通用旧网格 |
| 3.4 | 无分组、无懒加载、无 loading 占位；标题只显示 fallback「第 N 单元」 | A 分组目录 2929-2943、懒加载 2869-2886、占位 3183 | B 的 index.json 里其实有 `chapterTitles`（`openB2Module` 3409 已读入），只是没用真实标题。grammar P1-P6 可分组，其余模块 5-13 个单元平铺即可 |
| 3.5 | `isDone` 判断用 `curBook.format === 'quiz-first'` 字符串直比 | 3391 | 行为等价于 `isQuizFirstBook()`（2977-2979），旧写法但不是 bug |

## 四、阅读页 / 做题页（结构层）

| # | 差异 | 证据 | 实际问题 |
|---|---|---|---|
| 4.1 | B 的单题语义结构更好：`<section>` + `fieldset` + `role="radio"` + `aria-checked` + `hidden` 管理解析；A 用 `<div>` + 内联 style + `pointer-events:none` | B `reader.html:5362-5385, 6563`，A `9673-9724` | 按已定方向：做题渲染视觉照 A 抄，但换皮时保留 B 已有的语义标记（选项 role/aria、解析区 hidden+aria-expanded），A 的内联 style（9681、9705）抽成 class |
| 4.2 | **A 的 `reading_speaking` 有阅读/练习双模式架构**：模式切换按钮、练习侧栏（阅读模式下 `display:none`，`reader.html:220`）、模式记忆、手机强制练习模式；B 的 `reading` 模块文章和题目永远混在一页（`reader.html:6602-6603`），无模式之分 | A `9625-9639, 9484-9507`，B `6589-6619` | **本次同步的主工程**。B2 往 A 靠不是换皮，是要引入整套双模式架构 |
| 4.3 | 三套底部导航类并存：`.fab-group-bottom`（A 阅读、B renderChapter）、`.b2-quiz-nav`（B quiz/reading）、`.ws-bottom-nav`（A 写作口语） | `9653` / `5675, 6604, 6795` / `9384` | 同步时应收敛成一套，否则后续每次调样式要改三处 |
| 4.4 | **死代码**：`renderWritingSpeakingChapterLegacy`（8684）全文件无调用；`restoreLastRead` 定义了两次（3363 与 3414，后者运行时生效，3363 是死代码） | 8684 / 3363, 3414 | **必须先清理再重构**——否则改到 3363 那份全是无效功 |

## 五、CSS 体系

`css/reader-workbench.css` 里两边并列共享（95-102、104-116、131-139、141-146、529-543、595-601 都是 `.b2-*, .world-*` 成对出现）。差异：

- A 独有：`.world-module-continue`（71、84 行）、`.world-module-resume`（143 行）——做完 2.1/2.2 后这两条 CSS 天然复用，只需把选择器加上 B 侧等价类。
- B 独有但基本失效：`reader.html:441-448` 的 `.b2-module-card` 玻璃卡样式在 index 场景被 workbench 拍平，残留的 `.b2-module-progress` 胶囊条形成视觉孤儿（见 2.8/进度条说明）。

结论：**CSS 层几乎不用新增，重点是删旧的**（B 的玻璃卡内联定义、两套进度条之一、三套底部导航之二）。

## 六、状态与存储

| # | 差异 | 证据 | 实际问题 |
|---|---|---|---|
| 6.1 | B 内部混用两套键前缀：`rr_b2_*`（3484-3485、5702）与 `russian_b2_*`（5804-5808、5935、6457-6458） | — | **不能动键名**：`RussianB2Dashboard.ARCHIVE_KEYS`（备份契约，3106）、`tests/russian-b2/` 的一组测试、用户现有本地数据三重耦合。只在新代码层面统一读写入口 |
| 6.2 | A 的 `getReadingSpeakingProgress` 裸 `JSON.parse`+try/catch；B 走 `parseStoredObject` → `safeObject` 形态校验 | A `8648-8651`，B `3231-3234` | B 更好，同步时保留 B 的读法；A 补 safeObject 属于另一个"给 A 还债"的独立任务，不在本次范围 |
| 6.3 | 完成模型不同：A `readStats[bookId][ch].completed`；B grammar 用 `__completed`，writing/speaking/exam 用独立完成表 | A `8191-8194`，B `3554-3557` | 与硬问题 ① 同源。A 式"已完成 X/Y 章"在 B2 侧必须先定义每个模块的"一个单元是什么" |

---

# 第二部分 · 行为层审计

## 🔴 一个真正的 BUG（B2 有，A 没有）

**答题后，已展开的中文翻译全部收起。**

- B2 阅读页：答一道题 → 整页重新渲染（`reader.html:5743` → `5760`）。段落的"点击展开翻译"状态存在 DOM 里，重渲染后全部归零。
- 场景：展开 8 段翻译 → 答一道题 → 8 段全缩回去，得重新点。
- A 的做法：答完题只更新那一道题的 DOM，页面其他部分不动（`reader.html:9930` `updateReadingSpeakingQuestionDOM`）。
- 这是 A 修过、B2 没跟上的老问题。**修复不依赖双模式架构，改动小、收益立竿见影，应排在动手顺序最前面。**

## A 有 → B2 没有的行为（按影响大小排）

| # | 行为 | 感知 | 证据 |
|---|---|---|---|
| 1 | **题目旁「🤖 AI 直接解析」+「复制提示词」按钮** | A 做完一题可直接让 AI 讲题；B2 阅读题没有（B2 语法模块有） | A `9772`；B2 阅读题渲染 `6567-6578` 无 AI 调用 |
| 2 | **段落收藏 ☆**（配合导出阅读笔记） | B2 读到好句子没法标记 | A `9609-9611`；B2 `6591` 无 |
| 3 | **解析里「定位原文句子」**（跳回原文、证据句高亮+滚动居中） | B2 无 | A `9831-9884`；数据前提见下文"数据层的坑" |
| 4 | **👁 查看原文计数器**（"查看原文 3/18 段"） | B2 不数 | A `9634` |
| 5 | **「标记本篇完成」+ 完成弹窗**（读了 N 分钟 · 查了 N 词 · 存了 N 生词） | B2 阅读整条链路都没有 | A `9552-9558`、`9573` |
| 6 | **词典飘浮定位**（练习模式下词典出现在所点词旁，自动避让屏幕边缘） | — | `9462-9482` |
| 7 | **词典防误关**（点段落展开翻译时词典保持打开） | — | `7256-7258` |

**#5 的连带后果**：B2 阅读不记阅读时长、不记查词数，学习活动记录（`StudyActivityStore`）里永远没有"B2 阅读完成"事件（`reader.html:8197` 的完成上报只走 `markChapterDone`，B2 阅读没这条路）。**学习统计里 B2 阅读会是空白。**

**#7 的机制**：全局点击监听（`reader.html:7245`）里的特判（`7256-7258`）只认 A 的布局类名 `rs-reading-mode`；B2 阅读页用的是 `reader-reading-layout`（6600），不在名单里，所以走到关闭分支（7261）。同步 = 特判认两种布局，或 B2 直接复用 A 的布局类。

## B2 有 → A 没有的行为（往 A 靠时要决定去留）

| # | 行为 | 说明 | 建议 |
|---|---|---|---|
| 1 | **错因归因**：答错后弹"这题主要错在哪里？（词汇/语法/粗心…）"，喂给错题复习 | `reader.html:6575` | **保留** |
| 2 | **「原书答案」核对模式**：答完显示"查看原书答案（PDF 页码）"，强调逐项核验来源 | `6573`。与 A 的"解析卡"是两种哲学 | **待定决策**，见数据层的坑 |

## 扫过、确认两边一致的（不用动）

- 🔍 搜索本章：两边都走 `.para-block`，都搜不到题目文字（同样的局限，不是差距）
- ⌨️ 左右方向键翻章：两边都生效（`reader.html:8222`）
- 生词高亮、重音符号：两边都调用（`6617-6618` vs `9660-9661`）
- 分栏比例记忆：两边都有（`6616`、`9658`）
- 查词 / 划选短语 / 加入生词本：全局共享，一致
- 学习事件上报（查词、生词）：两边都记，且都带书名/模块归属（`js/reader-learning-events.js:40-55`）
- 答题记录上报：两边都走 `recordB2Submission`（B2 `5744`，A `9905`）
- 题目级"上次做到哪"的记忆与恢复：两边都有

---

# 第三部分 · 三个硬问题（决定方案形态）

1. **进度聚合的同步/异步矛盾**（1.2 + 6.3）：B2 的真实进度只有 `js/russian-b2/dashboard.js` 的 `buildDashboardProgress` 异步模型知道（需 fetch 各模块 index.json，`reader.html:3248-3259`）。书架渲染是同步的。B2 书架卡想要 A 式同口径真实进度，需要**缓存聚合结果**或**接受书架异步渲染/loading 态**——方案决策点，待定。
2. **`b2-module-card` 是 `<button>`**（2.2）：加卡内操作区必须换成 `<article onclick>`，连带 CSS 的 `:hover`/focus 样式和 `tests/russian-b2/b2-dashboard.test.js` 的断言更新。
3. **存储键族不能统一**（6.1）：备份契约 + 测试 + 用户本地数据三重耦合。UI 同步绕开它，不顺手改。

# 第四部分 · 数据层的坑（"直接往 A 靠"的内容缺口）

A 的做题体验里"查看解析"→ 定位原文、分析错误选项那一大段，依赖题目数据里预埋的解析文本与锚点（`detailed_explanation` 等字段）：

- A（阅读口语）：**241 道题，241 道全部有解析数据** ✅
- B2（阅读模块）：**60 道题，0 道有解析、0 道有原文锚点**（脚本实测，字段只有 `id/prompt/options/answer/answerSource`）

界面可以照搬 A，但解析区和定位按钮**没有内容可填**。两条路：

- **a.** 给 B2 的 60 道题补写解析 + 锚点（内容工程，A 当年就是这么干的）；
- **b.** 用 A 的界面壳，解析区沿用 B2 现在的"查看原书答案（PDF 页码）"模式。

→ **待定决策**，决定"定位原文句子"（行为层 #3）和解析卡是否纳入 B2 阅读同步范围。

---

# 第五部分 · 第三轮扫描增补（2026-08-28，模块级支线）

第三轮扫描覆盖前两轮未系统过的支线：各专项做题页（听力/写作/口语/真题/语法）、错题本联动、学习事件上报、设置层与移动端。行号基于当日工作区（10288 行）。

## 0. 工作区状态核对（前两轮条目哪些还在）

工作区存在用户未提交改动，逐条核对结果：

| 旧条目 | 当前状态 |
|---|---|
| 3.4 目录页只显示「第 N 单元」 | **已修**（未提交改动）：`renderB2ModuleChapters`（3453）已显示 `chapterTitles` 真实标题 |
| 4.4 死代码：重复 `restoreLastRead` | **仍在**：3433 与 3484 两份，3484 运行时生效；`renderWritingSpeakingChapterLegacy`（8938）仍在 |
| 🔴 行为层 BUG：答题整页重渲染 | **仍在**：`answerReadingQuestion` / `toggleReadingAnswer` / `setReadingErrorCategory` 均走 `rerenderReadingPracticePreservingScroll()`（6013 附近） |
| 1.2 书架进度口径、2.1-2.4 仪表盘差距 | **仍在**（`renderB2ShelfCard` 3114、`renderB2Dashboard` 3331、`showB2Dashboard` 3417 未变） |
| 3.1/3.2/3.3 目录页缺继续卡、menuAction、容器类 | **仍在** |

## 1. 🔴 B2 写作还有作文输入框，与纸笔决策冲突

这是本轮最重要的新发现，**修正了第一部分"已定决策 3"的适用范围**——那个判断只对 A 成立，B2 现状还没有改：

- **A 写作**（`renderWritingSpeakingChapter`，9577）：纸笔分步工作台——第 1 步读懂原书任务 → 第 2 步核对输入材料 → 第 3 步「在纸上形成内容」，页面明确写"不提供作文输入框，也不启动考试计时"（9620 附近）；底部有"纸笔写作记录 X/Y 项已完成自查修改"章节汇总。
- **B2 写作**（`renderWritingWorkbench`，6167）：仍有 `<textarea>` 草稿框 + 本地自动保存 + 词数统计 + 版本保存（`saveWritingVersion`）+ 评分自查 + 范文锁定，**没有**分步工作台结构。

同步时 B2 写作应收敛为 A 的纸笔模式（textarea 及版本功能按决策移除或降级为提纲记录），并补上分步结构。注意 B2 的草稿数据（`russian_b2_writing_drafts_v1`、版本列表）在界面上砍掉入口后仍留在 localStorage，**不要删存储键**（备份契约耦合，同硬问题 ③）。

连带发现：`initCollapseAnimations`（9615 附近）——A 写作页的折叠面板高度过渡动画——是 A 独有的交互打磨，B2 全部页面没有，同步时可随写作页一起带上。

## 2. 错题本只覆盖 B2 语法 + 阅读，跨书不平等

`getWrongAnswerItems`（5184）只读两类数据：B2 语法 `russian_b2:p[1-6]` 的 `everWrong` 记录 + B2 阅读的 `RussianB2ReadingReview.getReviewItems`。后果：

- **A（В мире людей）四个模块的错题完全不进错题本**——书架「错题复习 · N 题待掌握」的计数与 A 无关，A 的错题无处复习；
- **B2 真题（exam）的错题也不进**——`getExamProgress` 未纳入；
- 写作/口语本无客观对错，不纳入是合理的。

这是共享功能对两本书的不平等对待，同步时要么扩展数据源（把 A 的错题记录按模块归并进 `getWrongAnswerItems`），要么在 UI 上明确错题本的范围只限 B2。

## 3. 学习事件"章节完成"上报只走 A（BUG 的精确机制）

`markChapterDone`（8436）里：`if (!curBook.isB2Module && curBook.id !== 'russian_b2') recordReaderChapterCompletion();`

- `recordReaderChapterCompletion`（学习活动库的 complete 事件）**只有 A 的书会触发**；
- 且 B2 阅读页根本没有完成按钮——`markDoneBtn` 只存在于通用章节渲染（7050）和 A 阅读口语页（9283），`renderReadingPracticeChapter` 没有；
- 于是 B2 永远走不到 `markChapterDone` → 不写 `readStats`、不发完成事件。这既是行为层 #5"学习统计空白"的精确机制，也是 1.2 书架进度分子（readStats）基本为空的原因——**两条旧结论在此汇合为同一根因**。

## 4. 听力模块已统一（正面确认）

A `listening_speaking` 与 B2 `listening` 共用同一个 `renderListeningPractice` 精听工作台（6670），模式（考试/精听/媒体练习/复习/质量复盘）、播放器、来源标注全部共享，仅返回目标不同（`isWorldPeopleBook` 分支，6690-6691）。**听力做题页无需同步**。目录页除外：A 有分组目录 + 懒加载真实标题（2897-2990），B2 是平铺网格——归入 3.x 目录页差距。

## 5. 语法模块：渲染共用，但 A 独享整层增强

两边共用 `renderQuizChapter`（5880）+ `renderKnowledgePointNav`，但 A（zlatoust_grammar）在此之上多出一整层，B2 语法全部没有：

| # | A 独有 | 证据 |
|---|---|---|
| 5.1 | **虚拟滚动连续练习**：597 题用 `zlatoust-virtual-quiz` + spacer + resizeObserver 只渲染可视区，B2 语法是全量平铺 `renderQuizItem` 循环 | 5922-5930 |
| 5.2 | **理论卡联动**：章节理论（`loadZlatoustChapterTheory`）、规则单元页（`showZlatoustRuleUnit`）、原子规则/判定步骤/信号词卡/易错卡 | 4013-4345 |
| 5.3 | **薄弱规则面板**（`renderZlatoustWeakRulePanel`）与分节学习进度、状态标签 | 4169、4057-4106 |
| 5.4 | **学习路线 / 思维导图 / 学习 TOC（移动端）** | 4408-4661 |
| 5.5 | 章节练习与理论的互链（`renderZlatoustExerciseLinks`） | 4345 |

B2 语法往 A 靠 ≈ 移植这一层；但**第三轮讨论修正了前提**：B2 并非没有理论内容——32 张审核过的学习卡已存在并在用（见待定决策 6）。5.2-5.5 中真正缺的只有"从知识点卡进入 zlatoust 完整教学页"的集成（含学习路线/思维导图，随教学页而来）与薄弱规则面板；5.1 虚拟滚动是纯工程项。

## 6. 其他确认

- **真题模块（exam）**：B2 独有、无 A 对应物。UI 已带 `reader-workbench--exam` 作用域、menuAction、词典考试策略（`setExamPolicy({mode:'exam'})`，6793）与查词辅助解锁记录，符合 A 的视觉体系，**无同步差距**。
- **设置层**：主题/字号/字体是全局 `body` class（`applyTheme` 2395），两书共享，无差距。
- **口语**：B2 有独立口语页（6252，渐进练习 + 录音 IndexedDB + 手动完成），A 的口语内嵌在写作章节（`WhiteNightReaderSpeaking.mount`，9651）；两边录音走同一组件，页面结构差异属于 B2 有而 A 无的独立模块，不算债。
- **书架继续卡对 B2 标签降级**：`getShelfContinueLabel` 对 A 显示"模块 · 单元 · 题目"，对 B2 只显示"俄语 B2 全模块 · 第 N 章"，丢失 moduleId（3310 附近）。小项，做 2.5 时顺带。
- **移动端**：媒体查询两边均有覆盖；A 的"手机强制练习模式"（9697-9720 的视口探测）属于双模式架构的一部分，归入主工程。
- **A 自身的债（同步时别抄进 B2 的新代码）**：A 写作页 summary 的内联 `style="display:flex..."`（9610 附近）。

# 完整差距图（结构层 + 行为层合并）

> **验收修正（2026-08-29）**：用户对照 A 二级页截图指出"B2 模块目录页完全没有对标内容"。审计第三部分 3.4 曾判断"分组目录对 B2 影响有限、平铺即可"——该判断有误：**A 的模块目录页本质是二级仪表盘**（大标题 + 元信息 + 继续卡 + 分组折叠网格），不是一张平铺网格。已按 A 重做：`B2_DIRECTORY_GROUP_CONFIG`（阅读 1–5/6–10 篇、写作 1–13 任务、真题分测验）复用 A 的 `listening-section/listening-entry` 样式；单元标题 fallback 链 chapterTitles→index.units[].title；完成口径修正为阅读按"该篇全部题目已答"判定（与侧栏完成卡、标记完成同口径）。语法（6 单元）保持平铺。

```
B2 阅读模块 ←→ A 阅读口语 的全部差距：

结构层                      行为层
├─ 双模式架构缺失（主工程） ←→ ├─ 答题重渲染吞翻译状态（BUG）
├─ 目录页简陋              ←→ ├─ AI 解析按钮缺失
├─ 仪表盘卡功能少          ←→ ├─ 段落收藏缺失
├─ 书架进度口径错误        ←→ ├─ 定位原文缺失（需补数据）
└─ 状态清理遗漏            ←→ ├─ 计数器/完成弹窗/时长记录缺失
                              └─ 词典生命周期 2 项
```

# 建议动手顺序（仅建议，未执行）

> 进度（2026-08-29）：步骤 1-5 已完成并通过测试与浏览器实测；步骤 6 起未开始。

1. ✅ **修答题重渲染 BUG**：B2 阅读三处答题动作改为 `updateReadingQuestionDOM` 局部更新（含 `data-question-id` 标记与整页渲染兜底），段落展开翻译不再丢失。
2. ✅ **清理死代码**：删除重复 `restoreLastRead`（保留完整版）与 `renderWritingSpeakingChapterLegacy`（356 行）；两个引用旧版写作页文案的静态断言已对齐现行渲染器。
3. ✅ **补行为参数**：B2 仪表盘/模块目录/备份面板三处补 `menuAction`；`showB2Dashboard` 与 `openB2Module` 补 `stopTimer` + searchBar 清理。
4. ✅ **模块目录页升级（含 2026-08-29 验收返工）**：B2 模块目录按"二级仪表盘"重做——大标题 + 元信息（N 个学习单元 · 已完成 N 个）+ 继续卡 + **A 式分组折叠目录**（阅读 1–5/6–10 篇、写作 1–13、真题分测验，复用 `listening-section/listening-entry` 双列网格、衬线标题、完成 ✓ 绿色编号）；单元标题 fallback：chapterTitles→index.units[].title；阅读完成口径 = 该篇全部题目已答（目录 ✓ / 侧栏完成卡 / 标记完成按钮三处统一）；语法（6 单元）保持平铺网格。此前版本只做了继续卡和平铺网格，漏掉分组——审计 3.4 的"平铺即可"判断已修正。
5. ✅ **仪表盘模块卡结构对齐**：`<button>`→`<article role="button">`，加 `book-kind` 标签、A 式 `progress-bar/progress-fill` 进度条（替代孤立的 `b2-module-progress` 胶囊）、「上次学习」行（`getB2ModuleResume`/`getB2ResumeLocation`）、卡内操作区（打开目录/继续↗；review 卡为打开错题本）；CSS 同步重写。
6. ✅ **书架卡进度口径修复**（1.2）——已按决策 1 实现：新增 `russian_b2_progress_cache_v1` 缓存（`renderB2Dashboard` 每次渲染时由聚合模型写入：总进度 + 各模块 completed/total/percent）；`renderB2ShelfCard` 改读缓存（首次无缓存时兜底显示"总进度待统计"，模块小卡对齐 A 式"上次学习位置 + X/Y · P%"）。注意快照时效：缓存只在进仪表盘时刷新，当次会话内做题后回书架看到的仍是快照，进一次仪表盘即更新。
7. ◐ **B2 阅读模块双模式架构 + 行为补齐**（4.2 + 行为层 1-7）——**一期已完成（2026-08-29）**：双模式架构（B2 阅读页复用 A 的 `rs-reading-mode/rs-practice-mode` 布局类，阅读模式隐藏练习侧栏，模式记忆 `russian_b2_reading_layout_mode`，手机强制练习，含词典防误关与分栏联动的全部既有行为）；**练习模式为 A 式固定右栏**（`b2ReadingPracticePanel`：桌面 fixed 右栏 clamp(320px,32vw,440px)、原文在左侧不重叠、题目收在栏内、栏头"边读边答"+完成进度条随答题实时更新；移动端 static 堆叠到原文下方）；飘浮词典（练习模式词典出现在所点词旁，行为层 #6，复用 `positionReadingSpeakingDictionary`）；👁 查看原文计数器；段落收藏 ☆（复用 `toggleBookmark`/bookmarks 存储）；"✓ 标记本篇完成"完成卡 + 完成弹窗；B2 模块完成学习事件（修复第五部分 §3 根因：`markChapterDone` 的 B2 分支现在写入 `module:'b2'` 事件）。**二期未做**：AI 解析按钮（行为层 #1）、导出阅读笔记入口；解析区沿用"查原书答案"（决策 3）；参照 `docs/superpowers/specs/2026-07-21-reading-module-unification-design.md`。
8. ✅ **B2 写作收敛为纸笔分步工作台**（第五部分 §1，2026-08-29 完成）：`renderWritingWorkbench` 重写为 A 的三步结构——第 1 步读懂原书任务（任务+中文提示+元信息）→ 第 2 步核对原书材料（材料网格）→ 第 3 步在纸上形成内容（"页面不提供作文输入框，也不启动考试计时"）；头部标"纸笔模式"；textarea/自动保存/词数/复制反馈提示/版本保存与恢复的**界面入口全部移除**，相关死函数删除；草稿/版本的 localStorage 键与历史数据原样封存（决策 4）；范文折叠面板挂 `ws-animated-collapse` 并调用 `initCollapseAnimations`（A 的折叠动画）。注意：**真题模块的写作 textarea 不在决策 4 范围**（真题写作另行处理），`countWritingWords` 保留为公共函数供其使用。
9. **语法增强（缩小版）**：仅做虚拟滚动连续练习（5.1）与薄弱规则面板（复刻 A，按 B2 知识点聚合）——教学页/理论卡内容层**不在同步范围**，由用户用自制制卡 skill 为 B2 独立建设（决策 6）。
10. **错题本与完成事件跨书对齐**（第五部分 §2、§3）——与步骤 6 的进度口径同源，合并决策。

每步之后跑 `tests/russian-b2/` 下的现有测试（`b2-dashboard.test.js`、`dashboard-progress.test.js` 等十来个）做回归。

# 待定决策清单

> 状态更新（2026-08-28）：决策 1-5 已由用户当场确认，决策 6 用户考虑中。确认结论如下。

| # | 决策 | 结论 | 影响 |
|---|---|---|---|
| 1 | B2 真实进度上书架卡 | **缓存聚合结果**：仪表盘算完真实进度即存 localStorage，书架同步读缓存秒开；首次无缓存时兜底显示 | 步骤 6 实现方式已定 |
| 2 | B2 仪表盘「导师复盘」入口卡 | **已修订（2026-08-29）：完全不保留入口**——B2 仪表盘复盘卡与书架工具栏「导师复盘」按钮均已移除（原方案为保留书架入口，用户后改为全不保留）。`showTutorReview`/`renderTutorReview`/`copyTutorReview` 函数与相关 CSS 暂留成为无入口代码，是否连代码一并删除待用户定 | 2.6 关闭 |
| 3 | B2 阅读 60 题解析区 | **先上线后补解析**：第一期界面照搬 A、解析区暂显原书答案；「补写 60 题解析+锚点」记入 backlog 作为独立内容任务，分批补、补完自动升级为 A 式解析卡 | 步骤 7 范围确定；新增 backlog 项 |
| 4 | B2 写作旧 textarea 草稿数据 | **封存，无入口**：界面移除入口，localStorage 键原样保留不删不显示 | 步骤 8 实现细节已定 |
| 5 | 错题本收纳范围 | **补收 B2 真题 + UI 标注范围**：exam 错题纳入 `getWrongAnswerItems`，界面注明「仅含俄语 B2」；A 的错题复习另立任务，不在本次范围 | 第五部分 §2 落地方案已定（步骤 10） |
| 6 | B2 语法理论内容数据 | **已关闭（2026-08-29 用户定案）**：核查确认 B2 已有 32 张审核过的学习卡（`data/textbook/russian_b2/study-cards/`），覆盖 34 个知识点中的 32 个、330 题中的 298 题（90%）；未覆盖的 32 题全部来自 P6 两个无卡知识点（"材料语境题"18 题、"公文格式"14 题），当前 UI 走"对应练习导航"降级分支。**方案定案：不做跨书映射（B2 知识点不接 zlatoust 教学页），改为建设 B2 内部映射体系**——用户使用自制的制卡 skill 完成 B2 知识点卡片，并为每个知识点建立与自己题目/题型的映射，细化到每道题都有对应知识点标注。现状可作为基线：ch0000-0005 的 `knowledgePoints[].exerciseIds` 已是逐题归属映射（32/34 点、298/330 题），skill 建设在此之上补齐 P6 缺口并细化校对。本次同步的代码任务在语法模块仅保留两个纯技术子项：① 虚拟滚动连续练习（纯工程）；② 薄弱规则面板复刻（纯代码，知识点↔题目映射数据现成，且将随用户 skill 建设更完善） | 步骤 9 范围为 ①②；B2 卡片与逐题映射由用户 skill 独立建设 |
