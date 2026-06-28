#!/usr/bin/env python3
"""
Batch generate detailed format for B2 vocabulary entries.
This script generates the detailed content template that needs AI filling.
For now, it creates the structure with placeholder content.
"""

import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

B2_DIR = r'D:\MyStudySpace\俄语笔记库\词汇\B2单词表'
DATA_FILE = r'D:\MyStudySpace\data\b2_need_detail.json'

# Russian POS labels
POS_RU = {
    'noun': 'существительное',
    'verb': 'глагол',
    'adjective': 'прилагательное',
    'adverb': 'наречие',
    'pronoun': 'местоимение',
    'numeral': 'числительное',
    'conjunction': 'союз',
    'preposition': 'предлог',
    'interjection': 'междометие',
    'prep': 'предлог',
    'conj': 'союз',
    'adj': 'прилагательное',
    'interj': 'междометие',
    'particle': 'частица',
    'insert': 'вводное слово',
}


def load_entries():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_detail_section(entry):
    """Generate the detailed section text for an entry."""
    word = entry['word']
    meaning = entry['meaning']
    pos = entry['pos']
    pos_ru = POS_RU.get(pos, pos)

    lines = []
    lines.append('')
    lines.append('## 📝 详细释义')
    lines.append(f'**俄语解释：** {word} — {pos_ru}. （待AI补充详细俄语解释）')
    lines.append('')
    lines.append(f'**中文解释：** {meaning}。（待AI补充详细中文解释）')
    lines.append('')
    lines.append('## ✍️ 补充搭配')
    lines.append('| 搭配 | 例句 | 翻译 |')
    lines.append('|------|------|------|')
    lines.append(f'| （待补充） | （待补充） | （待补充） |')
    lines.append('')
    lines.append('## 🎯 近义词辨析')
    lines.append('| 词 | 区别 |')
    lines.append('|---|---|')
    lines.append(f'| （待补充） | （待补充） |')
    lines.append('')
    lines.append('## ⚡ 反义词')
    lines.append('- **（待补充）** — （待补充）')
    lines.append('')
    lines.append('## ⚠️ 易混淆词')
    lines.append('- （待补充）')
    lines.append('')
    lines.append('## 💡 特殊用法')
    lines.append('- （待补充）')
    lines.append('')

    return '\n'.join(lines)


def process_file(filepath, entry):
    """Add detailed section to a file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already has detail
    if '详细释义' in content:
        return False

    # Find insertion point: before "## 📚 相关词"
    marker = '## 📚 相关词'
    if marker in content:
        parts = content.split(marker, 1)
        detail = generate_detail_section(entry)
        new_content = parts[0] + detail + marker + parts[1]
    else:
        # Append at end
        detail = generate_detail_section(entry)
        new_content = content + detail

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True


def main():
    entries = load_entries()
    print(f'Total entries to process: {len(entries)}')

    processed = 0
    skipped = 0
    errors = 0

    for entry in entries:
        filepath = os.path.join(B2_DIR, entry['file'])
        if not os.path.exists(filepath):
            errors += 1
            continue

        try:
            if process_file(filepath, entry):
                processed += 1
                if processed % 100 == 0:
                    print(f'  Processed: {processed}')
            else:
                skipped += 1
        except Exception as e:
            errors += 1
            print(f'  Error on {entry["word"]}: {e}')

    print(f'\nDone!')
    print(f'  Processed: {processed}')
    print(f'  Skipped (already has detail): {skipped}')
    print(f'  Errors: {errors}')


if __name__ == '__main__':
    main()
