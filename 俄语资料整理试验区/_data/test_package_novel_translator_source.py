#!/usr/bin/env python3
"""Tests for packaging novel-translator extracted text as source packages."""

from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


MODULE_PATH = Path(__file__).with_name("package_novel_translator_source.py")
spec = importlib.util.spec_from_file_location("package_novel_translator_source", MODULE_PATH)
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class NovelTranslatorPackagingTest(unittest.TestCase):
    def test_filters_to_displayable_russian_sentences(self) -> None:
        good = "Я долго изучала русский язык, потому что хотела читать настоящие книги."

        self.assertTrue(packager.is_displayable_russian_sentence(good))
        self.assertFalse(packager.is_displayable_russian_sentence("РУССКИЙ ЯЗЫК КАК ИНОСТРАННЫЙ"))
        self.assertFalse(packager.is_displayable_russian_sentence("Привет."))
        self.assertFalse(packager.is_displayable_russian_sentence("Я учу русский。中文污染"))
        self.assertFalse(packager.is_displayable_russian_sentence("1 2 3 | таблица | ---"))

    def test_builds_valid_source_package_from_extracted_json(self) -> None:
        with TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            extracted_path = tmp_dir / "extracted.json"
            package_root = tmp_dir / "packages"
            extracted_path.write_text(
                json.dumps(
                    [
                        {"text": "РУССКИЙ ЯЗЫК КАК ИНОСТРАННЫЙ", "page": 1, "type": "para"},
                        {
                            "text": "Она внимательно прочитала текст и выписала новые слова в тетрадь.",
                            "page": 2,
                            "type": "para",
                        },
                        {"text": "Я учу русский。中文污染", "page": 3, "type": "para"},
                    ],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            pkg_path = packager.build_package(
                extracted_path=extracted_path,
                source_id="novel-0001",
                source_title="Novel Translator Sample",
                package_root=package_root,
                max_records=20,
            )

            source = json.loads((pkg_path / "source.json").read_text(encoding="utf-8"))
            pages = json.loads((pkg_path / "pages.json").read_text(encoding="utf-8"))
            candidates = json.loads((pkg_path / "sentence_candidates.json").read_text(encoding="utf-8"))
            records = json.loads((pkg_path / "sentence_records.json").read_text(encoding="utf-8"))

            self.assertEqual(source["source_id"], "novel-0001")
            self.assertEqual(len(pages), 3)
            self.assertEqual(len(candidates), 1)
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["sentence_id"], "n0001-0001")
            self.assertEqual(records[0]["match_risk"], "low")
            self.assertGreaterEqual(records[0]["page_number"], 1)
            self.assertIn("прочитала", records[0]["surface_forms"])
            self.assertIn("прочитала", records[0]["possible_lexemes"])

    def test_builds_package_from_russian_cache_with_translations(self) -> None:
        with TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            cache_dir = tmp_dir / "cache_russian"
            package_root = tmp_dir / "packages"
            cache_dir.mkdir()
            (cache_dir / "ch0000.json").write_text(
                json.dumps(
                    {
                        "title": "Сказка",
                        "original": [
                            "Белая уточка",
                            "Она внимательно прочитала текст и выписала новые слова в тетрадь.",
                            "Привет.",
                        ],
                        "translated": [
                            "白鸭子",
                            "她仔细读了课文，并把生词抄在笔记本里。",
                            "你好。",
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            pkg_path = packager.build_package_from_russian_cache(
                cache_dir=cache_dir,
                source_id="novel-0002",
                source_title="Russian Tales",
                package_root=package_root,
                max_records=20,
            )

            records = json.loads((pkg_path / "sentence_records.json").read_text(encoding="utf-8"))

            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["sentence_id"], "n0002-0001")
            self.assertEqual(records[0]["zh"], "她仔细读了课文，并把生词抄在笔记本里。")
            self.assertEqual(records[0]["match_risk"], "low")
            self.assertFalse(records[0]["needs_review"])


if __name__ == "__main__":
    unittest.main()
