# Full OCR Source Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed 186-page OCR output for `В мире людей 阅读口语` into a clean, validated source package of candidate real examples without importing it into the live study database.

**Architecture:** Add a focused packager that reads cached OCR page text and OCR quality metadata, cleans common OCR artifacts, splits Russian sentences, rejects exercise instructions/tables/noisy OCR, and writes the existing source-package format. Keep import separate and only run dry-run validation.

**Tech Stack:** Python standard library, existing `validate_source_package.py`, existing `import_source_package.py --dry-run`, project JSON source-package format.

---

### Task 1: OCR Sentence Cleaning And Candidate Builder

**Files:**
- Create: `D:/MyStudySpace/俄语资料整理试验区/_data/test_package_full_ocr_source.py`
- Create: `D:/MyStudySpace/俄语资料整理试验区/_data/package_full_ocr_source.py`

- [ ] **Step 1: Write failing tests**

Create tests that assert:
- Exercise/task lines such as `Задание 5.` are rejected.
- Real Russian sentences are accepted.
- Chinese/OCR-mixed lines are rejected.
- Generated records include all fields required by `validate_source_package.py`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\test_package_full_ocr_source.py
```

Expected: failure because `package_full_ocr_source.py` does not exist yet.

- [ ] **Step 3: Implement the packager**

Implement:
- `normalize_text`
- `split_sentences`
- `is_good_sentence`
- `extract_surface_forms`
- `build_package`
- CLI arguments for OCR dir, PDF path, source id, title, and output root.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\test_package_full_ocr_source.py
```

Expected: all tests pass.

### Task 2: Build And Validate Candidate Package

**Files:**
- Output: `D:/MyStudySpace/俄语资料整理试验区/_source_packages/raw-0030-full-ocr/`

- [ ] **Step 1: Build package**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\package_full_ocr_source.py --source-id raw-0030-full-ocr --title "В мире людей 阅读口语 full OCR" --pdf "E:\wechat\xwechat_files\wxid_bmid7wemoiiu12_e784\msg\file\2026-06\В мире людей 阅读口语.pdf.pdf"
```

Expected: package path and nonzero record count.

- [ ] **Step 2: Validate source package**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\validate_source_package.py D:\MyStudySpace\俄语资料整理试验区\_source_packages\raw-0030-full-ocr
```

Expected: PASS.

- [ ] **Step 3: Dry-run import only**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\import_source_package.py D:\MyStudySpace\俄语资料整理试验区\_source_packages\raw-0030-full-ocr --dry-run
```

Expected: `would_add` is nonzero and no live data files are changed.

### Task 3: Review Samples

**Files:**
- Read: `D:/MyStudySpace/俄语资料整理试验区/_source_packages/raw-0030-full-ocr/package_report.md`
- Read: `D:/MyStudySpace/俄语资料整理试验区/_source_packages/raw-0030-full-ocr/quality_report.md`

- [ ] **Step 1: Inspect generated statistics**

Check record count, page coverage, rejected counts, and review/poor page handling.

- [ ] **Step 2: Inspect sample records**

Print representative records from early, middle, and late pages to ensure real examples are not dominated by task instructions.

- [ ] **Step 3: Final verification**

Re-run tests, package validation, and dry-run import before reporting.
