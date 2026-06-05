#!/usr/bin/env python3
"""
背单词页联动验证：
- 从 sentences 抽 30 个 surface_forms
- 确认 lexeme_index 能查到 sentence_id
- sentence_id 能回到 sentences.json
- source_id 能回到 sources.json
输出报告到 _reports/背单词页联动验证报告.md
"""
import json
import random
import sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

BASE = Path(r"D:\MyStudySpace")
SENTENCES_PATH = BASE / "data" / "sentences.json"
SOURCES_PATH = BASE / "data" / "sources.json"
LEXEME_PATH = BASE / "data" / "lexeme_index.json"
REPORT_DIR = BASE / "俄语资料整理试验区" / "_reports"


def main():
    random.seed(42)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    with open(SENTENCES_PATH, "r", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(SOURCES_PATH, "r", encoding="utf-8") as f:
        sources = json.load(f)
    with open(LEXEME_PATH, "r", encoding="utf-8") as f:
        lexeme_index = json.load(f)

    # Build lookup structures
    sid_to_rec = {r["sentence_id"]: r for r in sentences}
    source_ids = {s["source_id"] for s in sources}

    # Build reverse index: sentence_id → list of lemmas
    sid_to_lemmas = {}
    for lemma, entry in lexeme_index.items():
        if isinstance(entry, dict) and "sentence_ids" in entry:
            for sid in entry["sentence_ids"]:
                if sid not in sid_to_lemmas:
                    sid_to_lemmas[sid] = []
                sid_to_lemmas[sid].append(lemma)

    # Collect all surface_forms from sentences
    all_surface_forms = []
    for rec in sentences:
        for sf in rec.get("surface_forms", []):
            all_surface_forms.append((sf, rec["sentence_id"], rec["source_id"]))

    # Sample 30
    sample_size = min(30, len(all_surface_forms))
    samples = random.sample(all_surface_forms, sample_size)

    report = []
    report.append("# 背单词页联动验证报告\n")
    report.append(f"生成时间: 2026-06-06")
    report.append(f"抽样数: {sample_size}\n")

    pass_count = 0
    fail_count = 0
    results = []

    for sf, sid, src in samples:
        # Check 1: lexeme_index contains this surface_form or its lemma
        found_in_lexeme = sf in lexeme_index
        # Also check if any lemma in lexeme_index maps to this sentence_id
        lemmas_for_sid = sid_to_lemmas.get(sid, [])
        lexeme_ok = found_in_lexeme or len(lemmas_for_sid) > 0

        # Check 2: sentence_id exists in sentences.json
        sentence_ok = sid in sid_to_rec

        # Check 3: source_id exists in sources.json
        source_ok = src in source_ids

        passed = lexeme_ok and sentence_ok and source_ok
        if passed:
            pass_count += 1
        else:
            fail_count += 1

        results.append({
            "surface_form": sf,
            "sentence_id": sid,
            "source_id": src,
            "lexeme_ok": lexeme_ok,
            "sentence_ok": sentence_ok,
            "source_ok": source_ok,
            "passed": passed,
            "lemmas": lemmas_for_sid[:3],
        })

    report.append(f"## 总览\n")
    report.append(f"| 指标 | 数值 |")
    report.append(f"|------|------|")
    report.append(f"| 抽样数 | {sample_size} |")
    report.append(f"| 通过 | {pass_count} |")
    report.append(f"| 失败 | {fail_count} |")
    report.append(f"| 通过率 | {100*pass_count/sample_size:.1f}% |")
    report.append(f"\n## 详细结果\n")
    report.append(f"| # | surface_form | sentence_id | source_id | lexeme | sentence | source | 结果 |")
    report.append(f"|---|-------------|-------------|-----------|--------|----------|--------|------|")

    for i, r in enumerate(results, 1):
        lex = "✓" if r["lexeme_ok"] else "✗"
        sen = "✓" if r["sentence_ok"] else "✗"
        sou = "✓" if r["source_ok"] else "✗"
        res = "PASS" if r["passed"] else "FAIL"
        report.append(f"| {i} | {r['surface_form']} | {r['sentence_id']} | {r['source_id']} | {lex} | {sen} | {sou} | {res} |")

    # Failures detail
    failures = [r for r in results if not r["passed"]]
    if failures:
        report.append(f"\n## 失败详情\n")
        for r in failures:
            report.append(f"- **{r['surface_form']}** ({r['sentence_id']}):")
            if not r["lexeme_ok"]:
                report.append(f"  - lexeme_index 未找到")
            if not r["sentence_ok"]:
                report.append(f"  - sentence_id 不存在于 sentences.json")
            if not r["source_ok"]:
                report.append(f"  - source_id 不存在于 sources.json")

    report_text = "\n".join(report)
    report_path = REPORT_DIR / "背单词页联动验证报告.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"Report: {report_path}")
    print(f"Pass: {pass_count}/{sample_size}, Fail: {fail_count}/{sample_size}")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
