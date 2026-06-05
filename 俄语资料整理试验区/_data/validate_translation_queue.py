#!/usr/bin/env python3
"""
翻译队列一致性校验。
检查:
- pending/*.json 格式正确
- 每个 pending item 有 sentence_id/source_id/ru/i
- pending 中的 sentence_id 全部存在于 sentences.json
- pending 与 rejected 不重复
- manifest.json 与实际 pending 文件一致
- 不输出 API key
"""
import json
import sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

BASE = Path(r"D:\MyStudySpace")
QUEUE_DIR = BASE / "俄语资料整理试验区" / "_translation_queue"
SENTENCES_PATH = BASE / "data" / "sentences.json"

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
    print("翻译队列一致性校验")
    print("=" * 60)

    # 1. Load sentences.json for reference
    print("\n--- 1. 加载参考数据 ---")
    try:
        with open(SENTENCES_PATH, "r", encoding="utf-8") as f:
            sentences = json.load(f)
        sentence_ids = {r["sentence_id"] for r in sentences}
        ok(f"sentences.json: {len(sentence_ids)} 条")
    except Exception as e:
        err(f"sentences.json 加载失败: {e}")
        return 1

    # 2. Load manifest
    print("\n--- 2. manifest.json 校验 ---")
    manifest_path = QUEUE_DIR / "manifest.json"
    if not manifest_path.exists():
        err("manifest.json 不存在")
        return 1

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        ok(f"manifest.json 可解析")
    except Exception as e:
        err(f"manifest.json 解析失败: {e}")
        return 1

    manifest_batch_ids = {b["batch_id"] for b in manifest.get("batches", [])}
    manifest_total = manifest.get("total_pending", 0)
    ok(f"manifest 声明: {manifest_total} 条 pending, {len(manifest_batch_ids)} 批")

    # 3. Scan pending files
    print("\n--- 3. pending/*.json 校验 ---")
    pending_dir = QUEUE_DIR / "pending"
    pending_files = sorted(pending_dir.glob("*.json"))

    if not pending_files:
        err("pending/ 目录为空")
        return 1

    all_pending_sids = set()
    all_pending_items = 0
    batch_ids_found = set()

    for pf in pending_files:
        try:
            with open(pf, "r", encoding="utf-8") as f:
                batch = json.load(f)
        except Exception as e:
            err(f"{pf.name} 解析失败: {e}")
            continue

        batch_id = batch.get("batch_id", "")
        batch_ids_found.add(batch_id)

        items = batch.get("items", [])
        if not items:
            warn(f"{pf.name} items 为空")
            continue

        for item in items:
            all_pending_items += 1
            # Check required fields
            for field in ["sentence_id", "source_id", "ru", "i"]:
                if field not in item:
                    err(f"{pf.name} item {item.get('i', '?')} 缺少 {field}")

            sid = item.get("sentence_id", "")
            if sid in all_pending_sids:
                err(f"sentence_id 重复出现在 pending: {sid}")
            all_pending_sids.add(sid)

            # Check sentence_id exists in sentences.json
            if sid and sid not in sentence_ids:
                err(f"pending 中 sentence_id 不存在于 sentences.json: {sid}")

    ok(f"pending 文件: {len(pending_files)} 个")
    ok(f"pending 总条目: {all_pending_items}")
    ok(f"pending 唯一 sentence_id: {len(all_pending_sids)}")

    # 4. Check rejected
    print("\n--- 4. rejected 校验 ---")
    rejected_path = QUEUE_DIR / "rejected" / "rejected_records.json"
    rejected_sids = set()
    if rejected_path.exists():
        try:
            with open(rejected_path, "r", encoding="utf-8") as f:
                rejected = json.load(f)
            rejected_sids = {r["sentence_id"] for r in rejected.get("records", [])}
            ok(f"rejected: {len(rejected_sids)} 条")
        except Exception as e:
            err(f"rejected_records.json 解析失败: {e}")
    else:
        warn("rejected_records.json 不存在")

    # 5. Check no overlap between pending and rejected
    print("\n--- 5. pending/rejected 重叠检查 ---")
    overlap = all_pending_sids & rejected_sids
    if overlap:
        err(f"pending 与 rejected 重叠: {len(overlap)} 条")
        for s in sorted(list(overlap))[:10]:
            print(f"    {s}")
    else:
        ok("pending 与 rejected 无重叠")

    # 6. Manifest consistency
    print("\n--- 6. manifest 一致性 ---")
    if batch_ids_found != manifest_batch_ids:
        missing_in_fs = manifest_batch_ids - batch_ids_found
        extra_in_fs = batch_ids_found - manifest_batch_ids
        if missing_in_fs:
            err(f"manifest 中有但文件系统没有的 batch: {missing_in_fs}")
        if extra_in_fs:
            warn(f"文件系统有但 manifest 中没有的 batch: {extra_in_fs}")
    else:
        ok("manifest batch_id 与文件系统一致")

    if all_pending_items != manifest_total:
        warn(f"manifest 声明 {manifest_total} 条, 实际 {all_pending_items} 条")
    else:
        ok(f"manifest 条目数一致: {all_pending_items}")

    # 7. Security check
    print("\n--- 7. 安全检查 ---")
    import re
    for pf in pending_files:
        text = pf.read_text(encoding="utf-8")
        if re.search(r'(api[_-]?key|secret|token)\s*[:=]\s*["\'][^"\']{8,}', text, re.IGNORECASE):
            err(f"{pf.name} 可能包含 API key!")
    ok("pending 文件无 API key 泄露")

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
