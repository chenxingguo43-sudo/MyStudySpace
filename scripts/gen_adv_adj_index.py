"""Generate adverb and adjective index files."""
import os, re, glob

VOCAB = r'D:\MyStudySpace\俄语笔记库\词汇'


def parse_frontmatter(path):
    """Extract frontmatter fields from a markdown file."""
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    data = {}
    # Match YAML frontmatter
    m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not m:
        return data

    yaml = m.group(1)
    for line in yaml.split('\n'):
        line = line.strip()
        if ':' in line and not line.startswith('-') and not line.startswith('#'):
            key, _, val = line.partition(':')
            val = val.strip().strip('"').strip("'")
            if val == '':
                val = ''
            data[key.strip()] = val
    return data


# --- Adverb Index ---
adv_dir = os.path.join(VOCAB, '副词')
adv_files = sorted(glob.glob(os.path.join(adv_dir, '*.md')))
adv_entries = []

for f in adv_files:
    name = os.path.splitext(os.path.basename(f))[0]
    if '索引' in name:
        continue
    fm = parse_frontmatter(f)
    meaning = fm.get('meaning', '')
    adv_entries.append((name, meaning))

adv_lines = [
    '---',
    'cssclass: dashboard',
    '---',
    '',
    '# 📝',
    '',
    f'← [[名词索引]] | [[动词索引]] | [[形容词索引]] 副词索引 ({len(adv_entries)})',
    '',
    '| 单词 | 释义 |',
    '|------|------|',
]
for name, meaning in adv_entries:
    adv_lines.append(f'| [[{name}]] | {meaning} |')

adv_content = '\n'.join(adv_lines) + '\n'
with open(os.path.join(adv_dir, '副词索引.md'), 'w', encoding='utf-8') as f:
    f.write(adv_content)
print(f"副词索引: {len(adv_entries)} entries")


# --- Adjective Index ---
adj_dir = os.path.join(VOCAB, '形容词')
adj_files = sorted(glob.glob(os.path.join(adj_dir, '*.md')))
adj_entries = []

for f in adj_files:
    name = os.path.splitext(os.path.basename(f))[0]
    if '索引' in name:
        continue
    fm = parse_frontmatter(f)
    meaning = fm.get('meaning', '')
    short_form = fm.get('short_form', '')
    adj_entries.append((name, meaning, short_form))

adj_lines = [
    '---',
    'cssclass: dashboard',
    '---',
    '',
    '# 📝',
    '',
    f'← [[名词索引]] | [[动词索引]] | [[副词索引]] 形容词索引 ({len(adj_entries)})',
    '',
    '| 单词 | 释义 | 短尾 |',
    '|------|------|------|',
]
for name, meaning, sf in adj_entries:
    sf_display = sf if sf else '—'
    adj_lines.append(f'| [[{name}]] | {meaning} | {sf_display} |')

adj_content = '\n'.join(adj_lines) + '\n'
with open(os.path.join(adj_dir, '形容词索引.md'), 'w', encoding='utf-8') as f:
    f.write(adj_content)
print(f"形容词索引: {len(adj_entries)} entries")

print("Done!")
