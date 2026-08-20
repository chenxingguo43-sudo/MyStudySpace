# 白夜俄语口语：Phase 0 技术决策记录

> 状态：ASR 与 TTS 已完成当前 MVP 选型；LLM 尚未选型；能力测试集、统一 system prompt 和 JSON Schema 已设计，尚未运行。
> 更新：2026-08-18

## 结论总览

| 能力 | 当前 MVP 决策 | 状态 |
|---|---|---|
| ASR | Groq `whisper-large-v3` 双通道：同一音频分别以 `language=zh`、`language=ru` 转写；两路 `verbose_json`（含 timestamps/segments）同时交给白夜俄语 Agent | 已确定 |
| LLM | 尚未确定；已建立固定 5 案例候选测试，需比较 DeepSeek、Groq 或其他候选 | 测试工具已就绪，模型未选定 |
| TTS | 本地 Silero `v5_ru`，默认 `aidar`；5 个音色可自由切换；Edge TTS 为备选 | 已确定 |

## ASR

### 为什么不是 turbo

20 条中俄混合基准实测显示，`whisper-large-v3-turbo` 对混合语言和俄语内容不够稳定；`whisper-large-v3` 整体更可靠。双通道能够救回部分俄语专有名词和完整俄语句子。

### 处理规则

- ASR 只做转写，不做翻译；中文和俄语原文都保留。
- Agent 收到两路原始转写、分段和时间戳，结合上下文选择或融合。
- 不能确定且影响意思时，必须向用户追问，不静默猜测。
- 保存原始音频、两路原始转写和可编辑/确认后的转写。
- Groq 请求需要代理；批量请求限速约 300ms+并带重试。

相关结果：

- `data/asr-mixed-benchmark-v1.json`
- `data/asr-results-groq-v3-large.json`
- `data/asr-results-groq-dual-v2.json`

## TTS

- 主方案：本地 Silero `v5_ru`，CPU 推理，模型缓存后离线运行。
- 默认声音：`aidar`，用户选择理由是语速较慢、比较清晰。
- 可切换声音：`aidar`、`baya`、`kseniya`、`eugene`、`xenia`。声音必须配置化，不能写死。
- 接口应保持 provider-neutral，例如 `synthesize(text, voice, provider)`。
- 采用分段合成和播放，第一段准备好即可播放。
- Edge TTS 作为备选 provider。
- Silero 当前许可适合私人 MVP；商业化前必须重新核验许可。

试听文件位于：`tmp/silero-test/voices/`。

## LLM 当前明确未决

目前只确定 LLM 必须承担：

1. 结合上下文理解双通道 ASR；
2. 维持俄语陪练身份和回复长度约束；
3. 在需要时追问，不把不确定内容当事实；
4. 输出可供字幕、分段 TTS、关键词和支架 UI 使用的数据；
5. 遵守白夜俄语的单 Agent 架构。

尚未决定：

- 供应商和模型（DeepSeek、Groq 或其他候选）；
- JSON 输出 schema 与流式传输方式；
- 提示词骨架；
- 上下文窗口、记忆注入、摘要和裁剪策略；
- 质量、约束遵循、延迟、Token、成本和资源占用的测试结果。

测试集：`data/llm-capability-test-v1.json`；指南：`docs/llm-capability-test-v1-guide.md`；prompt：`docs/llm-system-prompt-v1.md`；schema：`data/llm-output-schema-v1.json`。

因此，Phase 1 开始前不能把某个 LLM 当作最终生产依赖。固定测试工具位于 `scripts/run-speaking-llm-benchmark.js`，案例位于 `tests/fixtures/speaking-llm-benchmark.json`；先运行 `npm run verify:llm-speaking` 做离线契约检查，再用安全环境变量逐个比较真实候选。
