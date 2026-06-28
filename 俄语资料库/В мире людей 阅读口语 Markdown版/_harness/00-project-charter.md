---
title: "00 Project Charter"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
status: "active"
tags:
  - harness
  - multi-agent
  - 俄语/阅读
---

# 00 Project Charter

## Mission

This project turns the sealed Russian reading textbook Markdown library into reusable study assets:

1. real source-example matches for the vocabulary system;
2. Chinese translation drafts and later bilingual reading views;
3. Obsidian learning cards;
4. quality reports that make every generated artifact auditable.

The sealed Russian base text is the source of truth. Agents must generate derived artifacts without contaminating the base text.

## Current State

The library is sealed as **v1.0 Russian base text**.

Known verified state:

- book pages covered: `1-186`;
- raw OCR files: `原始OCR/page_001.md` through `原始OCR/page_186.md`;
- chapter files: 11 chapter Markdown files under `章节/`;
- validator: `PASS` for full coverage `1-186`;
- matrix/noise pages remain explicitly marked as unrecoverable;
- pages `167-186` are an AI vocabulary appendix layer, not original book reading text.

## Non-Negotiable Rules

1. Do not modify sealed base text unless the task explicitly authorizes source correction.
2. Do not delete raw OCR.
3. Do not overwrite historical quality reports.
4. Do not treat uncertain reconstruction as confirmed original text.
5. Do not use pages `167-186` as original reading examples.
6. Every derived artifact must keep source traceability.
7. Every agent must submit a completion report.
8. Integration into formal downstream systems requires a quality gate.

## Mandatory Reading Order

Every agent must read these files before starting:

1. `README.md`
2. `封版说明.md`
3. `_harness/00-project-charter.md`
4. `_harness/01-source-of-truth.md`
5. `_harness/02-agent-roles.md`
6. the workflow and acceptance files relevant to its assigned task

If an agent cannot access one of these files, it must stop and report `BLOCKED`.

## Operating Principle

This harness is written for both chat-style agents and code-capable agents.

- Chat-style agents should follow the protocol and produce the required Markdown/JSON content.
- Code-capable agents may run scripts, validators, and file checks, but must still obey the same boundaries.

When in doubt, preserve the sealed base text and write uncertainty into a report.

