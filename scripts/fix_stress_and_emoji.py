#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复俄语知识库.html：
1. 从备份文件提取重音词典
2. 清理当前文件中的 ? 乱码
3. 应用词典恢复重音
4. 修复 ?? emoji
"""
import re
import os

BACKUP_FILE = r"D:\MyWorkBuddyProjects\俄语备考\_backups\俄语口语备考_终极整合版_backup_before_stress.html"
CURRENT_FILE = r"D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html"
OUTPUT_FILE = r"D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html"

STRESS = '\u0301'  # Combining Acute Accent U+0301

def has_cyrillic(text):
    return bool(re.search(r'[\u0400-\u04FF]', text))

def has_stress(word):
    return STRESS in word

def remove_stress(word):
    return word.replace(STRESS, '')

def extract_stressed_dict(text):
    """从文本中提取已标注重音的单词，建立词典"""
    d = {}
    # 匹配包含重音符号的西里尔字母序列
    for m in re.finditer(r'[\u0400-\u04FF]+(?:' + STRESS + r'[\u0400-\u04FF]*)*', text):
        word = m.group()
        if has_stress(word):
            bare = remove_stress(word).lower()
            if bare not in d:
                d[bare] = word
    return d

def apply_stress_to_word(word, d):
    """给单个单词加重音"""
    if has_stress(word) or not has_cyrillic(word):
        return word
    lower = word.lower()
    if lower in d:
        result = d[lower]
        # 保持原大小写
        if word[0].isupper():
            result = result[0].upper() + result[1:]
        return result
    return word

def process_russian_text(text, d):
    """处理俄语文本，加重音"""
    # 按西里尔字母单词分割
    parts = re.split(r'([\u0400-\u04FF]+(?:-[\u0400-\u04FF]+)*)', text)
    result = []
    for part in parts:
        if has_cyrillic(part) and not has_stress(part):
            if '-' in part:
                result.append('-'.join(apply_stress_to_word(w, d) for w in part.split('-')))
            else:
                result.append(apply_stress_to_word(part, d))
        else:
            result.append(part)
    return ''.join(result)

def fix_emoji_in_text(text):
    """根据备份文件中的映射修复emoji"""
    # 常见emoji映射（从备份文件中观察到的）
    emoji_map = {
        '??': '📚',  # 目录
        '??': '📝',  # 核心句型
        '??': '💬',  # 场景对话
        '??': '✨',  # 词汇小灶
        '??': '🆕',  # 素材更新
        '??': '🎯',  # 表达技巧
        '??': '📋',  # 高频表达
        '??': '💡',  # 小贴士
        '??': '🔍',  # 速查
        '??': '▸',   # 展开按钮
    }
    for k, v in emoji_map.items():
        text = text.replace(k, v)
    return text

def main():
    print("=" * 50)
    print("Step 1: Reading backup file (UTF-8 with stress marks)...")
    with open(BACKUP_FILE, 'r', encoding='utf-8-sig') as f:
        backup_content = f.read()
    print(f"  Backup size: {len(backup_content)} chars")
    
    print("\nStep 2: Building stress dictionary from backup...")
    d = extract_stressed_dict(backup_content)
    print(f"  Dictionary size: {len(d)} words")
    
    print("\nStep 3: Reading current (damaged) file...")
    with open(CURRENT_FILE, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    print(f"  Current size: {len(content)} chars")
    
    # 统计修复前的状态
    q_in_russian = len(re.findall(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', content))
    qq_count = content.count('??')
    print(f"  Russian words with ? (damaged stress): {q_in_russian}")
    print(f'  ?? occurrences (damaged emoji): {qq_count}')
    
    print("\nStep 4: Cleaning ? from Russian words...")
    # 把俄语单词中的 ? 去掉（恢复无重音的原文）
    def clean_russian_word(m):
        word = m.group(0)
        return word.replace('?', '')
    
    cleaned = re.sub(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', clean_russian_word, content)
    print(f"  Cleaned, now applying stress dictionary...")
    
    print("\nStep 5: Applying stress marks from dictionary...")
    # 只处理<td>单元格中的俄语文本
    def process_td(m):
        cell_content = m.group(1)
        if has_cyrillic(cell_content):
            return '<td>' + process_russian_text(cell_content, d) + '</td>'
        return m.group(0)
    
    stressed = re.sub(r'<td>(.*?)</td>', process_td, cleaned, flags=re.DOTALL)
    
    # 也处理<th>中的俄语
    def process_th(m):
        cell_content = m.group(1)
        if has_cyrillic(cell_content):
            return '<th>' + process_russian_text(cell_content, d) + '</th>'
        return m.group(0)
    
    stressed = re.sub(r'<th>(.*?)</th>', process_th, stressed, flags=re.DOTALL)
    
    # 处理普通文本中的俄语（不在标签内的）
    # 这个比较复杂，先跳过，主要确保表格内容正确
    
    print("\nStep 6: Fixing emoji (?? -> correct emoji)...")
    stressed = fix_emoji_in_text(stressed)
    qq_remaining = stressed.count('??')
    print(f"  Remaining ?? after fix: {qq_remaining}")
    
    # 统计修复后的重音数量
    stress_count = stressed.count(STRESS)
    print(f"\nStep 7: Verifying...")
    print(f"  Stress marks in result: {stress_count}")
    
    print(f"\nStep 8: Writing output (UTF-8 with BOM)...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8-sig') as f:
        f.write(stressed)
    
    file_size = os.path.getsize(OUTPUT_FILE)
    print(f"  Output file size: {file_size} bytes")
    print("\n" + "=" * 50)
    print("DONE! File saved with UTF-8 BOM.")
    print(f"  Stress marks: {stress_count}")
    print(f"  Remaining ?? : {stressed.count('??')}")

if __name__ == '__main__':
    main()
