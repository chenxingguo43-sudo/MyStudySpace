# 阅读口语教材 → 小说阅读器集成设计

> 日期：2026-06-25

## 目标

将俄语资料库中的阅读口语学习单元（30篇）集成到现有小说阅读器（reader.html），支持平板通过GitHub Pages访问。

## 范围

- 第一版：只放中俄对照阅读，不放练习题和答案
- 数据源：`俄语资料库/В мире людей 阅读口语 Markdown版/学习单元/`（30个文件）
- 目标格式：与 `data/novel/` 一致的JSON

## 数据转换

### 输入

30个学习单元Markdown文件，每个包含：
- 标题和元数据（frontmatter）
- 中俄对照段落（`**RU:**` + `> [!quote]- 中文译文` 折叠块）

### 输出

```
data/textbook/
├── index.json          # 书籍目录
├── reading_speaking/
│   ├── ch0000.json     # Текст 1.1.1
│   ├── ch0001.json     # Текст 1.1.2
│   └── ...（共30个）
```

### JSON格式

```json
{
  "index": 0,
  "title": "Текст 1.1.1 — Достопримечательности Мурома",
  "original": ["段落1俄语", "段落2俄语", ...],
  "translated": ["段落1中文", "段落2中文", ...]
}
```

index.json:
```json
{
  "books": [
    {
      "id": "reading_speaking",
      "title": "В мире людей — 阅读口语",
      "author": "М.Н. Макова, О.А. Ускова",
      "direction": "ru→cn",
      "chapters": 30,
      "dir": "reading_speaking",
      "description": "ТРКИ-2 阅读口语教材，30篇阅读文章"
    }
  ]
}
```

## 阅读器适配

reader.html 修改：
1. 支持加载 `data/textbook/index.json`（或合并到novel index）
2. 书架显示"教材"标签
3. direction = `ru→cn`

## GitHub Pages

- 添加 `.github/workflows/deploy.yml`
- 静态文件部署
- server.js API改为前端直接fetch JSON文件

## 转换脚本

`scripts/convert-textbook-to-novel.js`：
1. 扫描 `学习单元/` 目录
2. 解析每个Markdown的中俄段落
3. 输出JSON到 `data/textbook/`
