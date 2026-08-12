# AGENTS.md

本文件是 AI 进入 `D:\MyStudySpace` 后的首要项目说明。

## 当前唯一主项目：白夜俄语网页版

当前产品是 **БЕЛЫЕ НОЧИ / 白夜俄语**。默认开发目标已经从 Android APK 改为现有网页版，不再默认继续 Android 打包路线。

- 品牌：`БЕЛЫЕ НОЧИ / 白夜俄语`
- 当前技术：现有 HTML、CSS、JavaScript 网页应用
- 当前入口：首页、Reader、Vocabulary、我的
- 当前运行方式：通过 `server.js` 在浏览器中使用
- 当前优先方向：先把网页版口语学习体验做成可实际使用的功能
- 未来方向：网页版加正式后端，但服务器、数据库、鉴权、部署方式和域名均尚未确定

Reader 和 Vocabulary 是现有生产功能。不要为了新增口语或未来后端而重写它们，也不要建立第二套互不兼容的学习进度。

旧番茄钟、旧俄语知识库、学习舱 iframe 调度中心和早期 UI 优化任务均为历史项目，不是默认工作范围。

## 当前决定：Android 暂停并封存

Android 方向是一次快速落地尝试。现阶段继续打包、适配和维护的成本已经超过收益，而且正式后端尚未准备好，因此用户决定暂时停止 Android App 开发。

“封存”表示保留现有成果，停止默认推进，并不表示删除或回退：

- 保留现有 Capacitor 相关代码、Android 设计文档、统一学习档案和文件适配器。
- 不删除 `app-dist/`、Android 历史资料、APK 方案或已经完成的测试。
- 不主动继续 Phase 5 Task 5.4 或后续 Android 阶段。
- 不主动运行 Capacitor、Gradle、Android Studio、APK 构建、签名、设备安装或 Android 同步。
- 普通 Web、Reader、Vocabulary 或口语任务不以 APK 构建成功作为完成条件。
- 只有用户以后明确说“恢复 Android 开发”时，才重新审计现状并继续。

封存时的本地实现状态：

- Android V1 Phase 4 已存在于当前工作树。
- Phase 5 Task 5.1：统一 localStorage 学习档案，已实现。
- Phase 5 Task 5.2：IndexedDB 录音档案，已实现。
- Phase 5 Task 5.3：Web/Android 文件导入、导出与分享适配，已实现。
- Phase 5 Task 5.4：浏览器到 Android 的真机迁移验收，未实施，现已暂停。

不要因为前三项已经实现，就宣称 Android 迁移或整个 Android V1 已验收完成。

## 当前优先级：网页版口语

近期工作先围绕网页版口语学习展开。仓库和交接包中已经存在口语交互原型、产品设计、录音基础模块和测试，应先审计、合并和复用这些成果，不要从零重做。

当前口语方向遵循以下原则：

- 第一阶段先做浏览器中可实际使用的口语练习，不依赖正式后端。
- 优先复用浏览器 `MediaRecorder`、IndexedDB 和现有 Reader 任务数据。
- 没有后端时，录音、提纲、练习记录和设置继续保存在本机。
- 网页口语必须在离线或外部服务不可用时仍能完成基础练习和保存。
- AI 讲解、语音识别、模型评分、实时对话和云同步不是默认前置条件。
- 不把 API Key 写进网页、localStorage、IndexedDB、导出档案、Git 或日志。
- 不自动增加第五个底部导航入口；先根据当前口语任务和已确认原型决定入口位置。
- 开始具体实现前，先确认本轮最小目标和验收标准，避免一次建设完整 AI 平台。

与网页版口语有关的交接资料包括：

- `docs/white-night-app/SPEAKING_V2_PRD.md`
- `docs/white-night-app/SPEAKING_UI_PROTOTYPE.md`
- `docs/visual-prototypes/white-night-speaking-v2.html`
- `docs/superpowers/plans/2026-08-08-speaking-v2-phase0-phase1.md`
- `docs/superpowers/acceptance/2026-08-08-speaking-v2-phase0a-web.md`
- `js/speaking/`
- 对应的 `tests/speaking-*.test.js`

这些文件可能仍位于增量交接包、尚未合并到当前仓库。使用前先检查文件是否存在；缺失时从交接包选择性合并，不覆盖当前项目的 `AGENTS.md` 或其他较新文件。

## 未来后端方向

未来计划以“网页 + 后端”为主，但目前只确定方向，没有确定技术方案。

在用户购买服务器并确认需求之前：

- 不擅自选择云厂商、服务器配置、域名、数据库、后端语言或部署平台。
- 不提前把临时 Node 接口当作正式后端。
- 不让网页核心学习功能依赖尚不存在的在线服务。
- 不引入账号、支付、多用户、云同步或复杂鉴权，除非用户明确启动对应项目。
- 设计任何后端时，必须兼容并迁移现有浏览器学习数据，不能让 Reader、Vocabulary、写作、口语和录音进度丢失。

`server.js` 当前只是本地开发服务器，不代表未来正式后端架构。

## DeepTutor 与外部 AI

Reader–DeepTutor 集成属于可选的本地网页版实验，不是白夜俄语正常运行的必要条件。

- DeepTutor 未安装、未启动或不可用时，Reader 和口语基础练习必须继续工作。
- 未经用户明确要求，不安装或启动 DeepTutor，不接入模型供应商。
- OpenAI、Anthropic、DeepSeek 等 API Key 只能放在对应服务的安全设置中。
- 不把 DeepTutor 的内部接口当作稳定的正式后端契约。
- 未来若继续该实验，以交接文档为准，并保持 Reader 是客观学习记录的权威来源。

相关文档：`docs/white-night-app/READER_DEEPTUTOR_INTEGRATION_HANDOFF.md`。

## 权威资料顺序

发生冲突时按以下顺序判断：

1. 用户当前指令。
2. 本文件 `AGENTS.md`。
3. 当前任务对应的 PRD、交接文档、实施计划或验收记录。
4. 实际网页代码、测试和数据契约。
5. Android 历史设计与计划，仅在用户明确恢复 Android 时生效。

Android 历史资料包括：

- `docs/superpowers/specs/2026-07-27-v1-android-packaging-design.md`
- `docs/superpowers/plans/2026-07-27-v1-android-packaging.md`

这些文档现在是封存资料，不能再自动决定当前开发顺序。

## 当前网页结构

重要文件包括：

- `app-home.html`：白夜俄语首页。
- `reader.html`：Reader 主应用，包含阅读、语法、听力、写作和现有口语任务。
- `vocabulary.html`：Vocabulary 学习与复习。
- `profile.html`：“我的”、本地资料和学习档案。
- `js/app-shell.js`：四入口共享页面壳。
- `js/app-runtime.js`：不同运行环境的适配层。
- `js/app-archive.js`：统一学习档案。
- `js/app-file-transfer.js`：浏览器与封存 Android 路线共用的文件适配。
- `js/app-profile.js`：本地资料和每日打卡。
- `js/app-profile-page.js`：“我的”页面交互。

页面采用直接导航，不恢复旧 `index.html` iframe 调度中心。

`app-dist/` 是历史 Android 生成物。普通网页任务不要手工编辑、重建或同步它。

## 数据原则

- Reader、Vocabulary、写作、听力、口语和考试继续复用现有学习数据。
- 不创建第二套首页进度或口语进度来复制同一事实。
- localStorage 与 IndexedDB 的真实键和数据库以代码为准。
- 导入学习档案前必须完整校验；默认合并；失败时回滚。
- 不导出缓存、密钥、临时同步队列或无关 origin 数据。
- 未来后端必须提供现有本地数据的迁移与合并方案。

## 常用命令

在 `D:\MyStudySpace` 中运行：

```powershell
npm start
npm run verify:russian-b2
npm run verify:russian-dictionary
```

按改动范围运行对应的 `node --test ...` 测试。

- `npm test` 是占位命令，会故意失败，不能用作验收依据。
- `npm run build:v1-app` 和 `npm run verify:v1-app` 属于封存 Android 链路，普通网页任务不主动运行。
- Reader 修改需要运行 Reader/B2 对应测试。
- Vocabulary 修改需要运行 Vocabulary/词典对应测试。
- 口语修改需要运行对应的 `tests/speaking-*.test.js` 和受影响的 Reader 测试。
- 视觉修改必须在桌面和移动浏览器中实际检查。

## 工作方式

- 开始修改前查看 `git status --short`，当前工作树可能包含大量未提交成果。
- 搜索真实函数、存储键、测试和任务文档后再编辑，不根据旧计划猜测。
- 先完成最小可用版本，再逐步增加 AI、后端或高级功能。
- 不为了“像 App”而引入复杂框架或重写现有网页。
- `reader.html` 很大，修改前按函数名、元素 ID 或存储键精确定位。
- 内容生成脚本可能批量重写教材 JSON，普通功能任务不要随意运行。

## 工作树安全

- 保留所有现有修改和未跟踪文件。
- 不清理、重置、checkout、覆盖或删除无关文件。
- 不假设 `origin/main` 包含全部本地成果。
- 不为依赖当前未提交文件的任务创建新 worktree。
- 不自动 stage、commit 或 push。
- 修改已有变更文件前，先读当前 diff 并在现状上继续。

## Legacy 边界

以下内容默认是历史或独立项目：

- `index.html`
- `pomodoro.html`
- `study-stats.html`
- `俄语知识库.html`
- `b2-exam.html`
- 旧 Pomodoro 素材和统计数据
- 旧 iframe `OPEN_RUSSIAN` / `CLOSE_RUSSIAN` 架构
- Obsidian 转换和历史 B2 素材工作流

除非用户明确要求，不删除、不重构，也不把它们恢复为白夜俄语网页入口。

`俄语笔记库/` 是独立 Obsidian 学习资料库，不是白夜俄语运行代码。只有任务明确涉及 Obsidian 时才进入。

## 安全

- 永远不要读取、打印、修改、暂存或提交 `cloudsync-config.js`，其中含真实凭据。
- 不输出 `package.json` 中可能存在的认证仓库 URL 或 Token。
- 不把 API Key、Token、密码写入 HTML、JavaScript、localStorage、IndexedDB、导出档案、Git、日志或构建产物。
- 不提交 DeepTutor workspace、`.env`、日志、`tmp/`、个人学习数据、OCR 中间文件或 Android 签名材料。
- 保存到用户桌面时使用 `E:\Desktop`。
- 提交相关操作前必须检查 `git status --short`，但未经用户明确要求不创建提交或推送。

## 当前完成标准

一个网页版口语或白夜俄语网页任务只有在以下条件满足后才算完成：

1. 本轮目标和验收标准已经明确。
2. 基础学习流程不依赖尚不存在的后端。
3. 没有破坏 Reader、Vocabulary 和已有本地学习数据。
4. 相关自动化测试通过。
5. 受影响的桌面与移动浏览器界面完成实际验证。
6. 外部服务不可用时仍能完成约定的本地功能。
7. 未覆盖用户现有修改，未自动提交或推送。

Android 构建、APK、真机迁移和商店发布不再是普通网页任务的完成条件。

## 更新本文件

只有用户明确改变产品方向、恢复 Android、启动正式后端或确认新的主要阶段时，才更新相应章节。不要根据旧聊天摘要或封存计划把 Android 自动恢复为默认目标。
