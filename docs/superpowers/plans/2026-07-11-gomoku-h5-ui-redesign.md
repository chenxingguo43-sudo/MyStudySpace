# Gomoku H5 UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone high-fidelity mobile Gomoku H5 module at `D:\MyStudySpace\gomoku-h5\index.html` using the supplied game art and preserving two-player Gomoku gameplay.

**Architecture:** The implementation is isolated under `D:\MyStudySpace\gomoku-h5\` and does not modify the existing study-space pages. Production remains a single `index.html` file, with clearly marked JavaScript sections and testable pure game helpers exposed as `window.__gomokuCore`. Lightweight Node scripts in `gomoku-h5\tools\` verify the core logic and static HTML structure.

**Tech Stack:** Plain HTML, CSS, JavaScript, local JPG assets, Node.js for verification scripts, no framework and no bundler.

---

## File Structure

- Create: `D:\MyStudySpace\gomoku-h5\index.html`  
  Standalone H5 app containing layout, styles, pure game helpers, rendering, dialogs, and event delegation.

- Create: `D:\MyStudySpace\gomoku-h5\assets\source\`  
  Unmodified copies of the 10 supplied JPG source assets.

- Create: `D:\MyStudySpace\gomoku-h5\assets\processed\README.md`  
  Documents which assets are currently used directly and which need later transparent PNG cleanup.

- Create: `D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js`  
  Node test that extracts and executes the core helper block from `index.html`.

- Create: `D:\MyStudySpace\gomoku-h5\tools\validate-html.js`  
  Static validation for required IDs, asset paths, and accidental references to study-space files.

- Do not modify: `D:\MyStudySpace\index.html`, `D:\MyStudySpace\pomodoro.html`, `D:\MyStudySpace\study-stats.html`, the Russian knowledge-base HTML page, or `D:\MyStudySpace\cloudsync-config.js`.

## Task 1: Scaffold Isolated Gomoku Module

**Files:**
- Create: `D:\MyStudySpace\gomoku-h5\index.html`
- Create: `D:\MyStudySpace\gomoku-h5\assets\source\`
- Create: `D:\MyStudySpace\gomoku-h5\assets\processed\README.md`
- Create: `D:\MyStudySpace\gomoku-h5\tools\validate-html.js`

- [ ] **Step 1: Create the directory tree**

Run:

```powershell
New-Item -ItemType Directory -Force 'D:\MyStudySpace\gomoku-h5\assets\source'
New-Item -ItemType Directory -Force 'D:\MyStudySpace\gomoku-h5\assets\processed'
New-Item -ItemType Directory -Force 'D:\MyStudySpace\gomoku-h5\tools'
```

Expected: the three directories exist.

- [ ] **Step 2: Add the first failing static validation**

Create `D:\MyStudySpace\gomoku-h5\tools\validate-html.js`:

```javascript
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

const required = [
  'id="app"',
  'id="home-screen"',
  'id="game-screen"',
  'id="board-hit-layer"',
  'id="piece-layer"',
  'id="dialog-root"',
  'window.__gomokuCore'
];

const missing = required.filter((token) => !html.includes(token));

if (missing.length) {
  console.error(`Missing required tokens: ${missing.join(', ')}`);
  process.exit(1);
}

const forbidden = ['pomodoro.html', 'study-stats.html', 'cloudsync-config.js'];
const forbiddenHits = forbidden.filter((token) => html.includes(token));

if (forbiddenHits.length) {
  console.error(`Forbidden cross-app references: ${forbiddenHits.join(', ')}`);
  process.exit(1);
}

console.log('HTML static validation passed');
```

- [ ] **Step 3: Run validation and verify it fails**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
```

Expected: FAIL with `Missing required tokens`.

- [ ] **Step 4: Add minimal `index.html` shell**

Create `D:\MyStudySpace\gomoku-h5\index.html` with this starting structure:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>五子棋</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #092d2c;
      color: #fff;
    }
    #app {
      position: relative;
      width: min(100vw, 480px);
      height: 100dvh;
      min-height: 100vh;
      margin: 0 auto;
      overflow: hidden;
      background: #0b3633;
    }
    .screen {
      position: absolute;
      inset: 0;
      display: none;
    }
    .screen.is-active { display: block; }
    #board-hit-layer, #piece-layer {
      position: absolute;
      inset: 0;
    }
  </style>
</head>
<body>
  <main id="app">
    <section id="home-screen" class="screen is-active" aria-label="开始页面"></section>
    <section id="game-screen" class="screen" aria-label="对局页面">
      <div id="board-stage">
        <div id="board-hit-layer" aria-label="棋盘"></div>
        <div id="piece-layer" aria-hidden="true"></div>
      </div>
    </section>
    <div id="dialog-root" aria-live="polite"></div>
  </main>
  <script>
    window.__gomokuCore = {};
  </script>
</body>
</html>
```

- [ ] **Step 5: Run validation and commit**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
```

Expected: PASS with `HTML static validation passed`.

Commit:

```powershell
git add -- 'gomoku-h5/index.html' 'gomoku-h5/tools/validate-html.js' 'gomoku-h5/assets/processed/README.md'
git commit -m "feat: scaffold gomoku h5 module"
```

## Task 2: Copy And Map Source Assets

**Files:**
- Modify: `D:\MyStudySpace\gomoku-h5\assets\source\`
- Modify: `D:\MyStudySpace\gomoku-h5\assets\processed\README.md`
- Modify: `D:\MyStudySpace\gomoku-h5\index.html`
- Modify: `D:\MyStudySpace\gomoku-h5\tools\validate-html.js`

- [ ] **Step 1: Copy source JPG assets unchanged**

Run:

```powershell
$src = 'E:\wechat\xwechat_files\wxid_bmid7wemoiiu12_e784\temp\RWTemp\2026-07\1ebdc25ebc3ea4e668971187c3d06fc8'
Copy-Item -LiteralPath "$src\49424f585e9c213912feca1de7c5e43c.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\bottom-buttons.jpg'
Copy-Item -LiteralPath "$src\8fb04791ae5908ddcbcc8f5fc1703e5c.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\player-black-plate.jpg'
Copy-Item -LiteralPath "$src\b64d28617ec6a9ffd660180251c72ca0.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\player-white-plate.jpg'
Copy-Item -LiteralPath "$src\aae3d76ebefc335ed8a7fcecab9310c3.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\victory-title.jpg'
Copy-Item -LiteralPath "$src\bd6b57197833e9456abd5fb67a009e51.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\avatar-black.jpg'
Copy-Item -LiteralPath "$src\601c6f7c61737298f29acb23a5bfcced.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\game-background-board.jpg'
Copy-Item -LiteralPath "$src\4ae7f840ef169eb0798cca19e928b54b.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\home-background.jpg'
Copy-Item -LiteralPath "$src\1d6fe489d1bd090085faa299345405a4.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\board-frame.jpg'
Copy-Item -LiteralPath "$src\4ca5af7463c28d378805bca191735761.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\dialog-frame.jpg'
Copy-Item -LiteralPath "$src\d41a3c1aa3bc81fa7dc09521918289da.jpg" -Destination 'D:\MyStudySpace\gomoku-h5\assets\source\avatar-white.jpg'
```

Expected: 10 JPG files exist in `gomoku-h5\assets\source`.

- [ ] **Step 2: Document asset usage**

Create `D:\MyStudySpace\gomoku-h5\assets\processed\README.md`:

```markdown
# Processed Asset Notes

Phase 1 uses the supplied JPG assets directly where possible.

- `home-background.jpg`: full-screen home background.
- `game-background-board.jpg`: full-screen gameplay background with baked board art.
- `avatar-black.jpg` and `avatar-white.jpg`: circular avatar images via CSS clipping.
- `player-black-plate.jpg` and `player-white-plate.jpg`: used as decorative plate backgrounds with CSS masking by overflow.
- `bottom-buttons.jpg`: visual reference only in Phase 1; buttons are recreated in CSS to avoid checkerboard artifacts.
- `victory-title.jpg`: used inside the win dialog with a light blend background.
- `dialog-frame.jpg`: visual reference for CSS dialog framing in Phase 1.
- `board-frame.jpg`: reserved for a later board-frame replacement if the gameplay background board cannot align cleanly.
```

- [ ] **Step 3: Add asset manifest to `index.html`**

Inside the `<script>` tag before `window.__gomokuCore`, add:

```javascript
const ASSETS = {
  homeBg: 'assets/source/home-background.jpg',
  gameBg: 'assets/source/game-background-board.jpg',
  avatarBlack: 'assets/source/avatar-black.jpg',
  avatarWhite: 'assets/source/avatar-white.jpg',
  playerBlackPlate: 'assets/source/player-black-plate.jpg',
  playerWhitePlate: 'assets/source/player-white-plate.jpg',
  victoryTitle: 'assets/source/victory-title.jpg'
};
```

- [ ] **Step 4: Extend validation for asset presence**

In `D:\MyStudySpace\gomoku-h5\tools\validate-html.js`, add after the `required` check:

```javascript
const assetPaths = [
  'assets/source/home-background.jpg',
  'assets/source/game-background-board.jpg',
  'assets/source/avatar-black.jpg',
  'assets/source/avatar-white.jpg',
  'assets/source/player-black-plate.jpg',
  'assets/source/player-white-plate.jpg',
  'assets/source/victory-title.jpg'
];

const missingAssetRefs = assetPaths.filter((asset) => !html.includes(asset));
if (missingAssetRefs.length) {
  console.error(`Missing asset references: ${missingAssetRefs.join(', ')}`);
  process.exit(1);
}

const missingFiles = assetPaths.filter((asset) => !fs.existsSync(path.join(root, asset)));
if (missingFiles.length) {
  console.error(`Missing asset files: ${missingFiles.join(', ')}`);
  process.exit(1);
}
```

- [ ] **Step 5: Run validation and commit**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
```

Expected: PASS.

Commit:

```powershell
git add -- 'gomoku-h5'
git commit -m "feat: add gomoku visual assets"
```

## Task 3: Implement Testable Gomoku Core

**Files:**
- Create: `D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js`
- Modify: `D:\MyStudySpace\gomoku-h5\index.html`

- [ ] **Step 1: Write failing core tests**

Create `D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js`:

```javascript
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/\/\* core:start \*\/([\s\S]*?)\/\* core:end \*\//);
assert(match, 'core block markers are missing');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(match[1], context);

const core = context.window.__gomokuCore;

function makeMove(board, row, col, player) {
  const next = core.cloneBoard(board);
  next[row][col] = player;
  return next;
}

const board = core.createBoard();
assert.strictEqual(board.length, 15);
assert.strictEqual(board[0].length, 15);
assert.strictEqual(core.isInside(14, 14), true);
assert.strictEqual(core.isInside(15, 14), false);
assert.strictEqual(core.canPlace(board, 7, 7), true);

let horizontal = core.createBoard();
for (let col = 3; col <= 7; col += 1) horizontal = makeMove(horizontal, 7, col, 1);
assert.deepStrictEqual(core.checkWinner(horizontal, 7, 7), {
  winner: 1,
  cells: [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]]
});

let diagonal = core.createBoard();
for (let offset = 0; offset < 5; offset += 1) diagonal = makeMove(diagonal, 4 + offset, 5 + offset, 2);
assert.strictEqual(core.checkWinner(diagonal, 8, 9).winner, 2);

const occupied = makeMove(core.createBoard(), 1, 1, 1);
assert.strictEqual(core.canPlace(occupied, 1, 1), false);

console.log('Gomoku core tests passed');
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js'
```

Expected: FAIL with `core block markers are missing`.

- [ ] **Step 3: Add core helpers to `index.html`**

Replace the existing minimal `window.__gomokuCore = {};` block with:

```javascript
/* core:start */
function createBoard(size = 15) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function isInside(row, col, size = 15) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function canPlace(board, row, col) {
  return isInside(row, col, board.length) && board[row][col] === 0;
}

function collectLine(board, row, col, deltaRow, deltaCol) {
  const player = board[row][col];
  const cells = [[row, col]];

  for (const direction of [-1, 1]) {
    let nextRow = row + deltaRow * direction;
    let nextCol = col + deltaCol * direction;
    while (isInside(nextRow, nextCol, board.length) && board[nextRow][nextCol] === player) {
      if (direction === -1) cells.unshift([nextRow, nextCol]);
      else cells.push([nextRow, nextCol]);
      nextRow += deltaRow * direction;
      nextCol += deltaCol * direction;
    }
  }

  return cells;
}

function checkWinner(board, row, col) {
  const player = board[row] && board[row][col];
  if (!player) return { winner: 0, cells: [] };

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [deltaRow, deltaCol] of directions) {
    const cells = collectLine(board, row, col, deltaRow, deltaCol);
    if (cells.length >= 5) {
      return { winner: player, cells: cells.slice(0, 5) };
    }
  }

  return { winner: 0, cells: [] };
}

window.__gomokuCore = {
  createBoard,
  cloneBoard,
  isInside,
  canPlace,
  checkWinner
};
/* core:end */
```

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js'
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
```

Expected: both PASS.

Commit:

```powershell
git add -- 'gomoku-h5/index.html' 'gomoku-h5/tools/gomoku-core.test.js'
git commit -m "feat: add gomoku core rules"
```

## Task 4: Build Home And Gameplay Layout

**Files:**
- Modify: `D:\MyStudySpace\gomoku-h5\index.html`

- [ ] **Step 1: Add home and gameplay HTML**

Replace the empty screen sections with:

```html
<section id="home-screen" class="screen is-active home-screen" aria-label="开始页面">
  <div class="home-content">
    <div class="title-mark">
      <span class="title-main">五子棋</span>
      <span class="title-seal">对弈</span>
    </div>
    <p class="home-subtitle">五子连珠 · 一决胜负</p>
    <button class="primary-btn" type="button" data-action="start">开始游戏</button>
    <button class="paper-btn" type="button" data-action="rules">游戏规则</button>
  </div>
  <div class="home-tools" aria-label="音频与设置">
    <button class="round-tool" type="button" data-action="music" aria-label="音乐">♪</button>
    <button class="round-tool" type="button" data-action="sound" aria-label="音效">◉</button>
    <button class="round-tool" type="button" data-action="settings" aria-label="设置">⚙</button>
  </div>
</section>

<section id="game-screen" class="screen game-screen" aria-label="对局页面">
  <header class="player-row">
    <div class="player-card black-card" data-player-card="1">
      <img class="player-plate" src="assets/source/player-black-plate.jpg" alt="">
      <img class="avatar avatar-black" src="assets/source/avatar-black.jpg" alt="黑方">
      <span class="player-name">黑方</span>
      <span class="turn-stone black-stone"></span>
    </div>
    <div class="vs-mark">VS</div>
    <div class="player-card white-card" data-player-card="2">
      <img class="player-plate" src="assets/source/player-white-plate.jpg" alt="">
      <img class="avatar avatar-white" src="assets/source/avatar-white.jpg" alt="白方">
      <span class="player-name">白方</span>
      <span class="turn-stone white-stone"></span>
    </div>
  </header>
  <div id="board-stage" class="board-stage">
    <div id="piece-layer" aria-hidden="true"></div>
    <button id="board-hit-layer" type="button" aria-label="棋盘"></button>
  </div>
  <nav class="action-bar" aria-label="对局操作">
    <button class="game-action danger" type="button" data-action="leave">离开</button>
    <button class="game-action blue" type="button" data-action="undo">悔棋</button>
    <button class="game-action purple" type="button" data-action="reset">重玩</button>
    <button class="game-action green" type="button" data-action="settings">设置</button>
  </nav>
</section>
```

- [ ] **Step 2: Add visual CSS**

Append to the `<style>` block:

```css
.home-screen {
  background: linear-gradient(rgba(230, 255, 248, 0.08), rgba(8, 72, 66, 0.18)),
    url("assets/source/home-background.jpg") center / cover no-repeat;
}

.game-screen {
  background: url("assets/source/game-background-board.jpg") center / cover no-repeat;
}

.home-content {
  position: absolute;
  inset: 17vh 28px auto;
  display: grid;
  justify-items: center;
  gap: 20px;
  text-align: center;
}

.title-mark {
  position: relative;
  display: inline-grid;
  color: #07564f;
  text-shadow: 0 3px 10px rgba(255, 255, 255, 0.55);
}

.title-main {
  font-size: clamp(64px, 19vw, 96px);
  font-family: "STKaiti", "KaiTi", serif;
  font-weight: 800;
  letter-spacing: 0;
}

.title-seal {
  position: absolute;
  right: -20px;
  top: 18px;
  padding: 5px 4px;
  border-radius: 12px;
  background: #b5342c;
  color: #fff6df;
  font-size: 16px;
  writing-mode: vertical-rl;
}

.home-subtitle {
  margin: 0 0 42px;
  color: #245c58;
  font-size: 20px;
  font-family: "STKaiti", "KaiTi", serif;
}

button {
  border: 0;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.primary-btn,
.paper-btn {
  width: min(280px, 72vw);
  min-height: 56px;
  border-radius: 18px;
  font-size: 24px;
  font-family: "STKaiti", "KaiTi", serif;
  box-shadow: 0 8px 18px rgba(9, 47, 42, 0.32);
}

.primary-btn {
  color: #fff8d6;
  background: linear-gradient(#218b75, #0f6658);
  border: 2px solid #d7b35a;
}

.paper-btn {
  color: #5d4b32;
  background: linear-gradient(#fff8e7, #ead9b7);
  border: 2px solid rgba(181, 142, 76, 0.62);
}

.home-tools {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(42px + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  gap: 28px;
}

.round-tool {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: #fff8d6;
  background: rgba(15, 106, 92, 0.86);
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.35), 0 8px 15px rgba(4,45,42,0.25);
}

.player-row {
  position: absolute;
  top: calc(18px + env(safe-area-inset-top));
  left: 14px;
  right: 14px;
  display: grid;
  grid-template-columns: 1fr 54px 1fr;
  align-items: center;
  gap: 4px;
  z-index: 3;
}

.player-card {
  position: relative;
  height: 74px;
  overflow: hidden;
  border-radius: 42px;
}

.player-plate {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar {
  position: absolute;
  top: 8px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d9b867;
}

.avatar-black { left: 8px; }
.avatar-white { right: 8px; }

.player-name {
  position: absolute;
  top: 23px;
  color: #fff;
  font-size: 19px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.45);
}

.black-card .player-name { left: 82px; }
.white-card .player-name { right: 82px; }

.vs-mark {
  color: #ffe7a5;
  font-size: 28px;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 3px 8px rgba(70,38,8,0.85);
}

.turn-stone {
  position: absolute;
  top: 27px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  opacity: 0.9;
}

.black-card .turn-stone { right: 24px; }
.white-card .turn-stone { left: 24px; }

.black-stone { background: radial-gradient(circle at 34% 25%, #7b7b7b, #050505 58%, #000); }
.white-stone { background: radial-gradient(circle at 34% 25%, #fff, #e8e0d5 58%, #bfae9c); }

.player-card.is-current .turn-stone {
  box-shadow: 0 0 0 4px rgba(255,226,97,0.36), 0 0 18px 6px rgba(255,225,86,0.5);
}

.board-stage {
  position: absolute;
  left: 9.2%;
  right: 9.2%;
  top: 32.7%;
  aspect-ratio: 1;
  z-index: 2;
}

#board-hit-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
}

#piece-layer {
  pointer-events: none;
}

.action-bar {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: calc(20px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  z-index: 3;
}

.game-action {
  min-height: 56px;
  border-radius: 16px;
  color: #fff8ea;
  font-size: 19px;
  font-family: "STKaiti", "KaiTi", serif;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.28), 0 7px 14px rgba(0,0,0,0.28);
}

.danger { background: linear-gradient(#c95a43, #8f3229); }
.blue { background: linear-gradient(#3d8ac4, #1b5f91); }
.purple { background: linear-gradient(#9b60bd, #67318d); }
.green { background: linear-gradient(#2a9a7d, #116b5c); }
```

- [ ] **Step 3: Run static validation and commit**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
```

Expected: PASS.

Commit:

```powershell
git add -- 'gomoku-h5/index.html'
git commit -m "feat: build gomoku h5 layout"
```

## Task 5: Implement Board Rendering And Controls

**Files:**
- Modify: `D:\MyStudySpace\gomoku-h5\index.html`
- Modify: `D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js`

- [ ] **Step 1: Extend tests for coordinate conversion**

Append to `gomoku-core.test.js`:

```javascript
assert.deepStrictEqual(core.pointToCell({ x: 0, y: 0, size: 280 }), { row: 0, col: 0 });
assert.deepStrictEqual(core.pointToCell({ x: 140, y: 140, size: 280 }), { row: 7, col: 7 });
assert.deepStrictEqual(core.pointToCell({ x: 280, y: 280, size: 280 }), { row: 14, col: 14 });
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js'
```

Expected: FAIL with `core.pointToCell is not a function`.

- [ ] **Step 3: Add coordinate helper to core block**

Inside the core block, add:

```javascript
function pointToCell({ x, y, size, boardSize = 15 }) {
  const step = size / (boardSize - 1);
  const col = Math.max(0, Math.min(boardSize - 1, Math.round(x / step)));
  const row = Math.max(0, Math.min(boardSize - 1, Math.round(y / step)));
  return { row, col };
}
```

Then export it:

```javascript
window.__gomokuCore = {
  createBoard,
  cloneBoard,
  isInside,
  canPlace,
  checkWinner,
  pointToCell
};
```

- [ ] **Step 4: Add state, rendering, and event delegation**

After the core block, add:

```javascript
const state = {
  screen: 'home',
  board: createBoard(),
  currentPlayer: 1,
  moves: [],
  winner: 0,
  winCells: [],
  settings: {
    confirmMove: false,
    sound: true
  }
};

const dom = {
  home: document.getElementById('home-screen'),
  game: document.getElementById('game-screen'),
  boardHit: document.getElementById('board-hit-layer'),
  pieces: document.getElementById('piece-layer'),
  dialogRoot: document.getElementById('dialog-root')
};

function setScreen(screen) {
  state.screen = screen;
  dom.home.classList.toggle('is-active', screen === 'home');
  dom.game.classList.toggle('is-active', screen === 'game');
}

function renderTurn() {
  document.querySelectorAll('[data-player-card]').forEach((card) => {
    card.classList.toggle('is-current', Number(card.dataset.playerCard) === state.currentPlayer);
  });
}

function renderPieces() {
  dom.pieces.innerHTML = '';
  const boardRect = dom.boardHit.getBoundingClientRect();
  const step = boardRect.width / 14;
  state.moves.forEach((move, index) => {
    const piece = document.createElement('span');
    piece.className = `piece player-${move.player}`;
    piece.style.left = `${move.col * step}px`;
    piece.style.top = `${move.row * step}px`;
    if (index === state.moves.length - 1) piece.classList.add('is-last');
    if (state.winCells.some(([row, col]) => row === move.row && col === move.col)) piece.classList.add('is-win');
    dom.pieces.appendChild(piece);
  });
}

function commitMove(row, col) {
  if (state.winner || !canPlace(state.board, row, col)) return;
  state.board[row][col] = state.currentPlayer;
  state.moves.push({ row, col, player: state.currentPlayer });
  const result = checkWinner(state.board, row, col);
  if (result.winner) {
    state.winner = result.winner;
    state.winCells = result.cells;
    renderPieces();
    openWinDialog(result.winner);
    return;
  }
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  renderTurn();
  renderPieces();
}

function resetGame() {
  state.board = createBoard();
  state.currentPlayer = 1;
  state.moves = [];
  state.winner = 0;
  state.winCells = [];
  closeDialog();
  renderTurn();
  renderPieces();
}

function undoMove() {
  if (state.winner || state.moves.length === 0) return;
  const last = state.moves.pop();
  state.board[last.row][last.col] = 0;
  state.currentPlayer = last.player;
  renderTurn();
  renderPieces();
}

dom.boardHit.addEventListener('pointerup', (event) => {
  const rect = dom.boardHit.getBoundingClientRect();
  const cell = pointToCell({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    size: rect.width
  });
  commitMove(cell.row, cell.col);
});

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start') {
    resetGame();
    setScreen('game');
  }
  if (action === 'undo') undoMove();
  if (action === 'reset') resetGame();
  if (action === 'leave') openLeaveDialog();
  if (action === 'settings' || action === 'rules') openSettingsDialog(action);
});

window.addEventListener('resize', renderPieces);
renderTurn();
```

- [ ] **Step 5: Add piece CSS**

Append:

```css
.piece {
  position: absolute;
  width: 7.6%;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(1);
  animation: pieceIn 160ms ease-out;
}

.piece.player-1 {
  background: radial-gradient(circle at 35% 24%, #777, #161616 48%, #020202 72%);
  box-shadow: inset -4px -6px 8px rgba(0,0,0,0.72), inset 3px 3px 5px rgba(255,255,255,0.18), 0 7px 10px rgba(0,0,0,0.35);
}

.piece.player-2 {
  background: radial-gradient(circle at 35% 24%, #fff, #eee5d9 48%, #cbbca9 78%);
  box-shadow: inset -4px -6px 8px rgba(150,125,96,0.38), inset 3px 3px 5px rgba(255,255,255,0.75), 0 7px 10px rgba(0,0,0,0.28);
}

.piece.is-last::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #e72118;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px rgba(255, 55, 39, 0.9);
}

.piece.is-win {
  box-shadow: 0 0 0 4px rgba(255, 218, 92, 0.42), 0 0 18px rgba(255, 226, 92, 0.75);
}

@keyframes pieceIn {
  from { transform: translate(-50%, -50%) scale(0.55); opacity: 0; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js'
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
```

Expected: both PASS.

Commit:

```powershell
git add -- 'gomoku-h5/index.html' 'gomoku-h5/tools/gomoku-core.test.js'
git commit -m "feat: add gomoku board interactions"
```

## Task 6: Add Dialogs And Settings Flow

**Files:**
- Modify: `D:\MyStudySpace\gomoku-h5\index.html`

- [ ] **Step 1: Add dialog CSS**

Append:

```css
#dialog-root {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(2, 28, 27, 0.46);
}

#dialog-root.is-open { display: flex; }

.dialog-card {
  width: min(330px, 88vw);
  border-radius: 8px;
  padding: 24px 22px;
  color: #3e3020;
  text-align: center;
  background: linear-gradient(#fff5dd, #ead7b7);
  border: 4px solid #1f7a69;
  box-shadow: 0 0 0 2px #d1ad64, 0 14px 30px rgba(0,0,0,0.34);
}

.dialog-card h2 {
  margin: 0 0 16px;
  font-size: 24px;
  font-family: "STKaiti", "KaiTi", serif;
}

.victory-art {
  width: 78%;
  display: block;
  margin: -6px auto 8px;
  mix-blend-mode: multiply;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
}

.dialog-btn {
  min-width: 104px;
  min-height: 44px;
  border-radius: 10px;
  color: #5b4328;
  background: linear-gradient(#fff8e7, #e5cda4);
  border: 1px solid rgba(122, 91, 42, 0.38);
}

.dialog-btn.primary {
  color: #fff8df;
  background: linear-gradient(#229875, #116a5b);
}

.dialog-btn.danger {
  color: #fff8df;
  background: linear-gradient(#c75f47, #9b382e);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  text-align: left;
}
```

- [ ] **Step 2: Add dialog functions**

Append to the main script:

```javascript
function closeDialog() {
  dom.dialogRoot.classList.remove('is-open');
  dom.dialogRoot.innerHTML = '';
}

function openDialog(html) {
  dom.dialogRoot.innerHTML = html;
  dom.dialogRoot.classList.add('is-open');
}

function openWinDialog(winner) {
  const label = winner === 1 ? '黑方获胜' : '白方获胜';
  openDialog(`
    <section class="dialog-card" role="dialog" aria-modal="true" aria-label="胜利提示">
      <img class="victory-art" src="assets/source/victory-title.jpg" alt="胜利">
      <p>${label}</p>
      <div class="dialog-actions">
        <button class="dialog-btn primary" type="button" data-dialog-action="restart">再来一局</button>
        <button class="dialog-btn" type="button" data-dialog-action="home">返回首页</button>
      </div>
    </section>
  `);
}

function openLeaveDialog() {
  openDialog(`
    <section class="dialog-card" role="dialog" aria-modal="true" aria-label="离开确认">
      <h2>离开游戏</h2>
      <p>当前对局不会保存，确定要离开吗？</p>
      <div class="dialog-actions">
        <button class="dialog-btn" type="button" data-dialog-action="close">取消</button>
        <button class="dialog-btn danger" type="button" data-dialog-action="home">离开</button>
      </div>
    </section>
  `);
}

function openSettingsDialog(kind) {
  const title = kind === 'rules' ? '游戏规则' : '游戏设置';
  const body = kind === 'rules'
    ? '<p>黑白双方轮流落子，横向、纵向或斜向先连成五子者获胜。</p>'
    : `<div class="setting-row"><span>二次确认</span><input type="checkbox" ${state.settings.confirmMove ? 'checked' : ''} data-setting="confirmMove"></div>
       <div class="setting-row"><span>游戏音效</span><input type="checkbox" ${state.settings.sound ? 'checked' : ''} data-setting="sound"></div>`;
  openDialog(`
    <section class="dialog-card" role="dialog" aria-modal="true" aria-label="${title}">
      <h2>${title}</h2>
      ${body}
      <div class="dialog-actions">
        <button class="dialog-btn primary" type="button" data-dialog-action="close">确定</button>
      </div>
    </section>
  `);
}

dom.dialogRoot.addEventListener('click', (event) => {
  const setting = event.target.dataset.setting;
  if (setting) state.settings[setting] = event.target.checked;

  const action = event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
  if (!action) return;
  if (action === 'close') closeDialog();
  if (action === 'restart') resetGame();
  if (action === 'home') {
    resetGame();
    setScreen('home');
  }
});
```

- [ ] **Step 3: Run validation and commit**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
node 'D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js'
```

Expected: both PASS.

Commit:

```powershell
git add -- 'gomoku-h5/index.html'
git commit -m "feat: add gomoku dialogs"
```

## Task 7: Browser Verification And Alignment Pass

**Files:**
- Modify: `D:\MyStudySpace\gomoku-h5\index.html`

- [ ] **Step 1: Start local server**

Run:

```powershell
Start-Process -WindowStyle Hidden powershell -ArgumentList '-NoProfile','-Command','cd /d D:\MyStudySpace; node server.js'
```

Expected: app available at `http://localhost:3000/gomoku-h5/index.html`.

- [ ] **Step 2: Verify basic flow in browser**

Open:

```text
http://localhost:3000/gomoku-h5/index.html
```

Manual checks:

- Home screen shows light mountain background.
- Start button enters gameplay.
- Gameplay screen shows dark board background.
- Player header does not overlap the board.
- Bottom actions are visible above the safe area.
- Five black stones in a row opens the win dialog.
- Undo removes the last stone before a win.
- Reset clears the board.
- Leave opens confirmation.
- Settings opens and closes.

- [ ] **Step 3: Adjust board alignment if needed**

If tap placement is visibly offset from the baked board grid, tune only these CSS values:

```css
.board-stage {
  left: 9.2%;
  right: 9.2%;
  top: 32.7%;
  aspect-ratio: 1;
}
```

Use small changes such as `left: 9.6%`, `right: 9.0%`, or `top: 33.1%`. Re-test corner taps, center tap, and star-point taps after each change.

- [ ] **Step 4: Final verification**

Run:

```powershell
node 'D:\MyStudySpace\gomoku-h5\tools\validate-html.js'
node 'D:\MyStudySpace\gomoku-h5\tools\gomoku-core.test.js'
git status --short
```

Expected:

- Both Node checks pass.
- `git status --short` shows only intended `gomoku-h5` changes plus any pre-existing unrelated user changes.

- [ ] **Step 5: Commit alignment and verification fixes**

Commit:

```powershell
git add -- 'gomoku-h5/index.html'
git commit -m "fix: tune gomoku mobile layout"
```

## Self-Review

- Spec coverage: Tasks cover isolated module creation, asset intake, home screen, gameplay screen, player header, board interaction, bottom controls, dialogs, responsive constraints, game-rule tests, and browser verification.
- Existing app safety: The plan explicitly avoids editing study-space pages and `cloudsync-config.js`.
- Placeholder scan: The plan contains no unresolved placeholders and no unspecified test commands.
- Type consistency: Core helper names are consistent across `index.html` and `gomoku-core.test.js`: `createBoard`, `cloneBoard`, `isInside`, `canPlace`, `checkWinner`, and `pointToCell`.
