# 02 Agent Roles

## 全局规则

每个 Agent 只负责一个问题域。除非 dispatch prompt 明确授权，否则不得扩展到其他角色。

---

## Agent A: 真实例句匹配器 (Source Example Matcher)

**目标:** 将词汇条目匹配到密封俄语原文中的真实例句。

**输入:**
- `章节/` 下的密封章节文件
- `原始OCR/`（仅用于验证）
- dispatch prompt 指定的外部词汇数据

**允许输出:**
- `_data/source_examples/*.json`
- `_data/source_examples/*.md`

**必须行为:**
- 在每个例句中高亮标记匹配的词形
- 保留词元、匹配词形、源文件、页码、标题
- 区分高置信度匹配和需审核匹配
- 默认使用精确匹配；形态扩展匹配必须标注方法

**禁止行为:**
- 不得修改 `章节/*.md`
- 不得将子串匹配或粗糙词干匹配提升为高置信度

---

## Agent B: 中文翻译构建器 (Chinese Translation Builder)

**目标:** 为俄语原文生成中文翻译草稿。

**输入:**
- 密封俄语章节文件
- 质量报告和页面注释

**允许输出:**
- `翻译版/*.md`
- `翻译版/术语表*.md`

**必须行为:**
- 保持俄语原文和中文翻译段落级对齐
- 保留源页面元数据
- 标记不确定的名称、引用和 OCR 风险段落

**禁止行为:**
- 不得将中文翻译混入密封俄语章节
- 不得删除或压缩俄语原文

---

## Agent C: Obsidian 卡片构建器 (Obsidian Card Builder)

**目标:** 将书籍内容和衍生输出转换为 Obsidian 学习卡片。

**输入:**
- 密封俄语原文
- Agent A 例句匹配
- Agent B 翻译
- 项目标签约定

**允许输出:**
- `卡片草稿/词汇卡/*.md`
- `卡片草稿/语法卡/*.md`
- `卡片草稿/任务卡/*.md`
- `卡片草稿/主题卡/*.md`

**必须行为:**
- 每张卡片必须有源链接
- 分离原文、翻译和生成注释
- 每张卡片服务于一个明确的学习动作

---

## Agent D: 质量门审核员 (Quality Gate Reviewer)

**目标:** 验证 Agent A/B/C/E 的输出并给出集成建议。

**输入:**
- 所有相关生成产物
- harness 文件
- 验证脚本

**允许输出:**
- `_data/checks/*.md`
- `质量报告/*.md`

**必须行为:**
- 分类为 PASS / REVIEW / FAIL
- 检查只读区域完整性
- 采取红队审核立场

---

## Agent E: 学习单元构建器 (Learning Unit Builder)

**目标:** 为每个文本/任务构建一个完整的学习单元。

**输入:**
- 密封俄语章节
- Agent B 对齐翻译
- Agent A 例句匹配
- Agent C 卡片
- `10-learning-unit-standard.md`（阅读模块）
- `11-writing-speaking-unit-standard.md`（写作/口语/听力模块）

**允许输出:**
- `学习单元/*.md`
- `学习单元/_reports/*.md`

**必须行为:**
- 每个文本/任务一个 Markdown 文件
- 包含完整的原书任务和练习
- 语法模块参考语法格式单独处理
- 标记缺失翻译、OCR 不确定性

---

## 模块 → Profile 映射

| 模块 | Agent E 使用标准 | 说明 |
|------|-----------------|------|
| 阅读 | `10-learning-unit-standard.md` | 文章中心，含选择题、激活练习 |
| 写作 | `11-writing-speaking-unit-standard.md` | 任务中心，含范文框架 |
| 会话 | `11-writing-speaking-unit-standard.md` | 对话/独白/辩论模板 |
| 听力 | `11-writing-speaking-unit-standard.md` | 听力原文 + 理解任务 |
| 语法词汇 | 待定 | 参考语法书格式 |
| 真题套卷 | 按题型混合 | 各部分使用对应 profile |
