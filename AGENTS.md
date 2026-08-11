# AGENTS.md

本文件是 AI 进入 `D:\MyStudySpace` 后的首要项目说明。

## 当前唯一主项目：白夜俄语 APP

本工作区当前的默认目标是完成 **БЕЛЫЕ НОЧИ / 白夜俄语**。除非用户明确指定其他任务，否则所有分析、实现、测试和文档工作都应围绕白夜俄语 APP 展开。

旧番茄钟、旧俄语知识库、学习舱 iframe 调度中心和早期 UI 优化任务均为历史项目，不再是默认工作范围。不要因为这些文件仍位于仓库根目录就优先维护或重构它们。

## 当前开发状态：网页版优先，Android 暂时封存

白夜俄语的 Capacitor Android APP 开发已暂时封存，不再是当前默认目标。原因是现阶段 Android 原生打包、设备适配和发布链路的开发成本较高，同时项目尚未具备正式后端。

当前默认工作方向是继续完善现有网页版白夜俄语，包括 Reader、Vocabulary、学习数据、词典、听力、语法和网页交互体验。用户计划在服务器就绪后建设正式后端；届时产品路线以“网页 + 后端”为主，复用并延续当前网页版效果。

在用户明确恢复 Android 开发之前：

- 不主动执行 Capacitor、Gradle、APK、Android Studio、设备安装或签名发布任务；
- 不把 Android 构建、离线 APK、移动端原生壳或 `app-dist/` 当作普通 Web 任务的完成条件；
- 不因普通 Reader、Vocabulary 或网页功能改动而同步、重建或验收 Android 工程；
- 保留 `android/`、Capacitor 配置、Android 设计文档和历史验收记录，不删除、不回退，作为未来可能恢复开发时的参考；
- 后端技术栈、服务器环境、部署方式、域名、数据库和鉴权方案尚未确认，不得擅自假定或提前绑定技术方案。

## 产品基线

当前产品基线是现有 HTML/CSS/JS 网页版私人俄语学习应用：

- 品牌：`БЕЛЫЕ НОЧИ / 白夜俄语`
- 当前技术路线：现有 HTML/CSS/JS 网页前端；`server.js` 仅作为当前本地开发服务
- 主导航：首页、Reader、Vocabulary、我的
- 当前优先级：保证网页版学习流程、内容质量、本地数据和交互体验稳定
- 正式后端尚未建设；服务器就绪后再根据用户确认的方案设计 API、数据库、鉴权、同步与部署
- 后端接入时必须设计现有浏览器本地学习数据的兼容、迁移和合并策略，不得导致学习进度丢失
- 在后端正式落地前，不把临时 API、云账户、在线 AI 或实时语音服务当作默认依赖

AI 口语陪练仍是独立范围。只有用户明确要求，或任务明确引用对应 PRD 时，才进入该范围。

## 首要资料与权威顺序

处理白夜俄语 APP 时，按以下顺序确定事实：

1. 用户当前指令
2. 本文件 `AGENTS.md`
3. 当前任务对应的 PRD、实施文档或验收记录
4. 实际网页代码、测试、数据契约和内容清单
5. Android 历史设计与实施文档（仅在用户明确恢复 Android 任务时生效）

不要默认先读旧的番茄钟或旧俄语知识库文档。

### 按任务读取的资料

- Android V1（已封存，仅显式恢复时读取）：`docs/superpowers/specs/2026-07-27-v1-android-packaging-design.md`
- Android 实施（已封存，仅显式恢复时读取）：`docs/superpowers/plans/2026-07-27-v1-android-packaging.md`
- Android 验收（历史记录）：`docs/superpowers/acceptance/2026-07-28-v1-android-phase1-smoke.md`
- Reader 写作工作台：`docs/READER_WRITING_WORKBENCH_IMPLEMENTATION.md`
- 听力精听重建：`tasks/prd-listening-intensive-rebuild.md`
- Reader / Vocabulary 双页：`tasks/prd-reader-vocabulary-dual-page.md`
- AI 俄语口语 V2：`docs/white-night-app/SPEAKING_V2_PRD.md`
- Android 视觉参考：`docs/design-references/android-v1/README.md`
- 白夜俄语 App 专用工作区：`docs/white-night-app/README.md`

任务文档只在对应任务中生效。不要把某个局部 PRD 自动提升为整个 APP 的永久范围。

## 当前架构

### 源页面

| 文件 | 作用 |
|---|---|
| `app-home.html` | 白夜俄语网页版首页；同时保留为历史 Android 生产包入口源文件 |
| `reader.html` | Reader 主应用，承载教材阅读、语法、听力、写作与口语任务 |
| `vocabulary.html` | Vocabulary 复习、生词本与词汇学习 |
| `profile.html` | “我的”、数据与应用设置 |
| `css/app-shell.css` | 四入口共享 APP 壳样式 |
| `js/app-shell.js` | 共享底部导航与页面壳逻辑 |
| `js/app-runtime.js` | Web / Android 运行环境适配层 |
| `js/app-profile.js` | 学习档案导入、导出与迁移逻辑 |

页面之间采用直接导航，不使用旧 `index.html` iframe 调度中心。

### 当前 Web 入口与已封存 Android 入口

- 开发目录中的 `index.html` 当前仍跳转到 `reader.html`。
- 当前默认运行方式是通过 `server.js` 打开网页版页面并直接导航。
- Android 生产包不直接使用根 `index.html`；此规则仅作为历史 Android 工程约束保留。
- `scripts/build-v1-app.js`、`app-dist/`、`capacitor.config.json` 和 `android/` 属于已封存的 Android 打包链路。
- `app-dist/` 仍是生成物，不得手工编辑；普通 Web 任务不得主动重建或同步 Android 工程。

### 内容与构建真相来源

- `config/v1-app-assets.json` — 生产资源白名单与 Android 入口配置
- `data/app-content-manifest.json` — APP 核心内容文件清单
- `scripts/build-v1-app.js` — `app-dist/` 构建、安全扫描和资源校验
- `scripts/build-v1-content-manifest.js` — 内容清单生成与校验
- `capacitor.config.json` — Capacitor 应用身份和 Web 目录
- `tests/v1-app-build.test.js` — 生产包边界测试

未来若明确恢复 Android 构建，仍必须继续使用白名单，不得把整个仓库复制进 `app-dist/` 或 Android assets。普通 Web 任务不触发该构建链路。

## 常用命令

PowerShell 工作目录：`D:\MyStudySpace`

```powershell
node server.js
npm start
npm run test:russian-b2
npm run verify:russian-b2
```

- 本地开发服务器：`http://localhost:3000`
- `npm test` 仍是占位命令，会失败；不要把它当成项目验收命令。
- 修改范围较小时运行对应测试；涉及网页版共享运行层或内容契约时运行相应 Web/Reader/Vocabulary 验证。
- `npm run verify:v1-app`、`npm run build:v1-app`、`npm run android:sync` 和 `npm run android:build:debug` 属于已封存 Android 流程，只有用户明确恢复 Android 工作时才运行。

## 工作原则

### 先确认当前任务边界

- 开始修改前先查看 `git status --short`，工作区可能包含用户尚未提交的大量改动。
- 搜索相关函数、测试、数据契约和任务文档后再编辑；不要根据旧架构猜测。
- 不覆盖、不回退、不整理与当前任务无关的用户改动。
- `reader.html` 体积很大，CSS/JS 多为内联；先按函数名、ID 或数据字段精确搜索。
- 内容生成脚本可能批量重写 JSON。除非任务明确要求，不要随意运行会改写教材数据的命令。

### 修改后的验证

- 源页面修改：验证桌面和移动端布局、直接导航、返回路径与底部安全区。
- Reader 修改：运行相应 `tests/russian-b2/`、Reader 或工作台测试。
- Vocabulary 修改：运行对应 Vocabulary、词典和双页测试。
- 共享壳、运行适配层、首页或“我的”修改：运行对应网页测试，并在浏览器中验证直接导航和数据兼容性。
- Android 资源、配置、构建与 APK 验收均已封存；只有用户明确恢复 Android 任务时才按历史文档执行。
- 视觉修改应使用浏览器在桌面和移动视口进行实际检查，不只依赖静态代码判断。

## Legacy 边界

以下文件和功能仍可保留，但默认视为历史项目：

- `pomodoro.html`
- `study-stats.html`
- `俄语知识库.html`
- `b2-exam.html`
- `convert.js`
- `index.html.bak`
- `pomodoro-*.html` 与旧番茄钟截图
- `immersion-study-space/`
- 旧 `OPEN_RUSSIAN` / `CLOSE_RUSSIAN` iframe 通信架构
- `docs/UI_OPTIMIZATION_PLAN.md` 中针对旧学习舱的任务

除非用户明确要求修复或迁移 legacy 功能，否则：

- 不读取它们作为当前架构依据；
- 不把它们加入 `app-dist/`；
- 不因白夜俄语 APP 的改动而顺手重构它们；
- 不恢复旧番茄钟调度中心作为 APP 入口。

`俄语笔记库/` 是独立的 Obsidian 学习资料库，不是白夜俄语 APP 的运行时主代码。只有任务明确涉及 Obsidian、摄入或笔记维护时才进入该目录。

## 安全与 Git

- Windows 桌面已重定向到 `E:\Desktop`。用户要求保存到桌面时必须使用该路径。
- 当前主分支为 `main`。不要自动 push，等待用户确认。
- 不自动创建提交；只有用户明确要求时才 stage 或 commit。
- `cloudsync-config.js` 含真实 GitHub 凭据，不得提交、复制到构建产物或输出其内容。
- `package.json` 的 `repository.url` 必须保持无认证形式：`git+https://github.com/chenxingguo43-sudo/MyStudySpace.git`。
- 签名 keystore、密码、API Key、Token、`.env`、OCR 中间文件、测试日志和 `tmp/` 不得进入任何 Web 部署产物、后端镜像或未来可能恢复的 APK。
- 构建前后都要检查 `git status --short`，防止生成物或敏感文件被误纳入提交范围。
- 不使用破坏性 Git 命令回退用户改动，不自动删除未跟踪文件。

## 完成标准

一个当前白夜俄语网页版任务只有在以下条件满足后才算完成：

1. 实现符合当前产品设计和具体任务文档；
2. 没有把 legacy 功能重新带回生产入口；
3. 相关自动化测试通过；
4. 受影响的桌面与移动浏览器界面完成实际验证；
5. 本地数据兼容性、敏感信息和未来后端迁移风险按改动范围完成检查；
6. 未把 Android 封存链路重新设为默认完成条件；
7. 未覆盖用户现有改动，未自动 push。
