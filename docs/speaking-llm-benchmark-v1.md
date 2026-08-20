# 白夜俄语口语 LLM 候选测试 V1

状态：测试工具已建立，生产模型尚未选定。

## 这次测试什么

测试集只包含 5 条固定的合成案例，不读取用户录音、学习记录、localStorage、IndexedDB 或 SQLite。案例覆盖：

- 双通道转写不确定时先澄清；
- 日常对话保持短回复并继续追问；
- 中文求助时给俄语句型支架；
- B2 引导练习提供关键词支架；
- 纠错集中、不打断交流。

每个候选必须返回统一 JSON，供字幕、TTS 和口语界面继续使用：

- `replyRu`：主要俄语回复；
- `questionRu`：推动用户继续说的问题；
- `clarification`：是否需要澄清；
- `correction`：最多一个高价值纠错；
- `scaffold`：关键词、句型框架和完整建议；
- `ttsSegments`：可朗读的分段。

自动检查只判断硬约束：JSON 是否完整、是否有俄语回复、是否按案例要求澄清、是否超出回复句数、是否提供支架、纠错是否过多。自然度、鼓励感和事实准确性仍需人工看报告判断。

## 先做离线检查

在项目目录运行：

```text
npm run verify:llm-speaking
```

这一步使用固定离线候选，不访问网络，也不需要 API Key。通过只说明测试工具和输出契约正常，不代表任何真实模型已经选定。

## 比较真实候选

API Key 不能写进网页、代码、Git、日志或测试报告。只在当前终端临时设置以下环境变量，然后运行同一个命令：

```text
BELYE_NOCHI_SPEAKING_LLM_BASE_URL
BELYE_NOCHI_SPEAKING_LLM_API_KEY
BELYE_NOCHI_SPEAKING_LLM_MODEL
BELYE_NOCHI_SPEAKING_LLM_API_FORMAT=chat_completions
```

支持 OpenAI 兼容的 `chat_completions` 和 `responses` 接口。DeepSeek、Groq 等候选需要使用各自官方入口和模型名；不要把实验室地址或内部接口当成正式依赖。

脚本只发送这里的固定合成案例，按顺序逐条测试，不发送个人录音或正式学习内容。输出报告到终端，不自动写入 SQLite 或学习档案。

## 选型标准

候选模型至少需要同时满足：

1. 5 条硬约束全部通过；
2. 关键不确定信息会追问，而不是编造；
3. 回复通常短、自然，并真正推动用户继续说；
4. JSON 稳定、延迟和费用可以接受；
5. 失败、超时或断网时不影响本地录音保存。

因此目前只能说“测试工具已准备好”，不能提前宣称 DeepSeek、Groq 或其他供应商已经胜出。
