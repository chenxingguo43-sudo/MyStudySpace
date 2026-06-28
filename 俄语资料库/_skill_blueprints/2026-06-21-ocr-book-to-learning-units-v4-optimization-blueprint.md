# OCR Book To Learning Units v4 Optimization Blueprint

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Keep the current v3 skill stable while another agent may be using it.

**Goal:** Upgrade `ocr-book-to-learning-units` from a strong v3 whole-book workflow to a near-product-grade v4 skill for OCR/PDF book projects, with stateful automation, listening-speaking support, translation validation, safe parallel-agent mode, and forward tests.

**Architecture:** Keep `SKILL.md` as a compact router. Put detailed behavior in one-level `references/` files. Put deterministic checks in `scripts/`. Develop v4 in a draft copy first, validate there, then promote to the live skill only after the current Claude book run is sealed or explicitly restarted.

**Tech Stack:** Markdown skill files, Python validators/planners, Obsidian Markdown conventions, Windows absolute paths, Codex/Claude-compatible agent prompts.

---

## 0. Current State And Risk

Current live skill:

```text
C:\Users\梅子\.codex\skills\ocr-book-to-learning-units
```

Current estimated score:

```text
80 / 100
```

Strengths:

- Whole-book goal mode exists.
- Source sealing and learning-unit validation exist.
- Translation layer is recognized as a derived layer.
- Planner can identify sealed vs unfinished projects.
- The workflow has already succeeded on real reading/writing-speaking books.

Main gaps:

- No persistent `goal_state.json`.
- No dedicated listening-speaking profile.
- No formal parallel-agent mode.
- Translation layer has rules but no validator.
- Range map has no deterministic validator.
- Forward-testing is informal rather than scripted and repeatable.

Important concurrency warning:

If Claude is currently running a project using the live v3 skill, do not edit live `SKILL.md`, core references, or scripts during that run. Claude may have already loaded some files into context, but it may re-read references or run scripts later. Changing the live skill mid-run can create split-brain behavior: early batches follow v3, later batches follow v4.

Safe rule:

```text
Develop v4 in a draft folder. Promote only after the active Claude project is sealed, paused, or explicitly restarted on v4.
```

Recommended draft folder:

```text
C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft
```

---

## 1. Target Score Model

| Upgrade | Expected Score |
| --- | ---: |
| Current v3 baseline | 80 |
| Add persistent goal state | 86 |
| Add safe parallel-agent mode | 90 |
| Add listening-speaking profile | 93 |
| Add validator suite | 96 |
| Add forward-test scenarios and promotion protocol | 98 |

Reasonable target:

```text
95-98 / 100
```

Do not promise 100 because OCR projects depend on PDF scan quality, missing audio/script material, layout noise, and ambiguous source boundaries.

---

## 2. File Map

Create or modify only inside the v4 draft folder first:

```text
C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft
```

Files to create:

```text
references/profile-listening-speaking.md
references/parallel-agent-mode.md
references/goal-state-protocol.md
references/promotion-protocol.md
scripts/init_goal_state.py
scripts/validate_goal_state.py
scripts/validate_range_map.py
scripts/validate_translation_layer.py
scripts/validate_parallel_outputs.py
scripts/smoke_test_skill.py
assets/goal-state-template.json
```

Files to modify:

```text
SKILL.md
agents/openai.yaml
references/autonomous-goal-mode.md
references/project-flow.md
references/acceptance-checklist.md
references/claude-dispatch-prompts.md
scripts/plan_next_batch.py
```

Files not to modify in active book projects:

```text
原始OCR/
章节/
_data/source_manifest.json
PDF original files
```

---

## 3. Implementation Tasks

### Task 1: Create A v4 Draft Skill Copy

**Files:**

- Create: `C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft\`
- Read-only source: `C:\Users\梅子\.codex\skills\ocr-book-to-learning-units\`

- [ ] Copy the entire live v3 skill folder to the draft folder.

Command:

```powershell
Copy-Item -LiteralPath "C:\Users\梅子\.codex\skills\ocr-book-to-learning-units" -Destination "C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft" -Recurse
```

- [ ] Validate the draft copy before changes.

Command:

```powershell
$env:PYTHONUTF8="1"
python "C:\Users\梅子\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft"
```

Expected:

```text
Skill is valid!
```

Acceptance:

- Live v3 remains untouched.
- Draft validates before any v4 changes.

---

### Task 2: Add Goal State Protocol

**Files:**

- Create: `references/goal-state-protocol.md`
- Create: `assets/goal-state-template.json`
- Create: `scripts/init_goal_state.py`
- Create: `scripts/validate_goal_state.py`
- Modify: `references/autonomous-goal-mode.md`
- Modify: `scripts/plan_next_batch.py`

Purpose:

Make project progress resumable across Codex/Claude/model switches.

Required project file:

```text
[PROJECT_ROOT]/_automation/goal_state.json
```

Minimum schema:

```json
{
  "schema_version": "1.0",
  "project_root": "",
  "profile": "unknown",
  "goal": {
    "learning_units": true,
    "translation_layer": false,
    "parallel_mode": "off"
  },
  "stages": {
    "source_base": "unknown",
    "range_map": "unknown",
    "learning_units": "unknown",
    "translation_layer": "not_requested",
    "finalization": "unknown"
  },
  "batches": [],
  "known_risks": [],
  "last_validator_run": null
}
```

Implementation requirements:

- `init_goal_state.py [project_root] --profile [profile] --translation [true|false]` creates `_automation/goal_state.json`.
- `validate_goal_state.py [project_root]` checks required keys, valid enum values, and project root consistency.
- `plan_next_batch.py` should read goal state when present and include it in JSON output.

Acceptance:

- Existing sealed writing-speaking project still returns `sealed`.
- A new project with OCR but no range map returns `needs_range_map`.
- A project with requested translation but missing `翻译/` returns a state indicating translation is incomplete before final seal.

---

### Task 3: Add Listening-Speaking Profile

**Files:**

- Create: `references/profile-listening-speaking.md`
- Modify: `SKILL.md`
- Modify: `references/project-flow.md`
- Modify: `references/claude-dispatch-prompts.md`

Purpose:

Avoid forcing listening/speaking books into the writing-speaking template.

Profile must cover:

- listening task prompts;
- audio track references if present;
- tapescript/transcript pages;
- dialogue/monologue tasks;
- listening comprehension questions;
- speaking follow-up;
- retelling / role-play / opinion tasks;
- vocabulary and pronunciation support;
- answer keys or scripts;
- missing-audio risk labels.

Learning unit sections should include:

```text
0. 元信息
1. 原书任务
2. 听力/口语目标
3. 听前准备
4. 听力材料 / Tapescript / 输入文本
5. 理解题与答案区状态
6. 口语输出任务
7. 可复用表达
8. 语音/语调/听辨提示
9. 中文对照入口
10. 词汇与真实例句
11. 学习卡片入口
12. 后续待完善
```

Acceptance:

- `SKILL.md` profile selection mentions listening-speaking.
- Claude dispatch prompt for the listening-speaking book tells the agent not to hard-fit writing-speaking.
- Profile clearly separates original transcript from generated listening support.

---

### Task 4: Add Parallel Agent Mode

**Files:**

- Create: `references/parallel-agent-mode.md`
- Create: `scripts/validate_parallel_outputs.py`
- Modify: `references/autonomous-goal-mode.md`
- Modify: `references/acceptance-checklist.md`
- Modify: `references/claude-dispatch-prompts.md`

Trigger conditions:

```text
Only enable after source_base = PASS and range_map = PASS.
Only enable when 3+ independent non-overlapping batches or derived layers exist.
```

Coordinator-only files:

```text
README.md
封板说明.md
索引/学习单元总索引.md
质量报告/全书学习单元总质量报告.md
_automation/goal_state.json
```

Worker-agent allowed outputs:

```text
学习单元/[assigned files only]
翻译/[assigned files only]
质量报告/batch_[assigned_scope].md
```

Worker-agent forbidden outputs:

```text
原始OCR/
章节/
_data/source_manifest.json
README.md
封板说明.md
other agents' assigned files
```

`parallel-agent-mode.md` must include:

- readiness checklist;
- batch assignment format;
- worker prompt template;
- coordinator merge checklist;
- conflict policy;
- failure handling.

`validate_parallel_outputs.py` should check:

- duplicate target files across agent reports;
- overlapping page ranges where not declared;
- writes to coordinator-only files by worker reports;
- missing batch reports;
- missing source links.

Acceptance:

- Parallel mode is optional, not default.
- It cannot activate before range map validation.
- It gives exact worker prompt templates.
- It gives a single coordinator integration checklist.

---

### Task 5: Add Translation Layer Validator

**Files:**

- Create: `scripts/validate_translation_layer.py`
- Modify: `references/translation-layer.md`
- Modify: `references/acceptance-checklist.md`
- Modify: `references/autonomous-goal-mode.md`

Validator checks:

- `翻译/` exists when translation requested.
- Every translation file has source page or source unit links.
- Every translation file has `translation status: needs_review` unless human-reviewed.
- Translation files are not under `原始OCR/` or `章节/`.
- No full translation appears inside `> [!note] 原书内容`.
- Batch reports exist in `质量报告/`.

Command:

```powershell
python "C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft\scripts\validate_translation_layer.py" "[PROJECT_ROOT]"
```

Expected output format:

```text
project_root=[PROJECT_ROOT]
translation_files=19
findings_count=0
PASS
```

Acceptance:

- Missing `翻译/` returns FAIL only when translation is requested in goal state.
- Missing source links returns REVIEW or FAIL depending on severity.
- Validator output is concise and machine-readable enough for agents.

---

### Task 6: Add Range Map Validator

**Files:**

- Create: `scripts/validate_range_map.py`
- Modify: `references/project-flow.md`
- Modify: `references/acceptance-checklist.md`

Validator checks:

- range map file exists;
- all declared topics have page ranges;
- source page wikilinks exist;
- no duplicated topic IDs;
- page ranges do not overlap unless marked as boundary/shared material;
- expected profile fields exist for reading, writing-speaking, or listening-speaking;
- OCR risk labels exist.

Command:

```powershell
python "C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft\scripts\validate_range_map.py" "[PROJECT_ROOT]" --profile listening-speaking
```

Expected:

```text
range_map=[path]
topics_checked=[n]
findings_count=0
PASS
```

Acceptance:

- Bad or missing range map blocks parallel mode.
- Validator can run before learning-unit generation.

---

### Task 7: Update Planner For v4 Stages

**Files:**

- Modify: `scripts/plan_next_batch.py`
- Modify: `references/autonomous-goal-mode.md`

Planner must recognize:

```text
needs_goal_state
needs_source_base
needs_range_map
needs_learning_units
needs_translation_layer
needs_finalization
sealed
needs_manual_review
```

Planner output should include:

```json
{
  "stage": "needs_translation_layer",
  "profile": "listening-speaking",
  "translation_requested": true,
  "parallel_ready": true,
  "recommended_next_mode": "parallel",
  "recommended_commands": []
}
```

Acceptance:

- Existing projects without goal state remain supported.
- New v4 projects get stronger guidance when goal state exists.
- Planner never recommends parallel mode before source and range map pass.

---

### Task 8: Add Forward-Test Suite

**Files:**

- Create: `scripts/smoke_test_skill.py`
- Create test fixtures under a safe temp directory during test runtime only.

Test scenarios:

1. Existing sealed writing-speaking project remains sealed.
2. Empty project with OCR package returns `needs_source_base`.
3. Project with source base but no range map returns `needs_range_map`.
4. Project with range map and missing units returns `needs_learning_units`.
5. Project with requested translation and no `翻译/` returns `needs_translation_layer`.
6. Project with worker report writing coordinator-only files triggers parallel-output finding.

Command:

```powershell
python "C:\Users\梅子\.codex\skills\ocr-book-to-learning-units-v4-draft\scripts\smoke_test_skill.py"
```

Expected:

```text
tests=6
failed=0
PASS
```

Acceptance:

- Tests do not mutate active book projects.
- Tests create and remove their own temp fixtures.
- Test failure blocks promotion.

---

### Task 9: Update Cross-Agent Prompts

**Files:**

- Modify: `references/claude-dispatch-prompts.md`

Add prompt templates for:

- whole-book with listening-speaking profile;
- coordinator agent;
- worker learning-unit agent;
- worker translation agent;
- worker OCR-risk review agent;
- repair agent.

Each worker prompt must include:

```text
Project root
Skill directory
Assigned scope
Allowed output files
Forbidden output files
Required reads
Required validators
Required completion report fields
```

Acceptance:

- A worker prompt is self-contained.
- It does not rely on conversation history.
- It includes explicit no-write zones.

---

### Task 10: Promotion Protocol

**Files:**

- Create: `references/promotion-protocol.md`
- Modify: `SKILL.md`

Promotion steps:

1. Confirm no active Claude/Codex project is using the live v3 skill, or explicitly decide to restart it on v4.
2. Run `quick_validate.py` on draft.
3. Run all v4 smoke tests.
4. Run planner and validators against at least one real sealed project.
5. Copy draft over live skill or rename folders in a controlled way.
6. Run `quick_validate.py` on live skill.
7. Save promotion report in a book-neutral location.

Acceptance:

- Promotion cannot happen silently during an active project.
- There is a rollback path: keep a `ocr-book-to-learning-units-v3-stable` copy.

---

## 4. Self-Review

### Coverage Check

- Persistent automation state: covered by Tasks 2 and 7.
- Listening-speaking support: covered by Task 3.
- Parallel execution: covered by Task 4 and Task 9.
- Translation validation: covered by Task 5.
- Range-map validation: covered by Task 6.
- Forward testing: covered by Task 8.
- Safe rollout while Claude is running: covered by Task 1 and Task 10.

### Placeholder Scan

This blueprint avoids unresolved `TBD` / `TODO` placeholders. Any implementation details that require code are assigned to concrete script files with expected commands and outputs.

### Risk Review

Highest risk:

```text
Editing live v3 while Claude is actively using it.
```

Mitigation:

```text
Develop in ocr-book-to-learning-units-v4-draft and promote only after active runs are sealed or restarted.
```

Second risk:

```text
Overcomplicating SKILL.md.
```

Mitigation:

```text
Keep SKILL.md as router; place details in one-level references.
```

Third risk:

```text
Parallel agents creating conflicting files.
```

Mitigation:

```text
Coordinator-only files, worker allowed outputs, validate_parallel_outputs.py.
```

### Execution Recommendation

Implement in this order:

```text
1. Draft copy and promotion safety
2. goal_state protocol
3. listening-speaking profile
4. validators
5. parallel-agent mode
6. prompt templates
7. smoke tests
8. promotion
```

Do not start with parallel mode. Parallel mode is valuable, but it depends on goal state, profile clarity, and validators.

---

## 5. Current Active-Claude Guidance

If Claude is already running a book with live v3:

- Do not modify the live skill folder during the run.
- Do not replace scripts in the live folder.
- Do not change `SKILL.md` or currently referenced files.
- Continue using v3 for that active run.
- Build v4 in the draft folder.
- After Claude returns, decide whether to:
  - let the current project finish under v3, or
  - pause/restart it under v4 with explicit instruction.

Safe message to Claude if needed:

```text
Continue using the currently loaded v3 skill behavior for this project. Do not switch to v4 unless I explicitly restart the task with the v4 skill path.
```

