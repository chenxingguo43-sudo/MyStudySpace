# Reader Book Pipeline Profiles

每个 JSON 文件描述一本教材或一个可独立运行的教材模块。运行状态不写入配置，而是保存在 profile 的 `stateDir`；该目录必须排除在 Git 和 Reader 内容清单之外。

当前可运行 profile：

- `world-people-reading`：`В мире людей — 阅读口语`，30 篇文章、241 道题，使用 `reader-question-explainer` 生成逐题双层解析。
- `zlatoust-grammar`：Златоуст 语法与词汇，5 个章节、597 道题，输入同时关联知识点卡与原书页码。
- `russian-b2-reading`：俄罗斯 B2 阅读，10 篇文章、60 道题，使用本地原文证据生成逐题双层解析。
- `russian-b2-grammar`：俄罗斯 B2 六个语法分部，330 道逐题解析 + 34 张知识点卡片；已有合格卡片自动跳过，状态可断点恢复。

常用命令：

```powershell
node scripts/reader-book-pipeline.js init world-people-reading
node scripts/reader-book-pipeline.js refresh world-people-reading
node scripts/reader-book-pipeline.js resume world-people-reading
node scripts/reader-book-pipeline.js status world-people-reading
node scripts/reader-book-pipeline.js claim world-people-reading --worker agent-1 --limit 4
node scripts/reader-book-pipeline.js submit world-people-reading --task ch0000:q2 --artifact .reader-pipeline/world-people-reading/submissions/ch0000_q2.json --worker agent-1
node scripts/reader-book-pipeline.js integrate-ready world-people-reading --limit 4
node scripts/reader-book-pipeline.js unblock world-people-reading --task ch0000:q2
node scripts/reader-book-pipeline.js verify world-people-reading
```

`russian_b2` 的语法、听力、写作、口语和考试模块仍需要分别实现 adapter 与内容合同后再添加 profile。不能把未实现的模块伪装成已支持。

每个 profile 应设置 `defaultBatchSize`、`maxBatchSize`、`maxAttempts` 和 `maxConcurrency`，防止无限重试或一次领取过多高成本任务。

## Worker loop

`reader-book-worker.js` is the host-side resumable loop. It does not contain a
model; it invokes a configured processor once per claimed task:

```text
processor <input-json> <artifact-json>
```

The processor must read the complete input contract and write one artifact with
the exact `taskId`, `inputHash`, and required content fields. The worker then
submits and integrates only after the pipeline validator accepts the artifact.

Example:

```powershell
npm run reader:worker -- zlatoust-grammar --processor "node path/to/agent-processor.js" --worker grammar-agent --limit 2
```

The bundled Codex-backed processor is available as:

```powershell
npm run reader:worker -- zlatoust-grammar --processor "node scripts/reader-agent-processor.js" --worker grammar-agent --limit 2
```

Use `--max-batches N` for a bounded pilot. Add `--block-on-error` when a
processor failure should become an explicit `processor-failed` block instead
of leaving the leased task for repair or lease expiry. Re-running the same
command resumes from persisted state.

## Provider-neutral production runner

`reader-production.js` adds independent semantic review and bounded model
escalation around the same pipeline state. It does not call a model provider
itself. Each role is an ordinary executable configured as a command array, so
Codex, Claude Code, OpenCode, Z Code, direct API clients, and local model
runners can all use the same production core.

Copy `config/reader-production.example.json` to an environment-specific
configuration and replace the three example commands:

- `generator`: economical first draft and repair model;
- `reviewer`: independent semantic reviewer that did not write the draft;
- `escalation`: stronger model for repeated validation or review failures.

Preview without claiming or changing tasks:

```powershell
npm run reader:production -- plan zlatoust-grammar --config config/reader-production.example.json --preset low-cost
```

Run a bounded pilot after real commands are configured:

```powershell
npm run reader:production -- run zlatoust-grammar --config path/to/reader-production.local.json --preset low-cost --max-batches 1
```

Omit `--max-batches` for the authorized one-command full run. The runner
continues until work is complete/blocked or a profile test fails. Accepted
tasks are never regenerated because task state remains authoritative.

### Claude Code adapter

`reader-claude-adapter.js` uses Claude Code's non-interactive structured-output
mode. The model receives read-only tools and returns JSON to the adapter; it
does not write Reader or pipeline files itself. Existing Claude Code provider
configuration, including CC Switch routing, is inherited by the child process.

Preview the bundled Opus preset without a model call:

```powershell
npm run reader:production -- plan zlatoust-grammar --config config/reader-production.claude.example.json --preset claude-opus
```

Set `READER_CLAUDE_MODEL` or change the role command's `--model` value to route
generator, reviewer, and escalation roles to different models. Semantic review
is a separate Claude Code process even when the configured model name is the
same.

### Z Code GLM Flash adapter

`reader-zcode-adapter.js` drives Z Code's headless `--prompt` mode and parses
its JSON envelope. Z Code runs in plan mode with write and shell tools denied;
the host adapter alone writes contracted artifact/review files. The adapter
also refuses to run if `~/.zcode/cli/config.json` is no longer configured for
the expected model.

The desktop client and standalone CLI keep separate model configuration. Map
the existing desktop provider without printing its credential:

```powershell
node scripts/configure-zcode-reader-model.js --model glm-5.3-flash
```

Then preview the hybrid preset, where GLM Flash generates and reviews while
Claude Opus handles only exhausted items:

```powershell
npm run reader:production -- plan zlatoust-grammar --config config/reader-production.zcode-glm.example.json --preset zcode-glm-flash
```
