# 俄语学习系统 — 终局计划

> 从当前状态到最终闭环，分 5 个阶段。

---

## 当前基线

| 指标 | 值 |
|------|-----|
| sources | 18 |
| sentences | 6177 |
| translated | 5182 |
| vocabulary-card eligible | 5627 |
| lexeme keys | 19810 |
| validators | 全部 PASS |
| pending | 0 |

---

## 第一阶段：补完翻译

### 1.1 补完 raw-0016 剩余 544 条
- 创建 pending batch
- 跑 translate_batch.py
- 写回 sentences.json
- 预计耗时：20 分钟
- 验收：raw-0016 的 untranslated → 0

### 1.2 修复 diag 旧数据 451 条
- diag-0011 (84)、diag-0029 (249) 等被 rejected 但可能是好数据
- 逐一检查是否可以抢救
- 预计耗时：30 分钟
- 验收：能翻的翻了，不能翻的记录原因

### 验收
- sentences 全部 untranslated → 降至最低
- 6 个 validator 全部 PASS
- commit

---

## 第二阶段：292 页大文件

### 2.1 document_translator.py 提取
- 文件：В мире людей写作与口语.pdf（248MB，292 页）
- OCR → 提取段落 → 缓存
- 预计耗时：5-10 分钟（OCR）

### 2.2 桥接导入 MyStudySpace
- 从缓存提取句子 → source package
- 验证 → dry-run → 正式导入
- 预计耗时：5 分钟

### 2.3 翻译
- 创建 pending batch
- translate_batch.py
- 预计耗时：30-60 分钟

### 2.4 同时产出双语 HTML
- document_translator.py 继续翻译 → 生成 HTML 阅读器
- 输出到 output_document/

### 验收
- raw-0015 导入成功
- eligible 达到 8000+
- 6 个 validator PASS
- 双语 HTML 阅读器可用性检查
- commit

---

## 第三阶段：超级阅读器 MVP

### 3.1 创建 reader-v2.html
- 基于 reader.html 改造
- 加载 document_translator.py 产出的双语 HTML
- 核心功能：
  - 左栏俄语 / 右栏中文，逐段对照
  - 点击俄语词 → 查 lexeme_index → 弹出释义
  - 点击句子 → "加入背单词"按钮
  - 翻页导航
  - 暗色/亮色主题

### 3.2 数据接口
- 读取 cache_document 翻译缓存
- 读取 data/lexeme_index 做查词
- 读取 data/sentences.json 做背单词关联

### 验收
- 浏览器能打开一看俄语文章，能查词，能加卡片
- 不影响原有 vocabulary.html 功能

---

## 第四阶段：背单词页优化

### 4.1 提升例句匹配率
- 短语级索引（支持 "в общем" 这种多词匹配）
- 优先展示读者最近阅读的资料例句

### 4.2 展示优化
- 例句来源标签：📖 阅读 / 📝 语法 / 🎧 听力
- 例句收藏功能
- "从哪本书来的" 链接回阅读器

### 验收
- 背单词页例句覆盖率从 ~2% 提升到 ~15%
- 卡片上有来源标注

---

## 第五阶段：闭环打通

### 5.1 阅读→生词→背单词→阅读 循环
- 阅读器标记生词 → 自动加入 vocabulary 队列
- 背单词遇到不熟悉的 → 跳转到原文上下文
- 学习数据回传（什么词什么句背了几次）

### 5.2 学习仪表盘
- 本周新增词汇
- 阅读量统计
- 弱项词表（多次遗忘的）

### 验收
- 完整的使用流程：打开阅读器 → 读文章 → 查词 → 标记 → 背单词 → 复习 → 回到阅读
- 6 个 validator PASS

---

## 执行优先级

```
阶段 1（今晚） ████████████████████ 最高
阶段 2（今晚） ██████████████████   高
阶段 3（明天） ██████████████       中
阶段 4（明晚） ██████████           中低
阶段 5（后天） ██████               低
```

## 每个阶段完成后都做

- 6 个 validator 全部运行
- commit
- 更新进度到 run 目录

---

## 风险

| 风险 | 应对 |
|------|------|
| API 超时导致翻译卡住 | 自动重试 3 次，还不行跳过，记录 failed |
| OCR 质量差 | 不硬导，标记 blocked |
| 292 页文件太大 | 分页处理，50 页一批 |
| translations.db 损坏 | 已发现的删除，重跑 |

## 最终目标

```
打开 reader.html → 读俄语文章 → 点词查释义 → 
点句加卡片 → 打开 vocabulary.html 背单词 → 
例句来自你读过的文章 → 回到 reader.html 继续读
```

**一个完整的自学闭环。**
