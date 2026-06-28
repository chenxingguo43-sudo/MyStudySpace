# Obsidian 俄语仪表盘 Dribbble 风格改造计划

**Summary**
- 将 `俄语笔记库/仪表盘.md` 从旧的“词汇/每日练习”查询，改成真正读取 `B2口语素材` 的学习仪表盘。
- 参考你给的 Dribbble 图：浅色主画布、左侧窄导航感、圆角数据卡、大面积统计面板、章节分布/复习队列/最近新增列表。
- 保留 Obsidian 原生 Dataview 工作流，不做网页应用式重构。

**Key Changes**
- 修改 [仪表盘.md](C:/Users/梅子/.codex/worktrees/91de/MyStudySpace/俄语笔记库/仪表盘.md)：保留 `cssclass: dashboard`，重组为首页式结构。
- 修改 [dashboard.css](C:/Users/梅子/.codex/worktrees/91de/MyStudySpace/俄语笔记库/.obsidian/snippets/dashboard.css)：把当前 iOS 毛玻璃卡片改为浅色 SaaS 仪表盘视觉。
- 仪表盘内容改为：
  - 顶部概览：总素材数、待复习数、章节数、最近新增数。
  - 主面板：按章节统计素材数量，形成类似参考图热力/分布区。
  - 右侧卡片：掌握度分布、今日/近期学习入口、重点复习提示。
  - 下方列表：低掌握度素材、最近新增素材、按章节快速跳转。
- Dataview 数据源统一使用 `FROM "B2口语素材"`，字段使用现有 frontmatter：`ru`、`zh`、`chapter`、`section`、`tags`、`mastery`、`created`。

**Interface / Data Contract**
- 不新增插件依赖；继续依赖已启用的 Dataview 和 CSS snippet。
- `mastery <= 2` 定义为“需要复习”。
- `created >= date(today) - dur(7 days)` 定义为“最近新增”。
- 如果未来新增 `词汇` 或 `每日练习` 文件夹，本次不把它们混入主仪表盘，避免空查询影响首页观感。

**Test Plan**
- 在 Obsidian 打开 `俄语笔记库/仪表盘.md`，确认 DataviewJS 正常渲染。
- 检查亮色主题下：卡片、表格、标题、链接、数字统计不重叠。
- 检查暗色主题下：可读性不崩，至少有基本适配。
- 验证统计值与当前 vault 事实一致：`B2口语素材` 约 1715 条，章节分布来自实际文件夹。
- 缩窄窗口检查响应式：桌面多列，小屏单列。

**Assumptions**
- 目标是“借鉴参考图的仪表盘气质”，不是逐像素复刻 TalentSync。
- 优先服务俄语素材学习：复习、章节分布、最近新增、快速进入材料。
- 不改动素材笔记本身，只改仪表盘 Markdown 和 dashboard CSS snippet。
