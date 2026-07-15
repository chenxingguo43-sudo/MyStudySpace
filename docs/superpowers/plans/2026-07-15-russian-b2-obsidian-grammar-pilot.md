# Russian B2 Obsidian Grammar Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and visually verify one real Obsidian grammar pilot containing book exercise 1–10, exact source-page links, locally extracted page images, and collapsed answer explanations.

**Architecture:** Keep the PDF as immutable evidence, extract only the six JPEG pages needed by the pilot, reconstruct questions in a cleaned-source note, and transclude those question sections into a quiz-first learning unit. A project-specific CSS class improves answer affordances without changing the rest of the vault; a validator enforces source mapping, question count, hidden answers, and local links.

**Tech Stack:** Obsidian Markdown, Obsidian callouts and wikilinks, Dataview, CSS snippets, Python 3, pypdf, Pillow, unittest.

---

## Scope and execution constraints

- Target vault: `D:\MyStudySpace\俄语资料库`
- Pilot root: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版`
- Immutable source: `E:\Desktop\俄语B2.pdf`
- Question pages: PDF 18–19, printed pages 15–16.
- Reference/explanation pages: PDF 24–27, printed pages 21–24.
- Pilot questions: 第二部分练习 1–10.
- Expected original answer vector: `В, В, Б, А, Г, Г, А, А, А, Б`.
- Do not modify `D:\MyStudySpace\俄语资料库\俄语B2 全模块 Markdown版`.
- Do not stage or commit the PDF or extracted JPEGs.
- The repository already contains unrelated staged files. Every commit must use explicit paths and `git commit --only` so their staged state is preserved.
- Execute inside the actual vault rather than a Git worktree because the acceptance gate depends on the vault’s installed theme, snippets, Page Preview, Dataview, and Russian Reading Assistant.

## File map

- Create `俄语资料库/俄语B2·原书复刻与学习版/README.md`: pilot entry and usage instructions.
- Create `俄语资料库/俄语B2·原书复刻与学习版/.gitignore`: keep local binary evidence out of ordinary Git commits while re-including scripts and tests.
- Create `俄语资料库/俄语B2·原书复刻与学习版/_automation/goal_state.json`: machine-readable pilot state.
- Create `俄语资料库/俄语B2·原书复刻与学习版/_data/source_manifest.json`: source hash and pilot-page manifest.
- Create `俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json`: exact question, answer, and explanation page mapping.
- Create `俄语资料库/俄语B2·原书复刻与学习版/scripts/extract_pilot_pages.py`: lossless JPEG extraction.
- Create `俄语资料库/俄语B2·原书复刻与学习版/scripts/build_pilot_page_notes.py`: page-wrapper generation.
- Create `俄语资料库/俄语B2·原书复刻与学习版/scripts/validate_pilot.py`: content and link gate.
- Create `俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py`: automated contract tests.
- Create `俄语资料库/俄语B2·原书复刻与学习版/页图/PDF-018.jpg`, `PDF-019.jpg`, `PDF-024.jpg`–`PDF-027.jpg`: local evidence images.
- Create matching `原书页/PDF-NNN.md` notes: full-page image, page metadata, navigation, and task links.
- Create `整理原文/语法词汇/02-名词与形容词接格-题1-10.md`: verified original questions and original reference material.
- Create `学习单元/语法词汇/02-名词与形容词接格-题1-10.md`: quiz-first pilot.
- Create `学习记录/语法进度.md`: Dataview progress dashboard.
- Create `质量报告/试制单元验收.md`: validator and visual-QA results.
- Create `俄语资料库/.obsidian/snippets/b2-quiz.css`: scoped quiz styles.

### Task 1: Scaffold the pilot with a failing contract test

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\.gitignore`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\README.md`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\_automation\goal_state.json`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\_data\source_manifest.json`

- [ ] **Step 1: Write the failing scaffold test**

```python
from pathlib import Path
import json
import unittest

ROOT = Path(r"D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版")


class PilotProjectTest(unittest.TestCase):
    def test_required_scaffold_exists(self):
        required = [
            "README.md", ".gitignore", "_automation/goal_state.json",
            "_data/source_manifest.json", "页图", "原书页", "原始OCR",
            "整理原文/语法词汇", "学习单元/语法词汇", "学习记录",
            "质量报告", "scripts", "tests",
        ]
        for relative in required:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_goal_state_is_pilot_only(self):
        state = json.loads((ROOT / "_automation/goal_state.json").read_text(encoding="utf-8"))
        self.assertEqual(state["project_root"], str(ROOT))
        self.assertEqual(state["stages"]["source_base"], "in_progress")
        self.assertEqual(state["stages"]["learning_units"], "pending")
        self.assertEqual(state["pilot"]["questions"], list(range(1, 11)))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
& 'C:\Users\梅子\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py' -v
```

Expected: `FAIL` because the project scaffold does not yet exist.

- [ ] **Step 3: Create the minimal scaffold**

Create `.gitignore` with exactly:

```gitignore
原书/*.pdf
页图/*.jpg
__pycache__/
*.pyc
!scripts/*.py
!tests/*.py
```

Create `_automation/goal_state.json` with:

```json
{
  "schema_version": "1.0",
  "project_root": "D:\\MyStudySpace\\俄语资料库\\俄语B2·原书复刻与学习版",
  "profile": "grammar-quiz",
  "goal": {
    "learning_units": true,
    "translation_layer": false,
    "cleaned_source_layer": true,
    "parallel_mode": "off"
  },
  "stages": {
    "source_base": "in_progress",
    "cleaned_source": "pending",
    "range_map": "pending",
    "learning_units": "pending",
    "translation_layer": "not_requested",
    "finalization": "pending"
  },
  "pilot": {
    "question_pages": [18, 19],
    "explanation_pages": [24, 25, 26, 27],
    "questions": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  "batches": [],
  "known_risks": [
    "The source is a scanned PDF and all OCR-derived text requires page-image verification."
  ],
  "last_validator_run": null
}
```

Create `_data/source_manifest.json` with:

```json
{
  "schema_version": "1.0",
  "project": "俄语B2·原书复刻与学习版",
  "source_pdf": "E:\\Desktop\\俄语B2.pdf",
  "pdf_pages": 190,
  "source_status": "unsealed_pilot",
  "sha256": "",
  "pilot_pdf_pages": [18, 19, 24, 25, 26, 27],
  "page_images": []
}
```

Create every required directory. README must state the immutable source path, six pilot pages, question range 1–10, and the sentence `本目录是试制项目，不代表整本书已经完成或封版。`.

- [ ] **Step 4: Run the test and verify it passes**

Expected: `2 tests ... OK`.

- [ ] **Step 5: Verify Python files are not blocked by the parent ignore rule**

Run:

```powershell
git check-ignore -v -- '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
```

Expected: the nested negation rule reports the test as re-included, or no ignore match is returned. If the parent `*.py` still wins, add explicit `!俄语B2·原书复刻与学习版/tests/*.py` and `!俄语B2·原书复刻与学习版/scripts/*.py` rules to `俄语资料库/.gitignore` only after inspecting its current contents.

- [ ] **Step 6: Commit only the scaffold**

```powershell
git add -- '俄语资料库/俄语B2·原书复刻与学习版/README.md' '俄语资料库/俄语B2·原书复刻与学习版/.gitignore' '俄语资料库/俄语B2·原书复刻与学习版/_automation/goal_state.json' '俄语资料库/俄语B2·原书复刻与学习版/_data/source_manifest.json' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
git commit --only -m 'feat: scaffold Russian B2 grammar pilot' -- '俄语资料库/俄语B2·原书复刻与学习版'
```

### Task 2: Extract and validate the six original JPEG pages

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\scripts\extract_pilot_pages.py`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\_data\source_manifest.json`
- Generate locally: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\页图\PDF-018.jpg`, `PDF-019.jpg`, `PDF-024.jpg`–`PDF-027.jpg`

- [ ] **Step 1: Extend the test with the image contract**

```python
from PIL import Image

    def test_pilot_jpegs_are_original_resolution(self):
        expected = [18, 19, 24, 25, 26, 27]
        for page in expected:
            path = ROOT / "页图" / f"PDF-{page:03}.jpg"
            self.assertTrue(path.exists(), path)
            with Image.open(path) as image:
                self.assertEqual(image.format, "JPEG")
                self.assertGreaterEqual(image.width, 1300)
                self.assertGreaterEqual(image.height, 2000)
```

- [ ] **Step 2: Run the test and verify it fails for missing JPEGs**

Expected: `FAIL` naming `PDF-018.jpg`.

- [ ] **Step 3: Implement lossless extraction**

Create `extract_pilot_pages.py`:

```python
from hashlib import sha256
from pathlib import Path
import json
from pypdf import PdfReader

PDF = Path(r"E:\Desktop") / ("\u4fc4\u8bedB2.pdf")
ROOT = Path(r"D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版")
PAGES = [18, 19, 24, 25, 26, 27]


def main():
    reader = PdfReader(str(PDF))
    if len(reader.pages) != 190:
        raise SystemExit(f"Expected 190 pages, found {len(reader.pages)}")
    out = ROOT / "页图"
    out.mkdir(parents=True, exist_ok=True)
    page_records = []
    for page_no in PAGES:
        images = list(reader.pages[page_no - 1].images)
        if len(images) != 1:
            raise SystemExit(f"PDF page {page_no} has {len(images)} images")
        image = images[0]
        if not image.name.lower().endswith((".jpg", ".jpeg")):
            raise SystemExit(f"PDF page {page_no} is not backed by JPEG")
        target = out / f"PDF-{page_no:03}.jpg"
        target.write_bytes(image.data)
        page_records.append({
            "pdf_page": page_no,
            "file": f"页图/{target.name}",
            "width": image.image.width,
            "height": image.image.height,
            "bytes": len(image.data),
            "sha256": sha256(image.data).hexdigest(),
        })
    manifest_path = ROOT / "_data" / "source_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["sha256"] = sha256(PDF.read_bytes()).hexdigest()
    manifest["page_images"] = page_records
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run extraction and the tests**

Run the extractor, then the unittest command from Task 1. Expected: six JPEGs, each at least 1300×2000, and all tests pass.

- [ ] **Step 5: Visually inspect all six JPEGs**

Open each extracted image. Reject any page that is rotated, cropped, blank, mirrored, or unreadable. Confirm that PDF 18–19 contain questions 1–10 and PDF 24–27 contain the corresponding rule tables and answers.

- [ ] **Step 6: Commit only script, test, and manifest**

Do not add `页图/*.jpg`.

```powershell
git add -- '俄语资料库/俄语B2·原书复刻与学习版/scripts/extract_pilot_pages.py' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py' '俄语资料库/俄语B2·原书复刻与学习版/_data/source_manifest.json'
git commit --only -m 'feat: extract Russian B2 pilot pages' -- '俄语资料库/俄语B2·原书复刻与学习版/scripts' '俄语资料库/俄语B2·原书复刻与学习版/tests' '俄语资料库/俄语B2·原书复刻与学习版/_data/source_manifest.json'
```

### Task 3: Build navigable original-page notes

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\scripts\build_pilot_page_notes.py`
- Create: six notes under `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\原书页\`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py`

- [ ] **Step 1: Add failing tests for unique page names, image embeds, and navigation**

The test must assert that all six `PDF-NNN.md` files exist, each embeds `![[俄语B2·原书复刻与学习版/页图/PDF-NNN.jpg]]`, and each contains explicit `PDF 页码` plus at least one navigation wikilink. It must also assert that no file is named only `018.md` or `024.md`.

- [ ] **Step 2: Run the test and verify it fails**

Expected: `FAIL` naming `原书页/PDF-018.md`.

- [ ] **Step 3: Implement deterministic page-note generation**

Create `build_pilot_page_notes.py` with this complete implementation:

```python
from pathlib import Path

ROOT = Path(r"D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版")
PAGES = [
    {"pdf": 18, "printed": 15, "role": "练习题 1–5"},
    {"pdf": 19, "printed": 16, "role": "练习题 6–10"},
    {"pdf": 24, "printed": 21, "role": "接格规则 1–7"},
    {"pdf": 25, "printed": 22, "role": "答案 1–7 与接格规则 8–21"},
    {"pdf": 26, "printed": 23, "role": "答案 8–9 与形容词接格规则"},
    {"pdf": 27, "printed": 24, "role": "答案 10–21 与动词接格规则"},
]


def wikilink(page):
    return f"[[俄语B2·原书复刻与学习版/原书页/PDF-{page:03}|PDF {page}]]"


def main():
    out = ROOT / "原书页"
    out.mkdir(parents=True, exist_ok=True)
    for index, record in enumerate(PAGES):
        previous_link = wikilink(PAGES[index - 1]["pdf"]) if index else "试制起点"
        next_link = wikilink(PAGES[index + 1]["pdf"]) if index + 1 < len(PAGES) else "试制终点"
        pdf_page = record["pdf"]
        content = f'''---
type: source-page
pdf_page: {pdf_page}
printed_page: {record["printed"]}
source_status: verified_image
cssclasses:
  - russian-reading
---

# 原书 PDF {pdf_page} / 印刷页 {record["printed"]}

{previous_link} · {next_link}

![[俄语B2·原书复刻与学习版/页图/PDF-{pdf_page:03}.jpg]]

**页面内容：** {record["role"]}

[[俄语B2·原书复刻与学习版/整理原文/语法词汇/02-名词与形容词接格-题1-10|整理原文]] · [[俄语B2·原书复刻与学习版/学习单元/语法词汇/02-名词与形容词接格-题1-10|学习单元]]
'''
        (out / f"PDF-{pdf_page:03}.md").write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
```

The output must preserve the YAML properties, full-vault-path image embed, role text, and links shown above.

- [ ] **Step 4: Generate notes, rerun tests, and inspect PDF-018 and PDF-027 in Obsidian**

Expected: the image fits the reading column, the page is legible when opened, and navigation links resolve without ambiguous-name warnings.

- [ ] **Step 5: Commit only page-note source and generator**

```powershell
git add -- '俄语资料库/俄语B2·原书复刻与学习版/scripts/build_pilot_page_notes.py' '俄语资料库/俄语B2·原书复刻与学习版/原书页' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
git commit --only -m 'feat: add navigable B2 source pages' -- '俄语资料库/俄语B2·原书复刻与学习版/scripts/build_pilot_page_notes.py' '俄语资料库/俄语B2·原书复刻与学习版/原书页' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
```

### Task 4: Reconstruct the cleaned source and exact range map

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\整理原文\语法词汇\02-名词与形容词接格-题1-10.md`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\_data\range_map.json`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py`

- [ ] **Step 1: Add a failing cleaned-source test**

Assert all of the following:

```python
    def test_cleaned_source_has_ten_question_sections(self):
        source = (ROOT / "整理原文/语法词汇/02-名词与形容词接格-题1-10.md").read_text(encoding="utf-8")
        for number in range(1, 11):
            self.assertIn(f"### Q{number:03}", source)
        self.assertEqual(source.count("- А."), 10)
        self.assertEqual(source.count("- Б."), 10)
        self.assertEqual(source.count("- В."), 10)
        self.assertEqual(source.count("- Г."), 10)
        self.assertNotIn("参考解析（AI", source)
```

- [ ] **Step 2: Run the test and verify it fails**

Expected: missing cleaned-source file.

- [ ] **Step 3: Transcribe and verify the ten original questions**

Use PDF 18 for Q001–Q005 and PDF 19 for Q006–Q010. Preserve the printed А/Б/В/Г option order, punctuation, ellipses, capitalization, and Russian spelling. Each question is its own `### QNNN` section and ends with a compact source line such as `来源：[[原书页/PDF-018|PDF 18 / 印刷页 15]]`.

The verified answer vector is:

```text
Q001 В  Q002 В  Q003 Б  Q004 А  Q005 Г
Q006 Г  Q007 А  Q008 А  Q009 А  Q010 Б
```

Put original rule tables and original answer/explanation text in a separate `## 原书参考区` after all questions. Label it as original content and link each block to PDF 24, 25, 26, or 27. Do not insert AI analysis into this file.

- [ ] **Step 4: Create the range map with distinct page roles**

```json
{
  "schema_version": "1.0",
  "topics": [
    {
      "id": "grammar-case-government-q001-q010",
      "module": "语法词汇",
      "title": "名词与形容词接格：题 1–10",
      "question_pages": [18, 19],
      "answer_pages": [25, 26, 27],
      "explanation_pages": [24, 25, 26, 27],
      "media_pages": [],
      "question_ids": ["Q001", "Q002", "Q003", "Q004", "Q005", "Q006", "Q007", "Q008", "Q009", "Q010"],
      "cleaned_source": "整理原文/语法词汇/02-名词与形容词接格-题1-10.md",
      "learning_unit": "学习单元/语法词汇/02-名词与形容词接格-题1-10.md",
      "status": "pilot_review"
    }
  ]
}
```

- [ ] **Step 5: Run tests and visually compare every transcribed question with the source images**

Expected: ten sections, forty options, no AI content in cleaned source, and no unresolved OCR uncertainty. If a character remains uncertain, mark only that question `needs_review` rather than silently choosing a reading.

- [ ] **Step 6: Commit only the cleaned source, map, and test**

```powershell
git add -- '俄语资料库/俄语B2·原书复刻与学习版/整理原文/语法词汇/02-名词与形容词接格-题1-10.md' '俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
git commit --only -m 'feat: reconstruct B2 grammar pilot source' -- '俄语资料库/俄语B2·原书复刻与学习版/整理原文' '俄语资料库/俄语B2·原书复刻与学习版/_data/range_map.json' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
```

### Task 5: Create the quiz-first learning unit and progress dashboard

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\学习单元\语法词汇\02-名词与形容词接格-题1-10.md`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\学习记录\语法进度.md`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py`

- [ ] **Step 1: Add a failing learning-unit test**

Assert the unit has both CSS classes, the exact source-page properties, ten question transclusions, ten collapsed `答案与解析` callouts, the expected answer vector, and no visible answer line before the first collapsed callout.

```python
    def test_learning_unit_is_quiz_first(self):
        unit = (ROOT / "学习单元/语法词汇/02-名词与形容词接格-题1-10.md").read_text(encoding="utf-8")
        self.assertIn("russian-reading", unit)
        self.assertIn("b2-quiz", unit)
        self.assertEqual(unit.count("![[俄语B2·原书复刻与学习版/整理原文/语法词汇/02-名词与形容词接格-题1-10#Q"), 10)
        self.assertEqual(unit.count("> [!success]- 答案与解析"), 10)
        expected = ["В", "В", "Б", "А", "Г", "Г", "А", "А", "А", "Б"]
        for number, answer in enumerate(expected, start=1):
            start = unit.index(f"## 第 {number} 题")
            end = unit.find("## 第 ", start + 1)
            section = unit[start:] if end == -1 else unit[start:end]
            self.assertIn(f"**原书答案（已核对）：** {answer}", section)
```

- [ ] **Step 2: Run the test and verify it fails**

Expected: missing learning-unit file.

- [ ] **Step 3: Create the complete quiz unit**

Use this frontmatter contract:

```yaml
---
title: "语法试制 02：名词与形容词接格（题 1–10）"
type: learning-unit
profile: grammar-quiz
module: 语法词汇
question_pages: [18, 19]
answer_pages: [25, 26, 27]
explanation_pages: [24, 25, 26, 27]
status: pilot_review
mastery: 0
wrong_questions: []
last_review:
cssclasses:
  - russian-reading
  - b2-quiz
---
```

For each Q001–Q010, create a heading named exactly `## 第 N 题`, transclude the corresponding cleaned-source heading, then place exactly one collapsed answer callout. Each callout must contain three explicitly labeled blocks:

1. `原书答案（已核对）` with the answer vector above.
2. `原书依据` with the applicable case-government pattern and the exact PDF answer page.
3. `参考解析（AI，待复核）` explaining why the correct case is required and why at least one plausible distractor is wrong.

No callout may be titled `原书内容` if it contains the AI block. Do not wrap Russian prose in backticks. Add a final `复习记录` section instructing the learner to update `mastery`, `wrong_questions`, and `last_review` properties.

- [ ] **Step 4: Create the Dataview progress note**

````markdown
# 语法学习进度

```dataview
TABLE status AS "状态", mastery AS "掌握度", wrong_questions AS "错题", last_review AS "最近复习"
FROM "俄语B2·原书复刻与学习版/学习单元/语法词汇"
SORT file.name ASC
```
````

- [ ] **Step 5: Run tests and inspect answer leakage**

Open the unit in Reading View. Before interaction, no answer letter or explanation should be visible beneath any question. Expand Q001 and Q010 independently and confirm each reveals only its own answer and explanation.

- [ ] **Step 6: Commit only the unit, dashboard, and test**

```powershell
git add -- '俄语资料库/俄语B2·原书复刻与学习版/学习单元/语法词汇/02-名词与形容词接格-题1-10.md' '俄语资料库/俄语B2·原书复刻与学习版/学习记录/语法进度.md' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
git commit --only -m 'feat: add quiz-first B2 grammar pilot' -- '俄语资料库/俄语B2·原书复刻与学习版/学习单元' '俄语资料库/俄语B2·原书复刻与学习版/学习记录' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
```

### Task 6: Add scoped Obsidian quiz styling

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\.obsidian\snippets\b2-quiz.css`
- Modify: `D:\MyStudySpace\俄语资料库\.obsidian\appearance.json`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\tests\test_pilot_project.py`

- [ ] **Step 1: Add a failing CSS contract test**

Assert `b2-quiz.css` exists and contains scoped selectors for `.b2-quiz`, `.callout.is-collapsed`, `min-height: 44px`, a minimum 14px title size, dark-theme handling, and a `max-width: 760px` media query. Assert `appearance.json` enables `b2-quiz` without removing or reordering existing snippets.

- [ ] **Step 2: Run the test and verify it fails**

Expected: missing CSS snippet.

- [ ] **Step 3: Add scoped styles without altering global components**

Create CSS containing these required rules:

```css
.markdown-preview-view.b2-quiz .markdown-preview-sizer {
  max-width: 860px;
}

.markdown-preview-view.b2-quiz h3 {
  font-size: 1.08em;
  margin-top: 1.6em;
}

.markdown-preview-view.b2-quiz .callout.is-collapsed {
  width: auto;
  max-width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 22%, var(--background-modifier-border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--interactive-accent) 5%, var(--background-primary));
}

.markdown-preview-view.b2-quiz .callout.is-collapsed .callout-title {
  min-height: 28px;
  align-items: center;
  font-size: max(14px, 0.86em);
  opacity: 1;
}

.markdown-preview-view.b2-quiz .callout[data-callout="success"] .callout-title::after {
  content: "（点击展开）";
  margin-left: 0.55em;
  color: var(--text-muted);
  font-size: 0.86em;
}

.theme-dark .markdown-preview-view.b2-quiz .callout.is-collapsed {
  background: color-mix(in srgb, var(--interactive-accent) 8%, var(--background-primary));
}

@media (max-width: 760px) {
  .markdown-preview-view.b2-quiz .markdown-preview-sizer {
    padding-left: 1em;
    padding-right: 1em;
  }

  .markdown-preview-view.b2-quiz .callout.is-collapsed {
    width: 100%;
  }
}
```

Do not edit `components.css` or weaken its task-checkbox behavior. Append `b2-quiz` to `enabledCssSnippets` in `appearance.json` while preserving every existing value.

- [ ] **Step 4: Reload snippets and rerun tests**

Expected: all automated tests pass; the unit uses full-width, clearly clickable collapsed answers while ordinary vault callouts remain unchanged.

- [ ] **Step 5: Commit only the new snippet, appearance setting, and test**

```powershell
git add -- '俄语资料库/.obsidian/snippets/b2-quiz.css' '俄语资料库/.obsidian/appearance.json' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
git commit --only -m 'style: add scoped B2 quiz reading mode' -- '俄语资料库/.obsidian/snippets/b2-quiz.css' '俄语资料库/.obsidian/appearance.json' '俄语资料库/俄语B2·原书复刻与学习版/tests/test_pilot_project.py'
```

### Task 7: Add a single-command validator and run the visual gate

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\scripts\validate_pilot.py`
- Create: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\质量报告\试制单元验收.md`
- Modify: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\_automation\goal_state.json`

- [ ] **Step 1: Implement the validator as a unittest wrapper**

`validate_pilot.py` must load `tests/test_pilot_project.py`, run it with verbosity 2, return exit code 1 on any failure, and additionally reject any `http://` or `https://` image URL found under the pilot root.

```python
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(r"D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版")


def main():
    result = subprocess.run([sys.executable, str(ROOT / "tests/test_pilot_project.py"), "-v"])
    if result.returncode:
        return result.returncode
    for path in ROOT.rglob("*.md"):
        text = path.read_text(encoding="utf-8")
        if re.search(r"!\[[^\]]*\]\(https?://", text):
            print(f"External image URL: {path}")
            return 1
    print("PILOT PASS: automated checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run the validator**

```powershell
& 'C:\Users\梅子\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\scripts\validate_pilot.py'
```

Expected: `PILOT PASS: automated checks`.

- [ ] **Step 3: Capture actual Obsidian evidence in four states**

Open the learning unit inside the real `D:\MyStudySpace\俄语资料库` vault and capture accepted screenshots for:

1. Desktop dark theme, all answers collapsed.
2. Desktop dark theme, Q001 expanded and Q002 collapsed.
3. Live Preview showing frontmatter-driven properties without broken callout syntax.
4. Narrow/mobile-width view showing no horizontal overflow and a full-width 44px answer target.

Reject blank, loading, cropped, or wrong-note screenshots. Verify that Page Preview displays `PDF-018` and that tapping/opening the source page provides a working return path.

- [ ] **Step 4: Write the pilot acceptance report**

The report must include the exact validator command and result, screenshot links, question/answer/explanation page ranges, automated checks, visible UI findings, accessibility limits, and one verdict from `PASS`, `REVIEW`, or `FAIL`. Use `REVIEW` if any OCR character or answer mapping is still uncertain.

- [ ] **Step 5: Update goal state from evidence**

If automated and visual gates pass, set `source_base`, `cleaned_source`, `range_map`, and `learning_units` to `pass` for the pilot only; keep `finalization: pending` and add a batch record named `grammar-pilot-q001-q010`. Do not mark the whole book sealed.

- [ ] **Step 6: Commit only validator, report, and goal state**

```powershell
git add -- '俄语资料库/俄语B2·原书复刻与学习版/scripts/validate_pilot.py' '俄语资料库/俄语B2·原书复刻与学习版/质量报告/试制单元验收.md' '俄语资料库/俄语B2·原书复刻与学习版/_automation/goal_state.json'
git commit --only -m 'test: verify Russian B2 grammar pilot' -- '俄语资料库/俄语B2·原书复刻与学习版/scripts/validate_pilot.py' '俄语资料库/俄语B2·原书复刻与学习版/质量报告/试制单元验收.md' '俄语资料库/俄语B2·原书复刻与学习版/_automation/goal_state.json'
```

### Task 8: Pilot decision gate

**Files:**
- Review: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\质量报告\试制单元验收.md`
- Review: `D:\MyStudySpace\俄语资料库\俄语B2·原书复刻与学习版\学习单元\语法词汇\02-名词与形容词接格-题1-10.md`

- [ ] **Step 1: Present the actual Obsidian screenshots and pilot note to the user**

The handoff must state that only six source pages and ten questions are in scope. It must not call the whole book complete.

- [ ] **Step 2: Record one of two outcomes**

- Approved: freeze the pilot format and write a separate whole-book production plan covering all 190 pages.
- Changes requested: revise only the pilot CSS/template/content, rerun Task 7, and present the refreshed evidence before scaling.
