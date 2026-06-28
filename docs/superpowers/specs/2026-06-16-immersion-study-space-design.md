# Immersion Study Space — Design Spec

**Date:** 2026-06-16
**Status:** Ready for implementation
**Location:** `D:\MyStudySpace\immersion-study-space\`

---

## 1. Overview

### What

A web-based Russian language study tool for B1/B2 + TRKI-2 exam prep. Core features: audio listening with sense-group segmentation, shadow recording with waveform comparison, AI-powered grammar analysis via cloud API.

### Why

Existing MyStudySpace is a static HTML/Node project. The audio processing, waveform rendering, recording, and AI streaming requirements are too complex for vanilla JS. Vue 3 + Vite provides the component model, reactivity, and tooling needed.

### How

Standalone Vue 3 + Vite sub-project at `D:\MyStudySpace\immersion-study-space\`. Independent port (3001), independent `package.json`, linked from existing `index.html` dispatch center. Uses wavesurfer.js v7, Pinia, Dexie, Web Workers.

---

## 2. Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Vue 3 (Composition API) | ^3.5 |
| Build | Vite | ^6.0 (frozen; v7/8 未验证兼容性) |
| CSS | Tailwind CSS | ^4.0 |
| State | Pinia + pinia-plugin-persistedstate | ^2.2 / ^4.1 |
| Audio | wavesurfer.js v7 | ^7.12 |
| Storage | Dexie.js (IndexedDB wrapper) | ^4.0 |
| Markdown | marked + highlight.js | ^15.0 / ^11.10 |
| ID | uuid | ^11.0 |

**Node requirement:** `>=18.0.0`（Vite 6 最低要求）。在 `package.json` 中声明 `engines`，项目根目录放 `.nvmrc`。

**版本冻结说明：** 当前锁定 Vite 6.x 而非升级到 7/8，因为 Vue plugin 兼容性未验证。Pinia 2.x 而非 3.x 同理。wavesurfer 7.12 是当前最新稳定版。

**Scaffold rule:** Do not leave dependencies on `latest`. Either scaffold with the pinned create-vite version or scaffold once and immediately pin the generated dependencies to the versions in this table before the first commit.

Recommended setup commands:

```powershell
Set-Location D:\MyStudySpace
npm create vite@6.5.0 immersion-study-space -- --template vue-ts
Set-Location .\immersion-study-space
npm pkg set scripts.dev="vite --host 127.0.0.1 --port 3001"
npm pkg set engines.node=">=18.0.0"
Set-Content -Path .nvmrc -Value "18" -NoNewline
npm install vue@^3.5 @vitejs/plugin-vue@^5.2 vite@^6.0 typescript@^5.7 vue-tsc@^2.2
npm install pinia@^2.2 pinia-plugin-persistedstate@^4.1 wavesurfer.js@^7.12 dexie@^4.0 marked@^15.0 highlight.js@^11.10 uuid@^11.0
npm install -D tailwindcss@^4.0 @tailwindcss/vite@^4.0
```

---

## 3. Project Structure

```
immersion-study-space/
├── public/
│   └── workers/
│       └── audio-decoder.worker.js
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── components/
│   │   ├── layout/            # AppShell, LeftPanel, CenterPanel, RightPanel
│   │   ├── audio/             # WaveformDisplay, SenseGroupRegion, RecordingWaveform
│   │   ├── transcript/        # TranscriptView, SentenceBlock
│   │   ├── controls/          # FloatingControlBar
│   │   ├── ai/                # AIAnalysisPanel, APIKeyConfig, ContextPreview
│   │   └── common/            # GlassCard, GlassButton
│   ├── composables/
│   │   ├── useAudioEngine.ts
│   │   ├── useSenseGroups.ts
│   │   ├── useABLoop.ts
│   │   ├── useRecording.ts
│   │   ├── useAudioDecoderWorker.ts
│   │   ├── usePersistence.ts
│   │   ├── useAIClient.ts
│   │   └── useEnvironment.ts
│   ├── stores/
│   │   ├── audioStore.ts
│   │   ├── transcriptStore.ts
│   │   ├── recordingStore.ts
│   │   └── settingsStore.ts
│   ├── workers/
│   │   └── audio-decoder.worker.ts
│   ├── services/
│   │   ├── persistence/
│   │   │   ├── file-system-access.ts
│   │   │   ├── indexed-db.ts
│   │   │   └── interface.ts
│   │   └── ai/
│   │       ├── api-client.ts
│   │       ├── prompt-templates.ts
│   │       └── context-window.ts
│   ├── types/
│   │   ├── audio.ts
│   │   ├── transcript.ts
│   │   ├── project.ts
│   │   ├── settings.ts
│   │   └── ai.ts
│   └── utils/
│       ├── punctuation.ts
│       ├── time-format.ts
│       └── markdown.ts
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Rule:** Composables encapsulate behavior (lifecycle, side effects, imperative APIs). Stores hold shared reactive state. Composable may read from store; store does NOT import composable.

---

## 4. Data Model

### 4.1 TypeScript Interfaces

```ts
// types/project.ts
interface Project {
  id: string
  name: string
  language: 'ru'
  level: 'B1' | 'B2'
  schemaVersion: number          // 数据模型版本，用于迁移
  createdAt: number
  updatedAt: number
  audioFileName: string
  audioMimeType: string
  audioDuration: number
  audioHash: string              // SHA-256 of audio file,用于去重和缓存校验
  transcriptId: string
  settings: { playbackSpeed: number; autoScroll: boolean }
}

// types/transcript.ts
interface Transcript {
  id: string
  projectId: string
  source: 'manual' | 'whisper' | 'imported'
  schemaVersion: number          // transcript 结构版本
  createdAt: number
  updatedAt: number
}

interface Sentence {
  id: string
  transcriptId: string           // 修复：关联到 Transcript
  index: number
  text: string
  translation?: string
  startTime: number
  endTime: number
  senseGroups: SenseGroup[]
}

interface SenseGroup {
  id: string
  sentenceId: string
  text: string
  startTime: number
  endTime: number
  type: 'clause' | 'phrase' | 'punctuation-boundary'
}

// types/audio.ts
interface AudioSegment {
  projectId: string
  blob: Blob
  format: string
}

interface Recording {
  id: string
  projectId: string
  sentenceId: string
  senseGroupId?: string          // 可选：精确到意群
  blob: Blob
  duration: number
  createdAt: number
}

interface PeaksCache {
  projectId: string
  audioHash: string              // 与 Project.audioHash 对应
  peaks: Float32Array
  duration: number
  sampleRate: number
  peaksVersion: number           // 缓存格式版本
  createdAt: number
}

// types/ai.ts
interface AIAnalysis {
  id: string
  sentenceId: string
  templateType: 'grammar' | 'pronunciation' | 'vocabulary'
  context: string
  response: string
  provider: string                  // non-secret metadata for cache/debug
  model: string                     // non-secret metadata for cache/debug
  promptVersion: number          // prompt 模板版本，用于缓存失效
  status: 'pending' | 'streaming' | 'complete' | 'error'
  error?: string
  createdAt: number
}

// types/settings.ts
interface AppSettings {
  id: 'default'
  playbackSpeed: number
  autoScroll: boolean
  preferredProvider?: string
  preferredModel?: string
  updatedAt: number
}

interface ApiCredential {
  provider: string
  apiKey: string                    // BYOK local-only secret; never synced/exported
  updatedAt: number
}
```

### 4.2 IndexedDB Schema (Dexie)

```ts
import Dexie, { Table } from 'dexie'

class ImmersionDB extends Dexie {
  projects!: Table<Project>
  transcripts!: Table<Transcript>
  sentences!: Table<Sentence>
  audioFiles!: Table<AudioSegment>
  recordings!: Table<Recording>
  aiAnalyses!: Table<AIAnalysis>
  peaksCache!: Table<PeaksCache>
  settings!: Table<AppSettings>
  apiCredentials!: Table<ApiCredential>
}

const db = new ImmersionDB('ImmersionStudySpace')

db.version(1).stores({
  projects: 'id, updatedAt',
  transcripts: 'id, projectId',
  sentences: 'id, transcriptId, index, [transcriptId+index]',
  audioFiles: 'projectId',
  recordings: 'id, projectId, sentenceId, createdAt',
  aiAnalyses: 'id, sentenceId, templateType, [sentenceId+templateType]',
  peaksCache: 'projectId, audioHash',
  settings: 'id',
  apiCredentials: 'provider'
})
```

### 4.3 File System Access Structure (optional)

```
UserDirectory/
├── project.json
├── audio.mp3
├── transcript.json
├── recordings/
│   └── rec-xxx.webm
└── analyses/
    └── sentence-xxx-grammar.md
```

`FileSystemFileHandle` references stored in IndexedDB as lightweight cache; re-verified with `requestPermission()` each session.

---

## 5. UI Layout

### 5.1 Glassmorphism Design Tokens

```
Glass surface:  bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-2xl
Glass card:     bg-gray-800/30 backdrop-blur-sm border border-white/5 rounded-xl
Glass button:   bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-lg
Floating bar:   bg-gray-900/70 backdrop-blur-xl border-t border-white/10 rounded-2xl
```

Extract into `GlassCard.vue` and `GlassButton.vue` as slot-based wrappers.

### 5.2 Three-Column Grid

```
┌─────────────────────────────────────────────────────────────┐
│ AppShell — CSS Grid: 280px / 1fr / 360px                   │
│                                                             │
│ ┌──────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │LeftPanel │  │    CenterPanel       │  │  RightPanel    │ │
│ │          │  │                      │  │                │ │
│ │ 课程列表  │  │  WaveformDisplay    │  │ AIAnalysisPanel│ │
│ │ 文件导入  │  │  SenseGroupRegion   │  │ ContextPreview │ │
│ │ 录音列表  │  │  TranscriptView     │  │                │ │
│ └──────────┘  └──────────────────────┘  └────────────────┘ │
│                                                             │
│         ┌─────────────────────────────────┐                │
│         │   FloatingControlBar            │                │
│         │   fixed bottom-6, z-50          │                │
│         │   播放/暂停 | A-B循环 | 录音 | 倍速  │                │
│         └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

- Responsive: < 1024px → single column + bottom tab navigation
- FloatingControlBar: `fixed bottom-6 left-1/2 -translate-x-1/2 max-w-2xl`

### 5.3 Component Communication

- Parent → child: props only
- Cross-panel: Pinia stores exclusively
- FloatingControlBar ↔ panels: via stores (sibling relationship, not parent-child)

---

## 6. Core Modules

### 6.1 Audio Engine (`useAudioEngine`)

**Responsibilities:** Create/destroy wavesurfer.js instance with RegionsPlugin. Expose `play()`, `pause()`, `seekTo(time)`, `setPlaybackRate(rate)`. Reactive: `isPlaying`, `currentTime`, `duration`. Handle `loadAudio(source: File | Blob)`.

**Loading strategy (layered):**
1. Check IndexedDB peaksCache → cache hit → `ws.load(blob, peaks, duration)` → instant
2. Cache miss → `ws.load(blob)` → v7 internal decode
3. Background async: Worker decodes → extracts peaks → writes to peaksCache → next time instant

### 6.2 Sense-Group Segmentation (`useSenseGroups`)

**Algorithm:**
1. Input: `Sentence[]` with `startTime`, `endTime`
2. Split each sentence by Russian punctuation: `, ; : — ( )`
3. Distribute time proportionally by character count
4. Output: `SenseGroup[]` mapped to wavesurfer Region objects with distinct colors

**Known limitation:** Proportional distribution is approximate (<0.5s error). Users can drag Region boundaries to correct.

### 6.3 A-B Loop (`useABLoop`)

- Click sense-group → auto-set `loopStart`/`loopEnd`
- Highlight loop region on waveform (wavesurfer Region)
- Enforce on `audioprocess` event: `currentTime >= loopEnd` → `seekTo(loopStart)`
- Support manual drag for custom A/B points

### 6.4 Recording (`useRecording`)

**Flow:**
1. `getUserMedia({ audio: true })`
2. `AnalyserNode` → real-time waveform via `requestAnimationFrame` → canvas
3. `MediaRecorder` → Blob (`audio/webm;codecs=opus`)
4. Post-record: render as static wavesurfer waveform for dual-track comparison

**Dual-track display:**
- Top track: original audio waveform (white)
- Bottom track: recording waveform (cyan)
- Shared time axis for visual rhythm comparison

### 6.5 Sliding Context Window (`context-window.ts`)

When user selects sentence at index `i`:
```
[i-2] [i-1] **[current]** [i+1]
```
Clamped to transcript bounds. Formatted as numbered text block. `ContextPreview.vue` shows window before user sends.

### 6.6 AI API Client (`api-client.ts`)

**Chain:**
1. User selects sentence → build sliding window → select prompt template
2. `fetch` + `ReadableStream` for SSE streaming
3. Stream chunks render incrementally in `AIAnalysisPanel` (marked + highlight.js)
4. On complete: cache to IndexedDB (aiAnalyses table)

**Error handling:** 401 → check key; 429 → retry countdown; network error → local cache fallback

### 6.7 Persistence (`usePersistence`)

**Storage policy:**

- IndexedDB (Dexie) is the default source of truth for projects, audio blobs, transcripts, recordings, analyses, peaks cache, non-sensitive settings, and BYOK credentials.
- File System Access is an explicit user action for importing/exporting a project folder or binding a project to a local directory. Do not switch to File System Access automatically just because the browser supports it.
- `FileSystemFileHandle` values are cached only as convenience references. Every session must call `queryPermission()` / `requestPermission()` before reading or writing through a handle.

**Interface:** `init()`, `saveProject()`, `loadProject()`, `listProjects()`, `saveAudio()`, `loadAudio()`, `saveRecording()`, `loadRecordings()`, `exportProjectFolder()`, `importProjectFolder()`, `exportMarkdown()`

---

## 7. Web Worker Audio Pipeline

```
File/Blob → ArrayBuffer → Worker → OfflineAudioContext.decodeAudioData(完整文件) → Float32Array peaks → Transferable → 主线程 → peaksCache (IndexedDB)
```

**Key correction:** `decodeAudioData()` requires a complete audio file — cannot decode fragments. The Worker's value is "off-main-thread decoding", not "chunked decoding".

**Wavesurfer integration:**
- First load: `ws.load(blob)` — v7 handles decode internally
- Background: Worker decodes same blob → extracts peaks → caches
- Subsequent loads: `ws.load(blob, cachedPeaks, cachedDuration)` — skips decode entirely

**Capability guard:** Worker decoding is an enhancement, not a requirement. On app startup, run a small worker probe that checks whether `OfflineAudioContext` and `decodeAudioData` are available inside a dedicated worker. If the probe fails, disable background peaks caching for that session and keep the primary `ws.load(blob)` path unchanged. The UI should show audio as fully usable; only the "next load is instant" optimization is unavailable.

### Message Protocol

```ts
// Main → Worker
type WorkerInMessage =
  | { type: 'decode'; payload: { buffer: ArrayBuffer } }
  | { type: 'cancel' }

// Worker → Main
type WorkerOutMessage =
  | { type: 'ready'; payload: { canDecodeInWorker: boolean } }
  | { type: 'progress'; payload: { phase: string } }
  | { type: 'complete'; payload: { peaks: Float32Array; duration: number; sampleRate: number } }
  | { type: 'error'; payload: { message: string } }
```

---

## 8. Security

**API Key Model: BYOK（Bring Your Own Key）本地实验模式**

API key 存储在 IndexedDB 的 `apiCredentials` 表中，由 AI 配置 UI 通过 persistence service 读写。`settingsStore` 只保存非敏感偏好（播放速度、自动滚动、默认 provider/model），可以使用 `pinia-plugin-persistedstate`；API key 不进入 Pinia persisted paths、localStorage、项目文件、Markdown 导出或 Git。

- **非生产安全模型。** 浏览器端存储的 API key 可被 XSS 攻击读取。IndexedDB 同源可访问，任何注入到页面的脚本都能提取 key。
- **此工具仅限本地个人使用。** 不要部署到公网、不要在共享电脑上使用、不要存储有计费权限的 key。
- **推荐做法：** 使用有消费限额的 API key；在 AI 服务商控制台设置月度上限。
- **导出安全：** Markdown 导出仅包含用户可读的 analysis response，不包含 key、provider、model、prompt metadata 或错误详情。
- **缓存安全：** AIAnalysis 缓存允许保存 provider/model/promptVersion 等非敏感元数据，用于复现和缓存失效；缓存绝不保存 API key。

`FileSystemFileHandle` 引用每次会话需 `requestPermission()` 重新验证。AIAnalysis 导出仅包含 `response` 字段。

---

## 9. Implementation Phases

### Phase 0: Technical Preconditions (0.5 day)

| Step | Task | Details |
|------|------|---------|
| 0.1 | Confirm workspace target | Create/verify `D:\MyStudySpace\immersion-study-space\`; do not modify the root `package.json` except for the dispatch-center link later |
| 0.2 | Pin scaffold versions | Use the setup commands in Section 2; commit only after generated dependencies are pinned |
| 0.3 | Worker decode probe | Add a minimal dedicated-worker probe for `OfflineAudioContext`; if unsupported, record fallback behavior and keep `ws.load(blob)` as the only required path |
| 0.4 | Persistence boundary check | Confirm `apiCredentials` writes only to IndexedDB and that `settingsStore` persisted paths exclude secrets |

**Deliverable:** Project can be scaffolded reproducibly and risky browser-capability assumptions are either verified or explicitly disabled.

### Phase 1: MVP Foundation (3-4 days)

| Step | Task | Details |
|------|------|---------|
| 1.1 | Scaffold | Create `D:\MyStudySpace\immersion-study-space\` with pinned Vite 6 dependencies; add `.nvmrc`, `engines`, `dev` on port 3001 |
| 1.2 | AppShell layout | CSS Grid 3-col; responsive single-col <1024px; GlassCard containers |
| 1.3 | Environment detection | `useEnvironment.ts`: detect File System API, IndexedDB |
| 1.4 | Persistence layer | `interface.ts` contract; IndexedDB primary backend; File System Access import/export backend |
| 1.5 | Audio waveform | `useAudioEngine.ts` + `WaveformDisplay.vue`; drag-drop/file picker; basic play/pause |
| 1.6 | Pinia stores | Create audio/transcript/recording/settings stores; persist only non-sensitive settingsStore paths |

**Deliverable:** Glass UI layout, file import, waveform display, basic playback.

### Phase 2: Input Loop — Sense-Group A-B Looping (4-5 days)

| Step | Task | Details |
|------|------|---------|
| 2.1 | Transcript import | `TranscriptView.vue` + `SentenceBlock.vue`; JSON import; sentence CRUD |
| 2.2 | Sense-group segmentation | `useSenseGroups.ts`: split by punctuation; proportional time; wavesurfer regions |
| 2.3 | Active sentence tracking | Watch `currentTime` → auto-scroll transcript → highlight active |
| 2.4 | A-B looping | `useABLoop.ts`: click → loop boundaries; enforce on audioprocess |
| 2.5 | Worker background decode | `audio-decoder.worker.ts`: guarded full-file decode → peaks → IndexedDB cache; disable gracefully when worker Web Audio is unavailable |
| 2.6 | FloatingControlBar | `fixed bottom-6`; play/pause, loop toggle, speed (0.5-2.0x), scrubber |

**Deliverable:** Full input loop — transcript synced, sense-group regions, A-B looping, peaks caching.

### Phase 3: Output Loop — Shadow Recording (3-4 days)

| Step | Task | Details |
|------|------|---------|
| 3.1 | MediaRecorder | `useRecording.ts`: getUserMedia; graceful permission denial |
| 3.2 | Dual-track waveform | `RecordingWaveform.vue`: AnalyserNode canvas; stacked, shared time axis |
| 3.3 | Recording playback | Post-record static wavesurfer waveform; rhythm comparison |
| 3.4 | Recording persistence | Save to IndexedDB or File System recordings/ dir |
| 3.5 | ControlBar integration | Record/stop button; duration counter |

**Deliverable:** Shadow reading with dual-track waveform comparison.

### Phase 4: AI Integration (4-5 days)

| Step | Task | Details |
|------|------|---------|
| 4.1 | API key config | `APIKeyConfig.vue`: provider select, key input, test connection; save key only through `apiCredentials` IndexedDB table |
| 4.2 | Sliding context window | `context-window.ts`: prev2 + current + next1; `ContextPreview.vue` |
| 4.3 | Prompt templates | 3 templates: grammar, pronunciation, vocabulary (from spec) |
| 4.4 | Streaming API client | `api-client.ts`: fetch + ReadableStream; `useAIClient.ts` |
| 4.5 | AIAnalysisPanel | Markdown rendering; IndexedDB cache; "cached" badge |
| 4.6 | Markdown export | Export study notes; File System: save to project dir |

**Deliverable:** Complete AI-powered study workflow with streaming analysis and export.

---

## 10. Integration with Existing MyStudySpace

- Add a link/button in `index.html` dispatch center pointing to `http://localhost:3001`
- Optional: embed as iframe (like pomodoro.html, reader.html)
- Data layer independent — no shared localStorage keys, IndexedDB database names, or file conflicts with existing project
- API key stored in IndexedDB `apiCredentials`, not in `cloudsync-config.js`, project files, or persisted Pinia paths

---

## 11. Verification

1. **Phase 0:** `npm create vite@6.5.0` succeeds → dependencies are pinned → `npm run dev -- --port 3001` starts → worker decode probe reports supported or disabled fallback
2. **Phase 1:** Drag-drop MP3 → waveform renders → play/pause works → project/audio metadata persists after reload → API key is absent from localStorage
3. **Phase 2:** Import transcript JSON → sentences align with audio → click sense-group → A-B loop works → peaks cache is used when available and skipped cleanly when unavailable
4. **Phase 3:** Record → speak → stop → recording waveform appears below original → playback works → recording persists after reload
5. **Phase 4:** Enter API key → select sentence → preview context → send to AI → stream response → export Markdown → exported Markdown contains response only

---

## 12. Audio Pipeline Decision (Final)

**Primary:** `ws.load(blob)` — wavesurfer v7 internal decode. Simple, sufficient for files < 15MB.

**Background enhancement:** If the worker probe passes, Worker decodes full file → extracts peaks → caches to IndexedDB → subsequent loads use `ws.load(blob, peaks, duration)` for instant rendering. If the probe fails, skip this enhancement and keep the app fully functional through `ws.load(blob)`.

**NOT used:** 256KB chunked decode (impossible — `decodeAudioData()` requires complete file). NOT used: `loadDecodedBuffer()` (does not exist in v7).

```
首次加载: File → Blob → ws.load(blob) → v7 内部解码
后台异步(可选): Blob → Worker probe → OfflineAudioContext.decodeAudioData → peaks → IndexedDB
再次加载(有缓存时): IndexedDB peaks → ws.load(blob, peaks, duration) → 秒开
```
