# MyStudySpace UI 优化计划书

## 核心原则 ⚠️ 绝对不能动

以下元素是动态色温系统的一部分，**保持原样，一个字符都不改**：
- 番茄钟计时器 SVG 圆环颜色（随工作/休息模式自动切换）
- 开始/暂停/重置按钮的颜色（跟圆环联动）
- 模式切换按钮（工作模式/休息模式）
- 4 个漂浮流体光球（`.fluid-orb`）的颜色和动画
- 所有跟 `work-mode` / `break-mode` 相关的 CSS 颜色变量

---

## 改动范围

### 文件1：`pomodoro.html` — 全局样式和卡片系统

#### 1.1 页面背景色
```
当前: background: #0f0f1a
改为: background: #020617
```
位置：`body` 或最外层容器样式。让背景更深更干净，光球和圆环在上面更突出。

#### 1.2 毛玻璃卡片统一
```
当前: 混用 rgba(255,255,255,0.03) 到 0.08，圆角不统一
改为:
  --card-bg: rgba(255, 255, 255, 0.05)
  --card-border: rgba(255, 255, 255, 0.08)
  --card-radius: 16px
```
所有卡片（设置面板、任务输入、音乐面板等）统一用这些变量。
给每个卡片加一条极细的边框 `border: 1px solid rgba(255,255,255,0.08)`。

#### 1.3 字体引入
在 `<head>` 中新增：
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```
全局 body 字体改为 `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;`
保留计时器数字的 `'Noto Serif SC'` 不动。

#### 1.4 字体层级规范
```
计时器数字:  保持原样不动
状态文字:    font: 500 14px 'Inter'
按钮文字:    font: 600 15px 'Inter'
设置标签:    font: 500 12px 'Inter', 大写, 字间距1.2px
任务输入:    font: 400 16px 'Inter'
```

#### 1.5 能量矩阵优化
8 格番茄完成矩阵，已完成的小格加上微弱的绿色发光 `box-shadow: 0 0 6px rgba(22,163,74,0.4)`。

---

### 文件2：`study-stats.html` — 统计面板配色

#### 2.1 卡片配色迁移
```
当前番茄统计卡片: 橙红渐变
改为: 靛蓝渐变 background: linear-gradient(135deg, #4F46E5, #818CF8)

当前俄语统计卡片: 蓝紫渐变
改为: 保持蓝紫渐变不动（区分两个模块）
```

#### 2.2 数据高亮色
```
数字 highlight 色: #4F46E5（从当前的橙色改为靛蓝）
进度条/增长指示:  #16A34A（翠绿）
```

#### 2.3 背景统一
```
页面背景: #020617（和番茄钟一致）
卡片底色: rgba(255,255,255,0.05)
```

#### 2.4 字体
同 pomodoro.html，引入 Inter，全局应用。

---

### 文件3：`俄语知识库.html` — 学习内容排版

#### 3.1 引入学术字体
```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,500;0,700;1,300;1,500&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
```

#### 3.2 字体应用
```
章节标题:    font-family: 'Cormorant Garamond', serif; font-weight: 700;
俄语正文列:  font-family: 'Crimson Pro', serif; font-size: 16px;
中文翻译列:  保持系统字体（微软雅黑等）不用换
小标签徽章:  font-family: 'Cinzel', serif; font-size: 10px; text-transform: uppercase;
```

#### 3.3 章节标题栏颜色
```
当前: 蓝紫渐变
改为: 稍微调整让颜色和全局 Language Learning 调色板更接近
  从 #667eea→#764ba2
  到 #4F46E5→#6366F1（更干净的学习靛蓝）
```

#### 3.4 条目完成状态
阅读/朗读/背诵 三个标记，完成状态用 `#16A34A`（翠绿），和全局强调色统一。

---

### 文件4：`index.html` — 调度中心

改动最少，只改两处：
- 背景色统一为 `#020617`
- 底部 FAB 按钮颜色调为 `#4F46E5`

---

## 改动顺序

1. **pomodoro.html** — 背景、卡片、字体（影响最大，先改）
2. **study-stats.html** — 跟着统一配色
3. **俄语知识库.html** — 学术字体 + 标题栏
4. **index.html** — 最后微调

每改完一个文件就测试一下，确认圆环和光球没受影响。

---

## 不改的文件
- `server.js` — 纯后端，无关
- `数据存储说明.md` — 文档，不动
