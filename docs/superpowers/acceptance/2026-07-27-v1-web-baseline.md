# 白夜俄语 V1 网页发布基线与隐私审查

> 基线日期：2026-07-28
> 对应内容版本：`2026.07.27.1`
> 对应提交：`9e53b5ab`（`main`）
> 状态：Phase 0 基线已记录；Android 工程尚未创建

## 1. 范围与产品边界

- App 显示名：白夜俄语。
- App 内品牌：БЕЛЫЕ НОЧИ / 白夜俄语。
- Android application ID：`com.chenxingguo43.russianstudy`。
- V1 入口：首页、Reader、Vocabulary、我的。
- V1 不接 AI，不运行 Node.js，不依赖旧 `/api` 服务完成核心学习。
- Android App 只发布正式教材、Vocabulary 与本地词典。
- 私人小说书架和 `data/novel/**` 保留在本地网页版数据中，不进入内容 manifest、App 书架或 APK。
- 大体积音频、视频和发音文件不进入核心内容 manifest，后续以媒体包处理。

## 2. 仓库基线

| 项目 | 基线值 |
|---|---|
| 分支 | `main` |
| HEAD | `9e53b5ab` |
| Reader 页面 | `reader.html`，536,491 B |
| Vocabulary 页面 | `vocabulary.html`，243,161 B |
| 暂存/提交/push | 均未执行 |

建立本记录时，工作区中两份 Android 封装方案已有用户要求保留的未提交修订；Phase 0 新增内容 manifest、构建器和测试。OCR、媒体、日志和其他本机临时文件不清理、不纳入 Android 改动。

## 3. 内容基线

### 3.1 内容 manifest

| 项目 | 基线值 |
|---|---|
| schema | `mystudyspace-content-v1` |
| 内容版本 | `2026.07.27.1` |
| 受控文件 | 368 |
| 受控字节数 | 86,199,976 B |
| `filesHash` | `fdddad0b4acc6058a87e1981a515aed18c0a05b233b395ce41dceca08b2c181c` |
| 教材 JSON 汇总 SHA-256 | `c240ec58da53b33704f11e30dc7b76191777508c5a344a6680db1ed2298341ac` |
| 小说文件 | 0 |

`filesHash` 只覆盖排序后的规范化路径、字节数和文件 SHA-256，不包含 `generatedAt`。生成 manifest 前后教材 JSON 汇总 SHA-256 一致。

### 3.2 受控内容体积

| 分类 | 文件数 | 字节数 |
|---|---:|---:|
| 正式教材 | 349 | 8,322,149 B |
| 本地词典 | 10 | 34,770,653 B |
| Vocabulary、句库、词形和来源索引 | 9 | 43,107,174 B |
| 合计 | 368 | 86,199,976 B |

### 3.3 正式教材

| ID | 教材 | 声明章节/模块数 |
|---|---|---:|
| `reading_speaking` | В мире людей — 阅读口语 | 30 |
| `listening_speaking` | В мире людей — 听力口语 | 63 |
| `listening_speaking_mock` | В мире людей — ТРКИ-2 模拟考试 | 1 |
| `writing_speaking` | В мире людей — 写作口语 | 19 |
| `zlatoust_grammar` | В мире людей — 语法词汇 | 5 |
| `russian_b2` | 俄语 B2 全模块 | 7 |

正式教材共 6 本，声明章节/模块合计 125。小说不计入 Android 书架数量。

### 3.4 语法与 Vocabulary

- `grammarAnalysisStatus`：`complete`。
- 《В мире людей — 语法词汇》：5 章、597 题。
- 已核验客观题答案：591。
- 开放题：6。
- 已核验来源证据：597。
- Vocabulary 主词库：6,147 条。
- `data/vocabulary-quality-report.json` 当前记录 1 条释义为空的既有非阻塞问题；封装阶段不改写词库内容。

## 4. 浏览器视觉基线

采集环境：本地 `server.js`，视口 1280 × 720。Reader 与 Vocabulary 均达到 `document.readyState = complete`，采集期间控制台 warning/error 为 0。

| 页面 | 当前标题 | 截图 | SHA-256 |
|---|---|---|---|
| Reader | `📖 小说阅读 — 俄语学习舱` | [reader-baseline.png](screenshots/reader-baseline.png) | `4fbd1761f4b4bdabb1a3e703cc16e9c08c8acf31045e2c0c59913175706ac327` |
| Vocabulary | `背单词 \| 俄语学习舱` | [vocabulary-baseline.png](screenshots/vocabulary-baseline.png) | `ca08c76067bd22725e2c91ce378a56173ae601683932413db9c41888de6486bb` |

Reader 当前网页标题仍含“小说阅读”。Android App 已下架小说，因此 Phase 3/4 适配时必须改为 Reader/白夜俄语品牌标题，并由自动化测试防止小说标题或入口重新进入生产包。

截图只用于内部发布基线，不进入 APK 白名单。

## 5. 自动化测试基线

| 测试范围 | 命令 | 结果 |
|---|---|---:|
| 内容 manifest | `node --test tests/app-content-manifest.test.js` | 5/5 通过 |
| Russian B2 | `npm run test:russian-b2` | 285/285 通过 |
| Reader/Vocabulary/Novel 网页回归 | 根目录对应 `reader*`、`vocabulary*`、`novel*` 测试 | 37/37 通过 |
| 合计 |  | 327/327 通过 |

另有以下检查通过：

- `node scripts/build-v1-content-manifest.js --check`。
- `git diff --check`。
- manifest 无 `data/novel/`、小说书目或小说标题。
- manifest 构建不改写教材 JSON。

## 6. 学习数据基线

- 当前网页学习数据仍使用既有 localStorage 和 IndexedDB。
- 本次基线不读取、导出或复制用户真实浏览器存储，避免把个人学习记录写入仓库。
- 当前没有一份可公开提交、去个人化的完整 V1 浏览器迁移夹具。
- Phase 5 必须按数据键注册表创建纯测试档案，覆盖阅读位置、书签、错题、草稿、生词、复习记录和测试录音。
- 在迁移夹具完成前，不能声称“旧浏览器数据迁移已验收”。

## 7. 隐私与发布资源审查

### 7.1 自动扫描

对 Reader、Vocabulary 和 368 个受控内容文件（合计 370 个文件）执行高置信度扫描：

- Windows 用户目录/桌面/下载目录绝对路径。
- URL 内嵌用户名密码。
- GitHub token 常见格式。
- OpenAI key 常见格式。

结果：未发现匹配。

以下内容继续作为生产硬排除项：

- `cloudsync-config.js`。
- `package.json`、开发服务器、构建脚本和整个 `node_modules/`。
- `data/novel/**`。
- OCR、PDF、日志、测试输出和本机临时目录。
- `data/vocabulary-manifest.json`；该开发清单含本机 Obsidian vault 绝对路径，不属于运行内容。
- 任何 keystore、签名密码、`.env*` 或本机 SDK 配置。

### 7.2 Vocabulary 六张背景图

| 文件 | 字节数 | 尺寸 | GPS | 时间元数据 | 画面隐私判断 |
|---|---:|---:|---|---|---|
| `IMG_20260405_015648.jpg` | 2,735,813 | 4096 × 2304 | 无 | 有 | 无真人或可识别地点信息 |
| `IMG_20260405_015834.jpg` | 240,750 | 1252 × 680 | 无 | 有 | 无真人或可识别地点信息 |
| `IMG_20260405_015918.jpg` | 2,593,208 | 4096 × 2228 | 无 | 有 | 无真人；画面含虚构/风格化站牌 |
| `IMG_20260405_020008.jpg` | 2,821,466 | 4096 × 2228 | 无 | 有 | 无真人或可识别地点信息 |
| `IMG_20260405_020048.jpg` | 4,560,080 | 4096 × 2292 | 无 | 有 | 无真人或可识别地点信息 |
| `mmexport1775325437154.jpg` | 391,777 | 1259 × 707 | 无 | 无 | 二次元插画，无真人信息 |

六张图片合计 13,343,094 B。未发现 GPS、相机品牌或型号；前五张包含时间元数据，原文件名也暴露导出/保存时间。画面本身的个人隐私风险较低，但仓库无法证明六张图片的版权来源或对外分发授权。

发布建议：在面向他人的 APK 中，不直接使用这六张原文件。Phase 8 应选择以下一种方案并记录授权：

1. 使用用户拥有完整权利的图片，清除 EXIF 并改为中性文件名；或
2. 替换为专门为白夜俄语生成、授权清晰的背景；或
3. V1 仅保留无图片的默认背景。

在用户确认前，这六张图片标记为 `release-decision-pending`，不能自动进入生产白名单。

### 7.3 已确认的隐私边界

- 小说：Android 完全排除，本机文件不删除。
- 用户真实学习记录：不进入仓库、APK 或测试夹具。
- 浏览器基线截图：仅存内部文档目录，不进入 APK。
- App V1：无账户、无 AI、无云端个人资料。

## 8. 进入 Phase 1 前仍需确认

- `versionName`：建议 `1.0.0`。
- `versionCode`：建议 `1`。
- 最低 Android 版本。
- 首批验收手机/平板及一台低内存代表设备。
- 六张 Vocabulary 背景图的发布处理方案。
- 仓库外 release keystore 的保存与双备份位置策略。

## 9. 当前已知但允许保留的问题

- Vocabulary 质量报告有 1 条空释义。
- Reader 网页标题仍为“小说阅读”，必须在 Android 生产页面生成前修正。
- Android runtime adapter、四入口 App 壳、迁移模块、媒体包和离线字体尚未实施。
- 当前截图反映网页版已有学习状态，不代表 Android 新安装空状态。

这些问题不否定 Phase 0 内容冻结，但对应项目完成前不得生成 V1 候选 APK。
