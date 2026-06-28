# Reviewed Full OCR Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stricter reviewed source package from the 120 full-OCR candidates, keeping only examples that pass safety checks and match the current vocabulary data.

**Architecture:** Add a review script that reads `raw-0030-full-ocr`, scores each candidate with conservative OCR quality rules, matches candidate word forms against `data/vocabulary.json`, and writes a separate `raw-0030-full-ocr-reviewed` package. The script must not mutate live `data/`; live import remains a dry-run unless explicitly requested later.

**Tech Stack:** Python standard library, existing source-package JSON format, existing `validate_source_package.py`, existing `import_source_package.py --dry-run`.

---

### Task 1: Candidate Review Rules

**Files:**
- Create: `D:/MyStudySpace/俄语资料整理试验区/_data/test_review_full_ocr_candidates.py`
- Create: `D:/MyStudySpace/俄语资料整理试验区/_data/review_full_ocr_candidates.py`

- [ ] **Step 1: Write failing tests**

Test that:
- Clean complete sentences are approved.
- OCR-glued sentences such as `Не говоря уже о людях, которые остались без жилья в самому заработать на достойную жизнь.` are rejected.
- Records with no vocabulary match are rejected.
- Approved records are marked `needs_review=false` and `vocabulary_card_eligible=true`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\test_review_full_ocr_candidates.py
```

Expected: failure because `review_full_ocr_candidates.py` does not exist.

- [ ] **Step 3: Implement review script**

Implement:
- `normalize_lookup_text`
- `load_vocabulary_terms`
- `find_vocab_matches`
- `review_record`
- `build_reviewed_package`
- CLI defaults for source package and output package.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\test_review_full_ocr_candidates.py
```

Expected: all tests pass.

### Task 2: Build And Validate Reviewed Package

**Files:**
- Output: `D:/MyStudySpace/俄语资料整理试验区/_source_packages/raw-0030-full-ocr-reviewed/`

- [ ] **Step 1: Build reviewed package**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\review_full_ocr_candidates.py
```

Expected: reviewed package path and nonzero approved count.

- [ ] **Step 2: Validate package**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\validate_source_package.py D:\MyStudySpace\俄语资料整理试验区\_source_packages\raw-0030-full-ocr-reviewed
```

Expected: PASS.

- [ ] **Step 3: Dry-run import**

Run:

```powershell
$env:PYTHONIOENCODING='utf-8'; python D:\MyStudySpace\俄语资料整理试验区\_data\import_source_package.py D:\MyStudySpace\俄语资料整理试验区\_source_packages\raw-0030-full-ocr-reviewed --dry-run
```

Expected: `would_add` is nonzero and live data remains unchanged.
