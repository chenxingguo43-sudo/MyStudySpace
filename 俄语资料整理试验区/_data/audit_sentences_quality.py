#!/usr/bin/env python3
"""全量审计 data/sentences.json 质量，输出统计报告。"""
import json
import re
import sys
from collections import Counter, defaultdict
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
GRAMMAR_PATH = BASE / "data" / "grammar_index.json"
REPORT_DIR = BASE / "俄语资料整理试验区" / "_reports"


def has_chinese(text: str) -> bool:
    return bool(re.search(r'[一-鿿]', text or ""))


def is_too_short(text: str, threshold: int = 10) -> bool:
    return len((text or "").strip()) < threshold


def is_likely_title(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    # Short, no period/verb-like ending, capitalized first word
    if len(t) < 40 and not re.search(r'[.!?;:—]$', t):
        # Check if it looks like a heading (all words capitalized or all caps)
        words = t.split()
        if len(words) <= 6:
            return True
    return False


def has_mojibake(text: str) -> bool:
    """Check for common mojibake patterns."""
    t = text or ""
    patterns = [
        r'[ÃÂÐÑ]{2,}',  # Common UTF-8 mojibake
        r'[\x00-\x08\x0e-\x1f]',  # Control chars
        r'�',  # Replacement char
    ]
    for p in patterns:
        if re.search(p, t):
            return True
    return False


def is_vocabulary_item(text: str, source_id: str) -> bool:
    """Check if this looks like a vocabulary table entry."""
    t = (text or "").strip()
    # Pattern: word - translation, or word — translation
    if re.match(r'^[А-Яа-яЁё\-]+\s*[-–—]\s*.+$', t):
        return True
    # Very short, single word or two words
    if source_id == "diag-0029" and len(t.split()) <= 3:
        return True
    return False


def is_fragment(text: str) -> bool:
    """Check if text is a sentence fragment (not a complete sentence)."""
    t = (text or "").strip()
    if not t:
        return False
    # No sentence-ending punctuation
    if not re.search(r'[.!?…]$', t) and len(t) < 60:
        return True
    # Starts with lowercase (likely a continuation)
    if t and t[0].islower() and len(t) < 40:
        return True
    return False


def compute_quality_flags(rec: dict) -> dict:
    """Compute quality flags for a single record."""
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
    if is_vocabulary_item(ru, source_id):
        flags.append("vocabulary_table_item")

    # Clean sentence candidate
    if not flags:
        flags.append("clean_sentence_candidate")

    # Quality score: start at 100, subtract for each flag
    score = 100
    penalty = {
        "ru_has_chinese": 50,
        "too_short": 30,
        "likely_title": 20,
        "mojibake": 60,
        "fragment": 15,
        "vocabulary_table_item": 25,
    }
    for f in flags:
        score -= penalty.get(f, 0)
    score = max(0, score)

    # Translation status
    if zh and zh.strip():
        translation_status = "not_needed"
    elif score < 40:
        translation_status = "blocked"
    else:
        translation_status = "pending"

    # Review reason
    review_reason = ""
    if flags and flags != ["clean_sentence_candidate"]:
        review_reason = "标记: " + ", ".join(flags)

    return {
        "quality_flags": flags,
        "quality_score": score,
        "translation_status": translation_status,
        "review_reason": review_reason,
    }


def main():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    # Load data
    with open(SENTENCES_PATH, "r", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(SOURCES_PATH, "r", encoding="utf-8") as f:
        sources = json.load(f)
    with open(LEXEME_PATH, "r", encoding="utf-8") as f:
        lexeme_index = json.load(f)
    with open(GRAMMAR_PATH, "r", encoding="utf-8") as f:
        grammar_index = json.load(f)

    source_ids_in_sources = {s["source_id"] for s in sources}
    total = len(sentences)

    # Build reverse index from lexeme_index
    # Structure: { "word": { "lemma": ..., "sentence_ids": [...], "source": ... } }
    lexeme_sentence_ids = set()
    for entry in lexeme_index.values():
        if isinstance(entry, dict) and "sentence_ids" in entry:
            lexeme_sentence_ids.update(entry["sentence_ids"])
        elif isinstance(entry, list):
            lexeme_sentence_ids.update(entry)

    # Build reverse index from grammar_index
    # Structure: { "tag": ["sentence_id", ...] }
    grammar_sentence_ids = set()
    for sid_list in grammar_index.values():
        if isinstance(sid_list, list):
            grammar_sentence_ids.update(sid_list)

    # Per-source stats
    source_stats = defaultdict(lambda: {
        "count": 0,
        "zh_empty": 0,
        "grammar_tags_empty": 0,
        "needs_review": 0,
        "ru_has_chinese": 0,
        "too_short": 0,
        "likely_title": 0,
        "mojibake": 0,
        "fragment": 0,
        "vocabulary_table_item": 0,
        "clean_sentence_candidate": 0,
        "surface_forms_empty": 0,
        "possible_lexemes_empty": 0,
    })

    all_flags_counter = Counter()
    sentence_ids_seen = []
    id_duplicates = []
    missing_source_ids = []
    quality_details = []

    for i, rec in enumerate(sentences):
        sid = rec.get("sentence_id", f"UNKNOWN-{i}")
        src = rec.get("source_id", "")
        ru = rec.get("ru", "")
        zh = rec.get("zh", "")
        grammar_tags = rec.get("grammar_tags", [])
        needs_review = rec.get("needs_review", False)
        surface_forms = rec.get("surface_forms", [])
        possible_lexemes = rec.get("possible_lexemes", [])

        # Track duplicates
        sentence_ids_seen.append(sid)

        # Check source_id exists
        if src not in source_ids_in_sources:
            missing_source_ids.append(sid)

        # Compute quality flags
        qf = compute_quality_flags(rec)
        flags = qf["quality_flags"]

        # Update per-source stats
        ss = source_stats[src]
        ss["count"] += 1
        if not zh or not zh.strip():
            ss["zh_empty"] += 1
        if not grammar_tags:
            ss["grammar_tags_empty"] += 1
        if needs_review:
            ss["needs_review"] += 1
        if "ru_has_chinese" in flags:
            ss["ru_has_chinese"] += 1
        if "too_short" in flags:
            ss["too_short"] += 1
        if "likely_title" in flags:
            ss["likely_title"] += 1
        if "mojibake" in flags:
            ss["mojibake"] += 1
        if "fragment" in flags:
            ss["fragment"] += 1
        if "vocabulary_table_item" in flags:
            ss["vocabulary_table_item"] += 1
        if "clean_sentence_candidate" in flags:
            ss["clean_sentence_candidate"] += 1
        if not surface_forms:
            ss["surface_forms_empty"] += 1
        if not possible_lexemes:
            ss["possible_lexemes_empty"] += 1

        all_flags_counter.update(flags)

        quality_details.append({
            "sentence_id": sid,
            "source_id": src,
            "quality_flags": flags,
            "quality_score": qf["quality_score"],
            "translation_status": qf["translation_status"],
            "review_reason": qf["review_reason"],
        })

    # Check for duplicate sentence_id
    id_counter = Counter(sentence_ids_seen)
    id_duplicates = {sid: cnt for sid, cnt in id_counter.items() if cnt > 1}

    # Count totals
    total_zh_empty = sum(s["zh_empty"] for s in source_stats.values())
    total_grammar_empty = sum(s["grammar_tags_empty"] for s in source_stats.values())
    total_needs_review = sum(s["needs_review"] for s in source_stats.values())
    total_surface_empty = sum(s["surface_forms_empty"] for s in source_stats.values())
    total_lexemes_empty = sum(s["possible_lexemes_empty"] for s in source_stats.values())

    # Translation queue stats
    pending_count = sum(1 for d in quality_details if d["translation_status"] == "pending")
    blocked_count = sum(1 for d in quality_details if d["translation_status"] == "blocked")
    not_needed_count = sum(1 for d in quality_details if d["translation_status"] == "not_needed")

    # Lexeme/grammar index coverage
    sentence_ids_in_sentences = {r["sentence_id"] for r in sentences}
    lexeme_not_in_sentences = lexeme_sentence_ids - sentence_ids_in_sentences
    grammar_not_in_sentences = grammar_sentence_ids - sentence_ids_in_sentences

    # Generate report
    report = []
    report.append("# 全量句子质量审计报告")
    report.append(f"\n生成时间: 2026-06-06")
    report.append(f"\n## 总览\n")
    report.append(f"| 指标 | 数值 |")
    report.append(f"|------|------|")
    report.append(f"| 总记录数 | {total} |")
    report.append(f"| source 数量 | {len(source_stats)} |")
    report.append(f"| sentence_id 重复 | {len(id_duplicates)} |")
    report.append(f"| source_id 缺失 | {len(missing_source_ids)} |")
    report.append(f"| zh 为空 | {total_zh_empty} |")
    report.append(f"| grammar_tags 为空 | {total_grammar_empty} |")
    report.append(f"| needs_review=true | {total_needs_review} |")
    report.append(f"| surface_forms 为空 | {total_surface_empty} |")
    report.append(f"| possible_lexemes 为空 | {total_lexemes_empty} |")
    report.append(f"| lexeme_index 引用不存在的 sentence_id | {len(lexeme_not_in_sentences)} |")
    report.append(f"| grammar_index 引用不存在的 sentence_id | {len(grammar_not_in_sentences)} |")
    report.append(f"")
    report.append(f"## 翻译队列统计\n")
    report.append(f"| 状态 | 数量 |")
    report.append(f"|------|------|")
    report.append(f"| pending（可翻译） | {pending_count} |")
    report.append(f"| blocked（质量不足） | {blocked_count} |")
    report.append(f"| not_needed（已有翻译） | {not_needed_count} |")
    report.append(f"")
    report.append(f"## 质量标记分布\n")
    report.append(f"| 标记 | 数量 |")
    report.append(f"|------|------|")
    for flag, cnt in all_flags_counter.most_common():
        report.append(f"| {flag} | {cnt} |")
    report.append(f"")
    report.append(f"## 每个 source_id 详细统计\n")

    for src_id in sorted(source_stats.keys()):
        ss = source_stats[src_id]
        report.append(f"### {src_id}\n")
        report.append(f"| 指标 | 数值 |")
        report.append(f"|------|------|")
        report.append(f"| 句子数 | {ss['count']} |")
        report.append(f"| zh 为空 | {ss['zh_empty']} |")
        report.append(f"| grammar_tags 为空 | {ss['grammar_tags_empty']} |")
        report.append(f"| needs_review | {ss['needs_review']} |")
        report.append(f"| ru 含中文 | {ss['ru_has_chinese']} |")
        report.append(f"| 过短碎片 | {ss['too_short']} |")
        report.append(f"| 疑似标题 | {ss['likely_title']} |")
        report.append(f"| 疑似乱码 | {ss['mojibake']} |")
        report.append(f"| 句子碎片 | {ss['fragment']} |")
        report.append(f"| 词表条目 | {ss['vocabulary_table_item']} |")
        report.append(f"| 干净句子 | {ss['clean_sentence_candidate']} |")
        report.append(f"| surface_forms 为空 | {ss['surface_forms_empty']} |")
        report.append(f"| possible_lexemes 为空 | {ss['possible_lexemes_empty']} |")
        report.append(f"")

    # Problem records
    if id_duplicates:
        report.append(f"## sentence_id 重复\n")
        for sid, cnt in sorted(id_duplicates.items()):
            report.append(f"- {sid}: {cnt} 次")
        report.append(f"")

    if missing_source_ids:
        report.append(f"## source_id 缺失的记录\n")
        for sid in missing_source_ids[:50]:
            report.append(f"- {sid}")
        if len(missing_source_ids) > 50:
            report.append(f"- ... 共 {len(missing_source_ids)} 条")
        report.append(f"")

    if lexeme_not_in_sentences:
        report.append(f"## lexeme_index 引用不存在的 sentence_id（前 30 条）\n")
        for sid in sorted(lexeme_not_in_sentences)[:30]:
            report.append(f"- {sid}")
        report.append(f"")

    if grammar_not_in_sentences:
        report.append(f"## grammar_index 引用不存在的 sentence_id\n")
        for sid in sorted(grammar_not_in_sentences):
            report.append(f"- {sid}")
        report.append(f"")

    report_text = "\n".join(report)
    report_path = REPORT_DIR / "全量句子质量审计报告.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    print(f"Report written to: {report_path}")

    # Save quality details for downstream use
    details_path = REPORT_DIR / "quality_details.json"
    with open(details_path, "w", encoding="utf-8") as f:
        json.dump(quality_details, f, ensure_ascii=False, indent=2)
    print(f"Quality details written to: {details_path}")

    # Print summary
    print(f"\n=== 审计摘要 ===")
    print(f"总记录: {total}")
    print(f"zh 为空: {total_zh_empty}")
    print(f"pending: {pending_count}, blocked: {blocked_count}, not_needed: {not_needed_count}")
    print(f"sentence_id 重复: {len(id_duplicates)}")
    print(f"source_id 缺失: {len(missing_source_ids)}")
    print(f"grammar_tags 为空: {total_grammar_empty}")
    print(f"surface_forms 为空: {total_surface_empty}")


if __name__ == "__main__":
    main()
