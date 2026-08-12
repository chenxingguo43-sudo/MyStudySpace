# Android V1 视觉参考

本目录保存 Phase 4 的稳定视觉基准。桌面源图保留不动；开发、验收和后续设计讨论统一引用本目录。

## 文件映射

| 文件 | 用途 | 实施阶段 |
|---|---|---|
| `01-home.png` | App 首页、全局 Design Bible、底部导航基准 | Task 4.2 |
| `02-reader-shelf.png` | Reader 书架、最近阅读和教材集合 | Phase 4 / Reader 适配 |
| `03-reader-reading.png` | Reader 正文、翻译展开、章节导航 | Phase 4 / Reader 适配 |
| `04-reader-dictionary-sheet.png` | 点击单词后的词典 Bottom Sheet | Phase 4 / Reader 适配 |
| `05-vocabulary-list.png` | Vocabulary 待复习列表与选中导航 | Phase 4 / Vocabulary 适配 |
| `06-profile-my.png` | “我的”、本地资料、每日打卡和设置分组 | Task 4.3 |
| `assets/white-night-bridge.png` | 首页可用的无 UI 白夜背景候选素材 | Task 4.2 / Phase 8 |

## 使用规则

1. `01-home.png` 是颜色、字体气质、功能蓝、图标重量、导航和整体氛围的最高优先级参考。
2. 效果图中的手机外框、外部黑色背景、状态栏演示、手势条、按钮和文字不是图片素材。实际 App 必须用真实 HTML/CSS/JS 与 Android 安全区实现。
3. `assets/white-night-bridge.png` 是本目录中唯一可直接评估为生产背景的图片；使用前仍需验证不同宽高比裁切和体积优化。
4. 效果图文字只是视觉参考。教材名、进度、待复习数量、昵称、ID、连续天数、版本和存储占用必须来自真实数据。
5. 所有俄文必须使用正确 Unicode。尤其 `Му́ром` 必须使用西里尔字母 `у` 加组合重音，不得照抄效果图中可能出现的拉丁字母或错误重音。
6. 底部导航统一为：房屋图标“首页”、打开的书“Reader”、词条/文档列表“Vocabulary”、人物轮廓“我的”。不得照抄个别效果图中语义不一致的生成图标。
7. “我的”头像槽位固定约 `56dp`；效果图中的占位轮廓不是生产头像。昵称、本地 ID 和头像均可编辑并仅保存在设备上。
8. 每日打卡按设备本地自然日记录，同一天不得重复累计；连续天数不复用旧 `pomodoro-streak`。

## 验收基线

- 390 x 844 手机视口。
- 用户目标 Android 真机。
- Android 平板竖屏和横屏。
- 系统字体 100% 与 130%。
- 固定底部导航不得遮挡列表、词典抽屉、阅读章节栏或危险操作。
