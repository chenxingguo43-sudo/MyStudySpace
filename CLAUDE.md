# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Overview

An immersive study space that integrates a Pomodoro timer and a Russian B2 speaking-material library into a single unified UI. No build step — plain HTML/CSS/JS served by a minimal Node.js static server.

## Commands

```bash
node server.js              # Start dev server at http://localhost:3000
npm start                   # Same as above
npm run build:vocab          # Build vocabulary.json from Obsidian vault markdown
node convert.js             # Convert 俄语知识库.html → Obsidian markdown (requires cheerio)
npm test                    # No-op (placeholder)
```

Open `http://localhost:3000` in a browser. The server serves all static files — no framework, no bundler.

## Dependencies

Only runtime dependency: `cheerio` (used by `convert.js` to parse the HTML knowledge base). Install with `npm install`.

## Project files

| File | Role |
|------|------|
| `index.html` | Dispatch center — iframe container, mode switching, toolbar, drag system |
| `pomodoro.html` (~313KB) | Pomodoro timer with Tailwind CSS + Font Awesome 4.7 CDN, `#russian-fab` button |
| `俄语知识库.html` (~510KB) | Russian B2 speaking-material library (V7.0), ~2200 entries, 13 topic areas |
| `study-stats.html` (~31KB) | Stats dashboard (Pomodoro + Russian), Chart.js doughnut chart, data export/import |
| `b2-exam.html` (~9KB) | TRKI-B2 oral exam question bank with templates and scoring badges |
| `reader.html` | Novel reader — bookshelf, chapter list, bilingual reading, word selection popup, save to Obsidian vocab |
| `server.js` | Minimal Node.js static server on port 3000, MIME-type mapping, parent-dir fallback, `POST /api/vocab-sync`, novel API endpoints |
| `build-vocabulary.js` | Scans `俄语笔记库/` markdown files → generates `data/vocabulary.json` + quality report + manifest |
| `vocabulary.html` (~27KB) | Vocabulary flashcard review tool with SM-2 spaced repetition, daily limits, card modes |
| `convert.js` | Converts `俄语知识库.html` → Obsidian Markdown files into `俄语笔记库/B2口语素材/` |
| `cloudsync-config.js` | Cloud sync config (GitHub Gist token) — **DO NOT commit, contains real credentials** |
| `cloudsync-config.example.js` | Template for the above (safe to commit) |
| `启动学习舱.bat` | Windows batch launcher — gitignored (`*.bat`) |

**Directories:**
- `docs/` — design docs: `UI_OPTIMIZATION_PLAN.md` (current task), `数据存储说明.md` (localStorage schema), `排版审查报告.md` (layout audit), `灵动岛代码.md` (dynamic island code), `俄语知识库_结构分析报告.md` (knowledge base structure)
- `scripts/` — Python helper scripts: `fix_stress_and_emoji.py` / `fix_stress_step2.py` (data repair), `verify_repair.py` / `check_file.py` / `check_backup.py` (verification), `reorganize.py` (reorganization), `v.py` (quick verify)
- `assets/` — static images and videos referenced by HTML pages via `../assets/` paths
- `data/` — build output (gitignored): `vocabulary.json`, `vocabulary-manifest.json`, `vocabulary-quality-report.json`
- `data/novel/` — novel translation cache: `index.json` (book catalog), `boss_yin/` (261 chapters), `russian_tales/` (7 stories)
- `俄语笔记库/` — Obsidian vault with Russian notes (`B2口语素材/`, `词汇/`, `B2高频词/`, `语法/`, `考试词汇表/`, `每日练习/`). The `.obsidian/` subdirectory contains Obsidian plugin configs including Templater. **Gitignored — not tracked.**

## localStorage reference

`docs/数据存储说明.md` is the authoritative schema for all localStorage keys. Consult it when touching any `pomodoro-*` or `oral-*` key — it documents data formats, read/write locations, migration logic (V7→V9), and the cross-page `storage` event sync.

## Cloud sync (`cloudsync-config.js`)

Syncs Pomodoro + Russian speaking stats to a private GitHub Gist. The config holds a Gist ID and personal access token (needs `gist` scope). `cloudsync-config.js` is **not** in `.gitignore` by filename — be careful to never stage/commit it. The template (`cloudsync-config.example.js`) has placeholder values and is safe to commit.

## Novel Reader (`reader.html`)

Standalone novel reader page integrated into the dispatch center. Features:
- **Bookshelf**: displays imported novels from `data/novel/index.json`
- **Chapter list**: grid view with read/unread status
- **Reading view**: three modes (Russian only / Bilingual / Chinese only), paragraph click-to-reveal translation
- **Word selection**: select Russian text → popup with "📖 Wiktionary" / "🤖 AI提问" / "⭐ 保存到生词本"
- **Auto dictionary**: Wiktionary REST API lookup on word selection
- **Save to Obsidian**: POST to `/api/novel-vocab` → generates markdown in `俄语笔记库/小说词汇/`
- **Reading stats**: chapters read, peek count, reading time — persisted in localStorage (`rr_stats_study_novel`)

Data source: `data/novel/` directory with per-chapter JSON files (format: `{index, title, original[], translated[]}`).

## Server API Endpoints (`server.js`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vocab-sync` | POST | Sync vocab review stats to `俄语笔记库/wiki/study-log.json` |
| `/api/novel/index` | GET | Return book catalog from `data/novel/index.json` |
| `/api/novel/:bookId/:chapter` | GET | Return single chapter JSON from `data/novel/{bookId}/ch{idx}.json` |
| `/api/novel-vocab` | POST | Save word to `俄语笔记库/小说词汇/` as Obsidian markdown (with duplicate detection) |

## Architecture

### Entry point: `index.html` ("调度中心" / Dispatch Center)

The container that loads sub-apps via iframes, orchestrates mode switching, and provides toolbar buttons:

```
┌─────────────────────────────────────────────┐
│  index.html (z-index: 10 for pomodoro,      │
│              z-index: 5 for others)          │
│  ┌──────────────────────────────────────┐   │
│  │  #pomodoro-frame (fullscreen default)│   │
│  │  pomodoro.html                       │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  #russian-frame (hidden)             │   │
│  │  俄语知识库.html                      │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  #vocab-frame (hidden)               │   │
│  │  vocabulary.html                     │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  #reader-frame (hidden)              │   │
│  │  reader.html                         │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  #drag-shield (z-index: 9999)        │   │
│  │  24px-tall drag handle atop the mini │   │
│  │  pomodoro card                       │   │
│  └──────────────────────────────────────┘   │
│  [#russian-fab] — opens Russian KB          │
│  [#open-stats-btn] — opens study-stats.html │
└─────────────────────────────────────────────┘
```

### Inter-frame communication (postMessage protocol)

| Message | Direction | Effect |
|---------|-----------|--------|
| `OPEN_RUSSIAN` | pomodoro → parent | Parent shrinks pomodoro to mini-mode (260×260, positionable), shows Russian KB fullscreen, forwards message to Russian iframe |
| `CLOSE_RUSSIAN` | parent → pomodoro + Russian | Restores pomodoro to fullscreen, hides Russian KB |
| `CLOSE_STATS` | any → parent | Returns to console view |
| `CLOSE_VOCAB` | any → parent | Returns to console view |
| `CLOSE_READER` | any → parent | Returns to console view |

NOTE: pomodoro.html also sends `{type: 'DRAG_START', clientX, clientY}` on pointerdown in mini-mode, but index.html does **not** handle this message — the actual drag is driven by `mousedown` on `#drag-shield` (see Drag system below).

**CSS state classes:**
- `index.html`: `body.russian-active` — immersive mode active
- `#pomodoro-frame.mini-mode` — pomodoro is a 260×260 draggable card
- `pomodoro.html`: `body.is-mini-widget` — internal mini-mode styling
- `俄语知识库.html`: `body.immersive-mode` — adds bottom padding to avoid being hidden behind the mini pomodoro card

**Resume flow:** Double-click the mini pomodoro card → calls `returnToPomodoro()` → broadcasts `CLOSE_RUSSIAN` to both iframes.

### `pomodoro.html` (~313KB)

Single-file Pomodoro timer. Tailwind CSS + Font Awesome 4.7 via CDN. Inline CSS and JS — all state is in JS globals and localStorage. Contains a `#russian-fab` button that fires `OPEN_RUSSIAN` to enter immersive mode.

### `俄语知识库.html` (~510KB)

Single-file Russian B2 speaking-material library (V7.0). Contains ~2200 entries across 13 topic areas with a collapsible table-of-contents grid. All CSS/JS is inline. Listens for `OPEN_RUSSIAN` / `CLOSE_RUSSIAN` to toggle `body.immersive-mode`.

The `convert.js` script can export its table data to individual Obsidian-flavored markdown files (YAML frontmatter with ru/zh/chapter/section/tags/mastery fields) under `俄语笔记库/B2口语素材/`.

### `study-stats.html` (~31KB)

Standalone stats dashboard opened via `#open-stats-btn` in index.html (opens in new window via `window.open`). Displays Pomodoro stats (today/total count, minutes, streak) and Russian speaking stats (read/speak/memo counts + rating distribution doughnut chart via Chart.js CDN). Has data export (JSON download), import (file upload), and clear (with confirmation) buttons. Listens for cross-tab `storage` events to auto-refresh when other tabs modify localStorage.

### `server.js`

Minimal Node.js static file server (port 3000). Maps file extensions to MIME types; defaults unknown types to `application/octet-stream`. Falls back to parent directory when a file isn't found locally (supports `../videos`, `../assets/` paths). Binds to `0.0.0.0`.

Also handles `POST /api/vocab-sync` — receives vocabulary review stats from `vocabulary.html` and writes them to `俄语笔记库/wiki/study-log.json` for the Obsidian dashboard to read.

### `build-vocabulary.js`

Scans directories in `俄语笔记库/`:
- `词汇/**/*.md` → vocab entries (word/type/meaning/mastery/examples + grammar fields)
- `B2口语素材/**/*.md` → B2 oral entries (ru/zh/chapter/section)
- `B2高频词/**/*.md` → high-frequency words (word/stem/frequency)

Extracts grammar data from markdown body and frontmatter:
- `grammarTable` — 变位/变格表 from `## 📐 变位/变格/接格` section
- `case_gov` — verb case government pattern
- `pair` — aspect pair (сов./несов. partner)
- `conj_pattern` — conjugation pattern
- `morphology` — word root breakdown (prefix-root-suffix)
- `short_form` — adjective short form
- `animate` — noun animacy

Parses YAML frontmatter (inline arrays, multi-line objects), detects and swaps reversed front/back cards, filters garbage data. Outputs:
- `data/vocabulary.json` — unified entry array, sorted deterministically
- `data/vocabulary-manifest.json` — build metadata and per-source stats
- `data/vocabulary-quality-report.json` — suspected anomalies (no auto-fix)

Run: `npm run build:vocab`

### `vocabulary.html`

Standalone flashcard review page (no iframe, opens from nav bar). Features:
- **Card flip**: Russian front → Chinese back (+ extra, examples, gender/aspect)
- **SM-2 spaced repetition**: 不认识→1天, 模糊→2-3天, 认识→逐步拉长
- **Daily limit**: default 20 new cards/day, configurable in settings
- **Adaptive learning**: adjusts daily new card count based on performance (≥85%→+3, <60%→-3)
- **Card modes**: 今日待复习 / 生词本 / B2口语 / 高频词 / 错题本 / 收藏 / 问题卡
- **Card actions**: ⭐ 收藏, ⏭ 跳过, 🚩 标记数据问题
- **Grammar panel**: collapsible section showing case_gov, conjugation table, aspect pair
- **Morphology display**: colored word root breakdown (prefix/root/suffix)
- **Stress quiz**: clickable syllable options for stress mark practice
- **Mastery visualization**: progress bar, stars (★★★☆☆), colored glow on card
- **Search**: text filter by Russian word or Chinese meaning
- **Visual polish**: gradient mode bar, glass buttons, card entrance animation
- **Sync to dashboard**: POST review stats to `/api/vocab-sync` (3s debounce + beforeunload)
- **Export/Import**: JSON progress backup with 7-day reminder
- **Problem cards export**: generates Obsidian-readable `背词问题卡-日期.md`

localStorage keys:
- `vocabulary-review-records` — per-card scheduling data (mastery, nextReview, interval, easeFactor, count)
- `vocabulary-extras` — { fav[], skip[], report[] }
- `vocabulary-settings` — { dailyLimit, todayDate, newCardsToday, lastExportAt, adaptiveLimit, dailyPerf }

### Dashboard integration

`vocabulary.html` → `POST /api/vocab-sync` → `server.js` → `俄语笔记库/wiki/study-log.json` → `仪表盘.md` (DataviewJS).

The dashboard reads `vocab_reviewed`, `vocab_mastered`, `vocab_due`, `vocab_streak` from study-log.json and displays them in the "📚 背词打卡" card alongside the manual minute-based check-in.

### `convert.js`

Parses `俄语知识库.html` with cheerio, walks the DOM in document order tracking `h2` (chapter) → `h3`/`h4` (section) context, extracts each `<table>` row into a standalone Obsidian markdown file with YAML frontmatter. Output directory: `俄语笔记库/B2口语素材/<章节>/`. Temporarily disables Templater's auto-trigger during conversion to avoid template injection into generated files. File naming: `{俄语前50字符}-{8位hash}.md`.

## When editing

- All HTML files are monolithic with inline CSS/JS. Search for the function/symbol before editing — there is no module system.
- The `postMessage` protocol strings (`OPEN_RUSSIAN`, `CLOSE_RUSSIAN`, `CLOSE_STATS`, `CLOSE_VOCAB`, `CLOSE_READER`) are the contract between files. If you change one, change all relevant HTML files. `b2-exam.html` and `reader.html` are standalone and do **not** send postMessage (but `index.html` sends `CLOSE_READER` to return from reader view).
- **Drag system in `index.html`**: A `MutationObserver` watches `#pomodoro-frame` for the `.mini-mode` class. When added, `#drag-shield` (24px tall bar, z-index 9999) becomes visible and syncs its position to the iframe via `getBoundingClientRect()`. `mousedown` on the shield starts drag; `mousemove` repositions the iframe using `left`/`top` (clamped to viewport); `mouseup` ends it. If drag breaks, check: (a) shield `display` is `flex` in mini-mode, (b) shield `left`/`top` matches the iframe rect, (c) z-index 9999 > 10.
- `pomodoro.html` uses CDN dependencies (Tailwind, Font Awesome). It works offline only after the browser caches them.
- Chinese filenames are intentional (Windows UTF-8). Do not rename to ASCII.
- **`cloudsync-config.js` contains a real GitHub token.** Do not commit changes to it unless the user explicitly asks. It is NOT in `.gitignore` by filename — rely on `git status` vigilance.
- `.gitignore` blocks `*.py` and `*.bat` files. Python scripts in `scripts/` will not be tracked by git. This is intentional — they are local-only helper tools.
- **Sandbox**: this is a frontend-only project. Font Awesome icons use Unicode code points (e.g., ``). When editing JS strings that contain these, ensure the backslash is preserved as a literal `` in source, not interpreted as the actual Unicode character.

## Security note

`package.json` contains the full authenticated GitHub URL (with token) in the `repository.url` field. This is a **leaked credential**. If you ever edit `package.json`, replace the URL with the unauthenticated form `git+https://github.com/chenxingguo43-sudo/MyStudySpace.git`.

## ⚠️ 绝对不能改的东西
- 番茄钟 SVG 计时圆环颜色（随工作/休息模式自动变色）
- 开始/暂停/重置按钮颜色（跟圆环联动）
- 4 个漂浮流体光球 `.fluid-orb` 的颜色和动画
- 所有 work-mode / break-mode 相关的动态 CSS
- `cloudsync-config.js` — 含真实 token，不提交
