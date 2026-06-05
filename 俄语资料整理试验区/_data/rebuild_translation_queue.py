#!/usr/bin/env python3
"""
rebuild_translation_queue.py — 从 sentences.json 重建翻译队列
用法: python rebuild_translation_queue.py [--batch-size 50]

规则:
- quality_score < 50 → rejected (not pending)
- quality_flags 含 fragment / title_like / artifact / chinese_in_ru → rejected
- translation_status == 'translated' → skip
- 其余 → pending
- pending 只含真实可读俄语句子
- manifest 统计必须与实际 pending 文件一致
"""
import json, re, sys
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict

DATA_DIR = Path(__file__).parent.parent.parent / "data"
QUEUE_DIR = Path(__file__).parent.parent / "_translation_queue"
PENDING_DIR = QUEUE_DIR / "pending"
REJECTED_DIR = QUEUE_DIR / "rejected"

REJECT_FLAGS = {'fragment', 'title_like', 'artifact', 'chinese_in_ru', 'low_cyrillic_ratio', 'no_terminal_punct'}

def load_sentences():
    with open(DATA_DIR / "sentences.json", encoding="utf-8") as f:
        return json.load(f)

def is_rejected(record):
    """判断是否应 rejected"""
    flags = set(record.get("quality_flags", []))
    score = record.get("quality_score", 100)
    ru = record.get("ru", "")

    # 低分直接拒绝
    if score < 70:
        return True, "low_quality_score"

    # 质量标记
    if flags & REJECT_FLAGS:
        return True, ", ".join(sorted(flags & REJECT_FLAGS))

    # 短于 25 字符 → fragment
    if len(ru) < 25:
        return True, "fragment"

    # 无句末标点 → likely_title 或 fragment
    if not re.search(r'[.!?...]\s*$', ru.strip()):
        return True, "no_terminal_punct"

    # 词汇表条目: 含重音标记 + 短
    if re.search(r'[́̀̆]', ru) and len(ru) < 80:
        return True, "vocabulary_table_item"

    # mojibake 检测
    if re.search(r'[袧械芯褩褌懈泻谢阉胁薪屑]', ru):
        return True, "mojibake"

    return False, ""

def is_translated(record):
    return record.get("translation_status") == "translated"

def rebuild(batch_size=50):
    sentences = load_sentences()
    print(f"加载 sentences.json: {len(sentences)} 条")

    # 建立上下文查找表: source_id -> [(page, sentence_id, ru), ...]
    from collections import defaultdict
    by_source = defaultdict(list)
    for r in sentences:
        by_source[r["source_id"]].append(r)
    for sid in by_source:
        by_source[sid].sort(key=lambda x: x.get("page_or_location", ""))

    pending_items = []
    rejected_items = []
    skipped_translated = 0

    for r in sentences:
        if is_translated(r):
            skipped_translated += 1
            continue
        rej, reason = is_rejected(r)
        if rej:
            rejected_items.append({
                "sentence_id": r["sentence_id"],
                "source_id": r["source_id"],
                "ru": r["ru"],
                "quality_flags": r.get("quality_flags", []),
                "quality_score": r.get("quality_score", 0),
                "reject_reason": reason
            })
        else:
            pending_items.append(r)

    print(f"翻译状态: translated={skipped_translated}, pending={len(pending_items)}, rejected={len(rejected_items)}")

    # ── 清空旧文件 ──
    for f in PENDING_DIR.glob("*.json"):
        f.unlink()
    for f in REJECTED_DIR.glob("*.json"):
        f.unlink()

    # ── 写 rejected ──
    rej_data = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_rejected": len(rejected_items),
        "records": rejected_items
    }
    with open(REJECTED_DIR / "rejected_records.json", "w", encoding="utf-8") as f:
        json.dump(rej_data, f, ensure_ascii=False, indent=2)
    print(f"写入 rejected: {len(rejected_items)} 条")

    # ── 分批写 pending ──
    batches = []
    for i in range(0, len(pending_items), batch_size):
        batch_items = pending_items[i:i+batch_size]
        batch_num = len(batches) + 1
        batch_id = f"batch-20260606-{batch_num:03d}"

        # 收集该批次的 source_ids
        src_ids = sorted(set(r["source_id"] for r in batch_items))

        # 构建 items
        items = []
        for idx, r in enumerate(batch_items):
            # 查找上下文
            src_list = by_source.get(r["source_id"], [])
            ctx_before = ""
            ctx_after = ""
            for si, sr in enumerate(src_list):
                if sr["sentence_id"] == r["sentence_id"]:
                    if si > 0:
                        ctx_before = src_list[si-1].get("ru", "")[:100]
                    if si < len(src_list) - 1:
                        ctx_after = src_list[si+1].get("ru", "")[:100]
                    break

            items.append({
                "i": idx + 1,
                "sentence_id": r["sentence_id"],
                "source_id": r["source_id"],
                "page_or_location": r.get("page_or_location", ""),
                "ru": r["ru"],
                "context_before": ctx_before,
                "context_after": ctx_after
            })

        batch_data = {
            "batch_id": batch_id,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source_ids": src_ids,
            "items": items
        }

        batch_path = PENDING_DIR / f"{batch_id}.json"
        with open(batch_path, "w", encoding="utf-8") as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)

        batches.append({
            "batch_id": batch_id,
            "item_count": len(items),
            "source_ids": src_ids
        })

    print(f"写入 pending: {len(batches)} 个批次, {len(pending_items)} 条")

    # ── 写 manifest ──
    reject_reasons = Counter(item["reject_reason"] for item in rejected_items)
    manifest = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_pending": len(pending_items),
        "total_rejected": len(rejected_items),
        "total_batches": len(batches),
        "batch_size": batch_size,
        "batches": batches,
        "reject_reasons": dict(reject_reasons.most_common())
    }
    with open(QUEUE_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"写入 manifest: {len(pending_items)} pending, {len(rejected_items)} rejected, {len(batches)} batches")

    # ── 验证一致性 ──
    actual_items = 0
    for pf in sorted(PENDING_DIR.glob("*.json")):
        with open(pf, encoding="utf-8") as f:
            data = json.load(f)
        actual_items += len(data.get("items", []))
    assert actual_items == len(pending_items), f"不一致: manifest={len(pending_items)}, actual={actual_items}"
    print(f"一致性验证: ✅ manifest 与实际文件一致 ({actual_items} 条)")

if __name__ == "__main__":
    batch_size = 50
    for arg in sys.argv[1:]:
        if arg.startswith("--batch-size"):
            batch_size = int(arg.split("=")[1]) if "=" in arg else int(sys.argv[sys.argv.index(arg)+1])
    rebuild(batch_size)
