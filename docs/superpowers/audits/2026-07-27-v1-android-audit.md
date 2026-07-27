# MyStudySpace V1 Android 封装方案 — 对抗性审计报告

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

> **存在重大缺口，暂时不应进入实施**

方案框架清晰，方向判断总体正确，执行原则也足够谨慎。但以下三类问题会导致 Android 版本在核心功能上**静默失败**——即不报错、但功能实际坏掉：

1. **`/api/dictionary/lookup` 端点两份文档均未覆盖**。reader.html 实际调用它（`reader.html:5993`），但 Runtime adapter 接口列表里没有替换方案，Android 模式下词典补查将静默 404。

2. **核心 APK 白名单至少遗漏 4 类运行期数据文件**（`sentences.json` 17.8 MB、`lexeme_index.json` 5.96 MB、`morphology-map.json` 4.38 MB、`external-vocab.json`）。遗漏任何一项，Vocabulary 来源回跳或形态引擎会静默降级，用户看不到错误。

3. **localStorage 迁移白名单至少缺失 10 个实际存在的 key**，涵盖写作版本、写作模型解锁、听力草稿、阅读口语布局、词典缓存等。用户迁移后这些数据默默丢失，无任何提示。

上述问题需在进入 Phase 1 之前修订两份文档后再推进。

---

## 2. 阻塞性问题

### P0 — 可能造成数据丢失、安全事故、无法升级或方案整体不可行

---

#### P0-1 `/api/dictionary/lookup` 两份文档均未覆盖

- **对应文档**：设计方案 §12.1；实施方案 §Task 3.1、Task 3.5
- **仓库证据**：`reader.html:5993` — `fetch('/api/dictionary/lookup?'+params)` 直接调用；`server.js:56` — `GET /api/dictionary/lookup` 端点存在；CLAUDE.md API 端点表中**无此条目**，两份封装文档均未提及
- **问题**：设计方案 §12.1 列出 7 个 Runtime adapter 接口，其中 `lookupDictionary(term)` 存在，但没有说明它在服务端有一条 `/api/dictionary/lookup` 补查路径需要替换。实施方案 Task 3.5 只说"本地词典继续作为默认，隐藏联网补查"，没有覆盖这个本地 API 路径。
- **后果**：Android 下划词查询触发服务端路径时静默 404，用户看到空结果，误以为词典无词。
- **建议修改设计**：§12.1 的 `lookupDictionary` 接口说明中增加：Android 模式禁止发出 `/api/dictionary/lookup` 请求，完全使用本地多源合并结果，缺词记入 `rr_dictionary_missing_v1`。
- **建议修改实施**：Task 3.5 增加子任务：适配层拦截此端点，Android 返回本地查询结果，不发网络请求，不入重试队列。
- **阻止进入 Android 实施**：**是**

---

#### P0-2 `sentences.json`（17.8 MB）等 4 个数据文件未进入核心 APK 白名单

- **对应文档**：设计方案 §11.1；实施方案 §Task 2.1
- **仓库证据**：
  - `vocabulary.html:2108–2111` — 启动时并行 fetch `data/lexeme_index.json`（5.96 MB）、`data/sentences.json`（17.8 MB）、`data/sources.json`、`data/source_labels.json`
  - `reader.html:2065,2088` — fetch `data/morphology-version.json`、`data/morphology-map.json`（4.38 MB）
  - `reader.html:5791` — fetch `data/external-vocab.json`
- **问题**：设计方案 §11.1 写"Vocabulary 主词库、句库、词形索引和来源索引"但没有给出路径，构建脚本无法据此映射。实施方案 Task 2.1 示例白名单 `data` 规则为 `data/textbook/**`、`data/novel/**`、`data/dictionary/runtime-files`，全部未覆盖上述根级数据文件。
- **后果**：Android 启动 Vocabulary 时这些文件 404，来源回跳、形态分析、句库匹配静默失效；`rr_sync_fail_queue` 不会记录这类错误，用户不知道。
- **建议修改设计**：§11.1 核心 APK 白名单新增一行，列出文件路径和当前体积（合计约 28 MB）。
- **建议修改实施**：Task 2.1 白名单 `data` 规则增加这 4 类文件的显式路径；Task 2.3 体积预算追加 ~28 MB。
- **阻止进入 Android 实施**：**是**

---

#### P0-3 localStorage 迁移白名单至少缺失 10 个实际 key

- **对应文档**：实施方案 §Task 5.1
- **仓库证据**（reader.html 实测，行号附后）：

```
russian_b2_writing_drafts_v1        reader.html:4551  WRITING_DRAFTS_KEY
rr_ws_drafts_v1                     reader.html:4552  WS_DRAFTS_KEY
russian_b2_writing_versions_v1      reader.html:4559  WRITING_VERSIONS_KEY
russian_b2_writing_model_unlocks_v1 reader.html:4560  WRITING_MODEL_UNLOCKS_KEY
rr_listening_drafts_v1              reader.html:4755  LISTENING_DRAFTS_KEY
rr_listening_attempts_v1            reader.html:4756  LISTENING_ATTEMPTS_KEY
russian_b2_exam_writing_drafts_v1   reader.html:5134  EXAM_WRITING_DRAFTS_KEY
rr_reading_speaking_progress_v1     reader.html:6943  RS_PROGRESS_KEY
reader-reading-speaking-layout-mode reader.html:7379  READING_SPEAKING_LAYOUT_KEY
rr_local_lookup_cache               reader.html:5789  （词典查询缓存）
RussianDictionaryStorage 的内部 key  reader.html:6744  键名未在代码中显式枚举，尚未验证
```

- **问题**：Task 5.1 共列出约 14 个 key 前缀，自注"以 Reader/Vocabulary 现状审计为准"，但这个审计没有完成。**写作**有两套独立 key（`WRITING_DRAFTS_KEY` 和 `WS_DRAFTS_KEY`，疑为不同功能分支），方案当成一个概念处理，导致一套草稿静默丢失。
- **后果**：用户浏览器有写作历史版本、听力草稿、口语练习布局偏好，迁移后全部消失，没有任何警告。写作版本恢复功能在 Android 上永久失效。
- **建议修改设计**：§13.1 增加要求：实施前必须完成 reader.html 和 vocabulary.html 的 localStorage 完整枚举，两套写作 key 明确说明用途差异，决定各自是否纳入档案。
- **建议修改实施**：Task 5.1 在进入 Phase 5 之前，必须先执行"reader.html + vocabulary.html localStorage 完整 key 扫描"作为前置任务，产出明确的正式 key 白名单文件。
- **阻止进入 Android 实施**：**是**（阻止 Phase 5 开始，不阻止 Phase 1-4）

---

### P1 — 很可能造成核心功能失败、重大返工或无法验收

---

#### P1-1 Google Fonts 4 个字体族（含 Noto Serif SC CJK）需要完整离线替换

- **对应文档**：设计方案 §12.2；实施方案 §Task 8.1
- **仓库证据**：`vocabulary.html:8` — `fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans:wght@600;700&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+SC:wght@400;600`
- **问题**：两份文档都正确识别了这个问题，但低估了难度。Noto Serif SC 覆盖中文，离线回退到 Android 系统字体需要确认中文教材和词典解释在所有目标设备上均可正常渲染；Inter 是 UI 英文字体，系统 Roboto 替换后 UI 节奏会变化。未说明字体子集策略（全集还是覆盖俄语+中文的最小子集）。
- **后果**：离线 APK 首次打开时 vocabulary.html 字体降级为系统字体，可能导致 Vocabulary 排版错位（尤其是含斜体、变宽俄文字母的场景）。
- **建议**：Task 8.1 明确：① 只打包实际使用字符的子集（pyftsubset 或 fonttools）；② 用真机验证至少一个 Android 8 和一个 Android 13 设备的中文和俄文渲染；③ 记录允许的字体回退链。

---

#### P1-2 `/api/novel-vocab-list` 仍被 `vocabulary.html` 调用，不在 reader.html 里

- **对应文档**：设计方案 §9.2；实施方案 §Task 3.4
- **仓库证据**：`vocabulary.html:2054` — `fetch('/api/novel-vocab-list')` 在 Vocabulary 初始化时调用；`reader.html` 中未出现此调用（正确）
- **问题**：两份文档都说"不再作为 Reader 收藏的必要来源"，但没有说明 vocabulary.html 里这次调用的替换策略。Reader 收藏词后通过共享 App 存储合并是对的，但 vocabulary.html 的初始化路径需要明确：Android 模式直接跳过此 fetch，还是读一个本地同名接口？
- **后果**：Android 启动 Vocabulary 时这条 fetch 404，生词本初始化可能出现空状态或错误。

---

#### P1-3 `rr_sync_fail_queue` 在浏览器迁移档案中若有遗留，Android 首次加载会触发重试

- **对应文档**：实施方案 §Task 3.3
- **仓库证据**：`reader.html:1593` — 启动时立即读取并恢复队列；`reader.html:6539` — 重试逻辑循环调用 `/api/novel-vocab`
- **问题**：Task 3.3 说"Android 模式不写 `rr_sync_fail_queue`"，但如果用户从浏览器导入的档案中含有已有的队列条目，Android 模式仍会在启动时加载并触发重试。这是一个**读路径**问题，不是写路径问题。
- **后果**：Android 启动时持续向不存在的本地 Node API 发请求，产生无限失败日志，消耗电量，表现为"一直在转"。
- **建议**：在 Android runtime 初始化时，显式清空 `rr_sync_fail_queue`。

---

#### P1-4 `window.open(url, '_blank')` 在 vocabulary.html 未被覆盖

- **对应文档**：实施方案 §Task 3.4
- **仓库证据**：`vocabulary.html:5103` — `window.open(url, '_blank')`；`vocabulary.html:2309` — `window.location.href = 'reader.html'`
- **问题**：Android WebView 默认不处理 `window.open`，会静默失败或打开系统浏览器（取决于 Capacitor 配置）。两份文档对 vocabulary.html 里的 `window.open` 和页面跳转行为均无说明。
- **建议**：Task 3.4 增加：vocabulary.html 中的 `window.open` 调用在 Android 模式下的替换策略（Capacitor Browser 插件 or 导航到 App 内页面）。

---

#### P1-5 `data/novel/index.json` 实测 507 字节（基本为空），小说书架可能空置

- **对应文档**：设计方案 §8.1；实施方案 §Task 3.2
- **仓库证据**：`data/novel/index.json` 实测 507 字节；`data/novel/boss_yin/` 仅有 5 个可见章节文件（`ch0000.json`—`ch0004.json`），完整 261 章数据**未追踪在 Git**（与俄语笔记库一样被 gitignore）
- **问题**：reader.html 书架通过 `fetchJson('/api/novel/index', 'data/novel/index.json')` 加载小说目录。若小说数据不进入 APK 或仅有极少内容，Android 书架小说区为空，与"飞行模式打开全部核心文字教材"验收条目冲突。
- **尚未验证**：小说章节 JSON 文件是否通过其他机制（媒体包？用户手动导入？）提供。两份文档对此没有明确说明。
- **建议**：在设计方案 §11.1 中明确小说数据的归属：是核心 APK、独立媒体包，还是用户导入？

---

#### P1-6 词典总体积约 33 MB，启动时10 路并行 fetch，Android WebView 性能未评估

- **对应文档**：设计方案 §11.1（"运行期词典文件"），实施方案 §Task 1.3
- **仓库证据**：`reader.html:5791–5800` — 启动时并行 fetch 10 个词典 JSON（vocabulary.json 12.68 MB、freedict-rus-zh.json 19.15 MB、corpus-morphology.json 7.23 MB、openrussian-en.json 5.41 MB 等），总计约 46 MB（含 vocabulary.json）
- **问题**：两份文档对词典文件体积的描述为"约 48 MB"（实施方案 §Task 2.1 白名单注释），但没有评估 Android WebView 一次性解析 46 MB JSON 的冷启动性能，也没有设置加载时间门槛。
- **后果**：低端 Android 设备词典初始化可能耗时 5–10 秒，Vocabulary 首屏白屏，用户以为应用崩溃。
- **建议**：Task 1.3 环境试验中加入：低内存设备（2–3 GB RAM）词典冷启动时间实测；如超过 3 秒，讨论延迟加载或索引分片策略。

---

### P2 — 非阻塞，但应在 V1 前修正

---

#### P2-1 媒体包体积估算与实测有偏差（约 14–18 MB）

- **仓库证据（实测）**：
  - `listening-audio`（顶层）：78 文件，**299.1 MB**（方案写 313.6 MB，差 14.5 MB）
  - `world-people-video`（`world-people-v2/` 子目录）：56 文件，**174.8 MB**（方案写 183.3 MB，差 8.5 MB）
  - `vocab-dmitry + vocab-svetlana`：6036 文件，**155.7 MB**（方案写 163.2 MB，差 7.5 MB）
- **问题**：文件数量与实测完全吻合，但体积均低于方案估算。这说明方案数据来自某次旧状态，不是当前文件系统实测。差值为 23–30 MB，不影响核心决策，但体积预算和安装提示中的数字需要更新。

---

#### P2-2 Vocabulary 背景图为个人手机照片，命名含时间戳

- **仓库证据**：`vocabulary.html` 背景图列表中含 `assets/IMG_20260405_015648.jpg`、`assets/mmexport1775325437154.jpg` 等 6 张个人照片
- **问题**：两份文档说"六张实际被 Vocabulary 使用的背景图进入核心包"。对私人 APK 没有实质隐私风险，但文件名含有手机拍摄时间戳，如 APK 被他人获取可推断拍摄时间；同时 `mmexport` 前缀是微信导出特征。
- **建议**：构建时将背景图复制并改名为无元数据的中性名称（`vocab-bg-01.jpg` 等），原始文件路径不暴露在 APK assets 中。

---

#### P2-3 `app-content-manifest.json` 中 `generatedAt` 时间戳破坏构建确定性

- **对应文档**：实施方案 §Task 0.2
- **问题**：manifest 中包含 `"generatedAt": "ISO timestamp"`，Task 0.2 验收要求"同一内容得到同一 filesHash"——但 `generatedAt` 每次生成都不同，若 `filesHash` 是对整个 manifest JSON 的哈希则无法确定性；若只对文件内容哈希则需明确说明。两者定义不一致。
- **建议**：明确 `filesHash` 的计算范围（仅内容文件，不含 `generatedAt`），并在构建脚本注释中写明。

---

#### P2-4 `app-dist/` 应否进入 Git 未明确决策流程

- **对应文档**：设计方案 §4（非目标）；实施方案 §Task 9.1
- **问题**：两份文档均说"可重复生成的产物"不手工编辑，但都没有给出明确的 `.gitignore` 策略。Task 9.1 说"Android 工程是否提交 Git 需在首次生成后决定"，但这个决策延后会导致首次生成后忘记配置 gitignore 而意外提交。
- **建议**：在 Phase 2 开始时即将 `app-dist/` 加入 `.gitignore`，Android 工程内仅提交可复现的原生工程配置（`capacitor.config.*`、`android/app/build.gradle` 等），不提交编译产物。

---

#### P2-5 "合并优先"迁移策略缺少逐字段冲突规则

- **对应文档**：设计方案 §10.1；实施方案 §Task 5.2
- **问题**：设计方案说"合并优先，除非用户明确选择覆盖"，但对于 SM-2 复习记录（`vocabulary-review-records`）的合并规则，"取较新 lastReview 的记录"和"取 interval 更长的记录"是两种不同策略，结果不同。当旧浏览器的进度领先于 Android（或反向）时，合并哪个是正确的？
- **建议**：§13.1 为至少 3 类数据（SM-2 复习记录、阅读位置、写作草稿）明确逐字段合并规则。

---

#### P2-6 录音 Blob 导出格式与大小上限未定义

- **对应文档**：实施方案 §Task 5.2
- **仓库证据**：`reader.html:4709` — 录音以 `blob.type || 'audio/webm'` 存入 IndexedDB；实际 MIME 类型由 MediaRecorder 决定，不同 Android WebView 可能产生 `audio/webm;codecs=opus` 或 `audio/ogg` 或 `audio/mp4`
- **问题**：Task 5.2 说"IndexedDB 写入失败时回滚"，但没有说明单条录音 Blob 的大小上限、完整备份的分片策略，以及 Blob 的格式在浏览器（webm）和 Android（可能 mp4）之间是否可互相回放。
- **建议**：在 Task 5.2 中增加：规定录音导出格式（建议 base64 or ArrayBuffer JSON）、单次导出最大体积和分片规则，以及跨平台 MIME 兼容性声明。

---

#### P2-7 V2 扩展到五入口时"口语"入口的路由位置未预留

- **对应文档**：设计方案 §5（V2 导航示意）
- **问题**：设计方案 §5 V2 导航写 `首页 | Reader | Vocabulary | 口语 | 我的`，"口语"插入第 4 位。App 壳导航状态 `aria-current` 和 back 键逻辑若按索引（0/1/2/3）硬编码，V2 插入新入口时需要全部重写。
- **建议**：app-shell.js 导航用逻辑 ID（`home / reader / vocabulary / my`）而非索引，为第 4 个入口预留 id `speaking`，V2 只需新增一个 entry 定义。

---

### P3 — 优化建议

- **P3-1**：`data/dictionary/freedict-rus-zh.backup.json`（12.84 MB）在构建排除规则中只写了"`.backup`"通配，建议构建脚本显式枚举已知 backup 文件并在构建报告中列出被排除的 backup 列表，避免新增同类文件时遗漏。
- **P3-2**：Phase 12 的 Gradle 命令 `.\gradlew.bat assembleRelease` 写死了 Windows 路径分隔符，如果未来换环境需要改。建议注释说明此命令仅适用于 Windows，并加 `./gradlew assembleRelease` 的 Unix 等价命令。
- **P3-3**：实施方案 Task 10.3 浏览器测试中写了 `Verify in browser using dev-browser skill`（英文），与文档其余中文风格不一致，疑为 Codex 内部指令泄露；应改为中文描述的测试步骤。
- **P3-4**：Task 4.4 导航验证里有 `Verify in browser using dev-browser skill`，同上，建议清除 Codex 指令残留。
- **P3-5**：设计方案 §18（延后决定）提到"Capacitor 具体稳定版本"延后，但 Task 1.3 要求先做 Capacitor 最小试验——两者本质上需要先选定版本才能试验，应在 Phase 1 冻结 Capacitor 版本。

