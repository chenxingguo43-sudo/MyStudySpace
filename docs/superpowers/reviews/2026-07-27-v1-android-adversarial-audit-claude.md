# MyStudySpace V1 Android 封装 — 对抗性审计报告

> **审计日期**：2026-07-27
> **审计人**：Claude Opus 5（独立于方案起草方 Codex）
> **审计对象**：
> - `docs/superpowers/specs/2026-07-27-v1-android-packaging-design.md`（设计方案）
> - `docs/superpowers/plans/2026-07-27-v1-android-packaging.md`（实施方案）
>
> **仓库证据来源**：`reader.html`、`vocabulary.html`、`server.js`、`data/` 目录实测
> **承诺**：未修改任何文件，未安装依赖，未暂存/提交/push。

---

## 1. 总体结论

**存在重大缺口，暂时不应进入实施**

方案框架清晰，方向判断总体正确，执行原则也足够谨慎。但以下三类问题会导致 Android 版本核心功能**静默失败**（不报错但功能实际坏掉）：

1. **`/api/dictionary/lookup` 端点两份文档均未覆盖**。`reader.html:5993` 实际调用它，但 Runtime adapter 接口列表里没有替换方案，Android 模式下词典补查将静默 404。

2. **核心 APK 白名单至少遗漏 4 类运行期数据文件**：`sentences.json`（17.8 MB）、`lexeme_index.json`（5.96 MB）、`morphology-map.json`（4.38 MB）、`external-vocab.json`。遗漏任何一项，Vocabulary 来源回跳或形态引擎静默降级，用户看不到错误。

3. **localStorage 迁移白名单至少缺失 10 个实际存在的 key**，涵盖写作版本、写作模型解锁、听力草稿、阅读口语布局、词典缓存等，迁移后数据默默丢失。

上述问题需在进入 Phase 1 之前修订两份文档。其余 P1–P3 问题不阻止方案启动，但需在对应阶段前完成。

---

## 2. 阻塞性问题

### P0 — 可能造成数据丢失、安全事故、无法升级或方案整体不可行

---

#### P0-1 `/api/dictionary/lookup` 两份文档均未覆盖

- **对应文档**：设计方案 §12.1；实施方案 §Task 3.1、Task 3.5
- **仓库证据**：`reader.html:5993` — `fetch('/api/dictionary/lookup?'+params)` 直接调用；`server.js:56` — `GET /api/dictionary/lookup` 端点存在；CLAUDE.md API 端点表**无此条目**；两份封装文档均未提及
- **问题**：设计方案 §12.1 列出 7 个 Runtime adapter 接口（含 `lookupDictionary`），但没有说明它在服务端有一条 `/api/dictionary/lookup` 补查路径需要替换。实施方案 Task 3.5 只说"本地词典继续作为默认，隐藏联网补查"，没有覆盖这个本地 API 路径。
- **后果**：Android 模式下划词查询触发服务端路径时静默 404，用户看到空结果，误以为词典无词，无任何错误提示。
- **建议修改设计**：§12.1 `lookupDictionary` 接口说明增加：Android 模式禁止发出 `/api/dictionary/lookup`，完全依赖本地多源合并结果，缺词记入 `rr_dictionary_missing_v1`。
- **建议修改实施**：Task 3.5 增加子任务：适配层拦截此端点，Android 返回本地查询结果，不发网络请求，不入重试队列。
- **阻止进入 Android 实施**：**是**

---

#### P0-2 `sentences.json`（17.8 MB）等 4 个数据文件未进入核心 APK 白名单

- **对应文档**：设计方案 §11.1；实施方案 §Task 2.1
- **仓库证据**：
  - `vocabulary.html:2108–2111` — 启动时并行 fetch `data/lexeme_index.json`（5.96 MB）、`data/sentences.json`（17.8 MB）、`data/sources.json`、`data/source_labels.json`
  - `reader.html:2065,2088` — fetch `data/morphology-version.json`、`data/morphology-map.json`（4.38 MB）
  - `reader.html:5791` — fetch `data/external-vocab.json`（0.05 MB）
- **问题**：设计方案 §11.1 写"Vocabulary 主词库、句库、词形索引和来源索引"但未给路径，构建脚本无法据此映射。实施方案 Task 2.1 示例白名单的 `data` 规则为 `data/textbook/**`、`data/novel/**`、`data/dictionary/runtime-files`，全部未覆盖这些根级数据文件。
- **后果**：Android 启动 Vocabulary 时 404，来源回跳、形态分析、句库匹配静默失效；`rr_sync_fail_queue` 不记录此类错误，用户不知道。
- **建议修改设计**：§11.1 核心 APK 白名单新增一行列出文件路径和体积（合计约 28 MB）。
- **建议修改实施**：Task 2.1 白名单 `data` 规则增加显式路径；Task 2.3 体积预算追加 ~28 MB。
- **阻止进入 Android 实施**：**是**

---

#### P0-3 `/api/novel-vocab-list` 仍被 `vocabulary.html` 调用，文档未覆盖替换逻辑

- **对应文档**：设计方案 §9.2；实施方案 §Task 3.4
- **仓库证据**：`vocabulary.html:2054` — `fetch('/api/novel-vocab-list')` 在 Vocabulary **初始化**时调用；reader.html 中无此调用（正确）
- **问题**：两份文档都说"不再作为 Reader 收藏的必要来源"，但没有说明 vocabulary.html 这条初始化路径的替换策略。是 Android 模式跳过此 fetch，还是读本地接口？
- **后果**：Android 启动 Vocabulary 时此 fetch 404，生词本初始化出现空状态或报错，导致"今日待复习"卡片数归零。
- **建议修改设计**：§9.2 明确 vocabulary.html 中此调用在 Android 模式的替换：直接从共享 App 存储（localStorage/IndexedDB）读取生词，不发网络请求。
- **建议修改实施**：Task 3.4 增加子任务：vocabulary.html 初始化路径适配，拦截 `/api/novel-vocab-list` 并返回本地存储数据。
- **阻止进入 Android 实施**：**是**

---

#### P0-4 localStorage 迁移白名单至少缺失 10 个实际存在的 key

- **对应文档**：实施方案 §Task 5.1
- **仓库证据**（reader.html 实测，均不在 Task 5.1 示例白名单中）：

```
russian_b2_writing_drafts_v1         reader.html:4551  WRITING_DRAFTS_KEY
rr_ws_drafts_v1                      reader.html:4552  WS_DRAFTS_KEY（写作另一套草稿）
russian_b2_writing_versions_v1       reader.html:4559  WRITING_VERSIONS_KEY
russian_b2_writing_model_unlocks_v1  reader.html:4560  WRITING_MODEL_UNLOCKS_KEY
rr_listening_drafts_v1               reader.html:4755  LISTENING_DRAFTS_KEY
rr_listening_attempts_v1             reader.html:4756  LISTENING_ATTEMPTS_KEY
russian_b2_exam_writing_drafts_v1    reader.html:5134  EXAM_WRITING_DRAFTS_KEY
rr_reading_speaking_progress_v1      reader.html:6943  RS_PROGRESS_KEY
reader-reading-speaking-layout-mode  reader.html:7379  READING_SPEAKING_LAYOUT_KEY
rr_local_lookup_cache                reader.html:5789  词典查询缓存
RussianDictionaryStorage 内部 key    reader.html:6744  键名在代码中未显式枚举，尚未验证
```

- **附加证据**：**写作草稿存在两套独立 key**（`WRITING_DRAFTS_KEY` vs `WS_DRAFTS_KEY`），疑为不同功能分支（正式写作 vs 工作区草稿），方案当成一个概念处理。Task 5.1 自注"以 Reader/Vocabulary 现状审计为准"，但这个审计没有完成。
- **后果**：用户浏览器有写作历史版本、听力草稿、口语练习布局偏好，迁移后全部消失，无任何警告。写作版本恢复功能在 Android 上永久失效。
- **建议修改设计**：§13.1 增加要求：实施前必须完成 reader.html 和 vocabulary.html 的 localStorage 完整 key 枚举，两套写作 key 明确说明用途差异，决定各自是否纳入档案。
- **建议修改实施**：Task 5.1 之前增加前置任务"reader/vocabulary localStorage 完整扫描"，产出正式 key 白名单文件，再开始实施 Phase 5。
- **阻止进入 Android 实施**：**是**（阻止 Phase 5，不阻止 Phase 1–4）

---

### P1 — 很可能造成核心功能失败、重大返工或无法验收

---

#### P1-1 Google Fonts 含 Noto Serif SC（CJK），离线替换难度被低估

- **对应文档**：设计方案 §12.2；实施方案 §Task 8.1
- **仓库证据**：`vocabulary.html:8` — `fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700 &family=Noto+Sans:wght@600;700&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400 &family=Noto+Serif+SC:wght@400;600`
- **问题**：两份文档正确识别这个问题，但低估了难度。Noto Serif SC 覆盖中文 CJK 字符，离线回退到 Android 系统字体需确认中文教材和词典解释在所有目标设备上均可正常渲染；Inter 被 UI 标签使用，系统 Roboto 替换后字宽和行高会变。未说明子集策略（全集 or 覆盖俄语+中文的最小子集）。
- **后果**：飞行模式下 vocabulary.html 字体降级，可能导致 Vocabulary 卡片排版错位，尤其是含斜体、变宽西里尔字母的场景。
- **建议**：Task 8.1 增加：① 只打包实际使用字符的子集（pyftsubset/fonttools）；② 用真机验证 Android 8 和 Android 13 各一台的中文和俄文渲染；③ 记录允许的字体回退链。

---

#### P1-2 `rr_sync_fail_queue` 浏览器档案导入后 Android 首次加载会触发重试循环

- **对应文档**：实施方案 §Task 3.3
- **仓库证据**：`reader.html:1593` — 启动时立即读取并恢复队列；`reader.html:6539` — 重试循环持续调用 `/api/novel-vocab`
- **问题**：Task 3.3 说"Android 模式不写 `rr_sync_fail_queue`"，但若浏览器迁移档案中含有已存在的队列条目，Android 模式仍会在启动时加载并触发重试。这是**读路径**问题，不是写路径问题，Task 3.3 未覆盖。
- **后果**：Android 启动时持续向不存在的本地 Node API 发请求，产生无限失败日志，消耗电量，表现为"一直在转"。
- **建议**：在 Android runtime 初始化时，显式清空 `rr_sync_fail_queue`（不记入档案，迁移时丢弃）。

---

#### P1-3 `window.open(url, '_blank')` 在 `vocabulary.html` 未被适配层覆盖

- **对应文档**：实施方案 §Task 3.4
- **仓库证据**：`vocabulary.html:5103` — `window.open(url, '_blank')`；`vocabulary.html:2309` — `window.location.href = 'reader.html'`
- **问题**：Android WebView 默认不处理 `window.open`，会静默失败或跳系统浏览器（取决于 Capacitor 配置）。两份文档对 vocabulary.html 里的 `window.open` 行为均无说明，也没有覆盖 vocabulary.html 内部跳转到 reader.html 在 Android 多页面模式下的行为。
- **建议**：Task 3.4 增加：vocabulary.html 中 `window.open` 调用在 Android 模式下的替换策略（Capacitor Browser 插件 or App 内页面导航）；`window.location.href='reader.html'` 在 Android 模式下验证 WebView 能否正常加载。

---

#### P1-4 `data/novel/` 章节数据未追踪在 Git，小说书架可能在 APK 中空置

- **对应文档**：设计方案 §8.1；实施方案 §Task 3.2
- **仓库证据**：`data/novel/index.json` 实测 507 字节（基本为空）；`data/novel/boss_yin/` 仅见 `ch0000.json`–`ch0004.json` 共 5 个文件，完整 261 章数据**未追踪在 Git**；`data/novel/russian_tales/` 同样 0 字节
- **问题**：reader.html 书架通过 `fetchJson('/api/novel/index', 'data/novel/index.json')` 加载小说目录。若小说数据不进入 APK，Android 书架小说区为空，与"飞行模式打开全部核心文字教材"验收条目冲突。两份文档对小说数据的归属（核心包/媒体包/用户导入）**没有明确说明**。
- **建议**：在设计方案 §11.1 中明确小说数据归属；若小说 JSON 体积允许（boss_yin 261 章约几 MB），应进入核心包并确保进入 Git 追踪；若体积大，需增加独立小说包定义。

---

#### P1-5 词典启动时 10 路并行 fetch 共 ~46 MB，Android WebView 冷启动性能未评估

- **对应文档**：设计方案 §11.1；实施方案 §Task 1.3、Task 2.3
- **仓库证据**：`reader.html:5791–5800` — 启动时并行 fetch：`vocabulary.json`（12.68 MB）、`external-vocab.json`、`function-word-forms.json`、`corpus-morphology.json`（7.23 MB）、`freedict-rus-zh.json`（19.15 MB）、`markdown-glossary.json`、`reviewed-function-entries.json`、`openrussian-en.json`（5.41 MB）、`wiktionary-ru.json`、`salad-vocab.json`；合计约 46 MB
- **问题**：两份文档提到"本地词典约 48 MB"，但没有评估 Android WebView 一次性解析 46 MB JSON 的冷启动时间，也没有设置加载时间门槛或低内存设备测试要求。
- **后果**：低端设备（2–3 GB RAM）词典初始化可能耗时 5–10 秒，Vocabulary/Reader 首屏白屏，用户以为应用崩溃。
- **建议**：Task 1.3 环境试验加入低内存设备（≤3 GB RAM）词典冷启动时间实测；如超过 3 秒，讨论延迟加载或索引分片策略，并在 Task 2.3 体积预算中列出 46 MB 词典的启动影响评估。

---

#### P1-6 `MediaRecorder` MIME 类型在 Android WebView 可能与浏览器不一致，跨平台回放未验证

- **对应文档**：设计方案 §13.2；实施方案 §Task 9.3
- **仓库证据**：`reader.html:4717` — `new MediaRecorder(stream)`，未指定 mimeType；录音以 `blob.type || 'audio/webm'` 存入 IndexedDB（`reader.html:4709`）
- **问题**：不同 Android WebView 版本可能产生 `audio/webm;codecs=opus`、`audio/ogg` 或 `audio/mp4`。浏览器端（桌面 Chrome）录制的 webm 在 Android WebView 回放可能失败，反之亦然。Task 9.3 说"若不稳定则接原生录音插件"，但没有说明格式兼容性是判断标准之一，也没有说明跨平台档案包含的录音如何处理格式差异。
- **建议**：Task 9.3 明确：① 测试 Android WebView MediaRecorder 支持的 MIME 类型列表；② 档案中录音 Blob 必须携带 mimeType 元数据；③ 导入时发现 MIME 不支持，提示用户而非静默播放失败。

---

### P2 — 非阻塞，但应在 V1 前修正

---

#### P2-1 媒体包体积估算与实测有偏差

- **仓库实测**（PowerShell 直接测量）：
  - `listening-audio`（顶层 78 文件）：**299.1 MB**（方案写 313.6 MB，差 14.5 MB）
  - `world-people-video`（`world-people-v2/` 子目录 56 文件）：**174.8 MB**（方案写 183.3 MB，差 8.5 MB）
  - `vocab-dmitry + vocab-svetlana`（6036 文件）：**155.7 MB**（方案写 163.2 MB，差 7.5 MB）
- **问题**：文件数量完全吻合，但体积均低于方案估算。说明方案数据来自某次旧测量，不是当前文件系统实测。差值约 23–30 MB，不影响核心决策，但用户界面安装提示和空间预检数字需更新。
- **建议**：Task 7.1 媒体包表格用构建脚本实测值替换当前估算，并在构建报告中自动输出每次测量结果。

---

#### P2-2 Vocabulary 背景图为个人手机照片，命名含时间戳

- **仓库证据**：vocabulary.html 背景图列表含 `assets/IMG_20260405_015648.jpg`、`assets/mmexport1775325437154.jpg` 等 6 张，命名含拍摄时间戳和微信导出前缀
- **问题**：对私人 APK 无实质隐私风险；但若 APK 被他人获取，文件名可推断拍摄时间点；`mmexport` 前缀暴露图片来源为微信。
- **建议**：构建时将背景图复制并重命名为中性名称（`vocab-bg-01.jpg` 等），APK assets 中不保留含元数据的原始文件名。

---

#### P2-3 `generatedAt` 时间戳破坏 `filesHash` 的构建确定性

- **对应文档**：实施方案 §Task 0.2
- **问题**：manifest 含 `"generatedAt": "ISO timestamp"`，同时验收要求"同一内容得到同一 `filesHash`"。若 `filesHash` 是对整个 manifest JSON 的哈希，每次 `generatedAt` 变化就破坏确定性；若只对文件内容哈希则需明确说明，两者定义不一致。
- **建议**：明确 `filesHash` 的计算范围（仅内容文件，不含 `generatedAt`），并在构建脚本注释中写明。

---

#### P2-4 `app-dist/` 和 Android 工程的 gitignore 策略应在 Phase 2 开始时即确定

- **对应文档**：实施方案 §Task 9.1
- **问题**：Task 9.1 说"Android 工程是否提交 Git 需在首次生成后决定"，但延后决策会导致首次生成后忘记配置 gitignore 而意外提交数百 MB 编译产物。
- **建议**：在 Phase 2 开始时即将 `app-dist/` 和 `android/app/build/` 加入 `.gitignore`；Android 工程中仅提交原生配置文件（`capacitor.config.*`、`build.gradle`），不提交编译产物。

---

#### P2-5 "合并优先"迁移策略缺少逐字段冲突规则

- **对应文档**：设计方案 §10.1；实施方案 §Task 5.2
- **问题**：设计方案说"合并优先，除非用户明确选择覆盖"，但对 SM-2 复习记录 (`vocabulary-review-records`) 的合并规则，"取较新 lastReview 的记录"和"取 interval 更长的记录"是两种不同策略，结果不同。同名草稿的合并（保留哪个版本）也未定义。
- **建议**：§13.1 为至少 3 类数据（SM-2 复习记录、阅读位置、写作草稿）明确逐字段合并规则，并在 Task 5.4 迁移夹具中验证冲突场景。

---

#### P2-6 录音 Blob 导出格式与大小上限未定义

- **对应文档**：实施方案 §Task 5.2
- **仓库证据**：`reader.html:4709` — 录音以 `blob.type || 'audio/webm'` 存入 IndexedDB
- **问题**：Task 5.2 说"IndexedDB 写入失败时回滚"，但没有说明单条录音 Blob 的大小上限、完整备份的分片策略，以及浏览器（webm）和 Android（可能 mp4）之间的跨平台格式兼容性。
- **建议**：Task 5.2 增加：① 规定录音导出格式（base64 + mimeType 元数据）；② 单次导出最大体积和分片规则；③ 导入时 MIME 不支持的处理策略。

---

#### P2-7 V2 扩展到五入口时导航状态若按索引硬编码将需要全部重写

- **对应文档**：设计方案 §5
- **问题**：设计方案 §5 V2 导航 `首页 | Reader | Vocabulary | 口语 | 我的`，"口语"插入第 4 位。app-shell.js 导航若按数组索引（0/1/2/3）处理 `aria-current` 和 back 键，V2 插入新入口时需全部重写。
- **建议**：app-shell.js 导航用逻辑 ID（`home / reader / vocabulary / my`），为第 4 个入口预留 id `speaking`，V2 只需新增一个 entry 定义。

---

### P3 — 优化建议

- **P3-1**：`data/dictionary/freedict-rus-zh.backup.json`（12.84 MB）在排除规则中只写了 `.backup` 通配，建议构建脚本显式枚举已知 backup 文件并在报告中列出被排除文件，避免新增同类文件时遗漏。
- **P3-2**：Phase 12 Gradle 命令 `.\gradlew.bat assembleRelease` 写死 Windows 路径分隔符，建议注释说明此命令仅适用于 Windows 并附 `./gradlew assembleRelease` 的 Unix 等价命令。
- **P3-3**：实施方案 Task 10.3 和 Task 4.4 各含一行 `Verify in browser using dev-browser skill`（英文），为 Codex 内部工具调用残留，建议替换为中文描述的测试步骤，避免执行时混淆。
- **P3-4**：设计方案 §18 延后"Capacitor 具体稳定版本"，但 Task 1.3 要求先做 Capacitor 最小试验——试验必须使用某个版本，应在 Phase 1 冻结 Capacitor 版本（哪怕只写"使用实施时 latest stable"）。
- **P3-5**：实施方案 §Task 12.2 交付目录写 `E:\Desktop\...`，与内存文件 `desktop-redirect-e-drive.md` 一致，属已知正确配置，无需修改。

---

## 3. 两份方案一致性矩阵

| 主题 | 设计方案 | 实施方案 | 是否一致 | 缺口 |
|---|---|---|---|---|
| 产品范围 | V1：Reader+Vocabulary+首页+我的，无 AI | 同上 | ✅ | — |
| 四入口 | 首页\|Reader\|Vocabulary\|我的 | 同上 | ✅ | — |
| V1/V2 边界 | V2 增加"口语" | 同上 | ✅ | — |
| 核心包内容 | 文字教材、词典、句库、背景图、字体等 | 白名单示例 | ⚠️ 部分 | 设计方案未给文件路径；实施方案示例遗漏 sentences.json、lexeme_index.json、morphology-map.json、external-vocab.json（P0-2） |
| 媒体包划分 | 5个包+体积 | 5个包+体积 | ⚠️ 部分 | 体积估算与实测存在 7–15 MB 偏差（P2-1）；小说章节数据归属未说明（P1-4） |
| Node API 替代 | Runtime adapter 覆盖 7 个接口 | Task 3.1–3.5 分接口拆解 | ⚠️ 部分 | `/api/dictionary/lookup`、`/api/novel-vocab-list` 初始化路径均未覆盖（P0-1、P0-3） |
| 数据迁移 | 覆盖 Reader/Vocabulary 所有模块 | Task 5.1 白名单示例 | ❌ 不一致 | 实施方案白名单缺失 10+ 实际 key，且标注"以审计为准"但审计未完成（P0-4） |
| 录音处理 | 完整备份含 Blob，普通备份列出数量 | Task 5.2 同上 | ⚠️ 部分 | 录音 MIME 格式跨平台兼容性、Blob 大小上限、分片规则均未定义（P1-6、P2-6） |
| 字体 | 移除 Google Fonts，打包子集或系统回退 | Task 8.1 同上 | ✅ 方向一致 | 具体子集策略和验收设备要求未写入（P1-1） |
| application ID 和签名 | 首次发布后不得更换 | Task 1.1、1.2 | ✅ | keystore 备份步骤足够明确 |
| 内容冻结 | 语法解析完成后才生成内容版本 | Phase 0 前置条件 | ✅ | — |
| 发布门槛 | §17 列出 10 条硬门槛 | §20 同样列出硬门槛 | ✅ 基本一致 | 设计方案"所有核心文字教材在飞行模式下可打开"与实施方案遗漏的白名单文件存在矛盾 |
| 回退策略 | §19 列出 5 类回退 | §19 列出 5 类回退 | ✅ | — |
| Capacitor 版本 | 延后到 Phase 0 冻结 | Task 1.3 说"使用已验证的当前稳定版本" | ⚠️ 部分 | 试验必须先选定版本；"延后"和"试验前锁定"逻辑矛盾（P3-4） |
| 文件和模块命名 | `app-shell.css/js`、`app-runtime.js`、`media-registry.js` 等 | 同名文件列表 | ✅ | — |
| 构建指令残留 | — | Task 10.3、Task 4.4 含 `dev-browser skill` 英文指令 | — | 实施方案特有，设计方案无对应；为 Codex 工具调用残留，需清除（P3-3） |

**设计里提到但实施计划没有任务承接的内容：**
- 设计方案 §15（错误与空状态）：媒体损坏、存储不足、TTS 缺俄语的 UI 状态，实施方案中无对应的 UI 验收任务。
- 设计方案 §14（视觉与移动端原则）：系统字体放大 130% 的布局验证，实施方案 Task 4.4 只写了 130% 字体但无明确通过/失败标准。

**实施计划新增但设计方案没有定义的产品行为：**
- 实施方案 Task 0.3：建立发布基线记录文件（`acceptance/2026-07-27-v1-web-baseline.md`）——设计方案无此要求，属合理新增。
- 实施方案 §Task 2.4 npm 命令：`android:sync` 等脚本——设计方案未涉及，属实施细节，合理新增。

---

## 4. 被忽略的失败场景

以下 15 个具体失败场景，当前方案均未明确覆盖测试或处理策略。

```
场景 01
触发：用户从浏览器导出档案后导入 Android，档案中含 rr_sync_fail_queue 数据
→ 当前方案：reader.html:1593 在启动时读取队列，触发对 /api/novel-vocab 的无限重试
→ 应有行为：Android 模式启动时检测到该 key，显式清空，不入重试队列
→ 测试阶段：Task 5.4 迁移夹具验收

场景 02
触发：Vocabulary 启动时 fetch /api/novel-vocab-list 返回 404（Android 模式）
→ 当前方案：生词本初始化静默降级为空，"今日待复习"显示 0
→ 应有行为：Android 模式跳过此 fetch，直接从 localStorage/IndexedDB 读取生词
→ 测试阶段：Task 3.6 适配层测试

场景 03
触发：用户在 Vocabulary 页面划词，触发 /api/dictionary/lookup 请求
→ 当前方案：Android 模式静默 404，词典查询返回空结果，无错误提示
→ 应有行为：Android 模式拦截请求，返回本地多源合并结果，缺词记入 rr_dictionary_missing_v1
→ 测试阶段：Task 3.5 词典行为测试

场景 04
触发：Android 模式打开 Vocabulary，首次加载 46 MB 词典 JSON（低端设备 2 GB RAM）
→ 当前方案：无加载时间门槛，无降级策略，白屏无反馈
→ 应有行为：超过 3 秒显示加载进度；设备内存不足时提供延迟加载选项
→ 测试阶段：Task 1.3 真机环境试验（低端设备）

场景 05
触发：APK 安装后 Vocabulary 启动，sentences.json / lexeme_index.json 不在 APK 内
→ 当前方案：fetch 静默 404，来源回跳和句库匹配失效，无任何错误提示
→ 应有行为：启动时校验关键数据文件存在；缺失时提示重新安装
→ 测试阶段：Task 2.2 白名单构建验证 + Task 10.1 自动化测试

场景 06
触发：用户浏览器有写作历史版本（russian_b2_writing_versions_v1），迁移档案未包含此 key
→ 当前方案：迁移后 key 缺失，写作版本历史永久丢失，无提示
→ 应有行为：迁移预览界面列出所有将被导入的模块，写作版本作为独立模块展示；若 key 未在档案中，明确告知用户"写作历史版本不含在本次档案中"
→ 测试阶段：Task 5.4 迁移夹具（需增加写作版本场景）

场景 07
触发：用户在 Android 录制口语练习，切后台接听电话，再回到 App
→ 当前方案：reader.html:4717 使用 Web MediaRecorder，无后台恢复逻辑
→ 应有行为：来电时暂停录音并保留已录片段；恢复后提示用户继续或丢弃
→ 测试阶段：Task 11.5 长时间与异常测试 + Task 9.3 真机验证

场景 08
触发：媒体包导入过程中手机锁屏（或系统回收进程）
→ 当前方案：方案提到"失败和取消不会破坏旧包"，但没有描述锁屏/进程回收时的具体恢复机制
→ 应有行为：导入状态持久化；重新打开 App 时提示"上次导入未完成，是否继续"；临时目录自动清理
→ 测试阶段：Task 7.2 技术试验（需加锁屏场景）

场景 09
触发：媒体包 ZIP 内含路径穿越文件名（如 `../../app/reader.html`）
→ 当前方案：方案提到"路径穿越"风险，但没有说明解压插件是否做了校验，也没有说明构建脚本是否对自制包做了校验
→ 应有行为：解压前对每个条目的路径进行规范化校验，拒绝绝对路径和 `..` 穿越
→ 测试阶段：Task 7.4 媒体包验收（需加恶意路径测试用例）

场景 10
触发：用户升级 APK 后，旧 localStorage schema 与新代码不兼容（如字段重命名）
→ 当前方案：设计方案 §13.4 说"schema 必须版本化，每次破坏性迁移前自动备份"，但实施方案没有具体说明版本检查代码放在哪里、何时执行
→ 应有行为：App 启动时读取 localStorage schema 版本，若低于当前版本则执行迁移函数并备份旧数据
→ 测试阶段：Task 11.4 覆盖升级测试（需构造 schema V1→V2 场景）

场景 11
触发：导入损坏或被篡改的学习档案（JSON 结构合法但数据异常，如 interval=-1 或原型污染 `__proto__`）
→ 当前方案：档案导入只校验 schema 和 version，没有说明是否对记录值做范围校验和原型污染防护
→ 应有行为：逐字段校验范围；使用 `Object.create(null)` 或显式 key 白名单防止原型污染
→ 测试阶段：Task 5.4 迁移夹具（需加恶意档案测试用例）

场景 12
触发：用户删除某个媒体包后，Reader 中该包的章节仍尝试加载媒体
→ 当前方案：方案说"删除后文字学习仍正常"，但没有说明 media registry 何时刷新、是否需要重启 App
→ 应有行为：删除后 media registry 立即标记该包为"未安装"；当前正在显示的章节媒体控件立即切换为"缺失"状态，无需重启
→ 测试阶段：Task 6.4 媒体路径测试（"用户删除包后页面立即更新"已列出，但方案未说明如何实现）

场景 13
触发：小说 novel/index.json 为空（507 字节），用户打开 Reader 书架只显示教材，无小说
→ 当前方案：两份文档对小说数据归属未明确，用户打开书架后小说区为空，不清楚是"没有小说"还是"小说需要另外导入"
→ 应有行为：书架区分"教材"和"小说"两个区域；小说区为空时显示"暂无小说，可导入 boss_yin 小说包"
→ 测试阶段：Task 3.2 Reader 数据读取验收（需补充小说空状态场景）

场景 14
触发：Vocabulary 背景图路径 `assets/IMG_20260405_015648.jpg` 在 app-dist/ 中未正确复制（文件名含时间戳，构建脚本未做重命名）
→ 当前方案：白名单只写"六张背景图"，没有给出路径，构建脚本有可能按 assets/ 目录规则复制时遗漏
→ 应有行为：构建脚本显式枚举 6 张背景图路径，复制到 app-dist/assets/ 并重命名，验证 vocabulary.html 内的引用路径同步更新
→ 测试阶段：Task 8.2 背景图白名单验收

场景 15
触发：用户在"我的"清除学习数据后发现录音一并被删除（实际上方案说"删除媒体不删除学习进度"但没说反向——清除数据是否删除录音）
→ 当前方案：设计方案 §16 说"清除全部学习数据必须说明不可恢复；删除媒体不删除学习进度"，没有说明"清除学习数据"是否包含 IndexedDB 录音 Blob
→ 应有行为：清除学习数据的确认对话框明确列出"将删除：阅读进度、复习记录、写作草稿、口语提纲、**口语录音**"；或提供"仅清除进度"和"清除进度+录音"两个选项
→ 测试阶段：Task 4.3 "我的"框架验收（需加清除场景二次确认 UI 测试）
```

---

## 5. Top 10 最优先修复项（按影响排序）

| 优先级 | 问题 | 影响范围 |
|---|---|---|
| 1 | P0-1 `/api/dictionary/lookup` 未覆盖 | Android 词典功能整体静默失败 |
| 2 | P0-2 sentences.json 等 4 文件不在白名单 | Vocabulary 来源回跳、形态分析静默失效 |
| 3 | P0-3 `/api/novel-vocab-list` 初始化路径未替换 | Vocabulary 生词本启动时归零 |
| 4 | P0-4 localStorage 迁移白名单缺失 10+ key | 写作版本、听力草稿等迁移后永久丢失 |
| 5 | P1-2 `rr_sync_fail_queue` 档案导入后触发重试循环 | Android 启动后持续耗电+请求失败 |
| 6 | P1-1 Google Fonts（含 CJK）离线替换方案不完整 | 飞行模式 Vocabulary 排版可能错位 |
| 7 | P1-4 小说章节数据归属未定义 | Android 书架小说区可能为空 |
| 8 | P1-5 46 MB 词典冷启动无性能门槛 | 低端设备首屏白屏，用户认为应用崩溃 |
| 9 | P2-5 "合并优先"缺少逐字段冲突规则 | SM-2 进度合并结果不确定，可能倒退复习周期 |
| 10 | P2-1 媒体包体积估算偏差 | 安装提示空间预检数字不准确 |

---

*审计报告完。未修改任何仓库文件。*




