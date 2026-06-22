# Russian Reading Assistant v1 — 设计文档

> 目标 vault：`俄语资料库`
> 日期：2026-06-22

## 概述

一个轻量 Obsidian 本地插件，用于阅读俄语材料时快速捕获生词和切换双语显示模式。

## 功能范围

三条命令，不预设快捷键：

| 命令 | 触发条件 | 功能 |
|------|----------|------|
| Capture Selected Russian Word to Inbox | 需要选中文本 | 提取俄语词 → 标记原文 → 存入收件箱 |
| Enter Russian Immersion Mode | 全局 | 隐藏所有 `ZH:` 行 |
| Enter Russian Intensive Mode | 全局 | 显示所有 `ZH:` 行 |

## 文件结构

```
俄语资料库/.obsidian/plugins/russian-reading-assistant/
├── manifest.json
├── helpers.js              # 纯函数，无 Obsidian 依赖
├── main.js                 # Obsidian 入口
├── styles.css              # 标记样式 + ZH 隐藏
└── tests/
    └── helpers.test.js     # Node 单元测试
```

**分层原则：**
- `helpers.js`：词提取、路径规范化、frontmatter 生成、合并逻辑。纯函数，可在 Node 中测试。
- `main.js`：命令注册、编辑器选区处理、vault 文件读写。调用 `helpers.js`，不包含数据处理逻辑。

## 数据格式

### 阅读材料

采用 `RU:` / `ZH:` 逐行对格式：

```
RU: Муромчане гордятся своими знаменитыми земляками.
ZH: 穆罗姆人以自己的著名同乡为荣。
```

### 生词文件

存储路径：`词汇/未归档/<normalized>.md`

```yaml
---
word: "Муромчане"
normalized: "муромчане"
lemma: ""
status: "未归档"
created: "2026-06-22"
updated: "2026-06-22"
count: 1
encounter_dates:
  - "2026-06-22"
sources:
  - "学习单元/text.md"
---

# Муромчане

## 上下文

### 2026-06-22｜text

> RU: Муромчане гордятся своими знаменитыми земляками.
```

## 生词捕获流程

1. 从选区提取俄语词，分离标点（`«Муромчане,»` → word=`Муромчане`）
2. 规范化为小写（`муромчане`），用作文件名
3. 检查当前行是否已有 `<mark class="ru-new-word">` 包裹同一词，有则跳过
4. 用 `<mark class="ru-new-word">词</mark>` 替换选区
5. 取当前行作为上下文来源
6. 文件不存在 → 新建；已存在 → count+1、追加上下文块、去重 sources 列表

## 双语模式切换

**沉浸模式：**
1. 给 `body` 加 `ru-hide-zh` class
2. 扫描所有 `.markdown-preview-view p` 和 `.markdown-source-view .cm-line`
3. 以 `ZH:` 开头的元素加 `ru-zh-hidden-line`（`display: none`）
4. 注册 MutationObserver，DOM 变化时重新扫描

**精读模式：**
1. 移除 `body.ru-hide-zh`
2. 移除所有 `ru-zh-hidden-line` class

**卸载时：** 断开 Observer，清理 body class。

**为什么用 Observer 而非纯 CSS：** CSS 没有"以文本开头"选择器，且笔记切换后 DOM 重建需要重新扫描。

## 单元测试

| 用例 | 验证 |
|------|------|
| 选区提取 | 标点正确分离 |
| 规范化 | 大写→小写，非俄语→空 |
| 路径构建 | 正确拼接 `词汇/未归档/<word>.md` |
| 行上下文 | 从 editor mock 获取当前行 |
| 新建笔记 | frontmatter 字段、上下文块格式 |
| 合并笔记 | count+1、sources 去重、新上下文追加 |

使用 Node 原生 `assert`，无外部依赖。

## 手动验收

| 场景 | 预期 |
|------|------|
| 选中词运行捕获 | 标记 + 文件创建 |
| 同一行同一词再次捕获 | 跳过，提示已标记 |
| 同一词不同行 | count+1，追加上下文 |
| 选中非俄语文本 | 提示无俄语词 |
| 沉浸模式 | `ZH:` 行消失 |
| 精读模式 | `ZH:` 行恢复 |

## 实施计划

6 个任务，按依赖顺序执行：

1. **创建插件骨架** — manifest.json、main.js 骨架、styles.css 初始样式
2. **添加 helpers.js 和测试** — 纯函数实现 + 测试先行（先写失败测试，再实现）
3. **实现生词捕获** — main.js 完整实现，启用插件，手动验证
4. **防止重复标记** — 行级去重检查
5. **实现 ZH 模式 CSS** — MutationObserver + DOM 扫描
6. **最终验证** — 全部测试通过 + 语法检查 + 手动验收
