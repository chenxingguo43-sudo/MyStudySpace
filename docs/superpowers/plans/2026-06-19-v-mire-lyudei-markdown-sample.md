# В мире людей Reading Markdown Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-10 page Obsidian sample library for `В мире людей 阅读口语` that demonstrates the final cleaned reading style, traceability, and OCR quality reporting before full-book processing.

**Architecture:** The sample keeps three layers: cleaned reading Markdown, raw OCR/page-image traceability, and a quality report. A small selector script chooses candidate pages from existing OCR metrics, then the sample files are assembled under the Obsidian-style library folder.

**Tech Stack:** PowerShell, Python 3, Markdown, existing OCR outputs in `D:\MyStudySpace\俄语资料整理试验区\_ocr\v_mire_lyudei_reading_speaking_full`, Obsidian vault files under `D:\MyStudySpace\俄语资料库`.

---

## Files And Responsibilities

- Create: `D:\MyStudySpace\俄语资料整理试验区\_data\select_v_mire_sample_pages.py`
  - Reads `full_ocr_summary.json` and page OCR text.
  - Scores contiguous 5-10 page windows.
  - Outputs recommended sample windows with quality metrics and short previews.
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\章节\样章.md`
  - Cleaned reading sample organized by article/topic, not by hard page cuts.
  - Uses Russian paragraph + Chinese translation alternation.
  - Keeps exercises in collapsible callouts.
  - Includes page trace links to raw OCR pages.
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\原始OCR\page_XXX.md`
  - One raw OCR page file per sample page.
  - Links to the source OCR text and page image.
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\质量报告\样章质量报告.md`
  - Lists OCR uncertainty, manual corrections, and unresolved issues.
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\索引\样章索引.md`
  - Links sample sections, raw pages, and quality report.
- Create: `D:\MyStudySpace\俄语资料整理试验区\_data\validate_v_mire_sample_library.py`
  - Verifies required files, links, page references, and expected Markdown patterns.

---

### Task 1: Select Sample Pages

**Files:**
- Create: `D:\MyStudySpace\俄语资料整理试验区\_data\select_v_mire_sample_pages.py`

- [ ] **Step 1: Inspect summary JSON shape**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'
@'
import json
from pathlib import Path
p = Path(r"D:\MyStudySpace\俄语资料整理试验区\_ocr\v_mire_lyudei_reading_speaking_full\full_ocr_summary.json")
data = json.loads(p.read_text(encoding="utf-8"))
print(type(data))
if isinstance(data, dict):
    print(data.keys())
    first = next(iter(data.values())) if data else None
else:
    first = data[0]
print(first)
'@ | python -
```

Expected: prints the JSON top-level shape and one page summary record.

- [ ] **Step 2: Create selector script**

Write `select_v_mire_sample_pages.py` with this behavior:

```python
import json
import re
from pathlib import Path

ROOT = Path(r"D:\MyStudySpace\俄语资料整理试验区\_ocr\v_mire_lyudei_reading_speaking_full")
SUMMARY = ROOT / "full_ocr_summary.json"
TEXT_DIR = ROOT / "text"

def load_pages():
    raw = json.loads(SUMMARY.read_text(encoding="utf-8"))
    pages = raw.get("pages", raw) if isinstance(raw, dict) else raw
    normalized = []
    for item in pages:
        page = int(item.get("page", item.get("page_num", item.get("page_number"))))
        text_path = TEXT_DIR / f"page_{page:03d}.txt"
        text = text_path.read_text(encoding="utf-8", errors="replace") if text_path.exists() else ""
        cyr = len(re.findall(r"[А-Яа-яЁё]", text))
        han = len(re.findall(r"[\u4e00-\u9fff]", text))
        normalized.append({
            "page": page,
            "quality_class": item.get("quality_class") or item.get("class") or item.get("quality") or "",
            "score": int(item.get("score", item.get("quality_score", 0))),
            "chars": len(text),
            "cyr": cyr,
            "han": han,
            "text": text,
        })
    return sorted(normalized, key=lambda x: x["page"])

def window_score(window):
    good = sum(1 for p in window if p["quality_class"] == "good")
    review = sum(1 for p in window if p["quality_class"] == "needs_review")
    poor = sum(1 for p in window if p["quality_class"] == "poor")
    avg_score = sum(p["score"] for p in window) / len(window)
    avg_chars = sum(p["chars"] for p in window) / len(window)
    bilingual = sum(1 for p in window if p["cyr"] > 500 and p["han"] > 20)
    return avg_score + good * 4 + bilingual * 5 - review * 2 - poor * 12 + min(avg_chars / 400, 8)

def preview(text):
    compact = " ".join(text.split())
    return compact[:260]

def main():
    pages = load_pages()
    candidates = []
    for size in range(5, 11):
        for i in range(0, len(pages) - size + 1):
            window = pages[i:i+size]
            if any(p["quality_class"] == "poor" for p in window):
                continue
            candidates.append((window_score(window), window))
    candidates.sort(key=lambda x: x[0], reverse=True)
    for rank, (score, window) in enumerate(candidates[:10], 1):
        print(f"\n#{rank} score={score:.1f} pages={window[0]['page']:03d}-{window[-1]['page']:03d}")
        print("classes=" + ", ".join(f"{p['page']:03d}:{p['quality_class']}:{p['score']}" for p in window))
        print("preview=" + preview("\\n".join(p["text"] for p in window)))

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run selector**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'
python "D:\MyStudySpace\俄语资料整理试验区\_data\select_v_mire_sample_pages.py"
```

Expected: top 10 candidate windows are printed with page ranges, quality classes, scores, and previews.

- [ ] **Step 4: Choose one sample window**

Pick the highest-ranked window that also looks like coherent reading material rather than mostly title pages, indexes, or answer keys. Record the selected page range in the implementation notes before creating files.

---

### Task 2: Create Raw OCR Traceability Files

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\原始OCR\page_XXX.md`

- [ ] **Step 1: Create target directories**

Run:

```powershell
New-Item -ItemType Directory -Force -LiteralPath "D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\章节" | Out-Null
New-Item -ItemType Directory -Force -LiteralPath "D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\原始OCR" | Out-Null
New-Item -ItemType Directory -Force -LiteralPath "D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\质量报告" | Out-Null
New-Item -ItemType Directory -Force -LiteralPath "D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\索引" | Out-Null
```

- [ ] **Step 2: Generate one raw OCR Markdown file per sample page**

For each selected page `XXX`, create:

```markdown
---
title: "В мире людей 阅读口语 OCR page XXX"
type: "raw-ocr-page"
book: "В мире людей 阅读口语"
page: XXX
tags:
  - 俄语/阅读
  - OCR/原始
---

# OCR page XXX

来源图片：`D:\MyStudySpace\俄语资料整理试验区\_ocr\v_mire_lyudei_reading_speaking_full\images\page_XXX.png`

来源预处理图片：`D:\MyStudySpace\俄语资料整理试验区\_ocr\v_mire_lyudei_reading_speaking_full\images\page_XXX_prep.png`

```ocr
[paste exact raw OCR text from text/page_XXX.txt]
```
```

Expected: raw OCR layer preserves exact OCR text without cleanup.

---

### Task 3: Draft Cleaned Reading Sample

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\章节\样章.md`

- [ ] **Step 1: Create sample frontmatter and navigation**

Start `样章.md` with:

```markdown
---
title: "样章"
type: "chapter-sample"
book: "В мире людей 阅读口语"
source_ocr_pages: "PPP-QQQ"
tags:
  - 俄语/阅读
  - 教材/Markdown版
  - OCR/样章
---

# 样章

[[В мире людей 阅读口语 Markdown版/索引/样章索引|返回样章索引]]

%% source pages: PPP-QQQ %%

## 样章地图

- [[#阅读正文]]
- [[#练习区]]
- [[#OCR 质量提示]]
```

Replace `PPP-QQQ` with the selected page range.

- [ ] **Step 2: Build reading body**

For each coherent Russian paragraph and its Chinese translation, use:

```markdown
## 阅读正文

### [article or topic title] ^vm-sample-001

%% pages: XXX-YYY; raw: [[В мире людей 阅读口语 Markdown版/原始OCR/page_XXX|page XXX]] %%

Russian paragraph cleaned conservatively.

> Chinese translation faithful to the original book, only OCR cleanup applied.
```

Rules:
- Preserve the original meaning.
- Join OCR-broken lines into paragraphs.
- Remove page headers, footers, repeated page numbers, and scanning noise.
- Do not modernize or embellish Chinese translation.
- If Russian correction is inferred rather than obvious, add an entry in the quality report.

- [ ] **Step 3: Move exercises into collapsible blocks**

Use Obsidian callouts:

```markdown
> [!example]- 练习 / 任务（原书第 XXX 页）
> Вставить очищенную формулировку задания с выбранной страницы.
>
> | 项目 | 内容 |
> |---|---|
> | 原书任务 | 保留原书任务说明，清理 OCR 断行和噪音 |
```

Expected: exercises are preserved but do not interrupt the reading flow.

- [ ] **Step 4: Add local OCR quality hint section**

At the end of `样章.md`, add:

```markdown
## OCR 质量提示

完整校对记录见：[[В мире людей 阅读口语 Markdown版/质量报告/样章质量报告]]
```

---

### Task 4: Write Sample Quality Report

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\质量报告\样章质量报告.md`

- [ ] **Step 1: Create report skeleton**

```markdown
---
title: "样章质量报告"
type: "ocr-quality-report"
book: "В мире людей 阅读口语"
source_ocr_pages: "PPP-QQQ"
tags:
  - OCR/质量报告
  - 俄语/阅读
---

# 样章质量报告

[[В мире людей 阅读口语 Markdown版/章节/样章|返回样章]]

## 总体判断

- 样章页码：PPP-QQQ
- 阅读正文清洗状态：
- 练习区清洗状态：
- 主要风险：

## 页级记录

| 页码 | OCR 等级 | 处理结果 | 可疑点 |
|---|---|---|---|
| XXX | good/needs_review | 已清洗 | 未发现明显问题，或填写具体 OCR 疑点 |

## 推断性修正

| 位置 | 清洗后文本 | 原 OCR 片段 | 说明 |
|---|---|---|---|
| 样章 §阅读正文 | 清洗后的俄文或中文片段 | 原 OCR 中的可疑片段 | 说明为何这样修正 |

## 未解决问题

- 如果没有未解决问题，写：未发现影响样章阅读的未解决问题。
```

- [ ] **Step 2: Fill the report while cleaning**

For every inferred Russian correction, broken bilingual alignment, or uncertain table reconstruction, add a row. If no issue exists for a page, explicitly write `未发现明显问题`.

---

### Task 5: Create Sample Index

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版\索引\样章索引.md`

- [ ] **Step 1: Create index**

```markdown
---
title: "样章索引"
type: "index"
book: "В мире людей 阅读口语"
tags:
  - 俄语/阅读
  - 索引
---

# 样章索引

## 阅读入口

- [[В мире людей 阅读口语 Markdown版/章节/样章|样章]]

## 原始 OCR

- [[В мире людей 阅读口语 Markdown版/原始OCR/page_XXX|page XXX]]

## 质量报告

- [[В мире людей 阅读口语 Markdown版/质量报告/样章质量报告|样章质量报告]]

## 样章段落

| 段落 | 来源页 | 原始 OCR |
|---|---|---|
| [[В мире людей 阅读口语 Markdown版/章节/样章#^vm-sample-001|样章第一段]] | XXX | [[В мире людей 阅读口语 Markdown版/原始OCR/page_XXX|page XXX]] |
```

Expected: user can open this index and navigate to every sample artifact.

---

### Task 6: Validate Sample Library

**Files:**
- Create: `D:\MyStudySpace\俄语资料整理试验区\_data\validate_v_mire_sample_library.py`

- [ ] **Step 1: Create validator script**

```python
from pathlib import Path
import re

ROOT = Path(r"D:\MyStudySpace\俄语资料库\В мире людей 阅读口语 Markdown版")

REQUIRED = [
    ROOT / "章节" / "样章.md",
    ROOT / "质量报告" / "样章质量报告.md",
    ROOT / "索引" / "样章索引.md",
]

def fail(message):
    raise SystemExit(f"FAIL: {message}")

def main():
    for path in REQUIRED:
        if not path.exists():
            fail(f"missing required file: {path}")

    sample = (ROOT / "章节" / "样章.md").read_text(encoding="utf-8")
    index = (ROOT / "索引" / "样章索引.md").read_text(encoding="utf-8")
    report = (ROOT / "质量报告" / "样章质量报告.md").read_text(encoding="utf-8")

    if "## 阅读正文" not in sample:
        fail("sample missing reading body")
    if "> [!example]-" not in sample:
        fail("sample missing collapsible exercise block")
    if not re.search(r"\^vm-sample-\d+", sample):
        fail("sample missing block ids")
    if "原始OCR/page_" not in sample and "原始OCR\\page_" not in sample:
        fail("sample missing raw OCR trace links")
    if "推断性修正" not in report:
        fail("quality report missing inferred-correction section")
    if "样章段落" not in index:
        fail("index missing paragraph table")

    raw_files = list((ROOT / "原始OCR").glob("page_*.md"))
    if len(raw_files) < 5:
        fail("expected at least 5 raw OCR page files")

    print("PASS: sample library structure is valid")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run validator**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'
python "D:\MyStudySpace\俄语资料整理试验区\_data\validate_v_mire_sample_library.py"
```

Expected before all files are complete: `FAIL` naming the missing or incomplete artifact.
Expected after implementation: `PASS: sample library structure is valid`.

---

### Task 7: Final Review

**Files:**
- Read: all created sample library files.

- [ ] **Step 1: Open sample in Obsidian-compatible paths**

Check that links use Obsidian wiki-link format and point to existing files.

- [ ] **Step 2: Verify user success criteria**

Confirm:
- Reading flow is article/topic based, not hard page chunks.
- Russian paragraphs and Chinese translations alternate.
- Exercises are preserved in collapsible blocks.
- OCR doubts are in `样章质量报告.md`, not scattered through main text.
- Each section can trace back to raw OCR page files.
- At least 5 pages and at most 10 pages are represented.

- [ ] **Step 3: Report outcome**

Summarize:
- selected page range,
- what the sample contains,
- how to open it,
- remaining OCR risks,
- whether it is ready for user reading review.
