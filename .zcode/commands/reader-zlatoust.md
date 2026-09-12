---
description: 使用当前 Z Code 页面里的模型，安全续做 Reader 的Златоуст语法解析；支持 pilot 或 all。
argument-hint: pilot 或 all
allowed-tools: Read, Write, Edit, Bash
skills: reader-textbook-production, reader-question-explainer
---

Use `reader-textbook-production` in visible-Agent/in-host mode. Read its `references/in-host-runner.md` completely before doing any work. Do not invoke a nested Z Code CLI, `reader-production.js run`, or `reader-zcode-adapter.js`.

Work quietly and efficiently: do not narrate every file read, JSON check, or internal thought. Read each required instruction and input once, process the whole claimed batch, and report only the batch result or a real blocker. Do not reopen the same instruction or script after each question unless a concrete error requires it.

Mode is `$ARGUMENTS`. Treat an empty mode as `pilot`.

- `pilot`: prepare only `ch0000:GL1-Q029,ch0000:GL1-Q030` with worker `zcode-page`, limit 2, and explicit unblock. Generate full-quality artifacts, obtain genuinely independent subagent reviews, finish the manifest, run its tests, and report the two Reader question IDs.
- `all`: repeatedly prepare batches of 4 with worker `zcode-page`, generate, independently review, finish, and continue until no work remains or the in-host instructions require a stop. Never unblock unnamed blocked work automatically. Keep one reviewer context per batch when it can review all four tasks; use a second context only for a repair round.

Preserve all completed tasks, especially GL1-Q001 through GL1-Q028. Match the learner-approved depth and natural Chinese of the accepted references named in each manifest. Do not shorten explanations to save tokens. Do not edit production source JSON directly; write only manifest-named artifacts and reviews, and let the helper integrate them.

If this host cannot create a genuinely separate reviewer context, stop after writing artifacts and report the exact manifest path instead of self-approving. Never claim a batch completed when `finish` reports `ok: false`; resolve the reported issue and rerun that manifest first.
