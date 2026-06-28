# Immersion Study Space UI Redesign Spec

**Date:** 2026-06-18
**Status:** Draft for review
**Scope:** Redesign the learning workspace so AI analysis and note-taking become comfortable primary reading/writing surfaces.

---

## 1. Problem

The current three-column interface works structurally, but the actual learning experience exposes one major issue: AI analysis is too narrow and cramped. During intensive listening, the learner needs to read long grammar explanations, compare the current sentence, extract vocabulary, and write notes. A small side panel is not enough for that work.

The reference UI solves this by making the current sentence and AI analysis the central reading area. It also offers useful precision controls such as sentence navigation, repeat modes, A/B points, and note count per sentence. We should absorb those strengths while keeping our interface cleaner, less crowded, and better connected to Obsidian.

---

## 2. Design Principle

The workspace should be organized around one learning unit: the current sentence.

```
Left: find a sentence
Center: study this sentence
Right: manage notes and exports
Bottom: control playback
```

AI analysis is no longer treated as a secondary right-panel widget. It becomes part of the central study document, directly under the current sentence.

---

## 3. Layout

### Desktop

```
┌────────────────────────────────────────────────────────────────────┐
│ TopBar: project title · import audio · import subtitles · export · theme │
├──────────────┬────────────────────────────────────────┬────────────┤
│ SentenceNav  │ SentenceStudy                          │ NotesPanel │
│              │                                        │            │
│ search       │ waveform                               │ note history │
│ sentence list│ current sentence card                   │ obsidian target │
│ badges       │ AI analysis tabs/results                │ export actions │
│              │ inline note editor                      │ cached analyses │
├──────────────┴────────────────────────────────────────┴────────────┤
│ FloatingControlBar: previous · -5s · play · +5s · next · repeat · speed │
└────────────────────────────────────────────────────────────────────┘
```

Suggested desktop widths:

- Left: `300px`
- Center: `minmax(640px, 1fr)`
- Right: `320px`

The center column must be the widest and should own all long-form reading.

### Mobile

Use bottom tabs:

```
句子 / 学习 / 笔记 / 设置
```

The AI analysis should remain in the 学习 tab, not hidden in 笔记.

---

## 4. Left Panel: Sentence Navigation

Replace the current material-management-first left panel with sentence navigation.

### Top Actions

Keep material import visible but compact:

```
导入学习材料
[音频] [字幕]
```

After both files are loaded, collapse this into a small status row:

```
2.mp3 · 12:56 · 43句
```

### Sentence Search

Add a search input:

```
搜索句子 / 生词 / 笔记
```

Search should match Russian text, Chinese translation, and user notes when notes are available.

### Sentence List Item

Each sentence row should show:

```text
12  Я думаю, что изучение...
    00:48 - 00:55
    已分析 · 笔记 2 · 跟读 1
```

States:

- Active sentence: blue/cyan left border and brighter text
- Has notes: small amber badge
- Has cached AI analysis: small blue badge
- Has recording: small microphone badge

The list should be scrollable and should auto-scroll to the active sentence during playback.

---

## 5. Center Panel: Sentence Study Document

The center panel becomes the main study document.

### Waveform

Keep waveform at the top but make it compact enough to leave room for analysis:

- Original audio waveform
- Current sentence region
- Current sense-group region
- Playback cursor
- Optional recording waveform below when a recording exists

### Current Sentence Card

The selected sentence should be prominent:

```text
当前句 12       已分析 · 笔记 2

Я думаю, что изучение русского языка требует терпения.
我认为学习俄语需要耐心。

[Я думаю,] [что изучение русского языка] [требует терпения.]

[分析词句] [口语诊断] [生词提取] [记笔记] [跟读]
```

Sense-group chips set A/B loop boundaries when clicked.

### AI Analysis Area

Move `AIAnalysisPanel` from the right panel into the center panel under the current sentence.

Tabs:

```
语法解析 | 口语诊断 | 生词提取
```

Each tab renders as a readable document:

```markdown
### 句法结构

### 关键词汇

### TRKI-2 表达

### 可替换表达
```

Style requirements:

- Wider text column
- Comfortable line-height
- Headings clear but not oversized
- Use subtle colored highlights for grammar labels and vocabulary
- Streaming state should not jump layout

### Inline Note Editor

Below the AI result:

```text
我的笔记
[textarea]
[保存到当前句] [保存到 Obsidian]
```

V1 uses manual typing. V2 can add quick extraction from selected AI analysis text into the note editor.

---

## 6. Right Panel: Notes And Obsidian

The right panel should stop being the main AI reading surface. It becomes a management panel.

### Obsidian Target

Default folder:

```text
D:\MyStudySpace\俄语笔记库\沉浸精听\
```

Recommended file per material:

```text
沉浸精听/
  A Relaxed Russian Vlog You Can Actually Follow.md
```

UI:

```text
Obsidian 笔记
目标：俄语笔记库/沉浸精听/
[更改文件夹] [打开文件] [导出本课]
```

### Note History

Show sentence-level notes:

```text
笔记历史
句 12 · 2条
句 18 · 1条
```

Clicking a note jumps to the sentence and opens the note editor.

### Cached AI History

Show compact cached analyses:

```text
AI 缓存
句 12 · 语法解析 · 已缓存
句 12 · 生词提取 · 已缓存
```

This is for navigation and status, not for long reading.

---

## 7. Bottom Control Bar

Keep the global control bar and add the precision controls from the reference UI.

Controls:

```text
上一句 | -5s | 播放/暂停 | +5s | 下一句
循环：不复读 / 单句无限 / 3次 / 5次
倍速：0.5 / 0.75 / 1 / 1.25 / 1.5 / 1.75 / 2
A点 | B点 | 清除AB | 录音
时间：00:10 / 12:56
```

Behavior:

- `单句无限`: repeat current sentence until user changes sentence or turns off repeat
- `3次` / `5次`: repeat the current sentence fixed times, then continue or pause based on user setting
- `A点` / `B点`: custom loop range; takes priority over sentence repeat
- `-5s` / `+5s`: always available, even without subtitles

---

## 8. Obsidian Markdown Format

Each material exports to one Markdown file.

```markdown
# A Relaxed Russian Vlog You Can Actually Follow

source: YouTube
audio: 2.mp3
created: 2026-06-18

## 句子 12

> Я думаю, что изучение русского языка требует терпения.
> 我认为学习俄语需要耐心。

- 时间：00:48 - 00:55
- 循环：单句无限

### AI 语法解析

...

### 我的笔记

- требует 后面接二格。
- терпения 是 терпение 的二格。

### 生词

- терпение — 耐心
```

Append updates to the same sentence section instead of creating many tiny files.

---

## 9. Component Mapping

Current files can evolve this way:

- `layout/LeftPanel.vue` → `SentenceNavPanel.vue`
- `layout/CenterPanel.vue` → `SentenceStudyPanel.vue`
- `layout/RightPanel.vue` → `NotesPanel.vue`
- `ai/AIAnalysisPanel.vue` moves visually into the center panel
- `ai/APIKeyConfig.vue` becomes a modal or compact settings section
- `transcript/TranscriptView.vue` becomes part of the left sentence list or is replaced by sentence nav
- `transcript/CurrentSentenceDetail.vue` becomes the top of the central sentence card
- `controls/FloatingControlBar.vue` gains sentence navigation, repeat modes, and A/B controls

---

## 10. Implementation Priority

1. Move AI analysis into the center column under the current sentence.
2. Convert left panel from course summary to sentence navigation.
3. Add repeat modes and `-5s` / `+5s` controls.
4. Add current sentence note editor.
5. Add note history and Obsidian export target in the right panel.
6. Add light/dark theme toggle after core workflow is comfortable.

---

## 11. Success Criteria

- AI analysis is readable without squinting or horizontal crowding.
- A learner can select a sentence, loop it, analyze it, write a note, and save it to Obsidian without leaving the main screen.
- The right panel supports review and export without stealing attention from current sentence study.
- The interface still feels calmer and less crowded than the reference UI.
