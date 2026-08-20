# Reader Phase 2.5 AI 接入说明

> 状态：Phase 2.5 本地架构与整体验收已封板；真实模型供应商仍需由用户配置后单独验证。

## 1. 已实现范围

- 语法题可在 Reader 内直接请求 AI 解析，自动带入题目、选项、用户答案、正确答案和已有客观材料。
- 语法解析显示正确答案原因、其他选项原因、知识点、易错提醒和不公布答案的迁移题。
- 单词、词形、短语、选中文本和整句可请求 AI 语境解释。
- 本地词典的原形、词性和已有释义仍优先显示；AI 只显示在其后的独立区域。
- 本地词典缺词时，AI 结果显示“临时解释，尚未核实”，不会自动成为正式词典事实。
- 原“复制提示词”功能保留，并与“AI 直接解析”分开记账。
- 解析结果支持“有帮助”和“不正确”反馈。
- 加入生词本仍调用 Reader 原有 `doSaveWord()` 和正式词元识别流程；AI 不直接写 FSRS。

## 2. 数据保存位置

AI 使用 `learningStore.databasePath` 公开的同一数据库路径，因此不会创建第二个 AI 数据库。

数据库文件名仍是：

```text
white-night-learning.sqlite3
```

AI 独立使用表：

```text
reader_ai_interactions
```

表中保存：请求类型、操作方式、脱敏输入、完整结构化回答、模型、模板版本、时间、状态、来源题目或查词记录、`lexemeKey`、重试次数和用户反馈。

真实模型返回用量时，还会保存输入、缓存输入、输出、推理和总 token 数。Reader 会在 AI 回答底部显示这些数字。token 是模型计费使用的文字单位；金额必须结合当前供应商自己的输入、输出单价计算，不能用其他供应商价目代替。

两种操作方式：

- `direct`：Reader 内真实调用模型，可以保存请求和回答。
- `prompt_copy`：只记录提示词被复制；模型和回答保持为空，不伪装成已完成的 AI 对话。

API Key 不保存到 SQLite、网页、浏览器存储、导出档案或日志。

## 3. 安全配置真实模型

服务端采用可替换的 OpenAI-compatible 适配器。Reader 浏览器不会直接连接模型。默认使用 Chat Completions；若供应商标明“Responses（原生）”，则切换到 Responses。

Node 进程读取以下环境变量：

```text
BELYE_NOCHI_AI_BASE_URL
BELYE_NOCHI_AI_MODEL
BELYE_NOCHI_AI_API_KEY
BELYE_NOCHI_AI_TIMEOUT_MS（可选，默认 30000 毫秒）
BELYE_NOCHI_AI_API_FORMAT（可选：chat_completions 或 responses；默认 chat_completions）
```

`BELYE_NOCHI_AI_BASE_URL` 填供应商给出的版本级根地址。程序会按接口格式自动追加 `/chat/completions` 或 `/responses`。例如某些 Responses 原生中转站会直接提供根地址而不是 `/v1`。

### 书架中的“AI 服务”

Reader 书架工具栏提供“AI 服务”入口，可以：

- 新增 OpenAI、Anthropic、DeepSeek 或自定义中转站。
- 选择 OpenAI Responses、OpenAI Chat Completions 或 Anthropic Messages 接口格式。
- 分别指定“查词与语境分析”和“语法题解析”使用哪个配置。
- 填写每百万 token 的普通输入、缓存输入、输出单价及渠道倍率，在回答底部显示估算费用。

网页不把 API Key 写进 `localStorage`、IndexedDB、SQLite、配置 JSON、日志或学习档案。用户在本机页面提交密钥后，Node 使用 Windows DPAPI 按“当前 Windows 用户”加密，密文位于本机学习数据目录的 `reader-ai-secrets/`。不含密钥的供应商配置位于同目录的 `reader-ai-config.json`。

环境变量方式继续保留，并在配置页显示为只读的“当前终端配置”。因此旧启动方式不需要立即迁移。

安全操作原则：

1. 只在启动 `server.js` 的当前终端进程中设置 API Key。
2. 不把 Key 写入 `.env`、PowerShell 脚本、HTML、JavaScript、文档或 Git。
3. 不在聊天、截图或日志中展示 Key。
4. 首次真实测试前，只确认供应商入口和模型名；密钥由用户本人在本机终端输入。
5. 未经确认，不把正式学习内容发送到外部模型。

## 4. Reader 操作

语法题提交后，在答案解析区域可见：

```text
AI 直接解析 | 复制提示词
```

词典详情底部也保留相同的两个动作。直接请求时页面会显示加载、取消、成功、失败和重试状态。

Node、数据库接口或 AI 服务不可用时：

- Reader 题目继续作答和保存；
- 本地词典继续查询；
- 生词本继续使用原有保存流程；
- 复制提示词仍可用；
- AI 区域只显示错误和重试入口。

## 5. 当前未完成

- 尚未选择和验收真实模型供应商、模型名、价格与数据政策。
- 尚未把外部 AI 页面中的回答粘贴回 Reader；`prompt_copy` 只记录复制动作。
- 尚未实现写作解析、口语评分、实时对话、云同步或账号系统。
- AI 临时解释没有人工审核工作台，不能升级为正式词典事实。

## 6. 2026-08-18 整体验收

本轮只做 Reader、AI、词典、Vocabulary 与 SQLite 的隔离验收，没有扩充 AI 功能，也没有向正式数据库写入模拟记录。

验收结果：

- 语法题与词典语境解析通过真 Chrome 请求、渲染和同库保存；Node 重启后，相同请求直接读取已完成结果，不会重复调用模型；
- `reader_ai_interactions` 与 `learning_events`、`vocabularyFsrs` 共用同一个 SQLite 文件，但使用独立表和独立写入路径；
- 新增封板测试逐项比较 AI 写入前后的学习事件数、FSRS 来源哈希、状态哈希、稳定期、难度和下次复习日期，结果完全不变；
- 模拟 AI 连接中断后，本地词典仍可查询；Node 停止时，浏览器学习事件继续留在本地待同步，恢复后可补交且不重复；
- 365 天虚拟时间、备份恢复、损坏恢复、响应丢失、重复提交、事务中断和旧调度回滚测试通过；
- 桌面与 390 像素手机宽度的词典面板和 AI 设置完成实际 Chrome 检查，没有横向溢出。

自动化结果：本轮 AI、学习数据库、FSRS 与恢复链路共 85 项 Node 测试通过；5 项真 Chrome 验收通过。扩大 Reader/词典回归共 94 项，其中 92 项通过，2 项为既有的 Python 词形分析环境与生产内容清单问题，不属于本轮 AI 或数据库回归。

封板含义：Phase 2.5 的本地调用、持久化、隔离和降级边界已经固定。未配置真实供应商时页面会明确显示 AI 不可用；这不影响 Reader、本地词典、Vocabulary 或学习记录。真实供应商的模型质量、价格和数据政策不在本次封板结论内。
