#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证修复后的HTML文件"""
import re

FILE = r"D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html"

with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

STRESS = '\u0301'

# 1. 检查BOM
has_bom = content[0] == '\ufeff' if content else False
print(f"1. BOM检测: {'✅ 有BOM' if has_bom else '❌ 无BOM'}")

# 2. 重音符号数量
stress_count = content.count(STRESS)
print(f"2. 重音符号(U+0301): {stress_count} 个")

# 3. 俄语单词中是否还有 ?
q_in_ru = len(re.findall(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', content))
print(f"3. 俄语单词中残留 ? : {q_in_ru} 处")

# 4. ?? 残留
qq = content.count('??')
print(f"4. 残留 ?? : {qq} 处")

# 5. 示例：显示几个带重音的单词
stressed_words = re.findall(r'[\u0400-\u04FF]+(?:' + STRESS + r'[\u0400-\u04FF]*){1,}', content)
print(f"\n5. 带重音的单词示例（前10个）:")
for w in stressed_words[:10]:
    print(f"   {w}")

# 6. 检查关键章节是否存在
sections = ['s1', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16']
print(f"\n6. 章节检测:")
for s in sections:
    exists = f'id="{s}"' in content
    print(f'   {s}: {"✅" if exists else "❌"}')

print(f"\n文件总大小: {len(content)} 字符 / {len(content.encode("utf-8"))} 字节")
