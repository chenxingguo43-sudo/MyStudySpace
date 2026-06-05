#!/usr/bin/env python3
"""
全量坐标数据一致性校验。
检查:
- JSON 可解析
- sources/sentences/lexeme_index/grammar_index 引用一致
- sentence_id 无重复
- source_id 都存在
- lexeme_index 中的 sentence_id 全部存在
- grammar_index 中的 sentence_id 全部存在
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
DATA_DIR = BASE / "data"

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


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        ok(f"{path.name} 可解析, {type(data).__name__}")
        return data
    except Exception as e:
        err(f"{path.name} 解析失败: {e}")
        return None


def main():
    print("=" * 60)
    print("全量坐标数据一致性校验")
    print("=" * 60)

    # 1. Load all JSON files
    print("\n--- 1. JSON 解析 ---")
    sources = load_json(DATA_DIR / "sources.json")
    sentences = load_json(DATA_DIR / "sentences.json")
    lexeme_index = load_json(DATA_DIR / "lexeme_index.json")
    grammar_index = load_json(DATA_DIR / "grammar_index.json")

    if any(x is None for x in [sources, sentences, lexeme_index, grammar_index]):
        err("关键文件解析失败，无法继续校验")
        return 1

    # 2. sources 基本校验
    print("\n--- 2. sources.json 校验 ---")
    source_ids = set()
    for i, s in enumerate(sources):
        sid = s.get("source_id")
        if not sid:
            err(f"sources[{i}] 缺少 source_id")
        elif sid in source_ids:
            err(f"source_id 重复: {sid}")
        else:
            source_ids.add(sid)
    ok(f"source_id 唯一: {len(source_ids)} 个")

    # 3. sentences 基本校验
    print("\n--- 3. sentences.json 校验 ---")
    sentence_ids = []
    sid_set = set()
    missing_source = []
    for i, rec in enumerate(sentences):
        sid = rec.get("sentence_id")
        src = rec.get("source_id", "")
        if not sid:
            err(f"sentences[{i}] 缺少 sentence_id")
        elif sid in sid_set:
            err(f"sentence_id 重复: {sid}")
        else:
            sid_set.add(sid)
            sentence_ids.append(sid)
        if src and src not in source_ids:
            missing_source.append(sid)

    ok(f"sentence_id 唯一: {len(sid_set)} 条")
    if missing_source:
        err(f"source_id 不存在的记录: {len(missing_source)} 条")
        for s in missing_source[:10]:
            print(f"    {s}")
    else:
        ok("所有 source_id 都存在于 sources.json")

    # 4. lexeme_index 校验
    print("\n--- 4. lexeme_index.json 校验 ---")
    lexeme_sids = set()
    lexeme_entries = 0
    for word, entry in lexeme_index.items():
        if isinstance(entry, dict) and "sentence_ids" in entry:
            sids = entry["sentence_ids"]
            lexeme_sids.update(sids)
            lexeme_entries += 1
        elif isinstance(entry, list):
            lexeme_sids.update(entry)
            lexeme_entries += 1
        else:
            warn(f"lexeme_index['{word}'] 格式异常")

    ok(f"lexeme 条目: {lexeme_entries}")
    ok(f"引用 sentence_id: {len(lexeme_sids)} 个")

    lexeme_missing = lexeme_sids - sid_set
    if lexeme_missing:
        err(f"lexeme_index 引用不存在的 sentence_id: {len(lexeme_missing)} 个")
        for s in sorted(lexeme_missing)[:10]:
            print(f"    {s}")
    else:
        ok("lexeme_index 所有 sentence_id 都存在于 sentences.json")

    # 5. grammar_index 校验
    print("\n--- 5. grammar_index.json 校验 ---")
    grammar_sids = set()
    grammar_entries = 0
    for tag, sid_list in grammar_index.items():
        if isinstance(sid_list, list):
            grammar_sids.update(sid_list)
            grammar_entries += 1
        else:
            warn(f"grammar_index['{tag}'] 格式异常")

    ok(f"grammar 标签: {grammar_entries}")
    ok(f"引用 sentence_id: {len(grammar_sids)} 个")

    grammar_missing = grammar_sids - sid_set
    if grammar_missing:
        err(f"grammar_index 引用不存在的 sentence_id: {len(grammar_missing)} 个")
        for s in sorted(grammar_missing):
            print(f"    {s}")
    else:
        ok("grammar_index 所有 sentence_id 都存在于 sentences.json")

    # 6. 反向覆盖检查
    print("\n--- 6. 覆盖率 ---")
    sentences_in_lexeme = len(lexeme_sids & sid_set)
    sentences_in_grammar = len(grammar_sids & sid_set)
    print(f"  sentences 被 lexeme_index 覆盖: {sentences_in_lexeme}/{len(sid_set)} ({100*sentences_in_lexeme/len(sid_set):.1f}%)")
    print(f"  sentences 被 grammar_index 覆盖: {sentences_in_grammar}/{len(sid_set)} ({100*sentences_in_grammar/len(sid_set):.1f}%)")

    # 7. 安全检查: 不输出 API key
    print("\n--- 7. 安全检查 ---")
    import re
    for fname in ["sources.json", "sentences.json"]:
        path = DATA_DIR / fname
        text = path.read_text(encoding="utf-8")
        if re.search(r'(api[_-]?key|secret|token)\s*[:=]\s*["\'][^"\']{8,}', text, re.IGNORECASE):
            err(f"{fname} 可能包含 API key!")
        else:
            ok(f"{fname} 无 API key 泄露")

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
