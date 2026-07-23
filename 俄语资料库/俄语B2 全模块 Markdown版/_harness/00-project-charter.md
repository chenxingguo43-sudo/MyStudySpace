# 00 Project Charter

## 项目标识

- **项目名称:** 俄语B2 全模块 Markdown版
- **项目根目录:** `D:\MyStudySpace\俄语资料库\俄语B2 全模块 Markdown版`
- **源材料:** `E:\Desktop\俄语B2.pdf`（190页扫描版PDF）
- **书籍信息:** 《俄罗斯对外俄语等级考试真题与解析(B2级)》，王利众编著，哈尔滨工业大学出版社

## 书籍类型（混合型）

本书是 ТРКИ B2 全模块备考书，包含两个部分：

**第一部分：专项训练（五大模块）**
1. 语法与词汇（Грамматика. Лексика）
2. 阅读（Чтение）
3. 写作（Письмо）
4. 听力（Аудирование）
5. 会话（Говорение）

**第二部分：真题套卷**
- 完整成套 B2 真题 + 标准答案 + 答题思路

## Profile 分配

| 模块 | Profile | 学习单元标准 |
|------|---------|-------------|
| 阅读模块 | Reading | `10-learning-unit-standard.md` |
| 写作模块 | Writing/Speaking | `11-writing-speaking-unit-standard.md` |
| 会话模块 | Writing/Speaking | `11-writing-speaking-unit-standard.md` |
| 听力模块 | Writing/Speaking | `11-writing-speaking-unit-standard.md` |
| 语法词汇模块 | Reference | 待定（参考语法格式） |
| 真题套卷 | 混合 | 按各部分题型选用对应 profile |

## 当前阶段

**sealed** ✅ — 项目完成:
- ✅ 阅读 10 | ✅ 写作 6 | ✅ 听力 5 | ✅ 会话 5
- ✅ 语法词汇 7 (1总览+6部分) | ✅ 真题套卷 7 (1总览+6子章节)
- **总计: 40 个学习单元**

## 项目规则

- 使用绝对路径
- 保护 `原始OCR/` 和 `章节/` 只读（密封后）
- 生成内容（翻译、解析、范文）必须标注为学习辅助
- OCR 不确定性保持可见
- 俄语正文使用普通 Markdown，不用代码格式
- 不同模块使用对应的 profile，不强制混用

## 当前状态

- [ ] OCR 提取（Google Docs 上传 → 导出 Markdown → 拆分页面）
- [ ] Stage 1: 源材料密封
- [ ] Stage 2: 质量地图
- [ ] Stage 3: 范围地图
- [ ] Stage 4: 衍生层（翻译、例句、卡片、学习单元）
- [ ] Stage 5: 审核门
- [ ] Stage 6: 清理封版
