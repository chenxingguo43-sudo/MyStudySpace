#!/usr/bin/env python3
"""
extract_and_package.py — 通用 PDF 提取 + 打包 pipeline
用法: python extract_and_package.py <source_id> <pdf_path> <source_title> [--max-records 200]

流程:
1. PyMuPDF 提取 pages.json
2. 提取 sentence_candidates.json
3. 构建 sentence_records.json
4. 打包到 _source_packages/<source_id>/
5. 运行 validate_source_package.py
"""
import json, sys, os, re, argparse
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
PKG_DIR = BASE_DIR / "_source_packages"

def extract_pages(pdf_path: str, source_id: str) -> list:
    """用 PyMuPDF 提取每页文本"""
    import fitz
    doc = fitz.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text("text")
        cyrillic = len(re.findall(r'[а-яА-ЯёЁ]', text))
        han = len(re.findall(r'[一-鿿]', text))
        nul = text.count('\x00')
        pages.append({
            "source_id": source_id,
            "page_number": i + 1,  # 1-based
            "text": text,
            "char_count": len(text),
            "cyrillic_count": cyrillic,
            "han_count": han,
            "nul_count": nul
        })
    doc.close()
    return pages

def merge_lines(lines: list) -> list:
    """合并连续行成段落"""
    paragraphs = []
    current = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                paragraphs.append(' '.join(current))
                current = []
            continue
        # 标题检测
        if len(stripped) < 60 and not stripped[-1] in '.!?...':
            if current:
                paragraphs.append(' '.join(current))
                current = []
            paragraphs.append(stripped)
        else:
            current.append(stripped)
    if current:
        paragraphs.append(' '.join(current))
    return paragraphs

def normalize(text: str) -> str:
    """标准化文本"""
    text = re.sub(r'[́̀̆]', '', text)  # 去除重音
    text = text.replace('­', '')  # 软连字符
    text = re.sub(r'[–—]', '-', text)  # 统一破折号
    text = re.sub(r'[""«»]', '"', text)  # 统一引号
    text = re.sub(r'\s+', ' ', text)  # 空白标准化
    return text.strip()

def split_sentences(text: str) -> list:
    """分句"""
    parts = re.split(r'(?<=[.!?...])\s+', text)
    return [p.strip() for p in parts if p.strip()]

def is_valid_russian_sentence(text: str) -> bool:
    """检查是否为有效俄语句子"""
    if len(text) < 15:
        return False
    cyrillic = len(re.findall(r'[а-яА-ЯёЁ]', text))
    if cyrillic < 10:
        return False
    # 严格排除含中文的文本
    if re.search(r'[一-鿿]', text):
        return False
    # 排除 AI 元文本
    ai_patterns = ['用户要求', '考点', '练习题', '答案', '模块', '请选择', '听力原文']
    for pat in ai_patterns:
        if pat in text:
            return False
    # 排除纯标题
    if len(text) < 60 and not any(c in text for c in '.!?...'):
        return False
    return True

def extract_surface_forms(text: str) -> list:
    """提取词形"""
    words = re.findall(r'[а-яА-ЯёЁ]+(?:-[а-яА-ЯёЁ]+)*', text)
    return [w for w in words if len(w) > 1]

def build_candidates(pages: list, source_id: str) -> list:
    """从页面构建候选句"""
    candidates = []
    seq = 0
    for page in pages:
        page_num = page["page_number"]
        text = page["text"]
        # 合并行
        lines = text.split('\n')
        paragraphs = merge_lines(lines)
        for para in paragraphs:
            para = normalize(para)
            sentences = split_sentences(para)
            for sent in sentences:
                if not is_valid_russian_sentence(sent):
                    continue
                seq += 1
                candidates.append({
                    "candidate_id": f"{source_id[:3]}{seq:04d}",
                    "source_id": source_id,
                    "page_number": page_num,
                    "ru": sent,
                    "char_count": len(sent),
                    "surface_forms": extract_surface_forms(sent)
                })
    return candidates

def build_records(candidates: list, source_id: str, source_title: str, source_path: str) -> list:
    """从候选句构建记录"""
    records = []
    for c in candidates:
        sf = c["surface_forms"]
        # possible_lexemes = 小写的 surface_forms（保守策略）
        possible = list(set(w.lower() for w in sf))
        records.append({
            "sentence_id": c["candidate_id"],
            "source_id": source_id,
            "source_title": source_title,
            "source_path": source_path,
            "page_number": c["page_number"],
            "ru": c["ru"],
            "zh": "",
            "grammar_tags": [],
            "surface_forms": sf,
            "lexeme_tags": [],
            "possible_lexemes": possible,
            "confidence": "medium",
            "needs_review": True,
            "note": "自动提取，需人工复核翻译和语法标注",
            "candidate_id": c["candidate_id"],
            "match_risk": "low"
        })
    return records

def package(source_id: str, pdf_path: str, source_title: str, max_records: int = 200):
    """完整 pipeline"""
    pkg_path = PKG_DIR / source_id
    pkg_path.mkdir(parents=True, exist_ok=True)

    print(f"[1/5] 提取页面: {pdf_path}")
    pages = extract_pages(pdf_path, source_id)
    print(f"  -> {len(pages)} 页")

    print(f"[2/5] 提取候选句...")
    candidates = build_candidates(pages, source_id)
    print(f"  -> {len(candidates)} 候选句")

    # 限制数量
    if len(candidates) > max_records:
        print(f"  -> 截断到 {max_records} 条")
        candidates = candidates[:max_records]

    print(f"[3/5] 构建记录...")
    records = build_records(candidates, source_id, source_title, pdf_path)
    print(f"  -> {len(records)} 记录")

    # 保存
    source_meta = {
        "source_id": source_id,
        "source_title": source_title,
        "source_path": pdf_path,
        "category": "text_pdf",
        "recommended_pipeline": "pymupdf",
        "page_count": len(pages),
        "package_version": 1,
        "created_at": datetime.now().isoformat()
    }

    print(f"[4/5] 打包到 {pkg_path}")
    with open(pkg_path / "source.json", "w", encoding="utf-8") as f:
        json.dump(source_meta, f, ensure_ascii=False, indent=2)
    with open(pkg_path / "pages.json", "w", encoding="utf-8") as f:
        json.dump(pages, f, ensure_ascii=False, indent=2)
    with open(pkg_path / "sentence_candidates.json", "w", encoding="utf-8") as f:
        json.dump(candidates, f, ensure_ascii=False, indent=2)
    with open(pkg_path / "sentence_records.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"[5/5] 验证...")
    # 内联验证
    errors = []
    sent_ids = set()
    for r in records:
        if r["sentence_id"] in sent_ids:
            errors.append(f"重复 sentence_id: {r['sentence_id']}")
        sent_ids.add(r["sentence_id"])
        if not r["surface_forms"]:
            errors.append(f"空 surface_forms: {r['sentence_id']}")
        if not r["possible_lexemes"]:
            errors.append(f"空 possible_lexemes: {r['sentence_id']}")
        if r["page_number"] < 1:
            errors.append(f"page_number < 1: {r['sentence_id']}")
        if r["match_risk"] == "high":
            errors.append(f"match_risk=high: {r['sentence_id']}")

    if errors:
        print(f"  ❌ 验证失败 ({len(errors)} errors):")
        for e in errors[:10]:
            print(f"    {e}")
        return False

    print(f"  ✅ 验证通过")
    print(f"\n=== 打包完成: {source_id} ===")
    print(f"  Records: {len(records)}")
    print(f"  Pages: {len(pages)}")
    print(f"  Package: {pkg_path}")
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source_id", help="Source ID (e.g. diag-0029)")
    parser.add_argument("pdf_path", help="Path to PDF file")
    parser.add_argument("source_title", help="Source title")
    parser.add_argument("--max-records", type=int, default=200)
    args = parser.parse_args()

    success = package(args.source_id, args.pdf_path, args.source_title, args.max_records)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
