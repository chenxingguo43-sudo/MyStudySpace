#!/usr/bin/env python3
"""
翻译队列一致性校验 v3。
检查:
1. manifest 与实际 pending 文件完全一致
2. manifest total_pending == 实际 pending 总数
3. 每条 pending ru 的 Cyrillic 占比达标 (>= 0.6)
4. ru 不含 CJK mojibake
5. done 目录若存在，zh 必须是正常中文
6. pending/rejected/done 三者 sentence_id 不冲突
7. 每条 pending item 有 sentence_id/source_id/ru
8. pending 中的 sentence_id 全部存在于 sentences.json
"""
import json, re, sys
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


def cyrillic_ratio(text):
    """计算文本中 Cyrillic 字母占比"""
    alpha = [c for c in text if c.isalpha()]
    if not alpha:
        return 0
    cyr = sum(1 for c in alpha if 'Ѐ' <= c <= 'ӿ' or c in 'ёЁ')
    return cyr / len(alpha)


def has_cjk_mojibake(text):
    """检测 CJK mojibake 字符"""
    for c in text:
        cp = ord(c)
        if 0x4E00 <= cp <= 0x9FFF or 0x3400 <= cp <= 0x4DBF:
            return True
    return False


def has_garbled_zh(text):
    """检测中文翻译是否为乱码"""
    if not text:
        return False
    # 检查是否有常见 mojibake 模式
    garbled_patterns = ['鍦', '紬', '绋', '紓', '绋', '鎮', 'ㄥ', '鏂']
    for p in garbled_patterns:
        if p in text:
            return True
    # CJK 字符占比异常低（应该有大量 CJK）
    cjk = sum(1 for c in text if 0x4E00 <= ord(c) <= 0x9FFF)
    if len(text) > 10 and cjk / len(text) < 0.05:
        return True
    return False


def main():
    print("=" * 60)
    print("翻译队列一致性校验 v3")
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

    # 2. Load manifest
    print("\n--- 2. manifest 校验 ---")
    manifest_path = QUEUE_DIR / "manifest.json"
    if not manifest_path.exists():
        err("manifest.json 不存在")
        return 1
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        ok("manifest.json 可解析")
    except Exception as e:
        err(f"manifest.json 解析失败: {e}")
        return 1

    manifest_total = manifest.get("total_pending", 0)
    manifest_batches = {b["batch_id"]: b["item_count"] for b in manifest.get("batches", [])}
    ok(f"manifest 声明: {manifest_total} pending, {len(manifest_batches)} batches")

    # 3. Scan pending files
    print("\n--- 3. pending/*.json 校验 ---")
    pending_dir = QUEUE_DIR / "pending"
    if not pending_dir.exists():
        err(f"pending 目录不存在: {pending_dir}")
        return 1

    pending_files = sorted(pending_dir.glob("*.json"))
    if not pending_files:
        warn("pending/ 目录为空")

    all_pending_sids = []
    actual_total = 0
    actual_batches = {}
    cyrillic_fail = 0
    cjk_mojibake = 0

    for pf in pending_files:
        try:
            with open(pf, "r", encoding="utf-8-sig") as f:
                batch = json.load(f)
        except Exception as e:
            err(f"{pf.name} 解析失败: {e}")
            continue

        batch_id = batch.get("batch_id", pf.stem)
        items = batch.get("items", [])
        actual_batches[batch_id] = len(items)
        actual_total += len(items)

        for i, item in enumerate(items):
            # Required fields
            for field in ["sentence_id", "source_id", "ru"]:
                if field not in item:
                    err(f"{pf.name}[{i}] 缺少 {field}")

            sid = item.get("sentence_id", "")
            ru = item.get("ru", "")
            all_pending_sids.append(sid)

            # Cyrillic ratio
            ratio = cyrillic_ratio(ru)
            if ratio < 0.6 and len(ru) > 5:
                cyrillic_fail += 1
                if cyrillic_fail <= 3:
                    err(f"{pf.name} {sid}: Cyrillic 占比 {ratio:.0%} < 60% | {ru[:60]}")

            # CJK mojibake
            if has_cjk_mojibake(ru):
                cjk_mojibake += 1
                if cjk_mojibake <= 3:
                    err(f"{pf.name} {sid}: 含 CJK mojibake | {ru[:60]}")

            # Check sentence_id exists in sentences.json
            if sid and sid not in sent_map:
                err(f"{pf.name} 引用不存在的 sentence_id: {sid}")

    ok(f"pending 文件: {len(pending_files)} 个")
    ok(f"pending 实际总条目: {actual_total}")

    if cyrillic_fail:
        err(f"Cyrillic 占比不达标: {cyrillic_fail} 条")
    else:
        ok("所有 pending ru Cyrillic 占比 >= 60%")

    if cjk_mojibake:
        err(f"含 CJK mojibake: {cjk_mojibake} 条")
    else:
        ok("所有 pending ru 不含 CJK mojibake")

    # 4. Manifest consistency
    print("\n--- 4. manifest 一致性 ---")
    if actual_total != manifest_total:
        err(f"manifest total_pending={manifest_total} != 实际 {actual_total}")
    else:
        ok(f"total_pending 一致: {actual_total}")

    if actual_batches != manifest_batches:
        missing = set(manifest_batches) - set(actual_batches)
        extra = set(actual_batches) - set(manifest_batches)
        mismatch = {k for k in actual_batches if k in manifest_batches and actual_batches[k] != manifest_batches[k]}
        if missing:
            err(f"manifest 有但实际没有: {missing}")
        if extra:
            err(f"实际有但 manifest 没有: {extra}")
        if mismatch:
            for k in sorted(mismatch):
                err(f"batch {k}: manifest={manifest_batches[k]}, actual={actual_batches[k]}")
    else:
        ok("所有 batch 与 manifest 完全一致")

    # 5. Cross-file duplicate check
    print("\n--- 5. 跨文件重复检查 ---")
    sid_counts = Counter(all_pending_sids)
    dup_sids = [sid for sid, cnt in sid_counts.items() if cnt > 1]
    if dup_sids:
        err(f"跨文件重复 sentence_id: {len(dup_sids)} 个")
        for sid in dup_sids[:5]:
            err(f"  {sid}")
    else:
        ok(f"无跨文件重复 (唯一: {len(set(all_pending_sids))})")

    # 6. Check rejected
    print("\n--- 6. rejected 校验 ---")
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
        warn("rejected 目录不存在")

    # 7. Check done
    print("\n--- 7. done 校验 ---")
    done_dir = QUEUE_DIR / "done"
    done_sids = set()
    if done_dir.exists():
        done_files = sorted(done_dir.glob("*.json"))
        bad_zh = 0
        for df in done_files:
            try:
                with open(df, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                translations = data.get("translations", [])
                for t in translations:
                    sid = t.get("sentence_id", "")
                    done_sids.add(sid)
                    zh = t.get("zh", "")
                    if has_garbled_zh(zh):
                        bad_zh += 1
                        if bad_zh <= 3:
                            err(f"{df.name} {sid}: zh 乱码 | {zh[:60]}")
            except Exception as e:
                err(f"{df.name} 解析失败: {e}")
        if done_files:
            ok(f"done: {len(done_sids)} 条")
            if bad_zh:
                err(f"done 中 zh 乱码: {bad_zh} 条")
            else:
                ok("done zh 翻译正常")
        else:
            ok("done 目录为空")
    else:
        ok("done 目录不存在")

    # 8. Overlap check: pending/rejected/done
    print("\n--- 8. 三者冲突检查 ---")
    pending_set = set(all_pending_sids)
    pr_overlap = pending_set & rejected_sids
    pd_overlap = pending_set & done_sids
    rd_overlap = rejected_sids & done_sids
    if pr_overlap:
        err(f"pending/rejected 重叠: {len(pr_overlap)} 条")
    else:
        ok("pending/rejected 无重叠")
    if pd_overlap:
        err(f"pending/done 重叠: {len(pd_overlap)} 条")
    else:
        ok("pending/done 无重叠")
    if rd_overlap:
        err(f"rejected/done 重叠: {len(rd_overlap)} 条")
    else:
        ok("rejected/done 无重叠")

    # 9. File details
    print("\n--- 9. 文件详情 ---")
    for batch_id in sorted(actual_batches.keys()):
        count = actual_batches[batch_id]
        manifest_count = manifest_batches.get(batch_id, "?")
        match = "✅" if count == manifest_count else f"❌ manifest={manifest_count}"
        print(f"  {batch_id}.json: {count} 条 {match}")

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
