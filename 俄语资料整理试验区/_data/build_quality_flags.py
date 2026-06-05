#!/usr/bin/env python3
"""
为 data/sentences.json 全量记录生成 quality_flags 映射文件。
不修改 data/sentences.json，输出到 _translation_queue/quality_flags.json。
"""
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

BASE = Path(r"D:\MyStudySpace")
SENTENCES_PATH = BASE / "data" / "sentences.json"
SOURCES_PATH = BASE / "data" / "sources.json"
OUTPUT_DIR = BASE / "俄语资料整理试验区" / "_translation_queue"
REPORT_DIR = BASE / "俄语资料整理试验区" / "_reports"


def has_chinese(text: str) -> bool:
    return bool(re.search(r'[一-鿿]', text or ""))


def is_too_short(text: str, threshold: int = 10) -> bool:
    return len((text or "").strip()) < threshold


def is_likely_title(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    # Short, no sentence-ending punctuation, looks like a heading
    if len(t) < 50 and not re.search(r'[.!?;:—]$', t):
        words = t.split()
        if len(words) <= 6:
            return True
    # ALL CAPS pattern
    if t.isupper() and len(t) > 5:
        return True
    return False


def has_mojibake(text: str) -> bool:
    t = text or ""
    # Check for replacement character or control chars
    if '�' in t:
        return True
    if re.search(r'[\x00-\x08\x0e-\x1f]', t):
        return True
    return False


def is_author_name(text: str) -> bool:
    """Check if text looks like an author name: 'Фамилия, И.О.'"""
    t = (text or "").strip()
    if re.match(r'^[А-ЯЁ][а-яё]+\s*,\s*[А-ЯЁ]\.[А-ЯЁ]\.$', t):
        return True
    return False


def is_book_metadata(text: str) -> bool:
    """Check if text is book front matter (publisher info, ISBN, etc)."""
    t = (text or "").strip()
    meta_patterns = [
        r'под\s+редакцией',
        r'электронное\s+издание',
        r'УДК\s',
        r'ББК\s',
        r'ISBN',
        r'©',
        r'издательств',
        r'тираж',
        r'стр\.\s*\d',
    ]
    for p in meta_patterns:
        if re.search(p, t, re.IGNORECASE):
            return True
    return False


def is_vocabulary_table_item(text: str, source_id: str) -> bool:
    """Check if this looks like a vocabulary table entry."""
    t = (text or "").strip()
    # Pattern: word - translation, or word — translation
    if re.match(r'^[А-Яа-яЁё\-]+\s*[-–—]\s*.+$', t):
        return True
    # diag-0029 vocabulary entries: "word, ч.с." pattern
    if source_id == "diag-0029" and re.match(r'^[А-Яа-яЁё\-]+,\s*[а-яё]\.[а-яё]\.$', t):
        return True
    return False


def is_fragment(text: str) -> bool:
    """Check if text is a sentence fragment."""
    t = (text or "").strip()
    if not t:
        return False
    # No sentence-ending punctuation and short
    if not re.search(r'[.!?…]$', t) and len(t) < 60:
        return True
    # Starts with lowercase (likely a continuation)
    if t and t[0].islower() and len(t) < 40:
        return True
    return False


def is_page_number_or_label(text: str) -> bool:
    """Check if text is just a page number or section label."""
    t = (text or "").strip()
    if re.match(r'^\d+\.?\s*$', t):
        return True
    if re.match(r'^(стр|page|с)\.\s*\d+$', t, re.IGNORECASE):
        return True
    return False


def compute_quality_flags(rec: dict) -> dict:
    ru = rec.get("ru", "")
    zh = rec.get("zh", "")
    source_id = rec.get("source_id", "")
    flags = []

    if has_chinese(ru):
        flags.append("ru_has_chinese")
    if is_too_short(ru):
        flags.append("too_short")
    if is_likely_title(ru):
        flags.append("likely_title")
    if has_mojibake(ru):
        flags.append("mojibake")
    if is_fragment(ru):
        flags.append("fragment")
    if is_vocabulary_table_item(ru, source_id):
        flags.append("vocabulary_table_item")
    if is_author_name(ru):
        flags.append("author_name")
    if is_book_metadata(ru):
        flags.append("book_metadata")
    if is_page_number_or_label(ru):
        flags.append("page_number_or_label")

    # Clean sentence candidate
    if not flags:
        flags.append("clean_sentence_candidate")

    # Quality score
    score = 100
    penalty = {
        "ru_has_chinese": 50,
        "too_short": 30,
        "likely_title": 20,
        "mojibake": 60,
        "fragment": 15,
        "vocabulary_table_item": 25,
        "author_name": 40,
        "book_metadata": 45,
        "page_number_or_label": 50,
    }
    for f in flags:
        score -= penalty.get(f, 0)
    score = max(0, score)

    # Translation status
    if zh and zh.strip():
        translation_status = "not_needed"
    elif score < 40:
        translation_status = "blocked"
    elif "fragment" in flags or "vocabulary_table_item" in flags:
        # Fragments and vocab items can still be translated, but mark them
        translation_status = "pending"
    else:
        translation_status = "pending"

    # Review reason
    review_reason = ""
    if flags and flags != ["clean_sentence_candidate"]:
        review_reason = ", ".join(flags)

    return {
        "quality_flags": flags,
        "quality_score": score,
        "translation_status": translation_status,
        "review_reason": review_reason,
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    with open(SENTENCES_PATH, "r", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(SOURCES_PATH, "r", encoding="utf-8") as f:
        sources = json.load(f)

    source_ids_in_sources = {s["source_id"] for s in sources}

    # Build quality flags for all records
    quality_flags = {}
    stats = defaultdict(lambda: Counter())
    translation_status_counter = Counter()
    all_flags_counter = Counter()

    for rec in sentences:
        sid = rec["sentence_id"]
        src = rec.get("source_id", "")
        qf = compute_quality_flags(rec)
        quality_flags[sid] = qf

        translation_status_counter[qf["translation_status"]] += 1
        all_flags_counter.update(qf["quality_flags"])
        for flag in qf["quality_flags"]:
            stats[src][flag] += 1
        stats[src]["total"] += 1

    # Save quality flags
    flags_path = OUTPUT_DIR / "quality_flags.json"
    with open(flags_path, "w", encoding="utf-8") as f:
        json.dump(quality_flags, f, ensure_ascii=False, indent=2)
    print(f"Quality flags saved to: {flags_path}")

    # Generate summary report
    report = []
    report.append("# quality_flags 生成报告\n")
    report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    report.append(f"\n## 总览\n")
    report.append(f"- 总记录: {len(sentences)}")
    report.append(f"- quality_flags 条目: {len(quality_flags)}")
    report.append(f"\n## 翻译状态分布\n")
    report.append(f"| 状态 | 数量 |")
    report.append(f"|------|------|")
    for status, cnt in translation_status_counter.most_common():
        report.append(f"| {status} | {cnt} |")
    report.append(f"\n## 质量标记分布\n")
    report.append(f"| 标记 | 数量 |")
    report.append(f"|------|------|")
    for flag, cnt in all_flags_counter.most_common():
        report.append(f"| {flag} | {cnt} |")
    report.append(f"\n## 每个 source_id 标记统计\n")
    for src_id in sorted(stats.keys()):
        ss = stats[src_id]
        report.append(f"### {src_id} (共 {ss['total']} 条)\n")
        for flag, cnt in ss.most_common():
            if flag != "total":
                report.append(f"- {flag}: {cnt}")
        report.append("")

    report_text = "\n".join(report)
    report_path = REPORT_DIR / "quality_flags生成报告.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    print(f"Report saved to: {report_path}")

    # Print summary
    print(f"\n=== 摘要 ===")
    print(f"总记录: {len(sentences)}")
    for status, cnt in translation_status_counter.most_common():
        print(f"  {status}: {cnt}")


if __name__ == "__main__":
    main()
