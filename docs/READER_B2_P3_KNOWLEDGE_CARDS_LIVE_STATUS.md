# B2 P3 知识点卡片实时执行记录

日期：2026-09-06

执行依据：[P3 知识点卡片 1-4 实施文档](READER_B2_P3_KNOWLEDGE_CARDS_1234_IMPLEMENTATION.md)

## 当前状态

`Plan 4 verified with qualified acceptance`

本记录只写已经完成并核验过的事实。`pending` 不代表遗漏，表示尚未开始；`needs-review` 表示已发现问题但没有擅自替教材或学习记录作结论；`blocked` 表示必须获得新的证据或用户决定才能继续。

| 阶段 | 范围 | 状态 | 已完成事实 | 恢复点 |
|---|---|---|---|---|
| Gate 0 | P3-Q001 至 P3-Q050 与四张卡的边界、分支映射 | `complete` | 四张概念覆盖账本和 50 题逐题映射已写入审计；47 题 `confirmed`、3 题 `needs-review`、无阻断；不需要拆卡 | 已冻结；后续仅在新教材证据出现时复核 3 个风险题 |
| 计划 1 | `p3-gerund-meanings`，Q024-Q044 | `verified` | 完成概念优先教学稿、7 个新版分支、21 题精细映射、独立练习与迁移；保留 Q024 的 `needs-review` 标记 | 若补齐 PDF 证据，复核 Q024，不重写已接受结构 |
| 计划 2 | `p3-active-participles`，Q001-Q015 | `verified` | 完成 6 个新版分支、15 题精细映射、主动/被动边界和新版思维导图；保留 Q011 的 `needs-review` 标记 | 若补齐语境证据，复核 Q011，不改变卡片 ID |
| 计划 3 | `p3-passive-participles`，Q016-Q023 | `verified` | 完成 7 个新版分支、8 题精细映射、施受关系与长短形式边界；保留 Q022 的 `needs-review` 标记 | 若补齐教材证据，复核 Q022，不改变卡片 ID |
| 计划 4 | P3 四卡、50 题、数据与页面验收 | `verified` | 自动检查 24/24 通过；浏览器 8/8 通过，覆盖 1280/390、四卡入口、代表题和全部 50 题往返；修复虚拟题库返回定位 | 下次仅在教学结构、数据契约、思维导图/CSS 或教材边界发生变化时重新验收 |

## 已知基线

- 四张稳定卡片 ID 为 `p3-active-participles`、`p3-passive-participles`、`p3-gerund-meanings`、`p3-gerund-subject`，不得删除、换号或复用。
- 现有粗映射的题数为 15、8、21、6，合计 50；它还不是“题目能跳到准确讲解分支”的精细映射。
- `p3-gerund-subject` 是已接受的第二版显示与交互样板；其余三张卡现已按同一结构升级为第二版 `teachingNarrative`。四张卡均保留题目、来源和旧记录，并以独立的 `teachingV2` 保存新版教学练习记录。
- 当前逐题解析 profile 只保证 `answerAnalysis`，尚不能代表概念目录、完整卡片和题目映射的生产顺序；不能直接拿来批量生成知识卡。

## 风险与处理原则

| 事项 | 当前处理 |
|---|---|
| 一题可能触及多个语法点 | 只指定一个主要卡片和主要分支；必要补看可链接到其他分支，但不复制题目或成绩。 |
| 一张卡知识范围过宽 | 先在原卡 ID 内按知识逻辑分支；只有仍无法独立学习时，才单独提出兼容拆分方案。 |
| 题目答案或来源有争议 | 如实标为 `needs-review`，保留现行题面和答案，不把题目局部结论扩大成规则。 |
| 新版练习记录 | 只新增稳定的新版子记录，不覆盖原题作答、错题或旧卡练习记录。 |
| 思维导图和 CSS | 统一通过 `ReaderMindMap.renderRetrievalMap(...)` 和当前 Reader 知识卡 CSS 渲染，不复制旧方格导图。 |

## 本阶段将产生的证据

- `docs/READER_B2_P3_MAPPING_AUDIT.md`：四张卡的概念覆盖账本、相邻边界与 50 题逐题映射审计，已完成。
- 三张卡的概念优先教学稿、接入后的 `teachingNarrative` 与导航 `teachingMapping`。
- `docs/READER_B2_P3_KNOWLEDGE_CARDS_ACCEPTANCE.md`：最终数据、页面和学习闭环验收。

## 最后更新

2026-09-06：完成 Gate 0、计划 1、计划 2、计划 3 和计划 4。四张卡已接入并通过自动与浏览器验收；当前保留 Q011、Q022、Q024 三项 `needs-review`，不阻断使用。
