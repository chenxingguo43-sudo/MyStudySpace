#!/usr/bin/env python3
"""Tests for importing source packages that already contain translations."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("import_source_package.py")
spec = importlib.util.spec_from_file_location("import_source_package", MODULE_PATH)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class TranslatedPackageImportTest(unittest.TestCase):
    def test_convert_record_preserves_translation_display_fields(self) -> None:
        record = {
            "sentence_id": "n0002-0001",
            "source_id": "novel-0002",
            "page_number": 1,
            "ru": "Она внимательно прочитала текст и выписала новые слова в тетрадь.",
            "zh": "她仔细读了课文，并把生词抄在笔记本里。",
            "confidence": "medium",
            "needs_review": False,
            "candidate_id": "n0002-0001",
            "match_risk": "low",
            "surface_forms": ["Она", "прочитала"],
            "lexeme_tags": [],
            "possible_lexemes": ["она", "прочитала"],
            "grammar_tags": [],
        }
        source = {"category": "novel_translator_russian_cache"}

        unified = importer.convert_record_to_unified(record, source)

        self.assertEqual(unified["translation_status"], "translated")
        self.assertEqual(unified["quality_flags"], ["clean_sentence_candidate"])
        self.assertEqual(unified["quality_score"], 100)
        self.assertEqual(unified["translation_confidence"], "medium")
        self.assertFalse(unified["translation_needs_review"])
        self.assertEqual(unified["example_type"], "real_source")
        self.assertEqual(unified["display_priority"], 80)
        self.assertTrue(unified["vocabulary_card_eligible"])

    def test_convert_record_marks_empty_translation_untranslated(self) -> None:
        record = {
            "sentence_id": "novel-0001",
            "source_id": "novel-0001",
            "page_number": 1,
            "ru": "Она внимательно прочитала текст и выписала новые слова в тетрадь.",
            "zh": "",
            "confidence": "medium",
            "needs_review": True,
            "candidate_id": "novel-0001",
            "match_risk": "low",
            "surface_forms": ["Она", "прочитала"],
            "lexeme_tags": [],
            "possible_lexemes": ["она", "прочитала"],
            "grammar_tags": [],
        }
        source = {"category": "novel_translator_extracted"}

        unified = importer.convert_record_to_unified(record, source)

        self.assertEqual(unified["translation_status"], "untranslated")
        self.assertEqual(unified["quality_flags"], ["clean_sentence_candidate"])
        self.assertEqual(unified["quality_score"], 100)
        self.assertNotIn("vocabulary_card_eligible", unified)


if __name__ == "__main__":
    unittest.main()
