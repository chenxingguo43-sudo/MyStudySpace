#!/usr/bin/env python3
"""
validate_vocabulary_examples.py — 验证背单词页例句联动
用法: python validate_vocabulary_examples.py

从已翻译的 source examples 抽样，验证 lexeme_index 能查回完整例句。
"""
import json, random, sys
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

DATA_DIR = Path(r"D:\MyStudySpace\data")

def main():
    print("=" * 60)
    print("背单词页例句联动验证")
    print("=" * 60)

    # 加载数据
    with open(DATA_DIR / "sentences.json", encoding="utf-8") as f:
        sentences = json.load(f)
    with open(DATA_DIR / "lexeme_index.json", encoding="utf-8") as f:
        lexeme = json.load(f)
    with open(DATA_DIR / "sources.json", encoding="utf-8") as f:
        sources = json.load(f)

    sent_map = {r["sentence_id"]: r for r in sentences}
    src_map = {s["source_id"]: s for s in sources}

    # 筛选已翻译的记录
    translated = [r for r in sentences if r.get("translation_status") == "translated" and r.get("zh", "").strip()]
    print(f"已翻译记录: {len(translated)}")

    # 抽样 50 条
    random.seed(42)
    samples = random.sample(translated, min(50, len(translated)))

    # 验证
    ok_count = 0
    fail_count = 0
    report_lines = []

    for r in samples:
        sid = r["sentence_id"]
        ru = r["ru"]
        zh = r["zh"]
        src_id = r["source_id"]
        src_title = src_map.get(src_id, {}).get("source_title", "?")
        page = r.get("page_or_location", "?")

        # 取 surface_forms
        sfs = r.get("surface_forms", [])
        if not sfs:
            sfs = [w for w in ru.split() if len(w) > 3 and w[0].isupper()][:3]

        found_forms = 0
        for sf in sfs[:3]:
            key = sf.lower()
            if key in lexeme:
                entry = lexeme[key]
                if sid in entry.get("sentence_ids", []):
                    found_forms += 1

        if found_forms > 0:
            ok_count += 1
            report_lines.append(f"✅ [{src_title[:30]}] p.{page} | {ru[:60]} → {zh[:40]}")
        else:
            fail_count += 1
            report_lines.append(f"❌ [{src_title[:30]}] p.{page} | {ru[:60]} → 联动失败")

    print(f"\n验证结果: {ok_count} 通过, {fail_count} 失败 (共 {len(samples)} 条)")

    # 输出报告
    print("\n--- 抽样报告 ---")
    for line in report_lines[:30]:
        print(f"  {line}")

    # 写入报告文件
    report_path = Path(r"D:\MyStudySpace\俄语资料整理试验区\_reports\背单词页真实例句翻译联动报告.md")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 背单词页真实例句翻译联动报告\n\n")
        f.write(f"验证时间: 2026-06-06\n\n")
        f.write(f"## 统计\n\n")
        f.write(f"- 已翻译记录: {len(translated)}\n")
        f.write(f"- 抽样验证: {len(samples)}\n")
        f.write(f"- 通过: {ok_count}\n")
        f.write(f"- 失败: {fail_count}\n")
        f.write(f"- 通过率: {ok_count*100//len(samples)}%\n\n")
        f.write(f"## 详细报告\n\n")
        for line in report_lines:
            f.write(f"{line}\n")

    print(f"\n报告已写入: {report_path}")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
