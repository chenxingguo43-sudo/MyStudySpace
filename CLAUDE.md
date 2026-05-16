# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Overview

An immersive study space that integrates a Pomodoro timer and a Russian B2 speaking-material library into a single unified UI. No build step — plain HTML/CSS/JS served by a minimal Node.js static server.

## Commands

```bash
node server.js              # Start dev server at http://localhost:3000
npm start                   # Same as above
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
| `server.js` | Minimal Node.js static server on port 3000, MIME-type mapping, parent-dir fallback |
| `convert.js` | Converts `俄语知识库.html` → Obsidian Markdown files into `俄语笔记库/B2口语素材/` |
| `cloudsync-config.js` | Cloud sync config (GitHub Gist token) — **DO NOT commit, contains real credentials** |
| `cloudsync-config.example.js` | Template for the above (safe to commit) |
| `启动学习舱.bat` | Windows batch launcher — gitignored (`*.bat`) |

**Directories:**
- `docs/` — design docs: `UI_OPTIMIZATION_PLAN.md` (current task), `数据存储说明.md` (localStorage schema), `排版审查报告.md` (layout audit), `灵动岛代码.md` (dynamic island code), `俄语知识库_结构分析报告.md` (knowledge base structure)
- `scripts/` — Python helper scripts: `fix_stress_and_emoji.py` / `fix_stress_step2.py` (data repair), `verify_repair.py` / `check_file.py` / `check_backup.py` (verification), `reorganize.py` (reorganization), `v.py` (quick verify)
- `assets/` — static images and videos referenced by HTML pages via `../assets/` paths
- `俄语笔记库/` — Obsidian vault with Russian notes (`B2口语素材/`, `词汇/`, `语法/`, `考试词汇表/`, `每日练习/`). The `.obsidian/` subdirectory contains Obsidian plugin configs including Templater.

## localStorage reference

`docs/数据存储说明.md` is the authoritative schema for all localStorage keys. Consult it when touching any `pomodoro-*` or `oral-*` key — it documents data formats, read/write locations, migration logic (V7→V9), and the cross-page `storage` event sync.

## Cloud sync (`cloudsync-config.js`)

Syncs Pomodoro + Russian speaking stats to a private GitHub Gist. The config holds a Gist ID and personal access token (needs `gist` scope). `cloudsync-config.js` is **not** in `.gitignore` by filename — be careful to never stage/commit it. The template (`cloudsync-config.example.js`) has placeholder values and is safe to commit.

## Architecture

### Entry point: `index.html` ("调度中心" / Dispatch Center)

The container that loads both apps via iframes, orchestrates mode switching (Pomodoro ↔ Russian immersive), and provides toolbar buttons:

```
┌─────────────────────────────────────────────┐
│  index.html (z-index: 10 for pomodoro,      │
│              z-index: 5 for russian)         │
│  ┌──────────────────────────────────────┐   │
│  │  #pomodoro-frame (fullscreen default)│   │
│  │  pomodoro.html                       │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  #russian-frame (hidden default)     │   │
│  │  俄语知识库.html                      │   │
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

Minimal Node.js static file server (port 3000). Maps file extensions to MIME types; defaults unknown types to `application/octet-stream`. Falls back to parent directory when a file isn't found locally (supports `../videos`, `../assets/` paths). Binds to `0.0.0.0`. No routing, no middleware.

### `convert.js`

Parses `俄语知识库.html` with cheerio, walks the DOM in document order tracking `h2` (chapter) → `h3`/`h4` (section) context, extracts each `<table>` row into a standalone Obsidian markdown file with YAML frontmatter. Output directory: `俄语笔记库/B2口语素材/<章节>/`. Temporarily disables Templater's auto-trigger during conversion to avoid template injection into generated files. File naming: `{俄语前50字符}-{8位hash}.md`.

## When editing

- All HTML files are monolithic with inline CSS/JS. Search for the function/symbol before editing — there is no module system.
- The `postMessage` protocol strings (`OPEN_RUSSIAN`, `CLOSE_RUSSIAN`) are the contract between files. If you change one, change all three HTML files. `b2-exam.html` is standalone and does **not** participate in postMessage.
- **Drag system in `index.html`**: A `MutationObserver` watches `#pomodoro-frame` for the `.mini-mode` class. When added, `#drag-shield` (24px tall bar, z-index 9999) becomes visible and syncs its position to the iframe via `getBoundingClientRect()`. `mousedown` on the shield starts drag; `mousemove` repositions the iframe using `left`/`top` (clamped to viewport); `mouseup` ends it. If drag breaks, check: (a) shield `display` is `flex` in mini-mode, (b) shield `left`/`top` matches the iframe rect, (c) z-index 9999 > 10.
- `pomodoro.html` uses CDN dependencies (Tailwind, Font Awesome). It works offline only after the browser caches them.
- Chinese filenames are intentional (Windows UTF-8). Do not rename to ASCII.
- **`cloudsync-config.js` contains a real GitHub token.** Do not commit changes to it unless the user explicitly asks. It is NOT in `.gitignore` by filename — rely on `git status` vigilance.
- `.gitignore` blocks `*.py` and `*.bat` files. Python scripts in `scripts/` will not be tracked by git. This is intentional — they are local-only helper tools.
- **Sandbox**: this is a frontend-only project. Font Awesome icons use Unicode code points (e.g., ``). When editing JS strings that contain these, ensure the backslash is preserved as a literal `` in source, not interpreted as the actual Unicode character.

## Security note

`package.json` contains the full authenticated GitHub URL (with token) in the `repository.url` field. This is a **leaked credential**. If you ever edit `package.json`, replace the URL with the unauthenticated form `git+https://github.com/chenxingguo43-sudo/MyStudySpace.git`.

## 当前任务：UI 优化（进行中）

详细计划在 `docs/UI_OPTIMIZATION_PLAN.md`，请先读它。

### ⚠️ 绝对不能改的东西
- 番茄钟 SVG 计时圆环颜色（随工作/休息模式自动变色）
- 开始/暂停/重置按钮颜色（跟圆环联动）
- 4 个漂浮流体光球 `.fluid-orb` 的颜色和动画
- 所有 work-mode / break-mode 相关的动态 CSS

### 可以改的
- 页面背景色 → `#020617`
- 毛玻璃卡片 → 统一 16px 圆角 + 细白边 `rgba(255,255,255,0.08)`
- 字体 → Inter（界面UI）+ Crimson Pro + Cormorant Garamond（俄语内容）
- 统计面板配色 → Language Learning 调色板，主色 `#4F46E5`
- 章节标题栏颜色 → 学习靛蓝

### 改动顺序
1. pomodoro.html — 背景+卡片+字体（影响最大）
2. study-stats.html — 配色统一
3. 俄语知识库.html — 学术字体+标题栏
4. index.html — 微调背景+FAB

改完一个测一个，确认圆环光球没事再继续。
