# Reader + Vocabulary V1 Android 封装实施方案

> 日期：2026-07-27  
> 状态：待执行  
> 对应设计：`docs/superpowers/specs/2026-07-27-v1-android-packaging-design.md`  
> 产品范围：私人签名 APK、核心包 + 媒体包、V1 四入口、旧浏览器数据迁移

## 1. 目标

把当前 Reader + Vocabulary 网页应用交付为一个可在用户 Android 设备上安装的 V1：

- 首页、Reader、Vocabulary、“我的”四入口。
- 核心内容离线可用，不运行 Node `server.js`。
- 大媒体按包导入。
- 浏览器进度可以迁移。
- APK 覆盖更新不丢学习数据和媒体。
- 不包含 AI、API Key、OCR 临时文件或旧学习舱功能。

## 2. 总体架构

```text
开发仓库
├─ Reader / Vocabulary 源页面
├─ 教材、词典与小说数据
├─ App 壳与运行适配层
├─ 生产资源白名单
└─ 构建脚本
       |
       v
app-dist/                     # 生成物，不手工编辑
├─ index.html                 # Android 首页
├─ reader.html
├─ vocabulary.html
├─ profile.html
├─ css/ + js/ + fonts/
└─ data/                      # 仅核心运行数据，不含大媒体
       |
       v
Capacitor Android
       |
       v
签名 APK

独立媒体包
├─ listening-audio
├─ world-people-video
├─ listening-mock
├─ vocab-dmitry
└─ vocab-svetlana
```

## 3. 执行原则

1. 不在当前语法解析工作尚未冻结时修改同一批 Reader/语法数据。
2. `app-dist/` 是可重复生成的产物，不作为手工源文件。
3. 所有生产资源使用白名单，不依靠“排除几个目录”的黑名单。
4. 先让 Web 运行适配层通过测试，再引入 Android 工程。
5. 先验证真机录音、文件选择和媒体寻址，再批量生成媒体包。
6. 每个阶段独立验证和提交；不自动 push。
7. `cloudsync-config.js`、签名 keystore 和任何密钥不得暂存或提交。

## 4. 前置条件

- 《В мире людей — 语法词汇》固定解析已完成。
- 当前语法解析相关改动已经独立验证和保存。
- 工作区中 OCR、日志、媒体处理中间物与 Android 封装改动可以明确区分。
- 目标 Android 手机/平板的系统版本、可用空间和 CPU 架构已记录。
- 用户确认 App 显示名与 application ID。
- 用户准备一个仓库外目录保存签名 keystore 和密码备份。

当前仓库存在大量进行中的语法、媒体与测试改动。实施时不得把这些文件误纳入 Android 封装提交。

## 5. Phase 0：内容冻结与基线

### Task 0.1：保护当前语法解析工作

**只读检查：**

- `git status --short`
- `git diff -- reader.html data/textbook/zlatoust_grammar tests scripts`
- 当前语法质量报告和验证输出。

**要求：**

- 语法内容修改与 Android 封装修改不混在一个提交。
- 不运行会重写教材 JSON 的构建命令，除非语法任务本身要求。
- Android 工作最好在语法任务完成后创建独立分支，例如 `codex/v1-android-packaging`。
- 分支创建和提交必须等用户确认；不得自动 push。

### Task 0.2：冻结 V1 内容版本

**计划新增：**

- `data/app-content-manifest.json`
- `scripts/build-v1-content-manifest.js`
- `tests/app-content-manifest.test.js`

manifest 至少记录：

```json
{
  "schema": "mystudyspace-content-v1",
  "version": "2026.07.27.1",
  "generatedAt": "ISO timestamp",
  "books": [],
  "dictionaryVersion": "string",
  "vocabularyVersion": "string",
  "grammarAnalysisStatus": "complete",
  "filesHash": "sha256"
}
```

**验收：**

- [ ] 语法解析不存在空解析占位。
- [ ] 答案和选项一致性审计完成。
- [ ] `npm run test:russian-b2` 通过。
- [ ] 专用 Reader/Vocabulary 测试通过。
- [ ] 生成 manifest 前后教材文件内容不被重写。
- [ ] manifest 可重复生成，同一内容得到同一 `filesHash`。

### Task 0.3：建立发布基线记录

记录：

- Reader、Vocabulary 和核心数据当前大小。
- 浏览器关键流程截图。
- 现有 localStorage/IndexedDB 测试档案。
- 书架数量、教材章节数量和 Vocabulary 词条数量。
- 当前已知问题与允许进入 V1 的非阻塞问题。

建议保存到：

- `docs/superpowers/acceptance/2026-07-27-v1-web-baseline.md`

## 6. Phase 1：冻结 Android 身份与开发环境

### Task 1.1：确认固定身份

实施前由用户确认：

- App 显示名称。
- Android application ID。
- V1 版本名和 versionCode。
- 最低支持 Android 版本。
- 首批验收手机/平板。

**重要：** application ID 首次安装后不应改变，否则 Android 会把它当作另一款 App，旧数据不能原地升级。

### Task 1.2：签名策略

- 在仓库外生成 release keystore。
- 不把 keystore、密码或 properties 文件放入 Git。
- 至少做两份离线备份。
- 记录证书指纹和到期时间，但不记录密码。
- debug 与 release 使用不同签名。

### Task 1.3：环境技术试验

检查并记录：

- Node 与 npm 版本。
- Java/JDK 版本。
- Android Studio、SDK、build tools。
- 当前稳定 Capacitor 与 Android 插件要求。
- 真机 USB 调试和 `adb` 连接。

创建一次最小 Capacitor 壳，只验证：

- 本地 HTML 加载。
- 相对 `fetch()` 读取 JSON。
- WebView localStorage/IndexedDB 持久化。
- 麦克风权限与 `MediaRecorder`。
- 文件选择、写文件和分享文件。
- 覆盖安装后数据保留。

最小试验成功后再修改正式页面。

## 7. Phase 2：生产资源白名单与构建目录

### Task 2.1：建立白名单

**计划新增：**

- `config/v1-app-assets.json`
- `scripts/build-v1-app.js`
- `tests/v1-app-build.test.js`

白名单按“文件或规则”列出运行资源。不得写成“复制仓库后删除几个目录”。

示例结构：

```json
{
  "entry": ["app-home.html", "reader.html", "vocabulary.html", "profile.html"],
  "runtime": ["css/app-shell.css", "js/app-shell.js", "js/app-runtime.js"],
  "data": ["data/textbook/**", "data/novel/**", "data/dictionary/runtime-files"],
  "exclude": ["**/media/**", "**/*.backup.json"]
}
```

最终实现以明确枚举为准，`exclude` 仅作为双保险。

### Task 2.2：生成 `app-dist/`

构建脚本必须：

1. 创建干净的 `app-dist/`。
2. 复制白名单资源。
3. 将 Android 首页写为 `app-dist/index.html`。
4. 注入 `runtime=android` 构建标识。
5. 生成核心资源 manifest 和 SHA-256。
6. 输出文件数、未压缩体积和最大文件列表。
7. 扫描禁止文件和敏感模式。

禁止进入 `app-dist/`：

- `cloudsync-config.js`
- `.env*`
- `sk-...` 类密钥
- 已知中转站 URL 与凭据
- `tmp/`、`test-results/`、`_zlatoust_*`
- `node_modules/`、`tests/`、`scripts/`、`docs/`
- OCR 源文件、PDF、日志和本机绝对路径配置
- `data/audio/*.mp3`
- 教材 `media/`
- 词典 backup 文件

### Task 2.3：体积预算

第一轮目标：

- 核心未压缩运行资源不包含约 678 MB 的媒体包。
- 不包含当前约 52 MB 的未被 Reader/Vocabulary 引用场景视频。
- 构建报告分别列出教材文字、词典、词库、句库、背景图和代码体积。

不要在第一次计划中强行承诺 APK 最终压缩体积；以真实 Android release 构建结果为准。

### Task 2.4：npm 命令

计划增加：

```json
{
  "scripts": {
    "build:v1-app": "node scripts/build-v1-app.js",
    "verify:v1-app": "node --test tests/v1-app-*.test.js",
    "android:sync": "npm run build:v1-app && npx cap sync android"
  }
}
```

编辑 `package.json` 时继续保持无认证 repository URL，不得引入 token。

## 8. Phase 3：运行环境适配层

### Task 3.1：定义统一接口

**计划新增：**

- `js/app-runtime.js`
- `tests/app-runtime.test.js`

接口：

```text
getRuntime()
loadCatalogue()
loadChapter(bookId, chapter)
lookupDictionary(term, options)
saveVocabulary(entry)
loadVocabularyExtras()
syncStudyStats(summary)
resolveMedia(packId, logicalPath)
```

运行模式：

- `web-server`：允许连接现有 Node API。
- `static-web`：使用静态 JSON 和浏览器存储。
- `android`：使用静态 JSON、App 存储和 Capacitor 插件。

页面只能调用运行适配层，不能在各处重复判断环境。

### Task 3.2：Reader 数据读取

**修改：** `reader.html`

- 把书架和章节加载接到 `appRuntime`。
- Android 模式直接使用 `data/novel/index.json` 与 `data/textbook/index.json`。
- 教材章节继续按现有 manifest 路径加载。
- 保留 Web server 模式，避免破坏当前开发方式。

**验收：**

- [ ] 飞行模式打开全部核心文字教材。
- [ ] Android 控制台不出现 `/api/novel/...` 404。
- [ ] Web 开发服务器仍能工作。
- [ ] Reader 深链接和最近位置恢复正常。

### Task 3.3：Reader 生词保存

- Android 模式只写 `vocabulary-review-records` 和必要的附加词条数据。
- 不调用 `/api/novel-vocab`。
- 不写 `rr_sync_fail_queue`。
- 不显示 Obsidian 同步失败提示。
- Web server 模式可以保留现有可选同步。

### Task 3.4：Vocabulary 数据读取与同步

**修改：** `vocabulary.html`

- `loadVocabulary()` 不依赖 `/api/novel-vocab-list`。
- Reader 收藏的词直接从共享 App 存储合并。
- Android 模式的 `/api/vocab-sync` 为明确 no-op，不发送失败请求。
- 保留 Web server 模式兼容。

### Task 3.5：词典行为

- 本地词典继续作为默认。
- Android 离线模式隐藏“联网补查”。
- 未来若恢复在线补查，必须走明确 HTTPS 服务，不把 Node 本地 API 当作存在。
- 缺词继续记录到本地 `rr_dictionary_missing_v1`。

### Task 3.6：适配层测试

覆盖：

- 三种 runtime 的数据源选择。
- Android 模式零 Node API 请求。
- Reader 收藏后 Vocabulary 可见。
- 同一数据键不因 runtime 改名。
- 失败请求不生成无限重试队列。

## 9. Phase 4：四入口 App 壳

### Task 4.1：共享壳

**计划新增：**

- `css/app-shell.css`
- `js/app-shell.js`
- `app-home.html`
- `profile.html`

`app-shell.js` 负责：

- 注入四项底部导航。
- 设置当前项和 `aria-current`。
- 处理 Android 安全区。
- 转发系统返回键。
- 保存离开前的页面状态。
- 显示 App 版本和内容版本。

Reader/Vocabulary 现有顶部双页切换在 Android 模式隐藏，避免顶部和底部重复导航；普通 Web 模式可以暂时保留。

### Task 4.2：首页

首页只读取已有数据，不建立第二套进度：

- Reader 最近阅读键。
- Vocabulary 到期调度结果。
- B2 待复练/未完成记录。
- 最后备份时间。

主要行动：

- 继续上次阅读。
- 今日待复习。

次要信息：

- 最近教材。
- 待完成练习。

### Task 4.3：“我的”框架

首版实现：

- 本地学习档案：固定尺寸的头像槽位、可编辑昵称和可编辑本地 ID；头像支持选择、更换和移除。
- 资料仅保存在本机，不创建登录、云账号或社交身份；头像、昵称和 ID 必须进入统一备份与恢复。
- 每日手动打卡：同一本地自然日只记一次，重复点击不累加；显示今日打卡状态和当前连续学习天数。
- 连续天数只根据每日打卡日期重新计算，不读取或复用旧 `pomodoro-streak`，也不因打开 App、阅读或复习自动打卡。
- 所有日期使用设备本地时区的 `YYYY-MM-DD` 日期键，禁止用 UTC `toISOString()` 直接截取日期。
- 数据备份与恢复。
- 教材媒体。
- 外观设置入口。
- 存储占用。
- App 与内容版本。
- 清除学习数据。

视觉与交互基准：

- 头像槽位固定为约 `56dp`，未设置时显示低对比人物轮廓占位；效果图中的头像内容不是生产素材。
- 点击资料区或编辑入口进入本地资料编辑；昵称和 ID 均可修改，头像图片选择不改变槽位尺寸和页面布局。
- “今日打卡”是本页唯一主操作；打卡后切换为不可重复累计的“今日已打卡”状态。
- 设置项采用可滚动的分组列表，底部保留足够 padding，系统字体 `130%` 时不得被固定导航遮挡。
- 不展示虚构的存储数值、同步状态、版本号或学习统计。

不得创建登录注册、云账号、等级徽章、排行榜或社交信息。桌面小组件不属于 Phase 4；本阶段只建立它未来可读取的本地打卡数据。

### Task 4.4：导航验证

视口：

- 390 x 844 手机。
- 用户目标 Android 手机真实尺寸。
- Android 平板竖屏与横屏。
- 系统字体 100% 和 130%。

验证：

- 词典抽屉和底部导航不重叠。
- Vocabulary 操作按钮不被遮挡。
- Reader 长章节返回路径正确。
- 系统返回键不会直接退出并丢失草稿。
- Verify in browser using dev-browser skill.

## 10. Phase 5：统一学习档案与浏览器迁移

### Task 5.1：建立档案模块

**计划新增：**

- `js/app-archive.js`
- `tests/app-archive.test.js`

档案模块维护明确的 localStorage 键白名单，不导出所有 origin 数据。

首批必须覆盖：

- `rr_state_*`
- `rr_stats_*`
- `rr_lastread_*`
- `rr_bookmarks_*`
- `rr_world_people_resume_v1`
- `rr_b2_progress_v1`
- `rr_b2_quiz_settings_v1`
- `russian_b2_study_card_progress_v1`
- `rr_zlatoust_learning_v1`
- `rr_b2_reading_progress_v1`
- 写作、口语、听力和考试相关 V1 键
- `vocabulary-review-records`
- `vocabulary-extras`
- `vocabulary-settings`
- 本地学习档案键（头像引用、昵称和本地 ID）
- 每日打卡日期记录与连续天数摘要键
- 词典用户数据键

具体白名单以 `js/russian-b2/dashboard.js`、Reader 和 Vocabulary 现状审计为准，不能仅依赖本计划中的示例。

### Task 5.2：IndexedDB 录音

涉及：

- Reader 当前录音数据库。
- `russian_b2_recordings`。
- 其他实际被 Reader 使用的 Blob store。

设计两种导出：

1. **快速进度档案**：不含录音 Blob。
2. **完整学习档案**：包含录音或独立录音包。

导入时：

- 先验证 schema 与版本。
- 显示模块和条目数量。
- 默认合并。
- IndexedDB 写入失败时回滚本轮导入，不留下半份录音索引。

### Task 5.3：Android 文件操作

Web：继续支持 Blob 下载和 `<input type="file">`。

Android：使用维护中的 Capacitor 文件/分享/文件选择能力：

- 导出到用户选择的位置或系统分享面板。
- 导入通过系统文件选择器。
- 不请求整个共享存储的宽泛权限。
- 处理用户取消、文件被移动和空间不足。

### Task 5.4：迁移验收夹具

准备一份只含测试数据、不含个人敏感内容的迁移夹具，至少包含：

- 一本书的最近位置。
- 一个书签。
- 一道错题。
- 一个写作草稿。
- 一条口语提纲和测试录音。
- 三个 Vocabulary 词条及不同复习状态。
- 一个自定义设置。

流程：浏览器导出 -> Android 导入 -> 重启 -> 再导出 -> 对比关键记录。

## 11. Phase 6：媒体解析器和缺失状态

### Task 6.1：媒体注册表

**计划新增：**

- `js/media-registry.js`
- `data/media-packs/catalogue.json`
- `tests/media-registry.test.js`

接口：

```text
getPackStatus(packId)
resolveMedia(packId, logicalPath)
listInstalledPacks()
verifyPack(packId)
removePack(packId)
```

### Task 6.2：重构教材媒体路径

Reader 不再直接假设所有 `media/...` 都位于 APK assets。教材数据继续保存逻辑路径，渲染时通过 media registry 解析。

缺失时显示：

- 媒体包名称。
- 所需大小。
- “前往教材媒体”入口。
- 文字稿、题目和解析仍可使用。

### Task 6.3：Vocabulary 发音

- 音频 manifest 继续把词条映射到 hash。
- 根据当前声线解析到 `vocab-dmitry` 或 `vocab-svetlana`。
- 声音包未安装时尝试 Android 俄语 TTS。
- TTS 不可用时展示安装提示。

### Task 6.4：媒体路径测试

覆盖：

- 包未安装。
- 包安装且文件存在。
- manifest 存在但文件损坏。
- 用户删除包后页面立即更新。
- 切换已安装/未安装声线。
- Web 开发环境继续读取原始媒体目录。

## 12. Phase 7：媒体包生成与导入

### Task 7.1：媒体包构建脚本

**计划新增：**

- `scripts/build-v1-media-packs.js`
- `config/v1-media-packs.json`
- `tests/v1-media-pack-build.test.js`

包定义：

| ID | 来源 | 当前文件数 | 当前未压缩体积 |
|---|---|---:|---:|
| `listening-audio` | `data/textbook/listening_speaking/media` 顶层 | 78 | 313,599,744 B |
| `world-people-video` | `.../media/world-people-v2` | 56 | 183,332,627 B |
| `listening-mock` | `data/textbook/listening_speaking_mock/media` | 以构建审计为准 | 约 15.2 MB |
| `vocab-dmitry` | `data/audio/*` 非 `_f` | 3018 | 81,837,072 B |
| `vocab-svetlana` | `data/audio/*_f.mp3` | 3018 | 81,430,560 B |

脚本输出到本地 release 目录；大包不提交 Git。

每个包生成：

- archive。
- manifest。
- SHA-256。
- 文件清单和逻辑路径。
- 构建日志。

### Task 7.2：解压与原子安装技术试验

在正式选插件前验证：

- 能否处理 300 MB 以上 archive。
- 3000 个小文件的导入速度和内存。
- Android App 私有存储可用空间预检。
- 解压到临时目录后校验，再原子切换为正式包。
- 失败和取消不会破坏旧包。

如果 ZIP 解压插件不可靠，备选方案：

- 使用单个媒体容器和索引读取。
- 分卷包。
- 首次安装时由桌面工具把目录复制到 App 可读取位置。

最终选择以目标真机实测为准，不在实现前锁死第三方插件。

### Task 7.3：媒体管理 UI

- 文件选择器导入。
- 真实进度。
- 剩余空间预检。
- 校验状态。
- 安装、更新、删除。
- 失败原因和重试。

### Task 7.4：媒体包验收

每个包至少验证：

- 正确 manifest。
- 错误 manifest。
- 校验和不一致。
- 文件缺失。
- 重复安装同版本。
- 从旧版本更新。
- 删除后学习进度保留。

## 13. Phase 8：离线字体和生产素材

### Task 8.1：移除网络字体依赖

**修改：** `vocabulary.html` 及相关 CSS。

- 移除运行时 Google Fonts 请求。
- 决定打包字体或系统字体回退。
- 若打包字体，保留许可证文件并只包含实际字重。
- 验证中文、俄语、斜体、粗体和组合重音符号。

### Task 8.2：背景图白名单

仅复制 Vocabulary 当前实际引用的六张背景图。旧场景视频、番茄钟素材和未引用图片不进入核心包。

### Task 8.3：图标与启动页

- 生成 Android adaptive icon。
- 深色和浅色启动背景与 App 壳一致。
- 不使用旧番茄钟图标。
- 启动页只停留资源加载必要时间，不人为延迟。

## 14. Phase 9：正式引入 Capacitor

### Task 9.1：初始化

实施时使用已验证的当前稳定 Capacitor 版本：

- 配置 `webDir: 'app-dist'`。
- 添加 Android 平台。
- application ID 使用 Phase 1 冻结值。
- 本地 scheme/origin 首次发布后保持稳定。
- Android 工程是否提交 Git 需在首次生成后决定；默认提交可复现的原生工程配置，不提交构建产物和本机 SDK 路径。

### Task 9.2：最小插件

只引入 V1 需要的能力：

- App 生命周期和系统返回键。
- 文件系统、文件选择与分享。
- 状态栏和启动页。
- 必要时的本地 TTS。
- 媒体包解压或容器读取。

不要提前安装 V2 的相机、AI、Realtime 或网络 SDK。

### Task 9.3：麦克风

先测试当前 Web `MediaRecorder` 在 Capacitor WebView 中是否满足：

- 权限申请。
- 开始/停止。
- Blob 保存与回放。
- 切后台、锁屏和来电恢复。

若不能稳定工作，再把 Reader 本地录音接到原生录音插件；不得同时维护两套没有适配层的录音逻辑。

### Task 9.4：Android 配置

- 仅声明 V1 实际需要的权限。
- 默认不申请照片、视频、通讯录、定位和宽泛存储权限。
- 不允许明文 HTTP 作为核心运行依赖。
- 处理状态栏、导航栏、安全区和软键盘 resize。
- 手机竖屏优先，但不强制锁定方向；平板横屏仍可用。

## 15. Phase 10：自动化验证

### Task 10.1：新增测试命令

计划形成：

```text
npm run test:reader-vocab
npm run verify:v1-app
npm run build:v1-app
npm run android:sync
```

`test:reader-vocab` 必须是非破坏性命令，不重建教材或污染工作区。

### Task 10.2：静态与单元测试

- 生产白名单只包含允许文件。
- 禁止模式和密钥扫描。
- runtime adapter 三种模式。
- App 级档案导出、校验、合并和迁移。
- 媒体 registry、manifest 和引用完整性。
- 首页聚合数据不建立第二份进度。
- App 壳导航和当前项。

### Task 10.3：浏览器测试

浏览器验证：

- 四入口导航。
- Reader -> Vocabulary -> Reader 状态恢复。
- 首页继续阅读和今日复习。
- “我的”备份与媒体空状态。
- 390 px、平板竖屏、平板横屏。
- Verify in browser using dev-browser skill.

### Task 10.4：构建前后工作区检查

- 构建前记录 `git status --short`。
- 构建只允许产生 `app-dist/`、Android build 目录和明确 release 产物。
- 教材 JSON 构建前后哈希一致。
- `git diff --check` 通过。
- 不运行会修改语法解析输出的无关命令。

## 16. Phase 11：Android 真机验收

### 11.1 全新安装

- 安装签名 debug 候选包。
- 首次打开进入首页。
- 飞行模式下打开书架、章节、解析、词典和 Vocabulary。
- Reader 收藏词后 Vocabulary 立即出现。
- 写作草稿和本地口语录音重启后存在。
- 系统返回键逻辑正确。

### 11.2 浏览器迁移

- Web 导出测试档案。
- Android 导入。
- 检查阅读位置、书签、错题、草稿、生词和复习状态。
- 重启后再次检查。
- Android 再导出，验证可恢复性。

### 11.3 媒体包

- 导入一个发音包并播放单词和例句。
- 导入 `listening-audio` 并播放多个章节。
- 空间不足预检。
- 删除包后文字学习仍正常。
- 损坏包不覆盖已安装包。

### 11.4 覆盖升级

1. 安装 V1 候选 A。
2. 产生阅读、生词、草稿、录音和媒体数据。
3. 构建 versionCode 更高的候选 B。
4. 直接覆盖安装。
5. 验证所有数据、媒体和设置保留。

覆盖升级是正式发布的硬门槛。

### 11.5 长时间与异常

- 连续阅读 30 分钟。
- 多次前后台切换。
- 录音时锁屏/来电。
- 导入媒体时取消。
- 存储空间临界。
- Android 进程被系统回收后恢复。

## 17. Phase 12：签名与交付

### Task 12.1：Release 构建

典型流程在实施时按实际 Capacitor/Gradle 版本校准：

```powershell
npm run verify:v1-app
npm run android:sync
Set-Location android
.\gradlew.bat assembleRelease
```

不得把签名密码写在命令历史、仓库文件或日志中。

### Task 12.2：交付目录

仓库内生成轻量 release manifest；APK 和大媒体包可以存到仓库外发布目录。若用户要求复制到桌面，使用：

```text
E:\Desktop\MyStudySpace-V1-release\
```

建议交付内容：

```text
MyStudySpace-V1-release/
├─ app-release.apk
├─ SHA256SUMS.txt
├─ RELEASE-NOTES.md
├─ INSTALL.md
├─ MIGRATION.md
└─ media-packs/
   ├─ manifests/
   └─ 用户选择的媒体包
```

### Task 12.3：安装说明

说明：

- 如何允许安装私人 APK。
- 如何校验 SHA-256。
- 如何从浏览器导出并导入旧数据。
- 如何安装媒体包。
- 如何覆盖更新。
- 卸载会删除哪些本地数据。
- keystore 丢失会导致什么后果。

### Task 12.4：发布验收记录

保存：

- App versionName/versionCode。
- application ID。
- 签名证书指纹。
- 内容 manifest hash。
- 核心 APK 大小和 SHA-256。
- 媒体包版本和 SHA-256。
- 测试设备与 Android 版本。
- 已知限制。

不保存密码和密钥。

## 18. 建议提交顺序

实施时建议按以下提交拆分；不自动 push：

1. `docs: add v1 android packaging design and plan`
2. `build: add v1 app asset manifest and bundle builder`
3. `refactor: add web and android runtime adapter`
4. `feat: add v1 home profile and app navigation`
5. `feat: add unified v1 learning archive`
6. `feat: add media registry and missing media states`
7. `build: add v1 media pack generator`
8. `feat: add capacitor android shell`
9. `test: cover v1 android offline and migration flows`
10. `release: prepare v1 signed android candidate`

每个提交前检查 `git diff --cached --name-only`，确保不包含 `cloudsync-config.js`、OCR 临时文件、媒体处理日志和签名材料。

## 19. 回退策略

### App 壳问题

Android 构建来自独立 `app-dist/`，删除或回退 App 壳提交不会破坏原 Reader/Vocabulary 网页。

### Runtime adapter 问题

保留 Web server 实现；适配层按 runtime 切换，可以单独回退 Android 路径。

### 数据迁移问题

导入前生成本地快照；失败时恢复快照。旧浏览器导出文件始终保留，不做原地修改。

### 媒体更新问题

新包先安装到临时目录并校验，成功后替换注册表指针；旧包在切换成功前不删除。

### APK 更新问题

保留前一个已签名 APK 和对应内容 manifest。若新版本有严重问题，可以安装 versionCode 更高的回退构建，不能依赖 Android 降级安装。

## 20. 最终完成定义

V1 Android 封装只有在以下全部完成时才算交付：

- [ ] 语法解析内容冻结并通过验证。
- [ ] 私人签名 APK 可安装。
- [ ] 四入口完整可用。
- [ ] 飞行模式可使用全部核心文字学习功能。
- [ ] Android 运行零 Node API 依赖。
- [ ] Reader/Vocabulary 双向数据一致。
- [ ] 旧浏览器档案迁移成功。
- [ ] 至少一个发音包和一个听力包完成导入、播放、更新和删除测试。
- [ ] 覆盖安装不丢数据。
- [ ] 核心包和媒体包无密钥、无本机路径、无临时文件。
- [ ] 交付 APK、校验和、安装说明、迁移说明和发布记录。
- [ ] 未自动 push。

## 21. 实施前仍需填写的发布参数

```text
App 显示名：待用户确认
application ID：待用户确认
versionName：建议 1.0.0
versionCode：建议 1
最低 Android 版本：技术试验后填写
首批验收设备：待填写
核心包是否内置默认声线：媒体试验后填写
release keystore 路径：仓库外，仅记录位置策略，不写入本文件
```

这些参数不阻塞当前设计定稿，但 Task 1 完成前不得生成正式签名包。

