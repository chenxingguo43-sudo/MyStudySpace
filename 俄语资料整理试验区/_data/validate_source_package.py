#!/usr/bin/env python3
"""
validate_source_package.py — 验证 source package 完整性
用法: python validate_source_package.py <package_dir>
退出码: 0 = PASS, 1 = FAIL
"""
import json, sys, os, re
from pathlib import Path

REQUIRED_RECORD_FIELDS = [
    "source_id", "sentence_id", "ru", "zh", "page_number",
    "candidate_id", "match_risk", "needs_review",
    "surface_forms", "lexeme_tags", "possible_lexemes", "grammar_tags"
]

def has_chinese(text):
    """检测文本是否包含中文字符"""
    return bool(re.search(r'[一-鿿]', text))

def validate_package(pkg_dir: str) -> dict:
    """验证一个 source package，返回 {pass: bool, errors: [], warnings: [], stats: {}}"""
    pkg = Path(pkg_dir)
    errors = []
    warnings = []
    stats = {}

    # 1. 检查必要文件
    required_files = ["source.json", "pages.json", "sentence_candidates.json", "sentence_records.json"]
    for f in required_files:
        if not (pkg / f).exists():
            errors.append(f"缺少必要文件: {f}")

    if errors:
        return {"pass": False, "errors": errors, "warnings": warnings, "stats": stats}

    # 2. 加载文件
    try:
        with open(pkg / "source.json", encoding="utf-8-sig") as f:
            source = json.load(f)
        with open(pkg / "pages.json", encoding="utf-8-sig") as f:
            pages = json.load(f)
        with open(pkg / "sentence_candidates.json", encoding="utf-8-sig") as f:
            candidates = json.load(f)
        with open(pkg / "sentence_records.json", encoding="utf-8-sig") as f:
            records = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"JSON 解析失败: {e}")
        return {"pass": False, "errors": errors, "warnings": warnings, "stats": stats}

    source_id = source.get("source_id", "")
    stats["source_id"] = source_id
    stats["page_count"] = len(pages)
    stats["candidate_count"] = len(candidates)
    stats["record_count"] = len(records)

    # 3. source.json 基本检查
    if not source_id:
        errors.append("source.json 缺少 source_id")

    # 4. pages.json 检查
    for i, p in enumerate(pages):
        pn = p.get("page_number", 0)
        if pn < 1:
            errors.append(f"pages.json[{i}] page_number={pn}, 必须 >= 1")

    # 5. sentence_candidates.json 检查
    cand_ids = set()
    for i, c in enumerate(candidates):
        cid = c.get("candidate_id", "")
        if not cid:
            errors.append(f"candidates[{i}] 缺少 candidate_id")
        elif cid in cand_ids:
            errors.append(f"candidates[{i}] candidate_id 重复: {cid}")
        cand_ids.add(cid)

    # 6. sentence_records.json 严格检查
    sent_ids = set()
    empty_surface = 0
    empty_possible = 0
    high_risk = 0
    chinese_in_ru = 0
    page_zero = 0
    missing_fields_count = 0
    risk_stats = {"low": 0, "medium": 0, "high": 0, "unknown": 0}

    for i, r in enumerate(records):
        # 6a. 顶层字段完整（兼容旧格式: extraction.risk → match_risk）
        for field in REQUIRED_RECORD_FIELDS:
            if field == "match_risk" and field not in r:
                # 兼容旧格式: extraction.risk
                ext_risk = r.get("extraction", {}).get("risk", "")
                if ext_risk:
                    warnings.append(f"records[{i}] 使用旧格式 extraction.risk={ext_risk}, 建议升级为顶层 match_risk")
                else:
                    errors.append(f"records[{i}] 缺少顶层字段: {field}")
                    missing_fields_count += 1
            elif field not in r:
                errors.append(f"records[{i}] 缺少顶层字段: {field}")
                missing_fields_count += 1

        # 6b. sentence_id 唯一
        sid = r.get("sentence_id", "")
        if not sid:
            errors.append(f"records[{i}] 缺少 sentence_id")
        elif sid in sent_ids:
            errors.append(f"records[{i}] sentence_id 重复: {sid}")
        sent_ids.add(sid)

        # 6c. page_number > 0
        pn = r.get("page_number", 0)
        if pn < 1:
            page_zero += 1

        # 6d. surface_forms 不为空
        sf = r.get("surface_forms", [])
        if not sf:
            empty_surface += 1

        # 6e. possible_lexemes 不为空
        pl = r.get("possible_lexemes", [])
        if not pl:
            empty_possible += 1

        # 6f. match_risk 不允许 high（兼容 extraction.risk）
        mr = r.get("match_risk", r.get("extraction", {}).get("risk", "unknown"))
        risk_stats[mr] = risk_stats.get(mr, 0) + 1
        if mr == "high":
            high_risk += 1

        # 6g. ru 不能混入中文
        ru = r.get("ru", "")
        if has_chinese(ru):
            chinese_in_ru += 1

    stats["empty_surface_forms"] = empty_surface
    stats["empty_possible_lexemes"] = empty_possible
    stats["high_risk_count"] = high_risk
    stats["chinese_in_ru"] = chinese_in_ru
    stats["page_zero_count"] = page_zero
    stats["missing_fields_total"] = missing_fields_count
    stats["risk_distribution"] = risk_stats
    stats["unique_sentence_ids"] = len(sent_ids)

    # 7. 判定
    if empty_surface > 0:
        errors.append(f"surface_forms 为空: {empty_surface} 条")
    if empty_possible > 0:
        errors.append(f"possible_lexemes 为空: {empty_possible} 条")
    if high_risk > 0:
        errors.append(f"match_risk=high: {high_risk} 条，不允许入库")
    if page_zero > 0:
        errors.append(f"page_number=0: {page_zero} 条，必须 >= 1")
    if chinese_in_ru > len(records) * 0.3 and chinese_in_ru > 5:
        errors.append(f"ru 含中文: {chinese_in_ru} 条，比例过高")
    elif chinese_in_ru > 0:
        warnings.append(f"ru 含中文: {chinese_in_ru} 条（少量，需人工确认）")

    if stats["record_count"] == 0:
        errors.append("records 为空，would_add=0")

    return {
        "pass": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "stats": stats
    }

def main():
    if len(sys.argv) < 2:
        print("用法: python validate_source_package.py <package_dir>")
        sys.exit(1)

    pkg_dir = sys.argv[1]
    result = validate_package(pkg_dir)

    print(f"=== 验证结果: {'PASS' if result['pass'] else 'FAIL'} ===")
    print(f"Source ID: {result['stats'].get('source_id', 'N/A')}")
    print(f"Pages: {result['stats'].get('page_count', 0)}")
    print(f"Candidates: {result['stats'].get('candidate_count', 0)}")
    print(f"Records: {result['stats'].get('record_count', 0)}")
    print(f"Unique sentence_ids: {result['stats'].get('unique_sentence_ids', 0)}")
    print(f"Risk distribution: {result['stats'].get('risk_distribution', {})}")
    print(f"Empty surface_forms: {result['stats'].get('empty_surface_forms', 0)}")
    print(f"Empty possible_lexemes: {result['stats'].get('empty_possible_lexemes', 0)}")
    print(f"High risk: {result['stats'].get('high_risk_count', 0)}")
    print(f"Chinese in ru: {result['stats'].get('chinese_in_ru', 0)}")
    print(f"Page_number=0: {result['stats'].get('page_zero_count', 0)}")

    if result["errors"]:
        print(f"\n--- ERRORS ({len(result['errors'])}) ---")
        for e in result["errors"]:
            print(f"  ❌ {e}")

    if result["warnings"]:
        print(f"\n--- WARNINGS ({len(result['warnings'])}) ---")
        for w in result["warnings"]:
            print(f"  ⚠️  {w}")

    sys.exit(0 if result["pass"] else 1)

if __name__ == "__main__":
    main()
