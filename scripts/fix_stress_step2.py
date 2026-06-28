#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第二步：清理残留?并扩大重音词典范围"""
import re, json, os

FILE = r"D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html"
BACKUP = r"D:\MyWorkBuddyProjects\俄语备考\_backups\俄语口语备考_终极整合版_backup_before_stress.html"

STRESS = '\u0301'

def has_cyrillic(text):
    return bool(re.search(r'[\u0400-\u04FF]', text))

def clean_question_in_russian(text):
    """去掉俄语单词中残留的?（损坏的重音符号）"""
    def repl(m):
        w = m.group(0)
        return w.replace('?', '')
    # 匹配包含?的西里尔字母序列
    return re.sub(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', repl, text)

def build_better_dict():
    """尝试从多个来源建立重音词典"""
    d = {}
    
    # 来源1：备份文件
    with open(BACKUP, 'r', encoding='utf-8-sig') as f:
        backup_text = f.read()
    
    for m in re.finditer(r'[\u0400-\u04FF]+(?:' + STRESS + r'[\u0400-\u04FF]*)*', backup_text):
        word = m.group()
        if STRESS in word:
            bare = word.replace(STRESS, '').lower()
            if bare not in d:
                d[bare] = word
    
    print(f"词典来源1（备份文件）：{len(d)} 词")
    
    # 来源2：当前已修复的文件中提取（已有重音的）
    with open(FILE, 'r', encoding='utf-8-sig') as f:
        current_text = f.read()
    
    for m in re.finditer(r'[\u0400-\u04FF]+(?:' + STRESS + r'[\u0400-\u04FF]*)*', current_text):
        word = m.group()
        if STRESS in word:
            bare = word.replace(STRESS, '').lower()
            if bare not in d:
                d[bare] = word
    
    print(f"词典来源2（当前文件）：{len(d)} 词（合计）")
    return d, current_text

def apply_stress(word, d):
    if STRESS in word or not has_cyrillic(word):
        return word
    lower = word.lower()
    if lower in d:
        result = d[lower]
        if word[0].isupper():
            result = result[0].upper() + result[1:]
        return result
    return word

def process_td_content(cell_text, d):
    """处理<td>中的俄语文本，加重音"""
    parts = re.split(r'([\u0400-\u04FF]+(?:-[\u0400-\u04FF]+)*)', cell_text)
    result = []
    for part in parts:
        if has_cyrillic(part) and STRESS not in part:
            if '-' in part:
                result.append('-'.join(apply_stress(w, d) for w in part.split('-')))
            else:
                result.append(apply_stress(part, d))
        else:
            result.append(part)
    return ''.join(result)

def main():
    print("=" * 50)
    
    # 1. 建立更好的词典
    d, content = build_better_dict()
    
    # 2. 清理残留的? 
    print("\n清理残留 ? ...")
    cleaned = clean_question_in_russian(content)
    q_remaining = len(re.findall(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', cleaned))
    print(f"  清理后残留 ? : {q_remaining}")
    
    # 3. 应用重音词典
    print("\n应用重音词典...")
    def process_td(m):
        cell = m.group(1)
        if has_cyrillic(cell):
            return '<td>' + process_td_content(cell, d) + '</td>'
        return m.group(0)
    
    stressed = re.sub(r'<td>(.*?)</td>', process_td, cleaned, flags=re.DOTALL)
    
    # 也处理<th>
    def process_th(m):
        cell = m.group(1)
        if has_cyrillic(cell):
            return '<th>' + process_td_content(cell, d) + '</th>'
        return m.group(0)
    
    stressed = re.sub(r'<th>(.*?)</th>', process_th, stressed, flags=re.DOTALL)
    
    # 4. 统计
    stress_count = stressed.count(STRESS)
    q_left = len(re.findall(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', stressed))
    print(f"\n结果：")
    print(f"  重音符号数量：{stress_count}")
    print(f"  残留 ? : {q_left}")
    
    # 5. 保存
    with open(FILE, 'w', encoding='utf-8-sig') as f:
        f.write(stressed)
    
    file_size = os.path.getsize(FILE)
    print(f"  文件大小：{file_size} bytes")
    print("\n" + "=" * 50)
    print("完成！")

if __name__ == '__main__':
    main()
