#!/usr/bin/env python3
"""
翻译队列一致性校验 v2。
检查:
- pending/*.json 格式正确
- 每个 pending item 有 sentence_id/source_id/ru
- pending 中的 sentence_id 全部存在于 sentences.json
- 对应 sentence 的 translation_status 确实是 untranslated
- pending 中的 sentence_id 无跨文件重复
- pending 与 rejected 不重复
"""
import json
import sys
from pathlib import Path
from collections import Counter

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
    print("翻译队列一致性校验 v2")
    print("=" * 60)

    # 1. Load sentences.json
    print("\n--- 1. 加载参考数据 ---")
    try:
        with open(SENTENCES_PATH, "r", encoding="utf-8") as f:
            sentences = json.load(f)
        sent_map = {r["sentence_id"]: r for r in sentences}
        ok(f"sentences.json: {len(sent_map)} 条")
    except Exception as e:
        err(f"sentences.json 加载失败: {e}")
        return 1

    # 2. Scan pending files
    print("\n--- 2. pending/*.json 校验 ---")
    pending_dir = QUEUE_DIR / "pending"
    if not pending_dir.exists():
        err(f"pending 目录不存在: {pending_dir}")
        return 1

    pending_files = sorted(pending_dir.glob("*.json"))
    if not pending_files:
        warn("pending/ 目录为空")
        return 0

    all_pending_sids = []
    all_pending_items = 0
    file_stats = []

    for pf in pending_files:
        try:
            with open(pf, "r", encoding="utf-8-sig") as f:
                batch = json.load(f)
        except Exception as e:
            err(f"{pf.name} 解析失败: {e}")
            continue

        # 检查必需字段
        for field in ["source_id", "items"]:
            if field not in batch:
                err(f"{pf.name} 缺少字段: {field}")

        items = batch.get("items", [])
        source_id = batch.get("source_id", pf.stem)
        file_sids = []
        file_missing = 0
        file_already_translated = 0

        for i, item in enumerate(items):
            all_pending_items += 1

            # Check required fields
            for field in ["sentence_id", "source_id", "ru"]:
                if field not in item:
                    err(f"{pf.name}[{i}] 缺少 {field}")

            sid = item.get("sentence_id", "")
            file_sids.append(sid)

            # Check sentence_id exists
            if sid and sid not in sent_map:
                file_missing += 1
                if file_missing <= 3:
                    err(f"{pf.name} 引用不存在的 sentence_id: {sid}")

            # Check translation_status
            if sid in sent_map:
                rec = sent_map[sid]
                if rec.get("translation_status") == "translated":
                    file_already_translated += 1

        all_pending_sids.extend(file_sids)
        file_stats.append({
            "file": pf.name,
            "source_id": source_id,
            "items": len(items),
            "missing": file_missing,
            "already_translated": file_already_translated
        })

    ok(f"pending 文件: {len(pending_files)} 个")
    ok(f"pending 总条目: {all_pending_items}")

    # 3. Cross-file duplicate check
    print("\n--- 3. 跨文件重复检查 ---")
    sid_counts = Counter(all_pending_sids)
    dup_sids = [sid for sid, cnt in sid_counts.items() if cnt > 1]
    if dup_sids:
        err(f"跨文件重复 sentence_id: {len(dup_sids)} 个")
        for sid in dup_sids[:5]:
            err(f"  {sid}")
    else:
        ok(f"无跨文件重复 (唯一 sentence_id: {len(set(all_pending_sids))})")

    # 4. Check rejected
    print("\n--- 4. rejected 校验 ---")
    rejected_dir = QUEUE_DIR / "rejected"
    rejected_sids = set()
    if rejected_dir.exists():
        for rf in rejected_dir.glob("*.json"):
            try:
                with open(rf, "r", encoding="utf-8") as f:
                    rej = json.load(f)
                if isinstance(rej, list):
                    rejected_sids.update(r.get("sentence_id", "") for r in rej)
                elif isinstance(rej, dict):
                    rejected_sids.update(r.get("sentence_id", "") for r in rej.get("records", []))
            except Exception as e:
                err(f"{rf.name} 解析失败: {e}")
        if rejected_sids:
            ok(f"rejected: {len(rejected_sids)} 条")
        else:
            warn("rejected 目录为空")
    else:
        warn("rejected 目录不存在")

    # 5. Overlap check
    print("\n--- 5. pending/rejected 重叠检查 ---")
    pending_set = set(all_pending_sids)
    overlap = pending_set & rejected_sids
    if overlap:
        err(f"pending 与 rejected 重叠: {len(overlap)} 条")
        for s in sorted(list(overlap))[:5]:
            err(f"  {s}")
    else:
        ok("pending 与 rejected 无重叠")

    # 6. File details
    print("\n--- 6. 文件详情 ---")
    for fs in file_stats:
        issues = []
        if fs["missing"]:
            issues.append(f"missing={fs['missing']}")
        if fs["already_translated"]:
            issues.append(f"already_translated={fs['already_translated']}")
        issue_str = f" [{', '.join(issues)}]" if issues else ""
        print(f"  {fs['file']}: {fs['items']} 条{issue_str}")

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
