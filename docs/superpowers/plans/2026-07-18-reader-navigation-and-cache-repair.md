# 阅读器导航与词典缓存修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复阅读口语正文泄漏词典 JSON，并把 B2 全模块页面导航统一为阅读口语的浅色浮动样式。

**Architecture:** 继续使用共享词典渲染器和既有 FAB CSS，不复制第二套导航样式。新增 B2 页面壳只决定控件布局；各模块内容渲染器继续管理内容、进度与练习状态。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node 内置测试、Node 静态服务器。

## Global Constraints

- 不修改原题、答案、原文、草稿与学习进度数据。
- 词典上下文只能以 HTML 属性安全编码写入 DOM。
- B2 页面不得再调用黑色 `.toolbar`；非 B2 阅读口语页面保持原导航。
- 使用 `npm run test:russian-b2` 与浏览器页面实际验证。

---

### Task 1: 给共享词典脚本建立缓存回归门禁

**Files:**

- Modify: `reader.html:730-734`
- Modify: `tests/russian-b2/dictionary-reader.test.js`

**Interfaces:**

- Consumes: `RussianDictionaryCore.renderRussianText(value, context)`。
- Produces: 带相同 `?v=<version>` 参数的三份词典脚本 URL；安全的 `data-lookup-context` 属性。

- [ ] **Step 1: 写失败测试**

在 `dictionary-reader.test.js` 增加：

```js
test('reader version-pins all shared dictionary scripts', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const sources = [...reader.matchAll(/<script src="(js\/russian-dictionary\/(?:core|storage|runtime)\.js\?v=[^"]+)"><\/script>/g)].map(match => match[1]);
  assert.equal(sources.length, 3);
  assert.equal(new Set(sources.map(source => source.split('?v=')[1])).size, 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/russian-b2/dictionary-reader.test.js`

Expected: FAIL，因为当前三个 `<script>` 没有版本参数。

- [ ] **Step 3: 实现最小缓存修复**

将 `reader.html` 的三行脚本引用改为：

```html
<script src="js/russian-dictionary/core.js?v=20260718-1"></script>
<script src="js/russian-dictionary/storage.js?v=20260718-1"></script>
<script src="js/russian-dictionary/runtime.js?v=20260718-1"></script>
```

保留 `core.js` 中 `escapeHtml(JSON.stringify(normalizeContext(context)))` 的属性编码路径。

- [ ] **Step 4: 运行词典测试**

Run: `node --test tests/russian-b2/dictionary-core.test.js tests/russian-b2/dictionary-reader.test.js`

Expected: PASS，且安全属性测试仍通过。

- [ ] **Step 5: 提交**

```powershell
git add reader.html tests/russian-b2/dictionary-reader.test.js
git commit -m "fix: version shared dictionary assets"
```

### Task 2: 复用阅读口语 FAB 导航作为 B2 页面壳

**Files:**

- Modify: `reader.html:923-934, 1228-1250, 1253-1281, 1839-2067`
- Modify: `tests/russian-b2/b2-dashboard.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**

- Consumes: 现有 `.fab-group-top`、`.fab-btn`、`.fab-nav` 和 B2 `showB2Dashboard()`、`showChapters(bookId)`。
- Produces: `b2FloatingNavigation(options)` HTML 帮助器，供 B2 仪表盘、模块目录与专项页面使用。

- [ ] **Step 1: 写失败测试**

在 `b2-dashboard.test.js` 增加：

```js
test('B2 routes use the shared floating navigation instead of the dark toolbar', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /function b2FloatingNavigation\(options\)/);
  assert.match(reader, /renderB2Dashboard[\s\S]*b2FloatingNavigation/);
  assert.match(reader, /renderB2ModuleChapters[\s\S]*b2FloatingNavigation/);
  assert.doesNotMatch(reader.match(/function renderB2Dashboard[\s\S]*?\n\}/)[0], /toolbar\(/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/russian-b2/b2-dashboard.test.js`

Expected: FAIL，因为帮助器尚不存在且 B2 页面仍调用 `toolbar()`。

- [ ] **Step 3: 实现 B2 页面壳**

在 `toolbar()` 后增加 `b2FloatingNavigation(options)`：

```js
function b2FloatingNavigation(options) {
  var back = options.backAction ? '<button class="fab-btn" onclick="' + options.backAction + '" title="' + escapeHtml(options.backTitle || '返回') + '">←</button>' : '';
  var menu = options.menuAction ? '<button class="fab-btn" onclick="' + options.menuAction + '" title="目录">☰</button>' : '';
  return '<div class="fab-group-top b2-floating-navigation"><button class="fab-btn" onclick="cycleTheme()" title="切换主题">🎨</button><button class="fab-btn" onclick="cycleFont()" title="字号">Aa</button>' + menu + back + '</div>';
}
```

将 `renderB2Dashboard()`、`renderB2ModuleChapters()` 及 B2 专项渲染器的 `toolbar(...)` 头部替换为该帮助器；连续阅读/练习继续保留现有底部 `fab-nav`。

- [ ] **Step 4: 样式隔离**

添加 `.b2-floating-navigation` 的微调规则，仅处理浮动层级、窄屏按钮间距与不遮挡章节标题；不修改 `.toolbar` 与 `renderChapter()` 的原阅读口语布局。

- [ ] **Step 5: 运行 B2 静态测试**

Run: `node --test tests/russian-b2/b2-dashboard.test.js tests/russian-b2/reader-static.test.js`

Expected: PASS，B2 路由存在浮动导航且无黑色工具栏依赖。

- [ ] **Step 6: 提交**

```powershell
git add reader.html tests/russian-b2/b2-dashboard.test.js tests/russian-b2/reader-static.test.js
git commit -m "feat: use floating navigation across B2 pages"
```

### Task 3: 浏览器验收与完整回归

**Files:**

- Create: `docs/superpowers/acceptance/2026-07-18-reader-navigation-and-cache-repair.md`
- Test: `tests/russian-b2/*.test.js`

**Interfaces:**

- Consumes: 任务 1 的版本化脚本、任务 2 的 B2 浮动导航。
- Produces: 可追溯的桌面和窄屏验收记录。

- [ ] **Step 1: 启动隔离工作区服务器**

Run: `node server.js`

Expected: 输出 `Server running at http://localhost:3000`；若主目录占用端口，使用 `PORT=3004 node server.js`。

- [ ] **Step 2: 验收阅读口语第一章**

打开 `reader.html`，进入《В мире людей — 阅读口语》第一章，确认正文不包含 `sourceLabel`、`sentenceZh` 或 JSON 字段；点击一个俄语词可打开词典。

- [ ] **Step 3: 验收 B2 仪表盘与专项页**

进入《俄语 B2 全模块》、一个模块目录与写作/听力页面，确认顶部为浅色浮动控件，没有 `.toolbar` 黑栏；390px 窄屏不产生横向滚动。

- [ ] **Step 4: 完整自动化回归**

Run: `npm run verify:russian-b2 && npm run verify:russian-dictionary`

Expected: B2 与词典全部测试通过，严格页码账本仍为 `190/190`。

- [ ] **Step 5: 写验收记录并提交**

```powershell
git add docs/superpowers/acceptance/2026-07-18-reader-navigation-and-cache-repair.md
git commit -m "test: record reader navigation repair acceptance"
```

