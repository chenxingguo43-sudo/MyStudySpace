# -*- coding: utf-8 -*-
"""
Screen source files for the vocabulary-card real-example phase.

This script is intentionally read-only for the formal coordinate data. It scans
the raw Russian material folder, estimates extraction quality, and writes a
ranked candidate list for the next batch-import run.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


SOURCE_DIR = Path(r"E:\Desktop\俄语资料文档整理")
PROJECT_ROOT = Path(r"D:\MyStudySpace")
TEST_AREA = PROJECT_ROOT / "俄语资料整理试验区"
DATA_OUT = TEST_AREA / "_data" / "candidate_sources.json"
REPORT_OUT = TEST_AREA / "_reports" / "候选资料评分报告.md"
FORMAL_SOURCES = PROJECT_ROOT / "data" / "sources.json"

CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")
HAN_RE = re.compile(r"[\u4e00-\u9fff]")
WORD_RE = re.compile(r"[\u0400-\u04FF]+(?:-[\u0400-\u04FF]+)*")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
SENTENCE_START_RE = re.compile(r'^\s*(?:["(«]?\s*)?(?:\d+[\).]?\s*)?[А-ЯЁ]')

TABLE_NAME_HINTS = ("词汇", "高频词", "词表", "минимум", "словар", "лекс")
OCR_NAME_HINTS = ("扫描", "scan", "ocr")


def count_chars(text: str) -> dict[str, int]:
    return {
        "chars": len(text),
        "cyrillic_chars": len(CYRILLIC_RE.findall(text)),
        "han_chars": len(HAN_RE.findall(text)),
        "control_chars": len(CONTROL_RE.findall(text)),
        "nul_chars": text.count("\x00"),
    }


def normalize_text(text: str) -> str:
    text = text.replace("\u00ad", "")
    text = re.sub(r"[́̀]", "", text)
    text = re.sub(r"[“”«»]", '"', text)
    text = re.sub(r"[—–]", "-", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text


def sentence_candidates(text: str, limit: int = 8) -> tuple[list[str], int]:
    normalized = normalize_text(text)
    chunks: list[str] = []
    for raw_line in normalized.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        chunks.extend(re.split(r"(?<=[.!?])\s+", line))

    candidates: list[str] = []
    total = 0
    seen: set[str] = set()
    for chunk in chunks:
        sent = re.sub(r"\s+", " ", chunk).strip()
        if not (25 <= len(sent) <= 260):
            continue
        if not re.search(r"[.!?…]$", sent):
            continue
        if not SENTENCE_START_RE.search(sent):
            continue
        cyr = len(CYRILLIC_RE.findall(sent))
        han = len(HAN_RE.findall(sent))
        words = WORD_RE.findall(sent)
        if cyr < 16 or len(words) < 4:
            continue
        upper_words = sum(1 for w in words if w.isupper() and len(w) > 2)
        if upper_words / max(len(words), 1) > 0.65:
            continue
        if cyr / max(len(sent), 1) < 0.55:
            continue
        if han:
            continue
        if re.search(r"\b(?:сущ|прил|гл|нсв|св)\.?\b", sent, re.IGNORECASE):
            continue
        if sent in seen:
            continue
        seen.add(sent)
        total += 1
        if len(candidates) < limit:
            candidates.append(sent)
    return candidates, total


def table_signal_score(text: str, file_name: str) -> int:
    lower_name = file_name.lower()
    score = sum(30 for hint in TABLE_NAME_HINTS if hint in lower_name)
    score += min(text.count("нсв") + text.count("св"), 40)
    score += min(text.count("кого?") + text.count("что?") + text.count("чего?"), 40)
    score += min(len(re.findall(r"\.{5,}", text)) * 2, 30)
    return min(score, 100)


def read_pdf(path: Path) -> tuple[str, int, str]:
    try:
        import fitz

        doc = fitz.open(str(path))
        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text("text") or "")
        page_count = len(doc)
        doc.close()
        return "\n".join(pages), page_count, ""
    except Exception as exc:  # noqa: BLE001
        return "", 0, f"{type(exc).__name__}: {exc}"


def read_docx(path: Path) -> tuple[str, int, str]:
    try:
        import docx

        document = docx.Document(str(path))
        text = "\n".join(p.text for p in document.paragraphs)
        return text, 0, ""
    except Exception as exc:  # noqa: BLE001
        return "", 0, f"{type(exc).__name__}: {exc}"


def recommendation(
    *,
    file_name: str,
    metrics: dict[str, int],
    candidate_count: int,
    table_score: int,
    extract_error: str,
    already_imported: bool,
) -> str:
    lower_name = file_name.lower()
    chars = metrics["chars"]
    cyr = metrics["cyrillic_chars"]
    control = metrics["control_chars"]

    if already_imported:
        return "already_imported"
    if extract_error:
        return "manual_review"
    if any(hint in lower_name for hint in OCR_NAME_HINTS):
        return "needs_ocr_review"
    if chars < 500 or cyr < 100:
        return "needs_ocr_or_manual_review"
    if table_score >= 55:
        return "table_or_vocab_bank"
    if control / max(chars, 1) > 0.03:
        return "poor_extraction"
    if candidate_count >= 180:
        return "vocab_examples_priority"
    if candidate_count >= 80:
        return "vocab_examples_candidate"
    if candidate_count >= 30:
        return "grammar_examples_candidate"
    return "manual_review"


def score_record(metrics: dict[str, int], candidate_count: int, table_score: int, rec: str) -> int:
    chars = metrics["chars"]
    cyr = metrics["cyrillic_chars"]
    han = metrics["han_chars"]
    control = metrics["control_chars"]

    score = 0
    score += min(int(math.log10(max(cyr, 1)) * 16), 55)
    score += min(candidate_count // 4, 45)
    if cyr > 1000 and han > 500:
        score += 8
    if "priority" in rec:
        score += 10
    if rec == "vocab_examples_candidate":
        score += 6
    if rec == "grammar_examples_candidate":
        score += 2
    if table_score >= 55:
        score -= 20
    score -= min(int(control / max(chars, 1) * 300), 30)
    if rec.startswith("needs_ocr") or rec == "poor_extraction":
        score -= 35
    return max(0, min(score, 100))


def diagnose_file(path: Path, source_id: str) -> dict[str, Any]:
    extension = path.suffix.lower()
    if extension == ".pdf":
        text, page_count, extract_error = read_pdf(path)
    elif extension == ".docx":
        text, page_count, extract_error = read_docx(path)
    else:
        text, page_count, extract_error = "", 0, "unsupported_extension"

    metrics = count_chars(text)
    samples, candidate_count = sentence_candidates(text)
    table_score = table_signal_score(text, path.name)
    rec = recommendation(
        file_name=path.name,
        metrics=metrics,
        candidate_count=candidate_count,
        table_score=table_score,
        extract_error=extract_error,
        already_imported=path.name in imported_file_names(),
    )
    score = score_record(metrics, candidate_count, table_score, rec)

    return {
        "source_id": source_id,
        "file_name": path.name,
        "path": str(path),
        "extension": extension,
        "size_bytes": path.stat().st_size,
        "page_count": page_count,
        "extract_error": extract_error,
        **metrics,
        "candidate_sentence_count": candidate_count,
        "table_signal_score": table_score,
        "recommendation": rec,
        "already_imported": path.name in imported_file_names(),
        "score": score,
        "sample_sentences": samples,
    }


def iter_source_files() -> list[Path]:
    return sorted(
        p for p in SOURCE_DIR.rglob("*")
        if p.is_file() and p.suffix.lower() in {".pdf", ".docx"}
    )


def imported_file_names() -> set[str]:
    if not FORMAL_SOURCES.exists():
        return set()
    try:
        sources = json.loads(FORMAL_SOURCES.read_text(encoding="utf-8"))
    except UnicodeDecodeError:
        sources = json.loads(FORMAL_SOURCES.read_text(encoding="utf-8-sig"))
    names: set[str] = set()
    for source in sources:
        source_path = source.get("source_path") or ""
        if source_path:
            names.add(Path(source_path).name)
    return names


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8-sig")


def write_report(records: list[dict[str, Any]]) -> None:
    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    counts = Counter(r["recommendation"] for r in records)
    ranked = sorted(records, key=lambda r: (-r["score"], -r["candidate_sentence_count"], r["source_id"]))
    top = [r for r in ranked if r["recommendation"] in {
        "vocab_examples_priority",
        "vocab_examples_candidate",
        "grammar_examples_candidate",
    }][:20]

    lines = [
        "---",
        "type: candidate-source-screening-report",
        "version: 1",
        f"created: {datetime.now().isoformat(timespec='seconds')}",
        "---",
        "",
        "# 候选资料评分报告",
        "",
        "## 总览",
        "",
        f"- 扫描目录：`{SOURCE_DIR}`",
        f"- 文件总数：{len(records)}",
        f"- 推荐进入背词例句扩充的候选：{len(top)}",
        "",
        "## 分类统计",
        "",
        "| 推荐分类 | 数量 |",
        "|---|---:|",
    ]
    for key, value in counts.most_common():
        lines.append(f"| {key} | {value} |")

    lines.extend([
        "",
        "## Top 候选",
        "",
        "| 排名 | source_id | 分数 | 候选句 | 页数 | 分类 | 文件 |",
        "|---:|---|---:|---:|---:|---|---|",
    ])
    for i, r in enumerate(top, start=1):
        lines.append(
            f"| {i} | {r['source_id']} | {r['score']} | {r['candidate_sentence_count']} | "
            f"{r['page_count']} | {r['recommendation']} | {str(r['file_name']).replace('|', '\\|')} |"
        )

    lines.extend([
        "",
        "## 全量明细",
        "",
        "| source_id | 分数 | 推荐 | 候选句 | 俄文 | 中文 | 控制符 | 表格信号 | 文件 |",
        "|---|---:|---|---:|---:|---:|---:|---:|---|",
    ])
    for r in ranked:
        lines.append(
            f"| {r['source_id']} | {r['score']} | {r['recommendation']} | "
            f"{r['candidate_sentence_count']} | {r['cyrillic_chars']} | {r['han_chars']} | "
            f"{r['control_chars']} | {r['table_signal_score']} | {str(r['file_name']).replace('|', '\\|')} |"
        )

    lines.extend(["", "## 样例句抽查", ""])
    for r in top[:10]:
        lines.append(f"### {r['source_id']} · {r['file_name']}")
        if not r["sample_sentences"]:
            lines.append("")
            lines.append("- 未抽到合格样例句。")
        for sent in r["sample_sentences"][:3]:
            lines.append(f"- {sent}")
        lines.append("")

    REPORT_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def main() -> int:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"source dir not found: {SOURCE_DIR}")

    records: list[dict[str, Any]] = []
    for index, path in enumerate(iter_source_files(), start=1):
        records.append(diagnose_file(path, f"raw-{index:04d}"))

    ranked = sorted(records, key=lambda r: (-r["score"], -r["candidate_sentence_count"], r["source_id"]))
    payload = {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "source_dir": str(SOURCE_DIR),
        "total_files": len(records),
        "records": ranked,
    }
    write_json(DATA_OUT, payload)
    write_report(ranked)

    counts = Counter(r["recommendation"] for r in ranked)
    print(f"screened files: {len(ranked)}")
    for key, value in counts.most_common():
        print(f"{key}: {value}")
    print("top candidates:")
    for r in ranked[:10]:
        print(f"  {r['source_id']} score={r['score']} candidates={r['candidate_sentence_count']} {r['file_name']}")
    print(f"json: {DATA_OUT}")
    print(f"report: {REPORT_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
