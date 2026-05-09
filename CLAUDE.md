# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Overview

An immersive study space that integrates a Pomodoro timer and a Russian B2 speaking-material library into a single unified UI. Five operational files + one documentation file, no build step.

## Commands

```bash
node server.js          # Start dev server at http://localhost:3000
```

Open `http://localhost:3000` in a browser. The server serves all static files — there is no framework, no bundler, no package.json.

## localStorage reference

`数据存储说明.md` is the authoritative schema for all localStorage keys. Consult it when touching any `pomodoro-*` or `oral-*` key — it documents data formats, read/write locations, migration logic (V7→V9), and the cross-page `storage` event sync.

## Architecture

### Entry point: `index.html` ("调度中心" / Dispatch Center)

The container that loads both apps as iframes, orchestrates mode switching, and provides toolbar buttons:

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

### `pomodoro.html` (~304KB)

Single-file Pomodoro timer. Tailwind CSS + Font Awesome 4.7 via CDN. Inline CSS and JS — all state is in JS globals and localStorage. Contains a `#russian-fab` button that fires `OPEN_RUSSIAN` to enter immersive mode.

### `俄语知识库.html` (~359KB)

Single-file Russian B2 speaking-material library (V7.0). Contains ~2200 entries across 13 topic areas with a collapsible table-of-contents grid. All CSS/JS is inline. Listens for `OPEN_RUSSIAN` / `CLOSE_RUSSIAN` to toggle `body.immersive-mode`.

### `study-stats.html` (~27KB)

Standalone stats dashboard opened via `#open-stats-btn` in index.html (opens in new window via `window.open`). Displays Pomodoro stats (today/total count, minutes, streak) and Russian speaking stats (read/speak/memo counts + rating distribution doughnut chart via Chart.js CDN). Has data export (JSON download), import (file upload), and clear (with confirmation) buttons. Listens for cross-tab `storage` events to auto-refresh when other tabs modify localStorage.

### `server.js`

Minimal Node.js static file server (port 3000). Maps file extensions to MIME types; defaults unknown types to `application/octet-stream`. No routing, no middleware — just `fs.readFile`.

## When editing

- All three HTML files are monolithic with inline CSS/JS. Search for the function/symbol before editing — there is no module system.
- The `postMessage` protocol strings (`OPEN_RUSSIAN`, `CLOSE_RUSSIAN`) are the contract between files. If you change one, change all three HTML files.
- **Drag system in `index.html`**: A `MutationObserver` watches `#pomodoro-frame` for the `.mini-mode` class. When added, `#drag-shield` (24px tall bar, z-index 9999) becomes visible and syncs its position to the iframe via `getBoundingClientRect()`. `mousedown` on the shield starts drag; `mousemove` repositions the iframe using `left`/`top` (clamped to viewport); `mouseup` ends it. If drag breaks, check: (a) shield `display` is `flex` in mini-mode, (b) shield `left`/`top` matches the iframe rect, (c) z-index 9999 > 10.
- `pomodoro.html` uses CDN dependencies (Tailwind, Font Awesome). It works offline only after the browser caches them.
- Chinese filenames are intentional (Windows UTF-8). Do not rename to ASCII.

## 当前任务：UI 优化（进行中）

详细计划在 `UI_OPTIMIZATION_PLAN.md`，请先读它。

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
