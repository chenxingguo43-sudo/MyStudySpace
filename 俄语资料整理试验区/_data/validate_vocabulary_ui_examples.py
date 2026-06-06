#!/usr/bin/env python3
"""
validate_vocabulary_ui_examples.py — 验证背单词页 UI 例句展示逻辑
用法: python validate_vocabulary_ui_examples.py

模拟 vocabulary.html 的 lookupSourceExamples 逻辑，验证筛选和排序。
"""
import json, random, sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

DATA_DIR = Path(r"D:\MyStudySpace\data")

def main():
    print("=" * 60)
    print("背单词页 UI 例句展示验证")
    print("=" * 60)

    with open(DATA_DIR / "sentences.json", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(DATA_DIR / "lexeme_index.json", encoding="utf-8") as f:
        lexeme = json.load(f)
    with open(DATA_DIR / "sources.json", encoding="utf-8") as f:
        sources = json.load(f)

    sent_map = {r["sentence_id"]: r for r in sentences}
    src_map = {s["source_id"]: s for s in sources}

    # 模拟 lookupSourceExamples 筛选逻辑
    def lookup(word):
        candidates = [word.lower()]
        results = []
        seen = set()
        source_count = {}

        for cand in candidates:
            entry = lexeme.get(cand)
            if not entry:
                continue
            for sid in entry.get("sentence_ids", []):
                if sid in seen:
                    continue
                seen.add(sid)

                s = sent_map.get(sid)
                if not s:
                    continue
                if s.get("translation_status") != "translated":
                    continue
                if not s.get("zh", "").strip():
                    continue
                if not s.get("vocabulary_card_eligible"):
                    continue
                et = s.get("example_type", "")
                if et not in ("natural_sentence", "grammar_example"):
                    continue

                src_id = s.get("source_id", "")
                if not source_count.get(src_id):
                    source_count[src_id] = 0
                if source_count[src_id] >= 2:
                    continue
                source_count[src_id] += 1

                results.append(s)

        # 排序
        type_priority = {"natural_sentence": 1, "grammar_example": 0}
        results.sort(key=lambda r: (
            -(r.get("display_priority", 0)),
            -type_priority.get(r.get("example_type", ""), 0),
            -(r.get("quality_score", 0))
        ))

        return results[:3]

    # 测试 20 个 eligible 记录的 surface_forms
    eligible = [r for r in sentences if r.get("vocabulary_card_eligible") and r.get("translation_status") == "translated"]
    random.seed(2026)
    samples = random.sample(eligible, min(20, len(eligible)))

    ok_count = 0
    fail_count = 0

    print(f"\n--- 测试 20 个 eligible 记录的 surface_forms ---")
    for r in samples:
        sfs = r.get("surface_forms", [])
        if not sfs:
            continue
        sf = sfs[0].lower()
        results = lookup(sf)

        # 检查: lookup 是否返回有效结果 (不一定包含该特定句子)
        if results:
            ok_count += 1
        else:
            fail_count += 1
            print(f"  ❌ {sf} -> 无结果 (sentence: {r['sentence_id']})")

    print(f"\n结果: {ok_count} 通过, {fail_count} 失败")

    # 验证筛选逻辑
    print(f"\n--- 筛选逻辑验证 ---")
    translated = [r for r in sentences if r.get("translation_status") == "translated"]
    eligible_t = [r for r in translated if r.get("vocabulary_card_eligible")]
    ns = [r for r in eligible_t if r.get("example_type") == "natural_sentence"]
    ge = [r for r in eligible_t if r.get("example_type") == "grammar_example"]
    vt = [r for r in eligible_t if r.get("example_type") == "vocabulary_table"]
    print(f"  translated: {len(translated)}")
    print(f"  eligible: {len(eligible_t)}")
    print(f"  natural_sentence: {len(ns)}")
    print(f"  grammar_example: {len(ge)}")
    print(f"  vocabulary_table in eligible (should be 0): {len(vt)}")

    # 验证排序: 抽一个有多种类型结果的词
    print(f"\n--- 排序验证 ---")
    test_words = ["книга", "студент", "работать", "город", "знать"]
    for tw in test_words:
        results = lookup(tw)
        if results:
            types = [r.get("example_type", "?") for r in results]
            priorities = [r.get("display_priority", 0) for r in results]
            print(f"  {tw}: {len(results)} 条, types={types}, priorities={priorities}")

    if fail_count == 0:
        print(f"\n✅ 全部通过")
        return 0
    else:
        print(f"\n❌ 有 {fail_count} 个失败")
        return 1


if __name__ == "__main__":
    sys.exit(main())
