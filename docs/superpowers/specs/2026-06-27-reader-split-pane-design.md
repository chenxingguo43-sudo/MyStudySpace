# reader.html 可拖拽分栏布局 — 设计文档

日期：2026-06-27
范围：仅 `reader.html`（单文件改动）

## 目标

将阅读页面的"阅读区 + 详情面板"布局从当前的 px 宽度 + CSS transition 方案，改为基于 Flexbox 百分比的可拖拽分栏方案。统一使用 Pointer Events 同时支持鼠标和触控拖拽，响应式适配 iPad 横屏（左右分栏）和手机竖屏（上下分栏）。

## 需求确认

| # | 决策 | 选择 |
|---|------|------|
| 1 | 手机竖屏行为 | **上下真分栏**（flex-direction: column），非浮层 |
| 2 | 比例持久化 | **localStorage** 记录，横屏/竖屏各存一份 |
| 3 | 拖拽边界 | 默认 70%，最小 25%，最大 85% |
| 4 | 分割线风格 | 低调透明 → 悬停主题色高亮 → 拖拽发光 |
| 5 | 面板显示 | **始终显示双栏**，未选词时面板显示占位提示 |

## 技术方案

### 核心技术选择

- **Pointer Events**：`pointerdown` / `pointermove` / `pointerup` + `setPointerCapture`，统一鼠标和触控
- **Flexbox 百分比**：阅读区 `flex: 0 0 X%`，详情面板 `flex: 1`（自动填满剩余空间）
- **CSS Media Query**：`@media (max-width: 767px)` 切换 `flex-direction: column`
- **移除 CSS transition**：`.detail-panel` 上移除 `transition`，否则拖拽时动画滞后不跟手
- **`touch-action: none`**：分割线上禁用浏览器默认手势（滚动/缩放）

### 布局结构

```
┌──────────────────────────────────────────────┐
│  .toolbar (sticky, z-index: 100)             │
├──────────────────────────────────────────────┤
│  .peek-counter (sticky, z-index: 50)         │
├──────────────────────────────────────────────┤
│  .reader-layout (flex row/column)            │
│  ┌───────────────────┬────┬────────────────┐ │
│  │  .reader-pane     │分割│ .detail-panel  │ │
│  │  flex: 0 0 70%   │ 线 │ flex: 1        │ │
│  │  min-width: 25%   │    │ (自动填满)     │ │
│  │  max-width: 85%   │    │                │ │
│  │  (横屏)           │    │                │ │
│  └───────────────────┴────┴────────────────┘ │
├──────────────────────────────────────────────┤
│  .bottom-nav (fixed)                         │
└──────────────────────────────────────────────┘
```

### 响应式断点

- **≥768px（iPad 横屏 / 桌面）**：`flex-direction: row`，分割线垂直，cursor: `col-resize`
- **<768px（手机竖屏）**：`flex-direction: column`，分割线水平，cursor: `row-resize`

> 断点选择说明：iPad mini 竖屏宽度 768px，以 768px 为界，≥768 统一用横屏布局。比需求中建议的 768px 保持一致即可。

## CSS 改动

### 新增/重写

```css
/* 分栏容器 */
.reader-layout {
  display: flex;
  width: 100%;
  height: calc(100vh - 96px); /* 减去 toolbar + peek-counter + bottom-nav */
  /* 默认 row，横屏左右分栏 */
  flex-direction: row;
}

/* 阅读区 */
.reader-pane {
  flex: 0 0 70%;        /* 默认 70% */
  min-width: 25%;        /* 最小 25%（横屏） */
  max-width: 85%;        /* 最大 85%（横屏） */
  overflow-y: auto;
}

/* 分割线 */
.resize-handle {
  width: 8px;            /* 触控友好的宽度 */
  flex-shrink: 0;
  cursor: col-resize;
  touch-action: none;    /* 禁止浏览器默认手势 */
  background: transparent;
  transition: background 0.2s;
  align-self: stretch;
}
.resize-handle:hover { background: var(--accent); opacity: 0.5; }
.resize-handle.active { background: var(--accent); opacity: 1; box-shadow: 0 0 12px var(--accent-dim); }

/* 详情面板 */
.detail-panel {
  flex: 1;               /* 自动填满剩余空间 */
  min-width: 0;          /* 允许收缩 */
  overflow-y: auto;
  /* 注意：不设置 transition！拖拽时需要即时响应 */
}

/* ─── 竖屏 (<768px) ─── */
@media (max-width: 767px) {
  .reader-layout {
    flex-direction: column;
  }
  .reader-pane {
    flex: 0 0 55%;       /* 竖屏默认上方 55% */
    min-width: 0;         /* 清除横屏的 min/max-width */
    max-width: 100%;
    min-height: 25%;
    max-height: 85%;
    width: 100%;
  }
  .resize-handle {
    width: 100%;
    height: 8px;
    cursor: row-resize;  /* 上下拖拽光标 */
  }
  .detail-panel {
    min-height: 15%;     /* 竖屏最小高度 */
    width: 100%;
  }
}
```

### 移除

- `.detail-panel` 的 `transition: width 0.3s ease, opacity 0.25s ease`
- `.detail-panel.open` — 不再需要 `.open` 状态类，面板始终可见
- `.detail-overlay` — 不再需要浮层遮罩
- `.resize-handle.visible` — 分割线始终可见
- 旧移动端 `@media (max-width: 767px)` 中关于 `.detail-panel`、`.resize-handle`、`.detail-overlay` 的规则

### 占位提示样式（新增）

```css
.detail-placeholder {
  display: flex; align-items: center; justify-content: center;
  min-height: 200px; color: var(--text-dim); font-size: 14px;
  text-align: center; line-height: 1.8;
}
```

## HTML 改动

### 当前结构（第 966-974 行）

```html
<div class="reader-layout">
  <div class="reader-pane"><div class="chapter-content">...</div></div>
  <div class="detail-panel" id="detailPanel"><div class="detail-panel-inner" id="detailInner"></div></div>
  <div class="resize-handle" id="resizeHandle"></div>
  <div class="detail-overlay" id="detailOverlay" onclick="closeDetailPanel()"></div>
</div>
```

### 调整后

```html
<div class="reader-layout" id="readerLayout">
  <div class="reader-pane" id="readerPane"><div class="chapter-content">...</div></div>
  <div class="resize-handle" id="resizeHandle"></div>
  <div class="detail-panel" id="detailPanel">
    <div class="detail-panel-inner" id="detailInner">
      <div class="detail-placeholder">👆 点击俄语单词查看详情</div>
    </div>
  </div>
</div>
```

要点：
1. 分割线移到阅读区和面板之间（DOM 顺序必须正确）
2. 移除 `.detail-overlay` 元素
3. 面板默认显示占位内容
4. 新增 `id="readerLayout"` 和 `id="readerPane"` 方便 JS 引用

## JS 改动

### 核心拖拽逻辑（重写第 1130-1160 行）

```javascript
(function() {
  var layout = null, pane = null, panel = null, handle = null;
  var dragging = false, isHorizontal = true;

  function initRefs() {
    layout = document.getElementById('readerLayout');
    pane = document.getElementById('readerPane');
    panel = document.getElementById('detailPanel');
    handle = document.getElementById('resizeHandle');
  }

  function getDirection() {
    if (!layout) return 'row';
    return getComputedStyle(layout).flexDirection;
  }

  document.addEventListener('pointerdown', function(e) {
    initRefs();
    if (!e.target.closest('#resizeHandle')) return;
    if (!pane || !panel) return;

    dragging = true;
    isHorizontal = getDirection() === 'row';
    handle.classList.add('active');
    handle.setPointerCapture(e.pointerId);
  });

  document.addEventListener('pointermove', function(e) {
    if (!dragging || !pane) return;

    var rect = layout.getBoundingClientRect();
    var percentage;

    if (isHorizontal) {
      percentage = (e.clientX - rect.left) / rect.width * 100;
    } else {
      percentage = (e.clientY - rect.top) / rect.height * 100;
    }

    // 限制范围 25%–85%
    percentage = Math.max(25, Math.min(85, percentage));
    pane.style.flexBasis = percentage + '%';
  });

  document.addEventListener('pointerup', function(e) {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('active');
    handle.releasePointerCapture(e.pointerId);

    // 持久化：横屏/竖屏各存一份
    try {
      var key = isHorizontal ? 'rr_split_h' : 'rr_split_v';
      localStorage.setItem(key, pane.style.flexBasis);
    } catch(err) {}
  });
})();
```

### localStorage 恢复逻辑（在 renderChapter 中调用）

```javascript
function restoreSplitRatio() {
  var layout = document.getElementById('readerLayout');
  var pane = document.getElementById('readerPane');
  if (!layout || !pane) return;

  var isH = getComputedStyle(layout).flexDirection === 'row';
  var key = isH ? 'rr_split_h' : 'rr_split_v';
  var saved = null;
  try { saved = localStorage.getItem(key); } catch(e) {}

  if (saved) {
    pane.style.flexBasis = saved;
  } else {
    // 默认值：横屏 70%，竖屏 55%
    pane.style.flexBasis = isH ? '70%' : '55%';
  }
}
```

### 面板逻辑改动

| 函数 | 当前行为 | 改为 |
|------|----------|------|
| `openDetailPanel(word)` | 添加 `.open` 类 + 显示 overlay + 显示 handle | 面板始终可见，只需 `renderDetailPanel(word)` 填充内容 |
| `closeDetailPanel()` | 移除 `.open` 类 + 隐藏 overlay + 隐藏 handle | 清空面板内容，恢复占位提示 |
| `toggleDetailPanel(word)` | 切换开/关 | 改为：同一单词再点 → 关闭；不同单词 → 切换内容 |

### 移除的代码

- `.detail-overlay` 相关的所有 DOM 操作
- `rr_panel_width` localStorage 键（替换为 `rr_split_h` / `rr_split_v`）
- 旧的拖拽代码中 `startX` / `startW` / `panelEl.offsetWidth` 等 px 计算逻辑

## 兼容性 & 边界情况

### 视图切换
- 书架 (`showShelf`) 和章节目录 (`showChapters`) 使用 `.main-container`，不受影响
- 只有阅读视图 (`renderChapter`) 使用 `.reader-layout`，分栏在此视图中生效

### 无 JavaScript
- 纯 CSS fallback：阅读区 `flex: 0 0 70%`，详情面板 `flex: 1`，分割线不可拖拽但布局正常

### 极窄视口（<320px）
- 阅读区最小 25%，面板仍有 75% 最小空间
- 实际使用中手机竖屏最小宽 320px（iPhone SE），25% = 80px，足够阅读

### localStorage 异常
- `localStorage.getItem` 包裹在 try/catch 中
- 读取失败时使用默认比例（横屏 70%，竖屏 55%）
- 非法值（非百分比字符串）会被 `flexBasis` 忽略，回退到 CSS 默认值

### iPad 横竖屏切换
- 拖拽过程中旋转屏幕：`pointerup` 时方向已变化，但百分比仍有效（因为 flexBasis 是百分比，与方向无关）
- 未拖拽时旋转屏幕：`restoreSplitRatio` 在每次 `renderChapter` 时调用，会读取对应方向的 localStorage 值

### 触摸设备优化
- `touch-action: none` 防止 iOS Safari 的橡皮筋效果干扰拖拽
- `setPointerCapture` 防止手指移出分割线后丢失拖拽状态
- 分割线 8px 宽度/高度，符合 Apple HIG 推荐的触控目标最小尺寸

## 测试要点

1. **桌面端鼠标拖拽**：左右拖动分割线，阅读区宽度实时变化
2. **iPad 触控拖拽**：手指按住分割线横向滑动，面板跟随
3. **手机竖屏上下拖拽**：手指按住分割线纵向滑动
4. **边界限制**：拖拽到 25% 和 85% 边界时停止，不会超出
5. **比例记忆**：调好比例 → 刷新页面 → 比例恢复
6. **方向独立记忆**：横屏调成 50% → 切竖屏 → 竖屏有自己的比例 → 切回横屏 → 恢复 50%
7. **主题切换**：三种主题下分割线颜色正确
8. **书架/目录视图不受影响**：没有 reader-layout 的视图照常显示
9. **点击单词**：面板内容更新，分割线位置不变
10. **点击面板外部**：面板清空恢复占位，分割线保持
