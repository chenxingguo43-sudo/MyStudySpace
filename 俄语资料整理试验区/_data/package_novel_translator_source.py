#!/usr/bin/env python3
"""Build a source package from novel-translator extracted JSON.

This is a bridge, not an importer: it only writes _source_packages/<source_id>.
Formal import still goes through validate_source_package.py and import_source_package.py.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).parent.parent
DEFAULT_PACKAGE_ROOT = BASE_DIR / "_source_packages"
DEFAULT_NOVEL_ROOT = Path(r"E:\Desktop\novel-translator")
CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
WORD_RE = re.compile(r"[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
SENTENCE_END_RE = re.compile(r"[.!?…][\"')\]]*$")


def normalize_text(text: str) -> str:
    text = text.replace("\u00ad", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def cyrillic_ratio(text: str) -> float:
    letters = re.findall(r"[A-Za-zА-Яа-яЁё]", text)
    if not letters:
        return 0.0
    return len(CYRILLIC_RE.findall(text)) / len(letters)


def is_title_like(text: str) -> bool:
    words = WORD_RE.findall(text)
    if len(text) > 90 or len(words) > 7:
        return False
    if SENTENCE_END_RE.search(text):
        return False
    upper_words = [w for w in words if w.upper() == w and len(w) > 1]
    return bool(words) and len(upper_words) / len(words) >= 0.7


def is_table_like(text: str) -> bool:
    if "|" in text or "\t" in text:
        return True
    digits = sum(ch.isdigit() for ch in text)
    words = WORD_RE.findall(text)
    return digits >= 3 and len(words) <= 4


def is_displayable_russian_sentence(text: str) -> bool:
    text = normalize_text(text)
    if len(text) < 35 or len(text) > 260:
        return False
    if CJK_RE.search(text):
        return False
    if text.count("\ufffd"):
        return False
    if is_table_like(text) or is_title_like(text):
        return False
    if cyrillic_ratio(text) < 0.75:
        return False
    if len(WORD_RE.findall(text)) < 5:
        return False
    if not SENTENCE_END_RE.search(text):
        return False
    return True


def split_sentences(text: str) -> list[str]:
    text = normalize_text(text)
    parts = re.split(r"(?<=[.!?…])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def extract_surface_forms(text: str) -> list[str]:
    seen: set[str] = set()
    forms: list[str] = []
    for word in WORD_RE.findall(text):
        if len(word) < 2:
            continue
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        forms.append(word)
    return forms


def load_extracted_records(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(data, list):
        raise ValueError(f"Expected extracted JSON list, got {type(data).__name__}")
    return [item for item in data if isinstance(item, dict)]


def source_prefix(source_id: str) -> str:
    digits = re.sub(r"[^0-9]", "", source_id)
    if digits:
        return f"n{digits[-4:]}"
    return re.sub(r"[^a-zA-Z0-9]", "", source_id.lower())[:6] or "novel"


def build_package(
    extracted_path: Path,
    source_id: str,
    source_title: str,
    package_root: Path = DEFAULT_PACKAGE_ROOT,
    max_records: int = 200,
) -> Path:
    extracted_path = Path(extracted_path)
    package_root = Path(package_root)
    records_in = load_extracted_records(extracted_path)
    pkg_path = package_root / source_id
    pkg_path.mkdir(parents=True, exist_ok=True)

    pages: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []
    prefix = source_prefix(source_id)
    seq = 0
    rejected = {
        "missing_text": 0,
        "not_displayable": 0,
        "empty_surface_forms": 0,
        "over_limit": 0,
    }

    for idx, item in enumerate(records_in, 1):
        page_number = int(item.get("page") or item.get("page_number") or idx)
        raw_text = normalize_text(str(item.get("text", "")))
        pages.append(
            {
                "source_id": source_id,
                "page_number": page_number,
                "text": raw_text,
                "char_count": len(raw_text),
                "cyrillic_count": len(CYRILLIC_RE.findall(raw_text)),
                "han_count": len(CJK_RE.findall(raw_text)),
            }
        )

        if not raw_text:
            rejected["missing_text"] += 1
            continue

        for sentence in split_sentences(raw_text):
            sentence = normalize_text(sentence)
            if not is_displayable_russian_sentence(sentence):
                rejected["not_displayable"] += 1
                continue
            forms = extract_surface_forms(sentence)
            if not forms:
                rejected["empty_surface_forms"] += 1
                continue
            if len(records) >= max_records:
                rejected["over_limit"] += 1
                continue

            seq += 1
            candidate_id = f"{prefix}-{seq:04d}"
            candidates.append(
                {
                    "candidate_id": candidate_id,
                    "source_id": source_id,
                    "page_number": page_number,
                    "ru": sentence,
                    "char_count": len(sentence),
                    "surface_forms": forms,
                }
            )
            records.append(
                {
                    "sentence_id": candidate_id,
                    "source_id": source_id,
                    "source_title": source_title,
                    "source_path": str(extracted_path),
                    "page_number": page_number,
                    "ru": sentence,
                    "zh": "",
                    "grammar_tags": [],
                    "surface_forms": forms,
                    "lexeme_tags": [],
                    "possible_lexemes": sorted({w.lower() for w in forms}),
                    "confidence": "medium",
                    "needs_review": True,
                    "note": "novel-translator extracted text; package-only candidate",
                    "candidate_id": candidate_id,
                    "match_risk": "low",
                }
            )

    source = {
        "source_id": source_id,
        "source_title": source_title,
        "source_path": str(extracted_path),
        "category": "novel_translator_extracted",
        "recommended_pipeline": "novel_translator_bridge",
        "page_count": len(pages),
        "package_version": 1,
        "created_at": datetime.now().isoformat(),
    }
    report = [
        f"# novel-translator source package: {source_id}",
        "",
        f"- source_title: {source_title}",
        f"- extracted_path: {extracted_path}",
        f"- input_records: {len(records_in)}",
        f"- pages: {len(pages)}",
        f"- candidates: {len(candidates)}",
        f"- records: {len(records)}",
        f"- rejected: {json.dumps(rejected, ensure_ascii=False)}",
        "",
        "## Sample Records",
        "",
    ]
    for record in records[:10]:
        report.append(f"- `{record['sentence_id']}` p.{record['page_number']}: {record['ru']}")

    (pkg_path / "source.json").write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "sentence_candidates.json").write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "sentence_records.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "package_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return pkg_path


def build_package_from_russian_cache(
    cache_dir: Path,
    source_id: str,
    source_title: str,
    package_root: Path = DEFAULT_PACKAGE_ROOT,
    max_records: int = 200,
) -> Path:
    cache_dir = Path(cache_dir)
    package_root = Path(package_root)
    pkg_path = package_root / source_id
    pkg_path.mkdir(parents=True, exist_ok=True)

    pages: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []
    prefix = source_prefix(source_id)
    seq = 0
    rejected = {
        "missing_translation": 0,
        "not_displayable": 0,
        "empty_surface_forms": 0,
        "over_limit": 0,
    }

    cache_files = sorted(cache_dir.glob("ch*.json"))
    for chapter_index, cache_file in enumerate(cache_files, 1):
        chapter = json.loads(cache_file.read_text(encoding="utf-8-sig"))
        title = str(chapter.get("title", cache_file.stem))
        originals = chapter.get("original", [])
        translations = chapter.get("translated", [])
        if not isinstance(originals, list) or not isinstance(translations, list):
            continue

        for para_index, ru_raw in enumerate(originals, 1):
            ru = normalize_text(str(ru_raw))
            zh = normalize_text(str(translations[para_index - 1])) if para_index <= len(translations) else ""
            page_number = chapter_index
            pages.append(
                {
                    "source_id": source_id,
                    "page_number": page_number,
                    "text": ru,
                    "chapter_title": title,
                    "chapter_index": chapter_index,
                    "paragraph_index": para_index,
                    "char_count": len(ru),
                    "cyrillic_count": len(CYRILLIC_RE.findall(ru)),
                    "han_count": len(CJK_RE.findall(ru)),
                }
            )

            if not zh or not CJK_RE.search(zh):
                rejected["missing_translation"] += 1
                continue
            if not is_displayable_russian_sentence(ru):
                rejected["not_displayable"] += 1
                continue
            forms = extract_surface_forms(ru)
            if not forms:
                rejected["empty_surface_forms"] += 1
                continue
            if len(records) >= max_records:
                rejected["over_limit"] += 1
                continue

            seq += 1
            candidate_id = f"{prefix}-{seq:04d}"
            candidates.append(
                {
                    "candidate_id": candidate_id,
                    "source_id": source_id,
                    "page_number": page_number,
                    "chapter_title": title,
                    "ru": ru,
                    "char_count": len(ru),
                    "surface_forms": forms,
                }
            )
            records.append(
                {
                    "sentence_id": candidate_id,
                    "source_id": source_id,
                    "source_title": source_title,
                    "source_path": str(cache_dir),
                    "page_number": page_number,
                    "ru": ru,
                    "zh": zh,
                    "grammar_tags": [],
                    "surface_forms": forms,
                    "lexeme_tags": [],
                    "possible_lexemes": sorted({w.lower() for w in forms}),
                    "confidence": "medium",
                    "needs_review": False,
                    "note": f"novel-translator cache; chapter={title}; paragraph={para_index}",
                    "candidate_id": candidate_id,
                    "match_risk": "low",
                }
            )

    source = {
        "source_id": source_id,
        "source_title": source_title,
        "source_path": str(cache_dir),
        "category": "novel_translator_russian_cache",
        "recommended_pipeline": "novel_translator_bridge",
        "page_count": len(pages),
        "package_version": 1,
        "created_at": datetime.now().isoformat(),
    }
    report = [
        f"# novel-translator Russian cache package: {source_id}",
        "",
        f"- source_title: {source_title}",
        f"- cache_dir: {cache_dir}",
        f"- cache_files: {len(cache_files)}",
        f"- pages: {len(pages)}",
        f"- candidates: {len(candidates)}",
        f"- records: {len(records)}",
        f"- rejected: {json.dumps(rejected, ensure_ascii=False)}",
        "",
        "## Sample Records",
        "",
    ]
    for record in records[:10]:
        report.append(f"- `{record['sentence_id']}` p.{record['page_number']}: {record['ru']} => {record['zh']}")

    (pkg_path / "source.json").write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "sentence_candidates.json").write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "sentence_records.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (pkg_path / "package_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return pkg_path


def default_extracted_path(name: str) -> Path:
    return DEFAULT_NOVEL_ROOT / "cache_document" / name


def main() -> int:
    parser = argparse.ArgumentParser(description="Package novel-translator extracted JSON as source package.")
    parser.add_argument("--input", type=Path, default=default_extracted_path("词汇表_extracted.json"))
    parser.add_argument("--russian-cache-dir", type=Path)
    parser.add_argument("--source-id", default="novel-0001")
    parser.add_argument("--title", default="novel-translator 词汇表 extracted candidates")
    parser.add_argument("--package-root", type=Path, default=DEFAULT_PACKAGE_ROOT)
    parser.add_argument("--max-records", type=int, default=200)
    args = parser.parse_args()

    if args.russian_cache_dir:
        pkg_path = build_package_from_russian_cache(
            cache_dir=args.russian_cache_dir,
            source_id=args.source_id,
            source_title=args.title,
            package_root=args.package_root,
            max_records=args.max_records,
        )
    else:
        pkg_path = build_package(
            extracted_path=args.input,
            source_id=args.source_id,
            source_title=args.title,
            package_root=args.package_root,
            max_records=args.max_records,
        )
    records = json.loads((pkg_path / "sentence_records.json").read_text(encoding="utf-8"))
    print(f"Package: {pkg_path}")
    print(f"Records: {len(records)}")
    return 0 if records else 1


if __name__ == "__main__":
    raise SystemExit(main())
