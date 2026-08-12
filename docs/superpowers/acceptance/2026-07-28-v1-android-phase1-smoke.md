# 白夜俄语 V1 Android Phase 1 最小壳验收记录

日期：2026-07-28
状态：核心技术试验通过；仍有两项后续验收待完成

## 1. 试验边界

- 使用仓库外独立 Capacitor 测试壳，不修改正式 Reader、Vocabulary 或内容数据。
- 测试 APK 不包含小说、教材、Reader、Vocabulary 或媒体包。
- application ID 使用冻结值 `com.chenxingguo43.russianstudy`，用于验证真实覆盖安装和 WebView 数据保留。
- 测试 APK 使用 Android debug 签名，不是可交付 release 包。

## 2. 固定身份与平台

| 项目 | 实测/冻结值 |
|---|---|
| App 显示名 | 白夜俄语 |
| 测试壳显示名 | 白夜俄语（技术试验） |
| App 内品牌 | БЕЛЫЕ НОЧИ / 白夜俄语 |
| application ID | `com.chenxingguo43.russianstudy` |
| 首发版本 | `versionName 1.0.0`、`versionCode 1` |
| 最低 Android | Android 7.0 / API 24 |
| compile/target SDK | API 36 |
| WebView origin | `https://localhost` |
| Capacitor | 8.4.2 |

## 3. 开发环境

| 组件 | 版本 |
|---|---|
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| Android Studio | 2026.1.1 |
| JDK | 21.0.10 |
| Gradle | 8.14.3（bin 分发） |
| Android Gradle Plugin | 8.13.0 |
| Android SDK Platform | 36 revision 2 |
| Android SDK Build Tools | 36.0.0 可用 |
| Android SDK Platform Tools | 37.0.0 |
| Android SDK Command-line Tools | 22.0 |

锁定依赖：

- `@capacitor/core@8.4.2`
- `@capacitor/cli@8.4.2`
- `@capacitor/android@8.4.2`
- `@capacitor/filesystem@8.1.2`
- `@capacitor/share@8.0.1`

npm 官方审计接口结果：生产依赖 0 个已知漏洞。

## 4. 目标真机

| 项目 | 实测值 |
|---|---|
| 设备 | vivo X100 / V2309A |
| 系统 | OriginOS 6 / Android 16 / API 36 |
| ABI | arm64-v8a |
| 屏幕 | 1260 × 2800，560 dpi |
| 物理内存 | 约 16 GB |
| Android System WebView | 150.0.7871.125 |
| ADB | USB 调试连接与授权通过 |

本记录不保存设备序列号。

## 5. APK 与签名

### 候选 A

- `versionName 1.0.0`，`versionCode 1`。
- 修正麦克风声明后的 APK 大小：4,255,185 bytes。
- SHA-256：`32e5f274ee7e07d916aaf6a9f25c5d44cc8a6aba9e06bd316f8cd76629e8fc9c`。
- Android debug 签名通过 APK Signature Scheme v2 验证。
- debug 证书 SHA-256：`1adbcfacc54a571becc6f1e0cf3106ca54215063d0812c171610a78496a83e2f`。

### 候选 B

- `versionName 1.0.0`，`versionCode 2`，仅用于真实升级试验。
- SHA-256：`f452b57eb9039e4306aea4cf6b24fe5419f17da1c1a018df39b2bde209fe1bd6`。
- `adb install -r` 覆盖安装成功，设备报告安装版本为 `versionCode 2`。

APK 文件表共 451 项；小说、`reader.html` 和 `vocabulary.html` 匹配数均为 0。

## 6. 真机验收结果

| 验收项 | 结果 | 证据摘要 |
|---|---|---|
| 本地 HTML 加载 | 通过 | MainActivity 正常启动并显示测试页 |
| Capacitor Android runtime | 通过 | `platform=android`、`native=true` |
| 相对 `fetch()` JSON | 通过 | APK 内小型 JSON schema 与内容校验成功 |
| WebView origin | 通过 | 首装与两次覆盖后均为 `https://localhost` |
| localStorage | 通过 | 原 token 保持，访问计数 1 → 2 → 3 |
| IndexedDB | 通过 | 原 token 保持，访问计数 1 → 2 → 3 |
| 媒体注册表夹具 | 通过 | 原 token 保持，检查计数 1 → 2 → 3 |
| 文件选择 | 通过 | 系统文件选择器返回文件，测试壳可读取元数据与文本 |
| App 缓存写文件 | 通过 | Filesystem 插件返回 App cache URI |
| 系统分享 | 通过 | Share 插件成功打开系统分享流程 |
| 麦克风权限 | 通过 | Manifest 需同时声明 `RECORD_AUDIO` 与 `MODIFY_AUDIO_SETTINGS` |
| MediaRecorder 录制 | 通过 | `audio/webm;codecs=opus`，3 秒样本约 46 KB |
| MediaRecorder 回放声音 | 通过 | 用户在 vivo X100 页面内播放并确认可以正常听见 |
| 原生音频控件时长/进度条 | **未通过** | 约 3 秒录音显示为 `1:03:01`，WebM duration 元数据异常 |
| versionCode 1 → 2 覆盖安装 | 通过 | origin 不变，三类持久化数据全部保留 |

文件选择验收不记录用户选择的文件名、内容或路径。

## 7. 关键结论

1. V1 可冻结 Capacitor 8.4.2、Android 7/API 24 和 `https://localhost`。
2. vivo X100 / OriginOS 6 / Android 16 可以运行 Capacitor 8 最小壳。
3. 正式录音 Manifest 必须同时声明：
   - `android.permission.RECORD_AUDIO`
   - `android.permission.MODIFY_AUDIO_SETTINGS`
4. 同 application ID、同签名且 versionCode 上升时，Capacitor WebView 的 localStorage、IndexedDB 与媒体注册表可保留。
5. 当前手机安装的是 debug 技术试验包 `versionCode 2`；正式 release 签名不同，进入正式安装前必须先卸载该测试包。
6. `audio/webm;codecs=opus` 的音频数据和回放本身正常，但 Android WebView 原生 `<audio controls>` 不能可靠读取本次 MediaRecorder Blob 的时长；正式 App 不得把原生控件显示值直接当作真实时长。

## 8. 仍待完成

- [x] 用户确认 3 秒录音样本在页面内点击播放后可以正常听见。
- [ ] Phase 9 修正录音时长与进度条：优先实测 `audio/mp4`，若仍采用 WebM，则写入/修复 duration 元数据或使用基于实测录制时长的自定义播放控件；必须验证播放结束、拖动定位和重新打开后的时长一致。
- [ ] 在低内存代表设备上，以正式 Reader 内容测量本地词典首次可检索时间；本次 16 GB 真机与无正式词典的最小壳不能替代该性能验收。
- [ ] Phase 9 正式工程引入录音功能时复测权限、录制、回放、切后台、锁屏和来电恢复。
- [ ] Phase 12 在仓库外生成 release keystore，并完成离线双备份；本次 debug 证书不得用于发布。

## 9. 非阻塞提示

- 构建成功，但 Android 工具链报告一条 SDK XML v4 与当前处理器仅理解到 v3 的兼容提示；未影响 API 36 编译或安装。正式工程阶段随已验证的 AGP/SDK 组合复核。
- Gradle Wrapper 的 Java 下载链路在本机无法跟随分发下载，改用同版本官方 `bin` 包并按官方 SHA-256 校验后构建成功。
