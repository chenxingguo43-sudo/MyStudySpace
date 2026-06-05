#!/usr/bin/env python3
"""
生成翻译队列：
- pending/*.json: 可翻译批次
- rejected/rejected_records.json: 不适合翻译的记录
- manifest.json: 队列总览
"""
import json
import re
from datetime import datetime
from pathlib import Path

BASE = Path(r"D:\MyStudySpace")
SENTENCES_PATH = BASE / "data" / "sentences.json"
FLAGS_PATH = BASE / "俄语资料整理试验区" / "_translation_queue" / "quality_flags.json"
OUTPUT_DIR = BASE / "俄语资料整理试验区" / "_translation_queue"

BATCH_SIZE = 50

# These flags mean the record should NOT go to translation
REJECT_FLAGS = {"mojibake", "author_name", "book_metadata", "page_number_or_label", "ru_has_chinese", "likely_title"}

# These flags are borderline — include in pending but mark quality
LOW_QUALITY_FLAGS = {"fragment", "too_short", "vocabulary_table_item"}


def build_context(sentences, idx, source_id):
    """Get context_before and context_after from neighboring records."""
    ctx_before = ""
    ctx_after = ""
    # Look backwards
    for i in range(idx - 1, max(0, idx - 3), -1):
        if sentences[i].get("source_id") == source_id:
            ctx_before = sentences[i].get("ru", "")
            break
    # Look forwards
    for i in range(idx + 1, min(len(sentences), idx + 3)):
        if sentences[i].get("source_id") == source_id:
            ctx_after = sentences[i].get("ru", "")
            break
    return ctx_before, ctx_after


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "pending").mkdir(exist_ok=True)
    (OUTPUT_DIR / "rejected").mkdir(exist_ok=True)

    with open(SENTENCES_PATH, "r", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(FLAGS_PATH, "r", encoding="utf-8") as f:
        quality_flags = json.load(f)

    # Build sentence index for context lookup
    sid_to_idx = {}
    for i, rec in enumerate(sentences):
        sid_to_idx[rec["sentence_id"]] = i

    pending_items = []
    rejected_items = []

    for i, rec in enumerate(sentences):
        sid = rec["sentence_id"]
        qf = quality_flags.get(sid, {})
        flags = set(qf.get("quality_flags", []))
        status = qf.get("translation_status", "pending")

        # Skip already translated
        if status == "not_needed":
            continue

        # Skip blocked records
        if status == "blocked":
            rejected_items.append({
                "sentence_id": sid,
                "source_id": rec.get("source_id", ""),
                "ru": rec.get("ru", ""),
                "quality_flags": list(flags),
                "quality_score": qf.get("quality_score", 0),
                "reject_reason": qf.get("review_reason", "blocked by quality_flags"),
            })
            continue

        # Check if should be rejected by flag-based rules
        should_reject = bool(flags & REJECT_FLAGS)
        # Also reject if score is very low
        if qf.get("quality_score", 100) < 30:
            should_reject = True

        if should_reject:
            rejected_items.append({
                "sentence_id": sid,
                "source_id": rec.get("source_id", ""),
                "ru": rec.get("ru", ""),
                "quality_flags": list(flags),
                "quality_score": qf.get("quality_score", 0),
                "reject_reason": qf.get("review_reason", ""),
            })
            continue

        # Build pending item
        ctx_before, ctx_after = build_context(sentences, i, rec.get("source_id", ""))
        pending_items.append({
            "sentence_id": sid,
            "source_id": rec.get("source_id", ""),
            "page_or_location": rec.get("page_or_location", ""),
            "ru": rec.get("ru", ""),
            "context_before": ctx_before,
            "context_after": ctx_after,
            "quality_flags": list(flags),
            "quality_score": qf.get("quality_score", 100),
        })

    # Split into batches
    batches = []
    for batch_start in range(0, len(pending_items), BATCH_SIZE):
        batch_items = pending_items[batch_start:batch_start + BATCH_SIZE]
        batch_id = f"batch-{datetime.now().strftime('%Y%m%d')}-{len(batches) + 1:03d}"
        source_ids = list(set(item["source_id"] for item in batch_items))

        batch = {
            "batch_id": batch_id,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source_ids": source_ids,
            "items": [],
        }
        for j, item in enumerate(batch_items):
            batch["items"].append({
                "i": j + 1,
                "sentence_id": item["sentence_id"],
                "source_id": item["source_id"],
                "page_or_location": item["page_or_location"],
                "ru": item["ru"],
                "context_before": item["context_before"],
                "context_after": item["context_after"],
            })
        batches.append(batch)

    # Write pending batches
    for batch in batches:
        batch_path = OUTPUT_DIR / "pending" / f"{batch['batch_id']}.json"
        with open(batch_path, "w", encoding="utf-8") as f:
            json.dump(batch, f, ensure_ascii=False, indent=2)

    # Write rejected
    rejected_path = OUTPUT_DIR / "rejected" / "rejected_records.json"
    with open(rejected_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_rejected": len(rejected_items),
            "records": rejected_items,
        }, f, ensure_ascii=False, indent=2)

    # Write manifest
    manifest = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_pending": len(pending_items),
        "total_rejected": len(rejected_items),
        "total_batches": len(batches),
        "batch_size": BATCH_SIZE,
        "batches": [
            {
                "batch_id": b["batch_id"],
                "item_count": len(b["items"]),
                "source_ids": b["source_ids"],
            }
            for b in batches
        ],
        "reject_reasons": {},
    }
    # Count reject reasons
    from collections import Counter
    reason_counter = Counter()
    for item in rejected_items:
        for flag in item["quality_flags"]:
            reason_counter[flag] += 1
    manifest["reject_reasons"] = dict(reason_counter.most_common())

    manifest_path = OUTPUT_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Print summary
    print(f"=== 翻译队列生成完成 ===")
    print(f"pending: {len(pending_items)} 条, {len(batches)} 批")
    print(f"rejected: {len(rejected_items)} 条")
    print(f"reject reasons: {dict(reason_counter.most_common())}")
    print(f"\n批次分布:")
    for b in batches:
        print(f"  {b['batch_id']}: {len(b['items'])} 条, sources={b['source_ids']}")


if __name__ == "__main__":
    main()
