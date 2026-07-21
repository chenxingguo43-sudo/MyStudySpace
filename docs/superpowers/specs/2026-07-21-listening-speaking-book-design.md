# В мире людей 听力口语 · 接入 Reader + 精听工作站 · 设计文档

**日期**: 2026-07-21
**源数据**: `D:\MyStudySpace\俄语资料库\В мире людей 听力口语 Markdown版\`
**音频**: `E:\Desktop\听力音频\`（78 个 mp3，按书内片段顺序编号 01-78）
**目标**: 存入 reader.html 作为独立书籍入口，精听功能链接到 immersion-study-space

---

## 1. 源数据概况

| 指标 | 值 |
|---|---|
| 书名 | В мире людей. Выпуск 2. Аудирование. Говорение |
| 作者 | М.Н. Макова, О.А. Ускова |
| 出版社 | Златоуст, 2016 |
| 学习单元 | 15 个 Тема（含 63 个可对应的音频片段） |
| 章节 | Р1 ТРКИ-2（8 Тема）+ Р2 ТРКИ-3（6 Тема）+ Р3 方法论 |
| mp3 文件 | 78 个（`01.mp3` ~ `78.mp3`，前 65 个已确认可对应） |
| 文字稿 | 每段后有 аудиотекст 文字稿 |

### 每段结构

```
Диалог 1.1.1
  Время звучания: 30 сек
  5 道选择题 + 答案（在答案键第 93-94 页）
  文字稿（аудиотекст）:
    — Олечка! Прекрасно выглядишь! Как муж? Сынок?
    — Муж как всегда, а вот сын...
```

---

## 2. 架构决策

| 决策 | 选项 | 理由 |
|---|---|---|
| 拆分 vs 合并 | **A（拆分）** | 一个音频片段 = reader 一章，直接复用 B2 `listening-practice` |
| reader format | `listening-practice` | 零新渲染代码，考试+精听模式已有 |
| 时间戳生成 | **whisper 宽松匹配** | 标准俄语 mp3，whisper 准确率 95%+ |
| 精听工作站 | **链接外部** | immersion-study-space 已有完整功能 |
| 书架入口 | 独立 `id: "listening_speaking"` | 同写作口语模式 |

---

## 3. 实施步骤

### Phase 1: 生成时间戳

用 `D:\MyStudySpace\_youtube_audio\transcribe.py` 批量处理 78 个 mp3：

```bash
# 伪代码
for f in E:/Desktop/听力音频/*.mp3; do
    python transcribe.py "$f" "data/listening_speaking_transcripts/$(basename $f .mp3).json"
done
```

输出 JSON：
```json
[
  {"text": "Олечка! Прекрасно выглядишь!", "startTime": 0.0, "endTime": 4.2},
  {"text": "Как муж? Сынок?", "startTime": 4.3, "endTime": 6.8},
  ...
]
```

### Phase 2: 数据转换

写 `scripts/convert-listening-speaking.js`：
1. 遍历 `章节/` 下 13 个有音频的 md
2. 切分音频片段 → 提取选择题 + 答案键 + аудиотекст
3. 按 mp3 编号顺序合并 whisper 时间戳
4. 输出 63 个 `data/textbook/listening_speaking/ch0000.json` ~ `ch0062.json`

JSON schema（与 B2 listening 完全一致）：
```json
{
  "id": "ls-t1.2-d1.1.1",
  "format": "listening-practice",
  "title": "Диалог 1.1.1 — 年轻人暑期去向",
  "section": "Tема 1.2 · ТРКИ-2 对话",
  "sourcePages": [14, 15],
  "media": {
    "provenance": "teacher-provided",
    "file": "media/listening_speaking/01.mp3"
  },
  "questions": [{...}],
  "transcriptSegments": [{
    "speaker": "A", "displayLabel": "Ж",
    "text": "Олечка! Прекрасно выглядишь!",
    "startTime": 0.0, "endTime": 4.2
  }, ...]
}
```

### Phase 3: 书架 + 路由

- `data/textbook/index.json` 添加 `listening_speaking` 条目（format: `listening-practice`）
- **不需要改 reader.html** — `renderListeningPractice` 已通过 format dispatch 自动处理

### Phase 4: 复制音频

```bash
mkdir -p data/textbook/listening_speaking/media/
cp E:/Desktop/听力音频/0*.mp3 data/textbook/listening_speaking/media/
```

### Phase 5: 精听工作站链接

在 reader 的听力页 `renderListeningPractice` 精听模式下，加一个按钮：
```
[🎧 打开精听工作站]
```
点击后新窗口打开 `immersion-study-space`，URL 带参数传音频路径和文字稿 JSON。

---

## 4. 63 章音频映射表（前 10 段示例）

| mp3 | 书内片段 | Тема |
|---|---|---|
| 01 | Диалог 1.1.1 | Тема 1.2 对话 |
| 02 | Диалог 1.1.2 | Тема 1.2 对话 |
| 03 | Диалог 1.1.3 | Тема 1.2 对话 |
| 04 | Диалог 1.1.4 | Тема 1.2 对话 |
| 05 | Диалог 1.1.5 | Тема 1.2 对话 |
| 06 | Монолог 1.2.1 | Тема 1.3 公告 |
| 07 | Монолог 1.2.2 | Тема 1.3 公告 |
| 08 | Монолог 1.2.3 | Тема 1.3 公告 |
| 09 | Монолог 1.2.4 | Тема 1.3 公告 |
| 10 | Монолог 1.2.5 | Тема 1.3 公告 |
| ... | ... | ... |
| 66-78 | 待确认 | Тема 2.3～2.6 区域（OCR 有噪音）|

---

## 5. 验收清单

- [ ] whisper 生成了 63+ 个 JSON 时间戳文件
- [ ] 书架显示 "В мире людей — 听力口语"
- [ ] 点击章节 → 音频播放器 + 5 道选择题
- [ ] 考试模式：听音做题，答后查看答案
- [ ] 精听模式：逐句文字稿 + 词可点击查词
- [ ] 前 65 个 mp3 完美对应
- [ ] 不破坏 B2 听力模块
- [ ] 不破坏其他已接入的书籍
