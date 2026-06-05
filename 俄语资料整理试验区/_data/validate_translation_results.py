#!/usr/bin/env python3
"""
validate_translation_results.py — 验证翻译结果
用法: python validate_translation_results.py
退出码: 0 = PASS, 1 = FAIL

检查:
1. done JSON 可解析
2. 每个 done item 的 sentence_id 存在于 sentences.json
3. done 中 ru 与原 sentence ru 一致
4. zh 是正常中文，不是 mojibake
5. zh 非空
6. 没有重复 sentence_id
7. pending/done/rejected 不冲突
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


def has_mojibake(text):
    """检测乱码 (只检测 UTF-8-as-GBK 模式，不误判正常中文)"""
    if re.search(r'[鍦紬绋紓鎮玡琯瑖瑭瑒瑧瑮瑯瑐瑑瑳瑴瑵瑸瑹瑖碶瑐瑳瑴瑵]', text):
        return True
    return False


def is_valid_zh(text):
    """检查中文翻译是否有效"""
    if not text or not text.strip():
        return False
    if has_mojibake(text):
        return False
    cjk = sum(1 for c in text if 0x4E00 <= ord(c) <= 0x9FFF)
    if cjk == 0 and len(text) > 3:
        return False
    return True


def main():
    print("=" * 60)
    print("翻译结果校验")
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

    # 2. Scan done files
    print("\n--- 2. done/*.json 校验 ---")
    done_dir = QUEUE_DIR / "done"
    if not done_dir.exists():
        warn("done/ 目录不存在")
        return 0

    done_files = sorted(done_dir.glob("*.json"))
    if not done_files:
        warn("done/ 目录为空")
        return 0

    all_done_sids = []
    total_translations = 0
    bad_zh = 0
    ru_mismatch = 0
    missing_sid = 0

    for df in done_files:
        try:
            with open(df, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
        except Exception as e:
            err(f"{df.name} 解析失败: {e}")
            continue

        translations = data.get("translations", [])
        if not translations:
            warn(f"{df.name} 无 translations")
            continue

        for t in translations:
            total_translations += 1
            sid = t.get("sentence_id", "")
            all_done_sids.append(sid)

            # Check sentence_id exists
            if sid not in sent_map:
                missing_sid += 1
                if missing_sid <= 3:
                    err(f"{df.name}: sentence_id 不存在: {sid}")
                continue

            # Check ru matches
            orig_ru = sent_map[sid].get("ru", "")
            done_ru = t.get("ru", "")
            if orig_ru.strip() != done_ru.strip():
                ru_mismatch += 1
                if ru_mismatch <= 3:
                    warn(f"{df.name} {sid}: ru 不一致")
                    warn(f"  orig: {orig_ru[:60]}")
                    warn(f"  done: {done_ru[:60]}")

            # Check zh validity
            zh = t.get("zh", "")
            if not is_valid_zh(zh):
                bad_zh += 1
                if bad_zh <= 3:
                    err(f"{df.name} {sid}: zh 无效 | {zh[:60]}")

        ok(f"{df.name}: {len(translations)} 条翻译")

    ok(f"done 总条目: {total_translations}")

    if missing_sid:
        err(f"sentence_id 不存在: {missing_sid} 条")
    else:
        ok("所有 sentence_id 存在")

    if ru_mismatch:
        warn(f"ru 不一致: {ru_mismatch} 条")
    else:
        ok("所有 ru 一致")

    if bad_zh:
        err(f"zh 无效 (空/mojibake/非中文): {bad_zh} 条")
    else:
        ok("所有 zh 有效")

    # 3. Duplicate check
    print("\n--- 3. 重复检查 ---")
    sid_counts = Counter(all_done_sids)
    dups = [sid for sid, cnt in sid_counts.items() if cnt > 1]
    if dups:
        err(f"done 中重复 sentence_id: {len(dups)} 个")
    else:
        ok("无重复 sentence_id")

    # 4. Overlap check
    print("\n--- 4. 冲突检查 ---")
    pending_dir = QUEUE_DIR / "pending"
    pending_sids = set()
    if pending_dir.exists():
        for pf in pending_dir.glob("*.json"):
            with open(pf, encoding='utf-8-sig') as f:
                data = json.load(f)
            for item in data.get("items", []):
                pending_sids.add(item.get("sentence_id", ""))

    rejected_dir = QUEUE_DIR / "rejected"
    rejected_sids = set()
    if rejected_dir.exists():
        for rf in rejected_dir.glob("*.json"):
            try:
                with open(rf, encoding='utf-8') as f:
                    rej = json.load(f)
                if isinstance(rej, dict):
                    rejected_sids.update(r.get("sentence_id", "") for r in rej.get("records", []))
            except Exception:
                pass

    done_set = set(all_done_sids)
    if done_set & pending_sids:
        err(f"done/pending 重叠: {len(done_set & pending_sids)} 条")
    else:
        ok("done/pending 无重叠")

    if done_set & rejected_sids:
        err(f"done/rejected 重叠: {len(done_set & rejected_sids)} 条")
    else:
        ok("done/rejected 无重叠")

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
