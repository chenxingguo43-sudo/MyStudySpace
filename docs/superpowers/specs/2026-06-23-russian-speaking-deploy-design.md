# Russian Speaking Tools — GitHub Pages Deployment Design

**Date:** 2026-06-23  
**Status:** approved  
**Scope:** 将两个俄语口语练习前端项目部署到 GitHub Pages，支持多人独立使用（单向）

## 目标

- `immersion-study-space`（3001）和 `russian-speaking-coach-v2`（3002）部署到公网可访问
- 纯静态部署：GitHub Pages 托管，不写后端、不建登录系统
- API Key 安全：每人自填自管，Key 不进 Git、不存服务端
- 多用户隔离：各人浏览器 localStorage/IndexedDB 天然隔离，无需服务端配合

## URL 结构

| 页面 | URL |
|------|-----|
| 导航页 | `https://chenxingguo43-sudo.github.io/russian-study/` |
| 口语教练 V2 | `https://chenxingguo43-sudo.github.io/russian-study/coach/` |
| 沉浸练习 | `https://chenxingguo43-sudo.github.io/russian-study/immersion/` |

## 仓库模型

独立发布仓库 `russian-study`（GitHub Pages），包含：

```
russian-study/
├── index.html          # 导航页（两个入口链接）
├── coach/              # ← russian-speaking-coach-v2/dist/
├── immersion/          # ← immersion-study-space/dist/
├── deploy.ps1          # 自动化构建 + 拷贝脚本
└── README.md
```

## 代码适配

### 1. Vite base 路径

| 项目 | vite.config.ts 修改 |
|------|-----|
| russian-speaking-coach-v2 | `base: '/russian-study/coach/'` |
| immersion-study-space | `base: '/russian-study/immersion/'` |

> 否则所有 JS/CSS/图片请求会指向根路径 `/` 而非子目录，全部 404。

### 2. Vue Router（如果有）

- Hash 模式无需修改
- History 模式需切回 Hash：GitHub Pages 不支持 SPA fallback

### 3. API Key 安全检查

两个项目均需确认：
- [ ] 无 hardcode 的默认 API Key
- [ ] Key 仅存储于 `localStorage`，通过设置页手动输入
- [ ] `git log` 历史中无 Key 残留（如有需 `git filter-branch` 清理）

### 4. 导航页

`release/index.html` — 简洁卡片式导航，列出两个工具的图标、名称、简短描述。

## 发布流程

```powershell
# 每次更新后运行
.\deploy.ps1
```

脚本步骤：
1. 在 `russian-speaking-coach-v2` 目录运行 `npm run build`
2. 在 `immersion-study-space` 目录运行 `npm run build`
3. 清空发布仓库目录下的 `coach/` 和 `immersion/`
4. 拷贝两个 `dist/` → 对应目录
5. 如 `index.html` 不存在则生成导航页
6. 打印 commit + push 提示

## 未实现（后续扩展）

- 多用户登录/注册
- 服务端 API Key 代理
- 服务端数据持久化
- CI/CD 自动构建

## 项目源码位置

| 项目 | 路径 |
|------|------|
| immersion-study-space | `D:\MyStudySpace\immersion-study-space\` |
| russian-speaking-coach-v2 | `C:\Users\梅子\.codex\worktrees\26ac\MyStudySpace\russian-speaking-coach-v2\` |
