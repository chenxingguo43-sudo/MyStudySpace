---
title: "07 Recovery Policy"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - recovery
---

# 07 Recovery Policy

## General Recovery Rule

When an agent encounters uncertainty, it should not guess silently. It should choose one of:

1. mark the item `needs_review`;
2. skip the item and explain why;
3. create a separate review report;
4. stop with `BLOCKED` if continuing would risk corrupting downstream work.

## OCR Or Source Ambiguity

If OCR is noisy or page reconstruction is uncertain:

- cite both the chapter file and raw OCR page if available;
- mark status as `needs_review`;
- avoid confident correction unless the PDF or source image has been checked;
- do not rewrite sealed text.

## Example Matching Errors

If a match looks suspicious:

- mark it `needs_review` or remove it from high-confidence output;
- record lemma, matched form, and reason for suspicion;
- avoid naive substring or stem matches as confirmed examples;
- prefer exact or verified morphology for high-confidence output.

Examples of risky matches:

- different lemma with similar stem;
- preposition or short function word matched inside another word;
- task instruction matched when the task requires natural reading examples;
- AI appendix text used as original book example.

## Translation Uncertainty

If a sentence is hard to translate:

- preserve the Russian original;
- provide the best conservative Chinese translation;
- add a short translator note;
- include the item in the translation report.

Do not omit difficult passages without listing them.

## Card Generation Problems

If a card would be too large:

- create an article card plus smaller linked cards;
- keep source metadata on every card;
- report the split in the card report.

If source metadata is missing, create the card only as `needs_review` or skip it.

## File Conflicts

If an output file already exists:

- inspect it before writing;
- append, version, or create a dated file unless the dispatch prompt authorizes replacement;
- report overwritten or superseded files explicitly.

If multiple agents are writing to the same path, stop and ask the coordinator to serialize the work.

## Read-Only Area Modification

If an agent accidentally modifies a read-only area:

1. stop the task;
2. report the exact files changed;
3. do not continue generating more output;
4. wait for coordinator instructions.

Code-capable agents should not revert user changes automatically unless explicitly told to do so.

