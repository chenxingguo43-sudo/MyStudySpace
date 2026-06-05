# -*- coding: utf-8 -*-
"""
import_source_package.py v2 — 导入 source package 到正式 data/
支持 --dry-run（只模拟）和正式导入（写入 data/）
用法:
  python import_source_package.py <package_dir> [--dry-run]
  python import_source_package.py <package_dir>              # 正式导入
"""
import json
import os
import sys
import re
import argparse
from datetime import datetime
from collections import defaultdict

# ─── 配置 ───
DATA_DIR = 'D:/MyStudySpace/data'

def load_json(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def build_lexeme_index_from_records(records):
    """从 records 构建 lexeme_index（增量）"""
    index = defaultdict(lambda: {"lemma": "", "sentence_ids": [], "source": ""})
    for r in records:
        sid = r["sentence_id"]
        # surface_forms -> source: "surface"
        for sf in r.get("surface_forms", []):
            key = sf.lower()
            if sid not in index[key]["sentence_ids"]:
                index[key]["sentence_ids"].append(sid)
            index[key]["lemma"] = key
            if index[key]["source"] not in ("lexeme", "possible"):
                index[key]["source"] = "surface"
        # possible_lexemes -> source: "possible"
        for pl in r.get("possible_lexemes", []):
            key = pl.lower()
            if sid not in index[key]["sentence_ids"]:
                index[key]["sentence_ids"].append(sid)
            index[key]["lemma"] = key
            if index[key]["source"] != "lexeme":
                index[key]["source"] = "possible"
        # lexeme_tags -> source: "lexeme"
        for lt in r.get("lexeme_tags", []):
            key = lt.lower()
            if sid not in index[key]["sentence_ids"]:
                index[key]["sentence_ids"].append(sid)
            index[key]["lemma"] = key
            index[key]["source"] = "lexeme"
    return dict(index)

def merge_lexeme_indexes(existing, new_data):
    """合并两个 lexeme_index"""
    merged = dict(existing)
    priority = {"lexeme": 3, "possible": 2, "surface": 1}
    for key, entry in new_data.items():
        if key in merged:
            for sid in entry["sentence_ids"]:
                if sid not in merged[key]["sentence_ids"]:
                    merged[key]["sentence_ids"].append(sid)
            if priority.get(entry["source"], 0) > priority.get(merged[key]["source"], 0):
                merged[key]["source"] = entry["source"]
                merged[key]["lemma"] = entry["lemma"]
        else:
            merged[key] = entry
    return merged

def build_grammar_index_from_records(records):
    """从 records 构建 grammar_index（增量）"""
    index = defaultdict(list)
    for r in records:
        sid = r["sentence_id"]
        for tag in r.get("grammar_tags", []):
            if sid not in index[tag]:
                index[tag].append(sid)
    return dict(index)

def merge_grammar_indexes(existing, new_data):
    """合并两个 grammar_index"""
    merged = dict(existing)
    for tag, sids in new_data.items():
        if tag not in merged:
            merged[tag] = []
        for sid in sids:
            if sid not in merged[tag]:
                merged[tag].append(sid)
    return merged

def convert_record_to_unified(r, source_meta):
    """将 package record 转换为统一的 sentences.json 格式（兼容旧格式）"""
    # 兼容旧格式: extraction.risk → match_risk
    match_risk = r.get("match_risk", r.get("extraction", {}).get("risk", "low"))
    candidate_id = r.get("candidate_id", r.get("extraction", {}).get("candidate_id", ""))
    return {
        "sentence_id": r["sentence_id"],
        "source_id": r["source_id"],
        "chapter": source_meta.get("category", "auto_extracted"),
        "page_or_location": str(r.get("page_number", "")),
        "ru": r["ru"],
        "zh": r.get("zh", ""),
        "confidence": r.get("confidence", "medium"),
        "needs_review": r.get("needs_review", True),
        "note": r.get("note", ""),
        "candidate_id": candidate_id,
        "match_risk": match_risk,
        "surface_forms": r.get("surface_forms", []),
        "lexeme_tags": r.get("lexeme_tags", []),
        "possible_lexemes": r.get("possible_lexemes", []),
        "grammar_tags": r.get("grammar_tags", [])
    }

def do_import(pkg_dir, data_dir=DATA_DIR, dry_run=False):
    """执行导入。返回结果 dict。"""
    pkg_dir = pkg_dir.rstrip('/\\')

    # 加载 package
    pkg_source = load_json(f'{pkg_dir}/source.json')
    pkg_records = load_json(f'{pkg_dir}/sentence_records.json')
    source_id = pkg_source['source_id']

    # 加载正式数据
    formal_sources = load_json(f'{data_dir}/sources.json')
    formal_sentences = load_json(f'{data_dir}/sentences.json')
    formal_lexeme = load_json(f'{data_dir}/lexeme_index.json')
    formal_grammar = load_json(f'{data_dir}/grammar_index.json')

    existing_sent_ids = {s['sentence_id'] for s in formal_sentences}
    existing_source_ids = {s['source_id'] for s in formal_sources}

    # 分析
    to_add = []
    skipped_dup = 0
    skipped_risk = 0
    risk_stats = {"low": 0, "medium": 0, "high": 0}

    for r in pkg_records:
        # 兼容旧格式: extraction.risk → match_risk
        mr = r.get("match_risk", r.get("extraction", {}).get("risk", "unknown"))
        risk_stats[mr] = risk_stats.get(mr, 0) + 1

        if mr == "high":
            skipped_risk += 1
            continue
        if r["sentence_id"] in existing_sent_ids:
            skipped_dup += 1
            continue
        to_add.append(r)

    result = {
        "success": True,
        "source_id": source_id,
        "would_add": len(to_add),
        "skipped_dup": skipped_dup,
        "skipped_risk": skipped_risk,
        "risk_distribution": risk_stats,
        "dry_run": dry_run
    }

    # 转换为统一格式
    new_sentences = [convert_record_to_unified(r, pkg_source) for r in to_add]

    # 计算 lexeme/grammar 增量
    new_lexeme = build_lexeme_index_from_records(new_sentences)
    new_grammar = build_grammar_index_from_records(new_sentences)
    result["new_lexeme_keys"] = len(new_lexeme)
    result["new_grammar_keys"] = len(new_grammar)

    if dry_run:
        merged_lexeme = merge_lexeme_indexes(formal_lexeme, new_lexeme)
        merged_grammar = merge_grammar_indexes(formal_grammar, new_grammar)
        result["total_lexeme_keys"] = len(merged_lexeme)
        result["total_grammar_keys"] = len(merged_grammar)
        return result

    # ─── 正式导入 ───
    # 1. sources.json
    if source_id not in existing_source_ids:
        formal_sources.append({
            "source_id": source_id,
            "source_title": pkg_source.get("source_title", ""),
            "source_path": pkg_source.get("source_path", ""),
            "chapters": [pkg_source.get("category", "auto_extracted")]
        })
    save_json(f'{data_dir}/sources.json', formal_sources)

    # 2. sentences.json
    formal_sentences.extend(new_sentences)
    save_json(f'{data_dir}/sentences.json', formal_sentences)

    # 3. lexeme_index.json
    merged_lexeme = merge_lexeme_indexes(formal_lexeme, new_lexeme)
    save_json(f'{data_dir}/lexeme_index.json', merged_lexeme)
    result["total_lexeme_keys"] = len(merged_lexeme)

    # 4. grammar_index.json
    merged_grammar = merge_grammar_indexes(formal_grammar, new_grammar)
    save_json(f'{data_dir}/grammar_index.json', merged_grammar)
    result["total_grammar_keys"] = len(merged_grammar)

    return result

def main():
    parser = argparse.ArgumentParser(description="Import source package")
    parser.add_argument("package_dir", help="Source package directory")
    parser.add_argument("--dry-run", action="store_true", help="Only simulate")
    args = parser.parse_args()

    result = do_import(args.package_dir, dry_run=args.dry_run)

    mode = "DRY-RUN" if result["dry_run"] else "正式导入"
    print(f'=== {mode}: {result["source_id"]} ===')
    print(f'would_add: {result["would_add"]}')
    print(f'skipped_dup: {result["skipped_dup"]}')
    print(f'skipped_risk: {result["skipped_risk"]}')
    print(f'risk_distribution: {result["risk_distribution"]}')
    print(f'new_lexeme_keys: {result["new_lexeme_keys"]}')
    print(f'total_lexeme_keys: {result["total_lexeme_keys"]}')
    print(f'new_grammar_keys: {result["new_grammar_keys"]}')
    print(f'total_grammar_keys: {result["total_grammar_keys"]}')

    if result["would_add"] == 0:
        print('\n⚠️  would_add = 0')
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
