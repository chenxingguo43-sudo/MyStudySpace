#!/usr/bin/env python3
"""
Zlatoust Transcription Combiner & JSON Builder
Reads all batch transcription files, parses exercises, generates chapter JSONs.
"""
import os, re, json, sys
from collections import defaultdict

TRANSCRIPT_DIR = 'D:/MyStudySpace/_zlatoust_transcriptions'
OUTPUT_DIR = 'D:/MyStudySpace/data/textbook/zlatoust_grammar'

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load ch0000 for schema reference
ch0000 = json.load(open(os.path.join(OUTPUT_DIR, 'ch0000.json'), encoding='utf-8'))
print(f"Schema: {len(ch0000['exercises'])} exercises, {len(ch0000['knowledgePoints'])} KPs")

# Collect ALL text from all sources
all_text = ''
for f in sorted(os.listdir(TRANSCRIPT_DIR)):
    if f.endswith('.txt') and 'batch' in f:
        path = os.path.join(TRANSCRIPT_DIR, f)
        text = open(path, encoding='utf-8').read()
        all_text += text + '\n'
        print(f'  Loaded {f}: {len(text)} chars, {text.count("Номер:")} exercises')

print(f'\nTotal accumulated text: {len(all_text)} chars, {all_text.count("Номер:")} exercises')

# Parse all exercises
exercises_by_page = defaultdict(list)

blocks = re.split(r'--- PAGE (\d+) ---', all_text)
for i in range(1, len(blocks), 2):
    page_num = int(blocks[i])
    content = blocks[i+1] if i+1 < len(blocks) else ''

    # Split by exercise number marker
    ex_blocks = re.split(r'Номер:\s*(\d+)', content)
    for j in range(1, len(ex_blocks), 2):
        try:
            ex_num = int(ex_blocks[j])
        except:
            continue
        ex_text = ex_blocks[j+1].strip() if j+1 < len(ex_blocks) else ''

        # Parse fields
        type_match = re.search(r'Ти[pи]п:\s*(.+)', ex_text)
        q_match = re.search(r'Вопрос:\s*(.+)', ex_text)

        # Extract options А) ... Б) ... В) ... Г) ...
        options = []
        lines = ex_text.split('\n')
        current_opt = None
        for line in lines:
            opt_match = re.match(r'([АБВГ])\)\s*(.+)', line)
            if opt_match:
                options.append({'key': opt_match.group(1), 'text': opt_match.group(2).strip()})

        if q_match:
            question = q_match.group(1).strip()
            exercises_by_page[page_num].append({
                'page': page_num,
                'printedNumber': ex_num,
                'type': type_match.group(1).strip() if type_match else 'single-choice',
                'question': question,
                'options': options
            })

total_ex = sum(len(v) for v in exercises_by_page.values())
pages = sorted(exercises_by_page.keys())
print(f'\nParsed {total_ex} exercises from {len(pages)} pages: {pages}')

# Separate by chapter boundaries (exercise numbering resets)
# Глава 1: already in ch0000.json (printed pp.7-17, ex 1-107)
# Глава 2: printed pp.18-39, ex 1-150
# Глава 3: printed pp.40-55, ex 1-99
# Глава 4: printed pp.55-68, ex 1-75
# Глава 5: printed pp.68-90, ex 1-121

chapter_pages = {
    'gl2': range(18, 40),   # Глава 2
    'gl3': range(40, 55),   # Глава 3
    'gl4': range(55, 68),   # Глава 4
    'gl5': range(68, 91),   # Глава 5
}

for ch_id, page_range in chapter_pages.items():
    ch_ex = []
    for p in page_range:
        if p in exercises_by_page:
            ch_ex.extend(exercises_by_page[p])
    pages_found = sorted(set(e['page'] for e in ch_ex))
    print('  {} (pp.{}-{}): {} exercises, pages covered: {}'.format(ch_id, page_range.start, page_range.stop-1, len(ch_ex), pages_found))

# Show what's missing
print('\nMissing pages (no data):')
for p in range(18, 91):
    if p not in exercises_by_page:
        print(f'  p{p}')

print('\nDone parsing. JSON generation will follow.')
