# Russian Speaking Tools — GitHub Pages Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy `immersion-study-space` (3001) and `russian-speaking-coach-v2` (3002) as static sites to GitHub Pages under `russian-study/coach/` and `russian-study/immersion/`, with a nav landing page at the root.

**Architecture:** Pure static deployment — both projects are Vue 3 + Vite SPAs with no router. Each project's `vite.config.ts` gets a `base` path set to its subdirectory. API keys stay in browser IndexedDB (immersion) / Dexie (coach-v2). A PowerShell deploy script automates build + copy + nav page generation. No backend, no auth, no CI.

**Tech Stack:** Vue 3, Vite 6, Pinia 3, Dexie 4, Tailwind CSS 4, TypeScript, GitHub Pages

---

### Task 1: Add API Key persistence to coach-v2 settingsStore

**Files:**
- Modify: `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\src\stores\settingsStore.ts`

**Background:** The coach-v2 has a `settings` table in Dexie (`db.settings`) but the Pinia `settingsStore` never loads from or saves to it. Keys entered via `APIKeyConfig.vue` disappear on page refresh. The immersion-study-space project already persists keys via an `indexedDBBackend` service — coach-v2 needs equivalent behavior.

**Strategy:** Wrap Pinia store with Dexie persistence. Load from DB on store init, save on every setter call. Simple pattern — no new deps, reuses existing `db` instance.

- [ ] **Step 1: Modify `settingsStore.ts` to load from and save to Dexie**

Replace the contents of `src/stores/settingsStore.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../services/persistence/indexed-db'

export const useSettingsStore = defineStore('settings', () => {
  const deepseekApiKey = ref('')
  const groqApiKey = ref('')
  const ttsEnabled = ref(true)
  const ttsRate = ref(0.9)
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    try {
      const saved = await db.settings.get('default')
      if (saved) {
        deepseekApiKey.value = saved.deepseekApiKey || ''
        groqApiKey.value = saved.groqApiKey || ''
        ttsEnabled.value = saved.ttsEnabled ?? true
        ttsRate.value = saved.ttsRate ?? 0.9
      }
      loaded.value = true
    } catch {
      // Dexie may fail if IndexedDB is blocked (private browsing). Use defaults.
    }
  }

  async function persist() {
    await db.settings.put({
      id: 'default',
      deepseekApiKey: deepseekApiKey.value,
      groqApiKey: groqApiKey.value,
      ttsEnabled: ttsEnabled.value,
      ttsRate: ttsRate.value,
    })
  }

  function setDeepseekKey(key: string) {
    deepseekApiKey.value = key
    persist()
  }

  function setGroqKey(key: string) {
    groqApiKey.value = key
    persist()
  }

  function setTtsEnabled(enabled: boolean) {
    ttsEnabled.value = enabled
    persist()
  }

  function setTtsRate(rate: number) {
    ttsRate.value = rate
    persist()
  }

  return {
    deepseekApiKey,
    groqApiKey,
    ttsEnabled,
    ttsRate,
    loaded,
    load,
    setDeepseekKey,
    setGroqKey,
    setTtsEnabled,
    setTtsRate,
  }
})
```

- [ ] **Step 2: Call `settingsStore.load()` in `main.ts` before app mount**

Modify `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\src\main.ts`:

Read the file first. Then add `await useSettingsStore().load()` before `app.mount('#app')`. The pattern is:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useSettingsStore } from './stores/settingsStore'
// ... other imports

const app = createApp(App)
app.use(createPinia())
// ... other plugins

// Load persisted settings (API keys, TTS prefs) before mount
await useSettingsStore().load()

app.mount('#app')
```

- [ ] **Step 3: Build and spot-check**

Run `npm run build` in the coach-v2 directory to verify the change compiles.

```powershell
cd C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2
npm run build
```

Expected: `✓ built in Xs` with no errors.

---

### Task 2: Set Vite `base` paths for both projects

**Files:**
- Modify: `D:\MyStudySpace\immersion-study-space\vite.config.ts`
- Modify: `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\vite.config.ts`

**Why:** Without `base`, Vite produces `index.html` with asset references like `/assets/index-abc123.js`. When served from `https://...github.io/russian-study/coach/`, these requests hit the wrong path and 404.

- [ ] **Step 1: Set base for immersion-study-space**

In `D:\MyStudySpace\immersion-study-space\vite.config.ts`, add `base: '/russian-study/immersion/'`:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/russian-study/immersion/',
  plugins: [vue(), tailwindcss()],
  // ... rest unchanged
})
```

- [ ] **Step 2: Set base for russian-speaking-coach-v2**

In `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\vite.config.ts`, add `base: '/russian-study/coach/'`:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/russian-study/coach/',
  plugins: [vue(), tailwindcss()],
  // ... rest unchanged
})
```

- [ ] **Step 3: Build both and verify output paths**

```powershell
cd D:\MyStudySpace\immersion-study-space
npm run build

cd C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2
npm run build
```

Verify that `dist/index.html` in each project has asset paths prefixed with the subdirectory:
- immersion: `<script src="/russian-study/immersion/assets/..."`
- coach: `<script src="/russian-study/coach/assets/..."`

---

### Task 3: Security audit — verify no hardcoded API keys

**Files to check:**
- `D:\MyStudySpace\immersion-study-space\src\*` — already verified ✓
- `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\src\*` — already verified ✓
- `D:\MyStudySpace\immersion-study-space\.env*` files
- `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\.env*` files
- Git history for Key leaks

- [ ] **Step 1: Check .env files for keys**

```powershell
Get-ChildItem -Path "D:\MyStudySpace\immersion-study-space" -Filter ".env*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "=== $($_.Name) ==="; Get-Content $_.FullName }
Get-ChildItem -Path "C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2" -Filter ".env*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "=== $($_.Name) ==="; Get-Content $_.FullName }
```

If any `.env` file contains real API keys (not placeholders), add `.env` to `.gitignore` in the respective project.

- [ ] **Step 2: Check git history for keys in both repos**

```powershell
cd D:\MyStudySpace\immersion-study-space
git log --all -p | Select-String -Pattern "sk-[a-zA-Z0-9]{20,}" | Select-Object -First 5
```

If matches are found, the keys need to be rotated and cleaned from git history with `git filter-branch`.

- [ ] **Step 3: Code review confirmation — confirmed clean from prior exploration**

Summary of manual audit:
| Project | Hardcoded Keys | Key Storage | .env file |
|---------|---------------|-------------|-----------|
| immersion-study-space | None found | IndexedDB via `indexedDBBackend` | TBD by Step 1 |
| coach-v2 | None found | Dexie via updated settingsStore (Task 1) | TBD by Step 1 |

---

### Task 4: Create deployment script `deploy.ps1`

**Files:**
- Create: release repo root `/deploy.ps1` (the release repository that will hold the static files)

**Strategy:** The release repo will be a separate git repo (not in MyStudySpace). The deploy script lives there, calls `npm run build` in the source projects by absolute path, then copies `dist/` into the release repo folders.

- [ ] **Step 1: Create the release repository directory**

Choose a location for the release repo. Recommended: `D:\russian-study` (a fresh directory that will become the `russian-study` GitHub Pages repo).

```powershell
New-Item -ItemType Directory -Path "D:\russian-study" -Force
cd D:\russian-study
git init
```

- [ ] **Step 2: Write `D:\russian-study\deploy.ps1`**

```powershell
<#
.SYNOPSIS
  Build and deploy Russian speaking tools to the release directory for GitHub Pages.
.DESCRIPTION
  1. Builds both projects (immersion-study-space + russian-speaking-coach-v2)
  2. Copies dist/ outputs into the release directory under /immersion/ and /coach/
  3. Creates navigation index.html at the root
#>

param(
    [switch]$SkipBuild,
    [switch]$SkipNav
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ─── Project source paths ──────────────────────────────────────────
$immersionSrc = "D:\MyStudySpace\immersion-study-space"
$coachSrc = "C:\Users\$env:USERNAME\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2"

# ─── Build both projects ───────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host "`n📦 Building immersion-study-space..." -ForegroundColor Cyan
    Push-Location $immersionSrc
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed for immersion-study-space" }
        Write-Host "  ✓ immersion-study-space built" -ForegroundColor Green
    } finally { Pop-Location }

    Write-Host "`n📦 Building russian-speaking-coach-v2..." -ForegroundColor Cyan
    Push-Location $coachSrc
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed for russian-speaking-coach-v2" }
        Write-Host "  ✓ russian-speaking-coach-v2 built" -ForegroundColor Green
    } finally { Pop-Location }
}

# ─── Clean and copy ────────────────────────────────────────────────
Write-Host "`n📋 Copying build outputs..." -ForegroundColor Cyan

# Clean target dirs
$immersionTarget = Join-Path $scriptDir "immersion"
$coachTarget = Join-Path $scriptDir "coach"
if (Test-Path $immersionTarget) { Remove-Item -Recurse -Force $immersionTarget }
if (Test-Path $coachTarget) { Remove-Item -Recurse -Force $coachTarget }

# Copy dist folders
Copy-Item -Recurse -Path "$immersionSrc\dist" -Destination $immersionTarget
Write-Host "  ✓ Copied immersion/ ($((Get-ChildItem -Recurse $immersionTarget).Count) files)" -ForegroundColor Green

Copy-Item -Recurse -Path "$coachSrc\dist" -Destination $coachTarget
Write-Host "  ✓ Copied coach/ ($((Get-ChildItem -Recurse $coachTarget).Count) files)" -ForegroundColor Green

# ─── Generate navigation page ──────────────────────────────────────
if (-not $SkipNav) {
    Write-Host "`n🧭 Generating navigation page..." -ForegroundColor Cyan

    $navHtml = @'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>俄语口语练习工具集</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    color: #e2e8f0;
  }
  .container { text-align: center; padding: 2rem; }
  h1 {
    font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .subtitle { color: #94a3b8; margin-bottom: 2.5rem; font-size: 0.95rem; }
  .cards { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; }
  .card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 2rem 1.5rem;
    width: 280px; cursor: pointer;
    backdrop-filter: blur(12px);
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    text-decoration: none; color: inherit; display: block;
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: rgba(167, 139, 250, 0.4);
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
  }
  .card-icon { font-size: 2.5rem; margin-bottom: 1rem; }
  .card h2 { font-size: 1.15rem; margin-bottom: 0.5rem; color: #e2e8f0; }
  .card p { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; }
  .card .tag {
    display: inline-block; margin-top: 1rem; padding: 0.25rem 0.75rem;
    border-radius: 99px; font-size: 0.75rem;
    background: rgba(167, 139, 250, 0.15); color: #a78bfa;
  }
</style>
</head>
<body>
<div class="container">
  <h1>🎓 俄语口语练习工具集</h1>
  <p class="subtitle">两个 AI 驱动的俄语口语训练工具，使用前请先配置 API Key</p>
  <div class="cards">
    <a class="card" href="./coach/">
      <div class="card-icon">🎤</div>
      <h2>口语教练 V2</h2>
      <p>选择话题 → 录音回答 → AI 纠错反馈。支持 DeepSeek + Groq ASR，对话式交互。</p>
      <span class="tag">Speaking Coach</span>
    </a>
    <a class="card" href="./immersion/">
      <div class="card-icon">🎧</div>
      <h2>沉浸式口语练习</h2>
      <p>逐句听写、跟读对比、波形可视化。AI 逐句纠音 + 语法分析 + 笔记导出。</p>
      <span class="tag">Immersion Practice</span>
    </a>
  </div>
</div>
</body>
</html>
'@

    Set-Content -Path (Join-Path $scriptDir "index.html") -Value $navHtml -Encoding UTF8
    Write-Host "  ✓ Navigation page written" -ForegroundColor Green
}

# ─── Done ──────────────────────────────────────────────────────────
Write-Host "`n✅ Deploy ready at: $scriptDir" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. cd $scriptDir"
Write-Host "  2. git add ."
Write-Host "  3. git commit -m 'deploy: russian speaking tools'"
Write-Host "  4. git remote add origin git@github.com:chenxingguo43-sudo/russian-study.git"
Write-Host "  5. git push -u origin main"
Write-Host "  6. Enable GitHub Pages in repo Settings → Pages → Source: main branch /root"
```

- [ ] **Step 3: Run the deploy script**

```powershell
cd D:\russian-study
.\deploy.ps1
```

Expected: builds both projects, copies to `immersion/` and `coach/`, creates `index.html`.

- [ ] **Step 4: Verify output structure**

```powershell
Get-ChildItem -Path "D:\russian-study" -Depth 2 | Select-Object FullName
```

Expected:
```
D:\russian-study\
├── index.html
├── deploy.ps1
├── immersion\
│   ├── index.html
│   └── assets\...
├── coach\
│   ├── index.html
│   └── assets\...
```

---

### Task 5: Setup GitHub repo and enable Pages

- [ ] **Step 1: Create GitHub repository**

Go to https://github.com/new

- Repository name: `russian-study`
- Visibility: **Public** (required for GitHub Pages free tier)
- Do NOT initialize with README (we already have content)
- Click "Create repository"

- [ ] **Step 2: Push the release directory**

```powershell
cd D:\russian-study
git remote add origin git@github.com:chenxingguo43-sudo/russian-study.git
git add .
git commit -m "feat: initial deploy - russian speaking coach + immersion practice"
git push -u origin main
```

If SSH isn't set up, use HTTPS with personal access token:
```powershell
git remote add origin https://github.com/chenxingguo43-sudo/russian-study.git
git push -u origin main
```

- [ ] **Step 3: Enable GitHub Pages**

In the GitHub repo web UI:
1. Go to **Settings** → **Pages**
2. Under "Branch", select `main` and `/ (root)` folder
3. Click **Save**
4. Wait ~1 minute for deployment

GitHub will show a URL like `https://chenxingguo43-sudo.github.io/russian-study/` with a ✅ checkmark.

- [ ] **Step 4: Verify deployment**

Open the URL in browser:
1. Navigation page loads at `/russian-study/`
2. Click "口语教练 V2" → coach page loads, assets aren't 404
3. Click "沉浸式口语练习" → immersion page loads, assets aren't 404
4. Open API Key config in either tool → key input works, test connection works

---

### Task 6: Add `.gitignore` for the release repo

**Files:**
- Create: `D:\russian-study\.gitignore`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
# Node
node_modules/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

The release repo only holds static build output — no source, no node_modules, no secrets ever. The `.gitignore` prevents accidental additions.

- [ ] **Step 2: Commit**

```powershell
cd D:\russian-study
git add .gitignore
git commit -m "chore: add .gitignore"
git push
```

---

## Deployment reference (after initial setup)

Each time you want to update the deployed site:

```powershell
cd D:\russian-study
.\deploy.ps1           # build both + copy
git add .
git commit -m "deploy: <describe changes>"
git push
```

Wait ~60 seconds for GitHub Pages to auto-deploy.

---

## Post-deployment checklist

- [ ] `https://chenxingguo43-sudo.github.io/russian-study/` loads nav page
- [ ] Both tools load without JS/CSS 404 errors
- [ ] API Key config accessible in both tools
- [ ] Keys persist across page refresh (coach-v2 fixed by Task 1)
- [ ] No API keys visible in git repo or page source
