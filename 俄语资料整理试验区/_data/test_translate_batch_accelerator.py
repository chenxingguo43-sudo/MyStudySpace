#!/usr/bin/env python3
"""Tests for the translation queue accelerator helpers."""

from __future__ import annotations

import importlib.util
import json
import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


MODULE_PATH = Path(__file__).with_name("translate_batch.py")
spec = importlib.util.spec_from_file_location("translate_batch", MODULE_PATH)
translate_batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(translate_batch)


class ApiKeyRotatorTest(unittest.TestCase):
    def test_rotates_comma_separated_keys_thread_safely(self) -> None:
        rotator = translate_batch.ApiKeyRotator("k1, k2,k3")

        observed = [rotator.next_key() for _ in range(5)]

        self.assertEqual(observed, ["k1", "k2", "k3", "k1", "k2"])


class ConcurrentBatchProcessingTest(unittest.TestCase):
    def test_processes_pending_batches_with_configurable_workers(self) -> None:
        with TemporaryDirectory() as tmp:
            queue_dir = Path(tmp)
            pending = queue_dir / "pending"
            done = queue_dir / "done"
            processed = queue_dir / "processed_pending"
            pending.mkdir()
            done.mkdir()
            processed.mkdir()

            batch_files = []
            for idx in range(4):
                batch_file = pending / f"batch-test-{idx}.json"
                batch_file.write_text(
                    json.dumps(
                        {
                            "items": [
                                {
                                    "i": 1,
                                    "sentence_id": f"s-{idx}",
                                    "source_id": "test",
                                    "ru": "Пример.",
                                }
                            ]
                        },
                        ensure_ascii=False,
                    ),
                    encoding="utf-8",
                )
                batch_files.append(batch_file)

            started = []

            def fake_process(batch_file: Path, log_lines: list[str]) -> bool:
                started.append((batch_file.name, time.monotonic()))
                time.sleep(0.2)
                batch_file.rename(processed / batch_file.name)
                log_lines.append(f"{batch_file.stem}: ok")
                return True

            start = time.monotonic()
            summary = translate_batch.process_pending_batches(
                batch_files=batch_files,
                workers=4,
                process_func=fake_process,
                delay_between_batches=0,
            )
            elapsed = time.monotonic() - start

            self.assertEqual(summary["batches_done"], 4)
            self.assertEqual(summary["successful_batches"], 4)
            self.assertEqual(summary["failed_batches"], 0)
            self.assertLess(elapsed, 0.55)
            self.assertEqual(len(list(pending.glob("*.json"))), 0)
            self.assertEqual(len(list(processed.glob("*.json"))), 4)


if __name__ == "__main__":
    unittest.main()
