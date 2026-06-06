#!/usr/bin/env python3
"""
validate_example_display_quality.py — 验证例句展示质量分类
用法: python validate_example_display_quality.py
退出码: 0 = PASS, 1 = FAIL

检查:
- translated 记录都有 example_type
- translated 记录都有 display_priority
- translated 记录都有 vocabulary_card_eligible
- eligible=true 的记录必须 ru/zh 都非空
- eligible=true 的 ru 不能是明显词表项
- eligible=true 的 source/page 可追溯
"""
import json, re, sys
from pathlib import Path
from collections import Counter

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

DATA_DIR = Path(r"D:\MyStudySpace\data")

ERRORS = []
WARNINGS = []

def err(msg):
    ERRORS.append(msg)
    print(f"  ❌ ERROR: {msg}")

def warn(msg):
    WARNINGS.append(msg)
    print(f"  ⚠ WARN: {msg}")

def ok(msg):
    print(f"  ✅ {msg}")

def main():
    print("=" * 60)
    print("例句展示质量分类验证")
    print("=" * 60)

    with open(DATA_DIR / "sentences.json", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(DATA_DIR / "sources.json", encoding="utf-8") as f:
        sources = json.load(f)

    src_ids = {s["source_id"] for s in sources}
    translated = [r for r in sentences if r.get("translation_status") == "translated"]

    print(f"\n已翻译记录: {len(translated)}")

    # 1. 检查必需字段
    print("\n--- 1. 字段完整性 ---")
    missing_type = sum(1 for r in translated if "example_type" not in r)
    missing_priority = sum(1 for r in translated if "display_priority" not in r)
    missing_eligible = sum(1 for r in translated if "vocabulary_card_eligible" not in r)

    if missing_type:
        err(f"缺少 example_type: {missing_type} 条")
    else:
        ok(f"example_type 全覆盖: {len(translated)} 条")

    if missing_priority:
        err(f"缺少 display_priority: {missing_priority} 条")
    else:
        ok(f"display_priority 全覆盖: {len(translated)} 条")

    if missing_eligible:
        err(f"缺少 vocabulary_card_eligible: {missing_eligible} 条")
    else:
        ok(f"vocabulary_card_eligible 全覆盖: {len(translated)} 条")

    # 2. 分类统计
    print("\n--- 2. 分类统计 ---")
    type_counts = Counter(r.get("example_type", "unknown") for r in translated)
    for t, c in type_counts.most_common():
        eligible = sum(1 for r in translated if r.get("example_type") == t and r.get("vocabulary_card_eligible"))
        print(f"  {t}: {c} 条 (eligible: {eligible})")

    eligible_count = sum(1 for r in translated if r.get("vocabulary_card_eligible"))
    print(f"\n  总 eligible: {eligible_count}/{len(translated)}")

    # 3. eligible 记录检查
    print("\n--- 3. eligible 记录质量 ---")
    eligible_records = [r for r in translated if r.get("vocabulary_card_eligible")]

    empty_ru = sum(1 for r in eligible_records if not r.get("ru", "").strip())
    empty_zh = sum(1 for r in eligible_records if not r.get("zh", "").strip())
    no_source = sum(1 for r in eligible_records if r.get("source_id") not in src_ids)

    # 检查词表项误标为 eligible
    vocab_in_eligible = 0
    for r in eligible_records:
        ru = r.get("ru", "")
        if re.search(r'[́̀̆]|нсв\s|св\s|гл\.\s|сущ\.\s', ru):
            vocab_in_eligible += 1
            if vocab_in_eligible <= 3:
                warn(f"eligible 中含词表项: {r['sentence_id']} | {ru[:60]}")

    if empty_ru:
        err(f"eligible ru 为空: {empty_ru} 条")
    else:
        ok(f"eligible ru 全非空: {len(eligible_records)} 条")

    if empty_zh:
        err(f"eligible zh 为空: {empty_zh} 条")
    else:
        ok(f"eligible zh 全非空: {len(eligible_records)} 条")

    if no_source:
        err(f"eligible source_id 不存在: {no_source} 条")
    else:
        ok(f"eligible source 全可追溯")

    if vocab_in_eligible:
        warn(f"eligible 中含词表项: {vocab_in_eligible} 条")
    else:
        ok("eligible 中无词表项")

    # 4. 非 eligible 记录检查
    print("\n--- 4. 非 eligible 记录 ---")
    not_eligible = [r for r in translated if not r.get("vocabulary_card_eligible")]
    print(f"  非 eligible: {len(not_eligible)} 条")
    for t in ['vocabulary_table', 'fragment', 'metadata']:
        count = sum(1 for r in not_eligible if r.get("example_type") == t)
        if count:
            print(f"    {t}: {count}")

    # Summary
    print("\n" + "=" * 60)
    if ERRORS:
        print(f"❌ 校验失败: {len(ERRORS)} 个错误, {len(WARNINGS)} 个警告")
        for e in ERRORS:
            print(f"  - {e}")
        return 1
    else:
        print(f"✅ 校验通过: 0 个错误, {len(WARNINGS)} 个警告")
        return 0

if __name__ == "__main__":
    sys.exit(main())
