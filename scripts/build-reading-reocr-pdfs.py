"""Build OCR-ready PDF batches from the archived source page images.

The original publisher PDF is not present locally. These PDFs are therefore
derived page-image bundles, kept separate from the sealed OCR source.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(r"D:\MyStudySpace")
IMAGE_ROOT = ROOT / "俄语资料整理试验区" / "_ocr" / "v_mire_lyudei_reading_speaking_full" / "images"
OUTPUT_ROOT = ROOT / "docs" / "reader-ai-reading" / "reocr-batches"

BATCHES = [
    {"id": "18-2.4.2", "chapter": "2.4.2", "title": "Информационные письма", "start": 75, "end": 76},
    {"id": "21-3.1.1", "chapter": "3.1.1", "title": "Алмазная колесница", "start": 100, "end": 103},
    {"id": "22-3.1.2", "chapter": "3.1.2", "title": "Обыкновенная история", "start": 104, "end": 107},
    {"id": "25-3.3.1", "chapter": "3.3.1", "title": "Алые паруса", "start": 116, "end": 118},
    {"id": "26-3.3.2", "chapter": "3.3.2", "title": "Герой нашего времени", "start": 119, "end": 121},
    {"id": "27-3.4.1", "chapter": "3.4.1", "title": "Попытка к бегству", "start": 122, "end": 125},
    {"id": "29-3.5.1", "chapter": "3.5.1", "title": "Шестой дозор", "start": 131, "end": 134},
]


def image_for_page(page: int) -> Path:
    normal = IMAGE_ROOT / f"page_{page:03d}.png"
    prep = IMAGE_ROOT / f"page_{page:03d}_prep.png"
    if normal.exists():
        return normal
    if prep.exists():
        return prep
    raise FileNotFoundError(f"Missing source page image for page {page}: {normal}")


def write_readme(batch: dict, pages: list[int], image_paths: list[Path], pdf_path: Path) -> None:
    source_lines = "\n".join(f"- 第 {page} 页：{path}" for page, path in zip(pages, image_paths))
    text = f"""# 阅读 {batch['chapter']} OCR 重做包

## 文章

**{batch['title']}**（《В мире людей》第 {batch['chapter']} 篇）

## 使用说明

把本目录的 `{pdf_path.name}` 上传到 OCR 工具，重新识别整份 PDF。
识别完成后，先人工检查俄语正文、题目、选项和答案页，再替换 Reader 的残缺原文。

## 页码范围

原书页面图像范围：第 {batch['start']}–{batch['end']} 页，共 {len(pages)} 页。

## 重要说明

当前电脑没有找到出版社原始 PDF。这个 PDF 是由项目中保存的原书页面图像重新合成的 OCR 输入包，不是新的教材内容，也没有修改原始 OCR。

页面图像来源：

{source_lines}
"""
    (pdf_path.parent / "README.md").write_text(text, encoding="utf-8")


def build_batch(batch: dict) -> dict:
    pages = list(range(batch["start"], batch["end"] + 1))
    image_paths = [image_for_page(page) for page in pages]
    images = []
    try:
        for image_path in image_paths:
            with Image.open(image_path) as source:
                images.append(source.convert("RGB"))
        destination = OUTPUT_ROOT / batch["id"]
        destination.mkdir(parents=True, exist_ok=True)
        pdf_path = destination / f"reocr-{batch['chapter']}.pdf"
        first, *rest = images
        first.save(pdf_path, "PDF", resolution=300.0, save_all=True, append_images=rest)
        write_readme(batch, pages, image_paths, pdf_path)
        return {
            **batch,
            "pages": pages,
            "pageCount": len(pages),
            "pdf": str(pdf_path),
            "sourceImageRoot": str(IMAGE_ROOT),
            "sourceImages": [str(path) for path in image_paths],
            "kind": "derived-page-image-pdf-for-reocr",
        }
    finally:
        for image in images:
            image.close()


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = [build_batch(batch) for batch in BATCHES]
    overview = """# 缺失阅读原文 OCR 重做包

当前电脑没有找到《В мире людей. Выпуск 3. Часть 1. Чтение. Говорение》的出版社原始 PDF。
本目录中的 PDF 是根据项目保存的原书页面图像合成的独立 OCR 输入包，页面内容未被 AI 改写。

页面图像来源：

`D:\\MyStudySpace\\俄语资料整理试验区\\_ocr\\v_mire_lyudei_reading_speaking_full\\images`

使用时，把对应章节目录中的 `reocr-章节号.pdf` 上传到 OCR 工具。OCR 完成后，先人工检查，再恢复 Reader 原文。

完整清单见 `manifest.json`。每个章节目录的 `README.md` 会列出具体页码和原始图像路径。
"""
    (OUTPUT_ROOT / "README.md").write_text(overview, encoding="utf-8")
    (OUTPUT_ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Built {len(manifest)} OCR-ready PDF batches in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
