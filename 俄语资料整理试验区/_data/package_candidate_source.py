# -*- coding: utf-8 -*-
"""
Build a strict source package for vocabulary-card examples.

This is used after screen_candidate_sources.py chooses a file. It keeps only
complete Russian-looking sentences and writes a standard source package.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(r"D:\MyStudySpace\俄语资料整理试验区")
PKG_DIR = BASE_DIR / "_source_packages"

CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")
HAN_RE = re.compile(r"[\u4e00-\u9fff]")
WORD_RE = re.compile(r"[\u0400-\u04FF]+(?:-[\u0400-\u04FF]+)*")
SENTENCE_START_RE = re.compile(r'^\s*(?:["(«]?\s*)?(?:\d+[\).]?\s*)?[А-ЯЁ]')


def normalize_text(text: str) -> str:
    text = text.replace("\u00ad", "")
    text = re.sub(r"[́̀]", "", text)
    text = re.sub(r"[“”«»]", '"', text)
    text = re.sub(r"[—–]", "-", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def split_candidates(text: str) -> list[str]:
    normalized = normalize_text(text)
    parts: list[str] = []
    for raw_line in normalized.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts.extend(re.split(r"(?<=[.!?])\s+", line))
    return parts


def is_good_sentence(text: str) -> bool:
    sent = re.sub(r"\s+", " ", text).strip()
    if not (25 <= len(sent) <= 260):
        return False
    if not re.search(r"[.!?…]$", sent):
        return False
    if not SENTENCE_START_RE.search(sent):
        return False
    if HAN_RE.search(sent):
        return False
    if re.search(r"\b(?:сущ|прил|гл|нсв|св)\.?\b", sent, re.IGNORECASE):
        return False
    if "..." in sent or "…" in sent:
        return False
    # PyMuPDF sometimes splits one Russian word into syllable-like chunks:
    # "миграцио нных", "материа лам". Two or more such pairs is too noisy.
    if len(re.findall(r"\b[а-яё]{4,}\s+[а-яё]{1,3}\b", sent, re.IGNORECASE)) >= 2:
        return False

    cyr = len(CYRILLIC_RE.findall(sent))
    words = WORD_RE.findall(sent)
    if cyr < 16 or len(words) < 4:
        return False
    if cyr / max(len(sent), 1) < 0.55:
        return False

    upper_words = sum(1 for word in words if word.isupper() and len(word) > 2)
    if upper_words / max(len(words), 1) > 0.65:
        return False
    return True


def extract_surface_forms(text: str) -> list[str]:
    forms = WORD_RE.findall(text)
    seen: set[str] = set()
    result: list[str] = []
    for form in forms:
        lower = form.lower()
        if len(lower) <= 1 or lower in seen:
            continue
        seen.add(lower)
        result.append(form)
    return result


def read_pdf_pages(pdf_path: Path, source_id: str) -> list[dict[str, Any]]:
    import fitz

    doc = fitz.open(str(pdf_path))
    pages: list[dict[str, Any]] = []
    for index, page in enumerate(doc, start=1):
        text = page.get_text("text") or ""
        pages.append({
            "source_id": source_id,
            "page_number": index,
            "text": text,
            "char_count": len(text),
            "cyrillic_count": len(CYRILLIC_RE.findall(text)),
            "han_count": len(HAN_RE.findall(text)),
            "nul_count": text.count("\x00"),
        })
    doc.close()
    return pages


def build_candidates(pages: list[dict[str, Any]], source_id: str) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen_sentences: set[str] = set()
    seq = 0
    digits = re.sub(r"[^0-9]", "", source_id)
    prefix = f"s{digits[-4:]}" if digits else source_id[:6]

    for page in pages:
        for raw in split_candidates(page["text"]):
            sent = re.sub(r"\s+", " ", normalize_text(raw)).strip()
            if not is_good_sentence(sent):
                continue
            if sent in seen_sentences:
                continue
            forms = extract_surface_forms(sent)
            if len(forms) < 4:
                continue
            seen_sentences.add(sent)
            seq += 1
            candidates.append({
                "candidate_id": f"{prefix}-{seq:04d}",
                "source_id": source_id,
                "page_number": page["page_number"],
                "ru": sent,
                "char_count": len(sent),
                "surface_forms": forms,
            })
    return candidates


def build_records(candidates: list[dict[str, Any]], source_id: str, title: str, source_path: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for candidate in candidates:
        possible = sorted({form.lower() for form in candidate["surface_forms"]})
        records.append({
            "sentence_id": candidate["candidate_id"],
            "source_id": source_id,
            "source_title": title,
            "source_path": source_path,
            "page_number": candidate["page_number"],
            "ru": candidate["ru"],
            "zh": "",
            "grammar_tags": [],
            "surface_forms": candidate["surface_forms"],
            "lexeme_tags": [],
            "possible_lexemes": possible,
            "confidence": "medium",
            "needs_review": True,
            "note": "严格规则自动提取，适合背词例句扩充；翻译和语义需后续校验。",
            "candidate_id": candidate["candidate_id"],
            "match_risk": "low",
        })
    return records


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def package(source_id: str, pdf_path: Path, title: str, max_records: int | None) -> Path:
    pkg_path = PKG_DIR / source_id
    if pkg_path.exists():
        shutil.rmtree(pkg_path)
    pkg_path.mkdir(parents=True, exist_ok=True)

    pages = read_pdf_pages(pdf_path, source_id)
    candidates = build_candidates(pages, source_id)
    if max_records is not None:
        candidates = candidates[:max_records]
    records = build_records(candidates, source_id, title, str(pdf_path))

    source_meta = {
        "source_id": source_id,
        "source_title": title,
        "source_path": str(pdf_path),
        "category": "strict_pymupdf",
        "recommended_pipeline": "pymupdf_strict_sentence",
        "page_count": len(pages),
        "package_version": 2,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }

    write_json(pkg_path / "source.json", source_meta)
    write_json(pkg_path / "pages.json", pages)
    write_json(pkg_path / "sentence_candidates.json", candidates)
    write_json(pkg_path / "sentence_records.json", records)

    report = [
        "---",
        "type: source-package-report",
        "version: 2",
        f"created: {datetime.now().isoformat(timespec='seconds')}",
        "---",
        "",
        f"# Source Package: {source_id}",
        "",
        f"- title: {title}",
        f"- source_path: `{pdf_path}`",
        f"- pages: {len(pages)}",
        f"- candidates: {len(candidates)}",
        f"- records: {len(records)}",
        "",
        "## Samples",
        "",
    ]
    for record in records[:10]:
        report.append(f"- p.{record['page_number']} `{record['sentence_id']}` {record['ru']}")
    (pkg_path / "package_report.md").write_text("\n".join(report) + "\n", encoding="utf-8-sig")
    return pkg_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_id")
    parser.add_argument("pdf_path")
    parser.add_argument("title")
    parser.add_argument("--max-records", type=int, default=None)
    args = parser.parse_args()

    pkg_path = package(args.source_id, Path(args.pdf_path), args.title, args.max_records)
    records = json.loads((pkg_path / "sentence_records.json").read_text(encoding="utf-8"))
    print(f"package: {pkg_path}")
    print(f"records: {len(records)}")
    for record in records[:8]:
        print(f"  {record['sentence_id']} p{record['page_number']}: {record['ru'][:140]}")
    if not records:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
