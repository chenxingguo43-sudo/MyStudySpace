---
title: "06 Parallel Dispatch"
type: "harness"
project: "В мире людей 阅读口语 Markdown版"
version: "v2.0-multi-agent"
tags:
  - harness
  - dispatch
---

# 06 Parallel Dispatch

## Dispatch Principle

Parallel work is allowed only when agents write to separate output areas and do not depend on each other's unfinished files.

Do not let multiple agents edit the same file unless the coordinator explicitly serializes those edits.

## Recommended Project Phases

### Phase 1: Parallel Drafting

These can run at the same time:

| Agent | Task | Output |
|---|---|---|
| Agent A | source-example matching | `_data/source_examples/` |
| Agent B | translation draft | `翻译版/` |
| Agent C | card schema and pilot cards | `卡片草稿/` |

Agent C may design card structure in Phase 1, but full card generation should wait for stable Agent A and Agent B outputs when those outputs are part of the card content.

### Phase 2: Dependent Generation

Agent C may generate full cards after:

- Agent A source-example output is available if cards include examples;
- Agent B translation output is available if cards include Chinese translation;
- naming and tag conventions are clear.

### Phase 3: Quality Gate

Agent D runs after A/B/C have delivered outputs.

Agent D may run partial reviews earlier, but a final integration verdict requires all assigned outputs.

## Safe Parallel Matrix

| Pair | Safe In Parallel? | Reason |
|---|---:|---|
| A + B | yes | separate outputs, shared read-only base |
| A + C pilot | yes | C pilot should not depend on A final data |
| B + C pilot | yes | C pilot should not depend on B final data |
| A + D final | no | D final needs A output complete |
| B + D final | no | D final needs B output complete |
| C full + A/B unfinished | no | C full may consume unstable outputs |
| D + any writer on same output | no | review target must be stable |

## Coordinator Dispatch Template

Use this template when assigning an agent:

```markdown
You are <Agent A/B/C/D> for the project `В мире людей 阅读口语 Markdown版`.

First read:
- `_harness/00-project-charter.md`
- `_harness/01-source-of-truth.md`
- `_harness/02-agent-roles.md`
- `_harness/03-workflows.md`
- `_harness/04-acceptance-criteria.md`
- `_harness/05-delivery-format.md`
- any additional files named below

Your task:
<specific task>

Scope:
<pages, chapters, vocabulary range, or output range>

You may write only to:
<allowed output directories>

You must not modify:
- `章节/`
- `原始OCR/`
- `README.md`
- `封版说明.md`
- any other read-only area from `_harness/01-source-of-truth.md`

Required final output:
- generated artifacts;
- completion report following `_harness/05-delivery-format.md`;
- final verdict: PASS, REVIEW, FAIL, or BLOCKED.
```

## Integration Rule

Generated artifacts are drafts until Agent D or the human coordinator marks them ready for integration.

