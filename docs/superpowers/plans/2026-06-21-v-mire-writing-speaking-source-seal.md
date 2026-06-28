# V Mire Writing Speaking Source Seal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sealed Obsidian Markdown project base for `В мире людей 写作与口语` from the existing `raw-0015` OCR sentence package.

**Architecture:** Treat `raw-0015` as the source package of record, but do not generate learning units yet. First reconstruct page-level OCR files, create project metadata, and write validation reports so later Claude/Codex agents can work from a stable source base.

**Tech Stack:** PowerShell, Python JSON processing, Obsidian Markdown, existing `_source_packages/raw-0015` OCR records.

---

### Task 1: Create Project Skeleton

**Files:**
- Create directory: `D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版`
- Create subdirectories: `原始OCR`, `章节`, `学习单元`, `质量报告`, `索引`, `_harness`, `_data`

- [ ] **Step 1: Verify target does not already exist**

Run:

```powershell
Test-Path -LiteralPath 'D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版'
```

Expected: `False`.

- [ ] **Step 2: Create directories**

Run:

```powershell
$root = 'D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版'
@('', '原始OCR', '章节', '学习单元', '质量报告', '索引', '_harness', '_data') |
  ForEach-Object { New-Item -ItemType Directory -Force -LiteralPath (Join-Path $root $_) | Out-Null }
```

Expected: all directories exist.

### Task 2: Reconstruct Page-Level OCR Markdown

**Files:**
- Read: `D:\MyStudySpace\俄语资料整理试验区\_source_packages\raw-0015\sentence_records.json`
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\原始OCR\page_001.md` through `page_292.md`

- [ ] **Step 1: Group records by `page_number`**

Use UTF-8 JSON parsing. For each page, preserve `sentence_id`, `page_number`, `ru`, `confidence`, `needs_review`, and `note`.

- [ ] **Step 2: Write page files**

Each page file must start with frontmatter:

```yaml
---
source_id: raw-0015
book: В мире людей 写作与口语
page: 1
ocr_type: sentence_records_reconstructed
needs_review: true
---
```

Then write `# Page 001` and one block per OCR record.

- [ ] **Step 3: Create an explicit empty/unchecked page 292**

If no OCR records exist for page 292, create `page_292.md` with:

```markdown
> [!warning] OCR Missing
> `raw-0015` has no sentence records for this page. Confirm against the PDF before treating the book as fully sealed.
```

### Task 3: Write Project Metadata And Index

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\README.md`
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\索引\页码索引.md`
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\质量报告\底座检查报告.md`
- Create: `D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\_data\source_manifest.json`

- [ ] **Step 1: Write README**

README must state that this is a sealed base, not a completed learning-unit project.

- [ ] **Step 2: Write page index**

Create a table with page number, OCR record count, page file wikilink, and status.

- [ ] **Step 3: Write validation report**

Report total records, pages covered, missing pages, PDF path, and next recommended stage.

- [ ] **Step 4: Write manifest**

Manifest must include `source_id`, `source_title`, `source_path`, `page_count`, `records_count`, `pages_with_records`, and `missing_pages`.

### Task 4: Verify Base

**Files:**
- Read: generated `原始OCR`
- Read: generated `质量报告\底座检查报告.md`

- [ ] **Step 1: Count page files**

Run:

```powershell
(Get-ChildItem -LiteralPath 'D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\原始OCR' -Filter 'page_*.md').Count
```

Expected: `292`.

- [ ] **Step 2: Confirm OCR record coverage**

Run a JSON/page-file validation script that confirms 2958 records from `sentence_records.json` are present in the page files.

Expected: `PASS`.

- [ ] **Step 3: Confirm page 292 is explicitly marked**

Run:

```powershell
Select-String -LiteralPath 'D:\MyStudySpace\俄语资料库\В мире людей 写作口语 Markdown版\原始OCR\page_292.md' -Pattern 'OCR Missing'
```

Expected: one match.
