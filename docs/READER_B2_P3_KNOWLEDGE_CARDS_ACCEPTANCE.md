# B2 P3 知识点卡片最终验收记录

验收日期：2026-09-07（执行批次：2026-09-06）  
对应实施文档：[READER_B2_P3_KNOWLEDGE_CARDS_1234_IMPLEMENTATION.md](READER_B2_P3_KNOWLEDGE_CARDS_1234_IMPLEMENTATION.md)  
对应实时记录：[READER_B2_P3_KNOWLEDGE_CARDS_LIVE_STATUS.md](READER_B2_P3_KNOWLEDGE_CARDS_LIVE_STATUS.md)

## 结论

P3“形动词与副动词”的四张知识点卡片、50 道题的分支级映射和 Reader 页面闭环已完成，状态为 `Plan 4 verified with qualified acceptance`。

“合格”中的限定是：P3-Q011、P3-Q022、P3-Q024 仍保留 `needs-review`。三题已有可用的主要卡片和讲解分支，不阻断学习流程；在补齐教材 PDF/原页证据前，不把题目答案扩大成无条件的一般规则。

## 交付范围

| 卡片 | 原题范围 | 新版分支 | 映射题数 | 教学状态 |
|---|---:|---:|---:|---|
| `p3-active-participles` 主动形动词的一致 | Q001–Q015 | 6 | 15 | `accepted` |
| `p3-passive-participles` 被动形动词的一致 | Q016–Q023 | 7 | 8 | `accepted` |
| `p3-gerund-meanings` 副动词的时间、条件、原因与让步 | Q024–Q044 | 7 | 21 | `accepted` |
| `p3-gerund-subject` 副动词的主体一致 | Q045–Q050 | 9 | 6 | `accepted-pilot` |
| **合计** | **Q001–Q050** | **29** | **50** | **全部已接入** |

每道题在 `part-study-navigation.json` 中有唯一主要卡片和主要分支；必要的跨卡关联只作为 `also`/补看入口，不复制题目，也不创建第二份成绩。

## 映射审计

审计文件：[READER_B2_P3_MAPPING_AUDIT.md](READER_B2_P3_MAPPING_AUDIT.md)

- P3 题目集合精确为 `P3-Q001` 至 `P3-Q050`。
- 50/50 题均有唯一主要归属和有效主要分支。
- `confirmed`：47 题。
- `needs-review`：3 题（Q011、Q022、Q024）。
- `blocked`：0 题。
- 不需要拆分稳定卡片 ID；原四个 ID 继续作为兼容入口。

三项风险的处理分别是：Q011 不把 `предусмотревший` 排他地写成唯一语境；Q022 保留教材答案但说明主动反身关系与被动选项并非严格等价；Q024 保留题面/OCR 待复核提示，不把“修订题面”冒充无争议原文。

## 教学结构

四张卡均使用第二版 `teachingNarrative`，并以概念优先为骨架：

1. 先提出整张卡要解决的判断问题，再给快速对照和决策步骤。
2. 通过新版 retrieval 思维导图进入每个完整分支；分支包含识别、规则、例句和易错陷阱。
3. 每个分支有独立检查、针对性反馈、换境重试；卡片隐藏正式题后仍然是一节完整课程。
4. 正式题只作为卡片之后的练习，题目特有的选项争议留在逐题 `answerAnalysis`，不反过来定义整个知识点。
5. 综合迁移任务和来源证据保留在卡片内；旧 `lessons`、`checks`、原题和历史记录进入兼容区。

新版练习记录使用稳定键 `teachingV2`，与原题作答、错题记录和旧卡练习记录分开保存。没有改动卡片 ID、题号、题面、答案、来源或既有学习记录。

## 思维导图与 CSS

- 思维导图统一调用 `ReaderMindMap.renderRetrievalMap(...)`，不再复制旧版中心方框/九宫格实现。
- 当前样式为左侧圆形起点、彩色曲线、分支圆点、四行摘要和可点击分支；四张卡与《В мире людей》共用同一渲染契约。
- B2 页面使用现有 Reader 知识卡 CSS，并由 `css/b2-study-teaching.css` 提供局部布局；手机只允许导图内部横向滚动，页面本身无横向溢出。

## 数据与生成链

权威源仍位于：

`俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/`

生成结果位于：

`data/textbook/russian_b2/study-cards/`

导航映射位于：

`俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-study-navigation.json`

本轮同时修复了六部分生成器会覆盖 Reader 专用 `answerAnalysis` 的问题：`build-six-part-book.js` 现在保留已有解析，并通过 `scripts/russian-b2/restore-pipeline-analyses.js` 恢复了 330 道题的解析数据。该修复避免以后重新生成章节时把逐题解析静默擦掉。

## 自动检查

本次相关检查全部通过：

```text
node --test tests/russian-b2/study-teaching.test.js
node --test tests/russian-b2/study-cards.test.js
node --test tests/russian-b2/grammar-content-integrity.test.js
node --test tests/reader-mind-map.test.js
node --test tests/reader-b2-grammar-pipeline.test.js
```

合计 24/24 项通过，覆盖卡片结构、50 题映射、来源与答案完整性、思维导图渲染以及生成管线契约。

## 浏览器验收

测试文件：[tests/reader-b2-study-teaching.spec.js](../tests/reader-b2-study-teaching.spec.js)

```text
npx playwright test tests/reader-b2-study-teaching.spec.js
```

8/8 项通过，覆盖：

- 1280×844 和 390×844 两种尺寸；
- 从 P3 目录进入四张卡；
- 每张卡进入自己的新版教学页和代表分支；
- 正式题默认折叠、展开后显示题目和解析；
- 全部 50 道题逐题进入映射分支并返回原题列表；
- 返回后原题成绩、作答记录和卡片 `teachingV2` 记录不丢失；
- 导图分支跳转和返回目录/返回原题；
- 页面没有横向溢出，旧版中心方框导图没有重新出现。

验收中发现并修复的页面问题是虚拟题库返回定位：返回时题目详情可能已经展开，真实行高高于默认估算，旧时序会在恢复目标题后又按估算高度重建窗口，导致 Q008 等题暂时被替换出 DOM。现在虚拟题目返回会先锁定目标，再允许窗口调度，50 题往返测试已通过。

## 非本次阻断项

仓库宽范围的旧基线测试仍有与本次 P3 无关的失败，主要是内容清单尚未重建、旧静态断言仍期待已替换的运行层名称，以及既有 Zlatoust 静态样例的定位假设。这些没有出现在本次 P3 专项测试或浏览器验收中，也没有为了通过旧断言回退当前 Reader 架构。后续若要提交整仓库基线，应单独按当前架构重建清单并更新对应旧测试。

## 重新验收条件

以下变化会使本次验收失效，需要重新执行相关阶段：

- 四张卡的教学结构、分支 ID、数据契约或 `teachingV2` 键改变；
- 思维导图公共渲染器或知识卡 CSS 改变；
- P3 题面、答案、来源或 50 题映射边界改变；
- 生成器再次改变卡片或 `answerAnalysis` 的保存行为；
- 补齐 Q011、Q022、Q024 的教材证据并决定修改教学边界。

仅修正文案拼写而不改变教学结构、证据来源、数据契约或显示行为，不自动使本次验收失效。
