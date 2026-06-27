# reader.html 交互修复 + 工具栏 UI 重构 — 设计文档

日期：2026-06-27
范围：仅 `reader.html`（单文件改动）

## 目标

修复两个操作性缺陷 + 重构顶部/底部导航 UI：

1. 点击阅读区空白处不应清空右侧面板
2. 滚动页面时右侧面板应跟随可视区域（sticky）
3. 顶部工具栏和底部导航栏改为悬浮半透明样式，提升阅读沉浸感

## 操作性问题修复

### 修复 1：点击空白不丢失面板

**根因：** click 处理器（约第 1269-1271 行）在检测到点击目标不在面板/弹窗内时调用 `closeDetailPanel()` 清空 `#detailInner.innerHTML`。

**方案：**
- 删除 click 处理器中的 `if (_detailWord) closeDetailPanel()` 调用
- 面板顶部新增 ✕ 关闭按钮，用户主动关闭
- 保留"重复点击同一单词 → 关闭"逻辑不变

**新增 CSS：**
```css
.detail-close {
  position: sticky; top: 0; right: 0; z-index: 10;
  float: right;
  width: 28px; height: 28px; line-height: 28px; text-align: center;
  border-radius: 50%; cursor: pointer;
  color: var(--text-dim); font-size: 14px;
  background: var(--glass); border: 1px solid var(--glass-border);
  transition: all 0.15s;
}
.detail-close:hover { color: var(--text); background: var(--glass-hover); }
```

**新增 HTML（面板内部顶部）：**
```html
<div class="detail-close" onclick="event.stopPropagation();closeDetailPanel()" title="关闭">✕</div>
```

**JS 改动：**
- 删除 `if (_detailWord && !e.target.closest('#resizeHandle')) closeDetailPanel();`

### 修复 2：面板跟随滚动

**根因：** `.reader-pane` 和 `.detail-panel` 各自有 `overflow-y: auto` 独立滚动条，左右脱钩。且 `.reader-layout` 有 `min-height: calc(100vh - 140px)` 限制。

**方案：** 统一滚动模型 — 整个页面自然滚动，右侧面板 sticky 吸附。

**CSS 改动：**

| 选择器 | 当前 | 改为 |
|--------|------|------|
| `.reader-layout` | `min-height: calc(100vh - 140px); padding: 0 0 100px;` | 去掉 min-height；padding 改为 `0 0 60px` |
| `.reader-pane` | `overflow-y: auto` | 去掉 overflow-y |
| `.detail-panel` | 无 sticky | 加 `position: sticky; top: 0; align-self: flex-start; max-height: 100vh; overflow-y: auto;` |

> 注意：`.detail-panel` 保留 `overflow-y: auto` + `max-height: 100vh`，确保面板内容超长时不溢出屏幕。sticky 让它始终在视口可见区域。

---

## UI 重构：悬浮按钮 + 极简导航

### 顶栏 → 左上角悬浮按钮组

**CSS 改动：**
```css
/* 悬浮工具栏 */
.floating-toolbar {
  position: fixed; top: 12px; left: 12px; z-index: 150;
  display: flex; flex-direction: column; gap: 6px;
}
.floating-toolbar .ft-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--glass); border: 1px solid var(--glass-border);
  color: var(--text-secondary); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.4; transition: opacity 0.2s, background 0.2s;
}
.floating-toolbar .ft-btn:hover { opacity: 0.95; background: var(--glass-hover); }
.floating-toolbar .ft-btn:active { transform: scale(0.92); }
/* 章节指示器 */
.floating-toolbar .ft-chapter {
  font-size: 11px; color: var(--text-dim); text-align: center;
  opacity: 0.5; margin-top: 2px;
}
```

**元素清单：**
- 🎨（主题切换）
- Aa（字号，点击循环）
- 🔍（搜索，Ctrl+F）
- ☰（目录 / 返回书架，根据当前视图切换）

**HTML 模板（替代原 `.toolbar` 元素）：**
```html
<div class="floating-toolbar" id="floatingToolbar">
  <button class="ft-btn" onclick="cycleTheme()" title="切换主题">🎨</button>
  <button class="ft-btn" onclick="cycleFont()" title="字号">Aa</button>
  <button class="ft-btn" onclick="toggleSearch()" title="搜索 (Ctrl+F)">🔍</button>
  <button class="ft-btn" onclick="showChapters(\'' + escapeHtml(curBook.id) + '\')" title="目录">☰</button>
</div>
```

> 书架视图和章节目录视图继续使用原 `.toolbar`（不改），只在阅读视图切换为悬浮按钮。

### 底栏 → 极简悬浮导航

**CSS 改动：**
```css
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(10,10,20,0.5);  /* 透明度 0.92 → 0.5 */
  border-top: 1px solid var(--border);
  padding: 0 16px; min-height: 36px;  /* 52px → 36px */
  z-index: 90; font-size: 13px;
}
.nav-btn {
  padding: 4px 12px;  /* 缩小 */
  border: 1px solid var(--glass-border); border-radius: 8px;
  color: var(--text-secondary); font-size: 13px; cursor: pointer;
  background: var(--glass); transition: all 0.15s; font-family: inherit;
}
.nav-btn:hover { background: var(--glass-hover); color: var(--accent); }
.nav-btn:active { transform: scale(0.95); }
.nav-btn.disabled { color: var(--text-dim); opacity: 0.3; pointer-events: none; }
.nav-info { font-size: 12px; color: var(--text-dim); }
```

**进度条保持：** 顶部 3px `#progressTop` 不变。

---

## 改动影响范围汇总

| 文件 | 区块 | 操作 |
|------|------|------|
| `reader.html` | CSS `.toolbar` | 新增 `.floating-toolbar` 样式，保留原 `.toolbar`（书架/目录视图用） |
| `reader.html` | CSS `.bottom-nav` / `.nav-btn` / `.nav-info` | 修改透明度、高度、字号 |
| `reader.html` | CSS `.reader-layout` / `.reader-pane` / `.detail-panel` | 修改 overflow/position/min-height |
| `reader.html` | CSS `.detail-close` | 新增关闭按钮样式 |
| `reader.html` | HTML `renderChapter` 模板 | 工具栏改为浮动按钮 + 面板加 ✕ |
| `reader.html` | JS click 处理器 | 删除外部点击关闭面板逻辑 |
| `reader.html` | `renderShelf` / `showChapters` 模板 | 保留原 toolbar 不变 |

## 边界情况

- **书架/目录视图：** 继续使用原 `.toolbar`（sticky），不受影响
- **搜索栏：** 仍然 sticky，但位置从 `top: 48px` 改为 `top: 0`（因为浮动工具栏不占空间）
- **peek-counter：** 同样 `top: 0` 开始
- **iPad 竖屏：** 浮动按钮在左侧，不随 flex-direction 改变位置
- **超大面板内容：** sticky + max-height: 100vh 限制，不溢出屏幕
- **滚轮快速滚动：** sticky 面板不抖动，浏览器原生 sticky 行为保证
