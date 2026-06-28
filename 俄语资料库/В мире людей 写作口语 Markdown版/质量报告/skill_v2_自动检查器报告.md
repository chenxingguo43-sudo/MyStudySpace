# Skill v2 自动检查器报告

日期：2026-06-21

## 1. 本次新增能力

已在 Codex skill 中新增学习单元自动检查器：

`C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\scripts\validate_learning_units.py`

用途：

- 检查学习单元是否缺少标准 source page wikilinks。
- 检查主题学习单元是否缺少 13 个必备章节。
- 检查 `> [!note] 原书内容` 区域是否出现高风险答案污染模式。

## 2. 已接入的 skill 文件

已更新：

- `C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\SKILL.md`
- `C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\references\acceptance-checklist.md`
- `C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\references\claude-dispatch-prompts.md`

新增规则：

- 每批学习单元验收前运行 `validate_learning_units.py`。
- 出现 `possible_answer_pollution_in_original_content` 时，批次 verdict 应为 `REVIEW`。
- 已完成配对、参考答案、范文、解析、翻译不得放入 `原书内容`。

## 3. 回归测试发现的问题

脚本首次回归测试时发现一个真实漏网问题：

文件：

`学习单元/Тема 3.2 — Работа и отдых.md`

问题：

- p149 的同义词配对表仍在 `原书内容` 区域。
- p149 的反义词配对表仍在 `原书内容` 区域。

修复：

- `原书内容` 中改为保留待配对题面。
- 已完成同义词/反义词配对移动到 `参考配对（学习辅助，needs_review）`。
- 动词体练习保留在 `原书内容` 区域。

## 4. 最终验证

运行：

```powershell
$env:PYTHONUTF8='1'
python 'C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\scripts\validate_learning_units.py' 'D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版' --pattern 'Тема *.md'
```

结果：

```text
files_checked=19
findings_count=0
PASS
```

OCR 底座验证：

```text
declared_page_count=292
page_files=292
missing_pages=[]
extra_pages=[]
PASS
```

## 5. 结论

**verdict: PASS**

Skill v2 的第一项自动化能力已经落地：答案污染检测与学习单元结构检查可用于后续书籍项目。当前《В мире людей 写作口语 Markdown版》的 19 个主题学习单元已通过该检查器。

## 6. 下一批自动规划器

新增：

`C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\scripts\plan_next_batch.py`

用途：

- 读取项目根目录状态。
- 判断当前阶段：
  - `needs_source_base`
  - `needs_range_map`
  - `needs_learning_units`
  - `needs_finalization`
  - `sealed`
- 统计范围地图中的主题数、已生成主题单元数、缺失主题。
- 检查封板文件是否存在。
- 输出下一步建议和推荐验证命令。

在当前封板项目上的结果：

```text
Stage: sealed
Expected topics: 19
Topic units found: 19
Next action: 项目已封板；下一步可做答案区逐题整理、中文精译、词库例句匹配或卡片化。
```

在临时未完成项目上的回归测试：

```text
Stage: needs_learning_units
Expected topics: 1
Topic units found: 0
Missing Topics:
- Тема 1.1 — Test Topic
Next action: 继续生成 Раздел 1 的学习单元。
```

已同步更新 skill 主说明：

- `SKILL.md` 已加入 `plan_next_batch.py` 工作流和资源说明。
