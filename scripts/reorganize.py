# -*- coding: utf-8 -*-
"""
俄语知识库 V7.0 结构重组脚本
按照计划执行：
1. 主CSS块新增 .chapter-nav 类
2. 清除所有 chapter-nav 的 inline style
3. 统一表格列标题
4. 删除所有「素材更新」小节（11处）
5. 统一章节子标题顺序，合并无标题表格进对应小节
"""

import re

FILE = r"D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html"

print("读取文件...")
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"文件大小: {len(content)} 字符, {content.count(chr(10))+1} 行")

# ─────────────────────────────────────────────
# 任务 1 & 2: CSS 新增 .chapter-nav + 清除 inline style
# ─────────────────────────────────────────────

# 1. 在主 CSS 的 </style> 前插入 .chapter-nav 类
# 主 CSS 在第1行，</style> 前插入
chapter_nav_css = """.chapter-nav{display:flex;justify-content:space-between;align-items:center;margin:0 0 14px 0;padding:8px 14px;background:#f6f7ff;border-radius:8px;font-size:.85em}"""

old_end_style = content.find('</style>')
if old_end_style > 0:
    # 确认这是主 CSS 块的 </style>（在第1行）
    content = content[:old_end_style] + chapter_nav_css + content[old_end_style:]
    print(f"✓ 已插入 .chapter-nav CSS 类（位置: {old_end_style}）")
else:
    print("✗ 未找到主 CSS 的 </style>")

# 2. 清除所有 chapter-nav 的 inline style
# 匹配: <div class="chapter-nav" style="...">
pattern_nav = r'<div class="chapter-nav" style="[^"]*">'
replacement_nav = '<div class="chapter-nav">'
new_content, count_nav = re.subn(pattern_nav, replacement_nav, content)
print(f"✓ 已清除 {count_nav} 处 chapter-nav inline style")
content = new_content

# ─────────────────────────────────────────────
# 任务 3: 统一表格列标题
# ─────────────────────────────────────────────

# 3a. 统一两列表格列标题
replacements = [
    # 俄语原文（带重音）→ 俄语原文（带重音）
    (r'<th>俄语原文</th>', '<th>俄语原文（带重音）</th>'),
    # 中文对照 / 中文原文 / 中文 → 统一为 中文对照
    (r'<th>中文对照</th>', None),   # 先不动，需要区分两列/三列
    (r'<th>中文原文</th>', '<th>中文对照</th>'),
    (r'<th>中文</th>', None),  # 词汇小灶的三列中的「中文」保留
    # 俄语原文（男性口吻）→ 保留但加注（暂时不动）
]

# 更精确的策略：
# - 两列表格：th 应该是「俄语原文（带重音）」+「中文对照」
# - 三列表格（词汇小灶）：「俄语」+「中文」+「常见搭配/场景」

# 先处理「中文原文」→「中文对照」
count = 0
def replace_cn_original(m):
    global count
    count += 1
    return '<th>中文对照</th>'

# 只替换「中文原文」，不匹配「中文对照」
content, n1 = re.subn(r'<th>中文原文</th>', '<th>中文对照</th>', content)
print(f"✓ 「中文原文」→「中文对照」: {n1} 处")

# 处理「俄语原文」（无后缀的）→「俄语原文（带重音）」
# 但要排除已经有（带重音）和（男性口吻）的
# 先找出所有 <th>俄语原文</th>（精确匹配）
content, n2 = re.subn(r'<th>俄语原文</th>', '<th>俄语原文（带重音）</th>', content)
print(f"✓ 「俄语原文」→「俄语原文（带重音）」: {n2} 处")

# ─────────────────────────────────────────────
# 任务 4: 删除所有「素材更新」小节
# ─────────────────────────────────────────────

# 「素材更新」小节的结构：
#   <h3 id="...">🆕 素材更新</h3>
#   然后跟着一个 <table>...</table>
#   需要删除从 h3 开始到下一个 h3 或 h2 之间的内容

def remove_cai_liao(content):
    """删除所有素材更新小节"""
    # 匹配：<h3 ...>🆕 素材更新</h3> 到下一个 <h3 或 </div 或 chapter-nav 之前
    pattern = r'<h3[^>]*>🆕 素材更新</h3>\s*<table>.*?</table>'
    new_c, n = re.subn(pattern, '', content, flags=re.DOTALL)
    return new_c, n

content, n_cai = remove_cai_liao(content)
print(f"✓ 已删除 {n_cai} 处「素材更新」小节")

# 也处理可能的变体（没有 🆕 图标的情况）
pattern2 = r'<h3[^>]*>素材更新</h3>\s*<table>.*?</table>'
content, n2 = re.subn(pattern2, '', content, flags=re.DOTALL)
print(f"✓ 已删除 {n2} 处「素材更新」（无图标变体）")
total_cai = n_cai + n2

# ─────────────────────────────────────────────
# 任务 5: 给无标题表格补上 h3（s1 特殊处理）
# ─────────────────────────────────────────────

# s1 里行 418-599 的表格（在 h3 核心句型前面）需要移动
# 这个需要更精细的 HTML 解析，暂时跳过，手动处理更啊全

print("\n⚠️  以下任务建议手动处理（需要精确 HTML 结构感知）:")
print("  - s1 无标题表格归位（行 418-599，697-887）")
print("  - 章节子标题顺序统一（13 个章节）")
print("  - 表格之间加缓冲文字")
print("  以上任务因为需要理解 HTML 结构上下文，")
print("  用正则表达式风险较高，建议逐章手动处理。")

# ─────────────────────────────────────────────
# 保存
# ─────────────────────────────────────────────
print("\n保存文件...")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 完成！")
print(f"  修改统计:")
print(f"  - .chapter-nav CSS 类: 已插入")
print(f"  - chapter-nav inline style: 清除 {count_nav} 处")
print(f"  - 「俄语原文」统一: {n2} 处")
print(f"  - 「中文原文」统一: {n1} 处")
print(f"  - 「素材更新」删除: {total_cai} 处")
