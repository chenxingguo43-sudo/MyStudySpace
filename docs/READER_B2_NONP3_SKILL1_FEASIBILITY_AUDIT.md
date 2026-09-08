# B2 P1/P2/P4/P5/P6 使用优化版 skill1 的可行性审计

日期：2026-09-07

## 结论

**当前不能直接用现有生产命令完成这 30 张卡的 P3 同级升级。**

原因不是 `reader-knowledge-teacher` 不能写这些主题，而是现有生产链仍把旧版富知识卡当作“已完成”，并且卡片契约没有强制 P3 新版的概念优先、邻卡边界、分支映射和 exercise-removal（隐藏正式题后仍是一节完整课程）门槛。

在补齐一个专用知识卡 profile/契约、完成一个 P1 试点并通过独立审查后，**可以复用优化版 skill1 批量完成 P1、P2、P4、P5、P6**。建议顺序为 P1 → P2 → P4 → P5 → P6；P6 的语境材料和公文格式应放在高风险批次单独审查。

## 盘点结果

| 部分 | 目标卡片数 | 当前带 `teachingNarrative` 的卡片 | 当前状态 |
|---|---:|---:|---|
| P1 | 6 | 0 | 旧版富知识卡 |
| P2 | 8 | 0 | 旧版富知识卡 |
| P3 | 4 | 4 | 已接受的 v2 样板 |
| P4 | 6 | 0 | 旧版富知识卡 |
| P5 | 6 | 0 | 旧版富知识卡 |
| P6 | 4 | 0 | 旧版富知识卡 |
| **P1/P2/P4/P5/P6 合计** | **30** | **0** | **尚未进入 v2 升级批次** |

当前 30 张目标卡仍有 `overview`、`rules`、4 个例句、3 个检查和 4 个旧版 `lessons`，因此通过旧版结构测试；这不等于已经通过 P3 的概念覆盖和迁移教学门槛。

## 运行层证据

### 1. 现有生产状态不会重新生成旧卡

已运行：

```powershell
node scripts/reader-production.js plan russian-b2-grammar --config config/reader-production.codex.example.json --preset codex-luna-sol-b2-grammar
node scripts/reader-book-pipeline.js verify russian-b2-grammar
```

结果：

- 364 个任务全部为 `completed`；
- 其中 34 个知识卡任务也全部为 `completed`；
- `actionable: 0`，因此 `run` 不会领取 P1/P2/P4/P5/P6 卡片；
- 底层 `verify` 返回通过，是因为它验证的是当前旧版卡片契约。

### 2. “已接受”判断仍是旧契约

`b2CardIsAccepted()` 和 `validateAnalysis()` 目前只要求：

- ID、部分 ID、题号完全一致；
- `reviewStatus = approved`；
- `overview`、`rules`、`lessons` 存在；
- 4–6 个例句、3–5 个检查；
- 例句和来源有基本标签。

它们没有要求：

- `teachingNarrative.version = 2` 和稳定 `progressKey`；
- 概念覆盖账本（核心概念、必要分支、限制、修复/产出用途）；
- 明确的 `neighboringScope` 和 handoff；
- 每个必要分支的练习、诊断反馈和换境重试；
- formal exercises 隐藏后的完整独立课程；
- 题目到分支的唯一主要映射。

### 3. 现有输入不足以支撑概念优先生成

知识卡任务输入目前主要提供知识点标题、简短规则、简短易错点和关联题目。它没有把 P3 审计所使用的完整来源账本、邻卡边界和风险记录作为受保护输入传给生成器。因此即便直接调用 skill1，也可能退化成“按题目总结一张旧卡”。

### 4. 适配器的卡片输出仍是宽松字符串

`reader-codex-adapter.js` 对 `studyCard` 使用 JSON 字符串承载，宿主只做旧版字段验证。提示词虽要求 `overview/rules/examples/checks/lessons/sources`，但没有把 P3 v2 的 narrative 分支结构放进可验证契约。

## 可以复用的部分

- `reader-knowledge-teacher` 的概念先行工作流和质量门槛；
- P3 四张卡的 `teachingNarrative v2` 数据形状、思维导图和 `teachingV2` 记录键；
- 现有题目、答案、来源、旧 lessons、旧检查和历史学习记录；
- `reader-production.js` 的领取、生成、独立审查、修复、阻断、事务式接入和测试流程；
- P3 已通过的 Reader 页面入口、分支跳转和移动端检查方法。

## 在批量生成前必须补的门槛

1. 增加专用知识卡 profile 或 profile 模式，明确目标部分和新版接受条件；不要继续用“旧卡已 approved”作为完成判断。
2. 为 P1/P2/P4/P5/P6 建立概念覆盖账本和邻卡边界，并把它们写入知识卡任务输入。
3. 扩展卡片验证：要求 v2 narrative、稳定进度键、完整分支、映射、邻卡交接、迁移任务和来源标注；保留旧题号、答案、题面和学习记录。
4. 增加“隐藏正式题仍完整”的确定性检查，并让独立 reviewer 按 skill1 的语义门槛复核。
5. 先做一个 P1 小批试点（建议 1–2 张卡），完成桌面/手机 Reader 检查和学习者接受；通过后再按 P1 → P2 → P4 → P5 → P6 批量推进。
6. 批量运行前让状态刷新把这 30 张旧卡标为 `pending`，P3 四张保持 `completed`；不能直接覆盖已接受 P3 卡片。

## 最终判断

| 问题 | 判断 |
|---|---|
| 优化版 skill1 能否讲解 P1/P2/P4/P5/P6 的知识点？ | **能**。这些部分已有题目、规则、来源和旧卡，可作为受保护证据。 |
| 现有 `reader-production` 命令能否现在直接生成同等级 v2 卡片？ | **不能**。当前状态无可领取任务，契约也不会检查 v2 质量。 |
| 是否值得继续做？ | **值得**。先补专用 profile/契约并做 P1 试点，成功后可批量复用。 |

