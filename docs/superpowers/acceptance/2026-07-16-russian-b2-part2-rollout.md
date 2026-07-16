# 俄语 B2：语法词汇·第 2 部分验收记录

日期：2026-07-16
范围：名词、形容词和动词的接格关系，印刷题号 1–70。

## 交付结果

- 已发布 7 个连续学习单元：`P2-Q001–Q010` 至 `P2-Q061–Q070`。
- 每题均使用永久题目 ID；阅读器的完成状态使用“教材 ID + 单元 ID”，不再依赖章节下标。
- 每题都关联原书题页、规则页和答案解析页，并提供已核对的原书答案、原书解析/译文、AI 参考解析与易错点。
- 阅读器保持先作答、确认后仅显示对错、再由用户主动展开答案与解析的流程；交互不会将页面强制滚回顶部。

## 原书依据

原书扫描件：`E:\Desktop\俄语B2.pdf`。

来源台账位于：
`俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/part-02-source-ledger.json`。

台账声明完整范围 `[1, 70]`；构建与验收均会拒绝缺号、答案不一致、缺少解析/译文或缺少题页/规则页/答案页的记录。

## 发布单元

| 单元 | 印刷题号 | 阅读器数据 |
| --- | --- | --- |
| `p2-q001-q010` | 1–10 | `data/textbook/russian_b2/ch0000.json` |
| `p2-q011-q020` | 11–20 | `data/textbook/russian_b2/ch0001.json` |
| `p2-q021-q030` | 21–30 | `data/textbook/russian_b2/ch0002.json` |
| `p2-q031-q040` | 31–40 | `data/textbook/russian_b2/ch0003.json` |
| `p2-q041-q050` | 41–50 | `data/textbook/russian_b2/ch0004.json` |
| `p2-q051-q060` | 51–60 | `data/textbook/russian_b2/ch0005.json` |
| `p2-q061-q070` | 61–70 | `data/textbook/russian_b2/ch0006.json` |

## 自动化验收

以下命令均在发布前成功运行：

```text
node scripts/russian-b2/build-book.js
→ 已生成 7 个阅读器单元与 7 个 Markdown 学习单元

node scripts/russian-b2/verify-source-ledger.js
→ Source ledger verified.

npm run test:russian-b2
→ 19 passed, 0 failed

git diff --check
→ exit 0
```

测试覆盖永久 ID、旧版 pilot 学习进度迁移、完整 1–70 覆盖、答案与原书答案一致性、解析与译文必填、PDF 证据页、构建输出、答案默认隐藏、滚动位置保持和静态服务器的 WebP MIME 类型。

## 浏览器验收

- 打开最后单元 `reader.html?book=russian_b2&ch=6`，确认题 61–70 均出现且未自动显示答案；第 70 题选项为“Г. учиться”。
- 在第 61 题选择错误答案并确认后，仅显示错误反馈；点击“查看答案与解析”后，依序显示原书答案、原书解析（含译文）、AI 参考解析、中文易错点和 PDF 页码 `PDF-023；PDF-036`。
- 刷新同一单元后，该题已确认的作答状态仍保留，验证进度键不依赖临时章节序号。

## 已知边界

题干、选项、原书答案、规则和译文均以原书扫描件为准。AI 参考解析明确标记为“待复核”，只作为学习辅助，不替代原书依据。
