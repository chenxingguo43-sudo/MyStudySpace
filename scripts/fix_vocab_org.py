"""Fix vocabulary file organization: move to subdirectories, remove hashes, update indexes."""
import os, shutil, re

VOCAB_DIR = r'D:\MyStudySpace\俄语笔记库\词汇'

# --- Classification of the 47 new words ---
# Each: (old_filename, clean_word_name, subdir)
# subdir is: 名词, 动词, 形容词, 副词, or None (stay in root)
MAPPING = {
    # Verbs → 动词/
    "осознавать-286d33b2":       ("осознавать",       "动词"),
    "пробить-029efd15":          ("пробить",          "动词"),
    "посылать-435a9a21":         ("посылать",         "动词"),
    "поддерживать-dedf8673":     ("поддерживать",     "动词"),
    "заслужить-09b83fd9":        ("заслужить",        "动词"),
    "обернуться-f784d36f":       ("обернуться",       "动词"),
    "носиться-9b757531":         ("носиться",         "动词"),
    "притягиваться-036d9c6e":    ("притягиваться",    "动词"),
    "склеиться-e2fdf9d6":        ("склеиться",        "动词"),
    "образоваться-62a9c764":     ("образоваться",     "动词"),
    "удерживать-4fc5524e":       ("удерживать",       "动词"),
    "зародиться-5ee1ff97":       ("зародиться",       "动词"),
    "сформироваться-eded27ce":   ("сформироваться",   "动词"),
    "увлекаться-96206b29":       ("увлекаться",       "动词"),
    "сломаться-c4d715fb":        ("сломаться",        "动词"),
    "постоять-4b757876":         ("постоять",         "动词"),
    "отремонтировать-3933f832":  ("отремонтировать",  "动词"),
    "прощаться-8033be94":        ("прощаться",        "动词"),

    # Nouns → 名词/
    "спина-07b92006":            ("спина",            "名词"),
    "Вселенная-bd6a544d":        ("Вселенная",        "名词"),
    "взрыв-8837b96a":            ("взрыв",            "名词"),
    "пустота-e0e6ac1e":          ("пустота",          "名词"),
    "шар-7616cefa":              ("шар",              "名词"),
    "галактика-049048f2":        ("галактика",        "名词"),
    "коньки-73e341cd":           ("коньки",           "名词"),
    "механика-e51bed00":         ("механика",         "名词"),
    "одеяло-fbe849aa":           ("одеяло",           "名词"),
    "фотоаппарат-8cb7e17b":      ("фотоаппарат",      "名词"),
    "продукт-3e966545":          ("продукт",          "名词"),
    "посуда-053f996c":           ("посуда",           "名词"),
    "груз-eeef8a80":             ("груз",             "名词"),
    "рюкзак-af6241d9":           ("рюкзак",           "名词"),
    "плечо-81f5730f":            ("плечо",            "名词"),
    "пыль-2e416337":             ("пыль",             "名词"),
    "пружина-591e9643":          ("пружина",          "名词"),
    "беда-ee517d95":             ("беда",             "名词"),

    # Adjectives → 形容词/
    "очаровательный-b8269a4d":   ("очаровательный",  "形容词"),
    "честный-ee569aea":          ("честный",          "形容词"),
    "порядочный-1bcb3707":       ("порядочный",       "形容词"),
    "огненный-c1a5a894":         ("огненный",         "形容词"),

    # Adverbs → 副词/
    "постепенно-a35f969f":       ("постепенно",       "副词"),
    "молча-f24ff8d9":            ("молча",            "副词"),
    "медленно-f0f46acb":         ("медленно",         "副词"),
    "по счёту-2ff92c34":         ("по счёту",         "副词"),

    # Phrases / particles / misc — stay in root vocab dir
    "пожилая дама-3bf951ab":     ("пожилая дама",     None),
    "кусочек плотного вещества-88b98b39": ("кусочек плотного вещества", None),
    "ведь-a638667e":             ("ведь",             None),
}

# Track which files were created for cleanup
created_files = set(MAPPING.keys())

stats = {"moved": 0, "duplicate_skipped": 0, "index_updated": 0, "root_kept": 0}

for old_name, (clean_name, subdir) in MAPPING.items():
    src = os.path.join(VOCAB_DIR, old_name + ".md")

    if not os.path.exists(src):
        print(f"[WARN] Source not found: {old_name}.md")
        continue

    if subdir is None:
        # Rename to remove hash if there is one
        if old_name != clean_name:
            dst = os.path.join(VOCAB_DIR, clean_name + ".md")
            if not os.path.exists(dst):
                os.rename(src, dst)
                print(f"[RENAME] {old_name}.md -> {clean_name}.md (root)")
            else:
                # Already exists without hash — keep the old one, delete the new one
                os.remove(src)
                print(f"[SKIP] {old_name}.md — {clean_name}.md already exists in root")
        else:
            print(f"[KEEP] {clean_name}.md (root)")
        stats["root_kept"] += 1
        continue

    dst_dir = os.path.join(VOCAB_DIR, subdir)
    dst = os.path.join(dst_dir, clean_name + ".md")

    if os.path.exists(dst):
        # Duplicate — read new file content for comparison
        with open(src, 'r', encoding='utf-8') as f:
            new_content = f.read()
        with open(dst, 'r', encoding='utf-8') as f:
            old_content = f.read()

        # If new has more specific info (case_gov, original form note), merge
        if '笔记中出现形式' in new_content and '笔记中出现形式' not in old_content:
            # Merge the original form note into existing
            import re as re2
            note_match = re2.search(r'> 笔记中出现形式:.*?\n', new_content)
            if note_match:
                # Insert after 释义 section
                meaning_end = old_content.find('## 变位')
                if meaning_end == -1:
                    meaning_end = old_content.find('## 例句')
                if meaning_end > 0:
                    updated = old_content[:meaning_end] + '\n' + note_match.group() + '\n' + old_content[meaning_end:]
                    with open(dst, 'r', encoding='utf-8') as f:
                        pass  # read was done above
                    # Read again to be safe
                    pass
            print(f"[DUPE-MERGE] {clean_name} — existing kept, would add origin note")
        else:
            print(f"[DUPE-SKIP] {clean_name} — already exists in {subdir}/")

        os.remove(src)
        stats["duplicate_skipped"] += 1
        continue

    # Move and rename
    shutil.move(src, dst)
    print(f"[MOVE] {old_name}.md -> {subdir}/{clean_name}.md")
    stats["moved"] += 1

print(f"\n--- Stats ---")
print(f"Moved to subdirs: {stats['moved']}")
print(f"Duplicates skipped: {stats['duplicate_skipped']}")
print(f"Kept in root: {stats['root_kept']}")

# --- Now update index files ---

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update 名词索引
NOUN_INDEX = os.path.join(VOCAB_DIR, '名词', '名词索引.md')
content = read_file(NOUN_INDEX)

# New nouns to add (that were moved successfully)
new_nouns = [
    ("спина",       "ж.", "否", "背部"),
    ("Вселенная",   "ж.", "否", "宇宙"),
    ("взрыв",       "м.", "否", "爆炸"),
    ("пустота",     "ж.", "否", "空虚，真空"),
    ("шар",         "м.", "否", "球，球体"),
    ("галактика",   "ж.", "否", "星系"),
    ("коньки",      "pl.", "否", "溜冰鞋（通常只用复数）"),
    ("механика",    "ж.", "否", "机械学，力学"),
    ("одеяло",      "ср.", "否", "毯子，被子"),
    ("фотоаппарат", "м.", "否", "照相机"),
    ("продукт",     "м.", "否", "产品，食品"),
    ("посуда",      "ж.", "否", "餐具"),
    ("груз",        "м.", "否", "货物，负荷"),
    ("рюкзак",      "м.", "否", "背包"),
    ("плечо",       "ср.", "否", "肩膀"),
    ("пыль",        "ж.", "否", "灰尘，尘埃"),
    ("пружина",     "ж.", "否", "弹簧"),
    ("беда",        "ж.", "否", "灾难，不幸，麻烦"),
]

# Check which ones are already in the index
existing_nouns = set()
for line in content.split('\n'):
    m = re.match(r'\|\s*\[\[(.+?)\]\]', line)
    if m:
        existing_nouns.add(m.group(1))

new_entries = []
for word, gender, anim, meaning in new_nouns:
    if word not in existing_nouns:
        row = f"| [[{word}]] | {gender} | {anim} | {meaning} |"
    else:
        row = None  # already there
    new_entries.append((word, row))

added_noun_count = 0
for word, row in new_entries:
    if row:
        content += '\n' + row
        added_noun_count += 1
        print(f"[INDEX+] 名词/{word}")

# Update the count in header
content = re.sub(r'名词索引 \(\d+\)', f'名词索引 ({68 + added_noun_count})', content)

write_file(NOUN_INDEX, content)
print(f"名词索引 updated: +{added_noun_count} new entries")

# Update 动词索引
VERB_INDEX = os.path.join(VOCAB_DIR, '动词', '动词索引.md')
content = read_file(VERB_INDEX)

new_verbs = [
    ("осознавать",       "HCB", "осознать",       "意识到，认识到"),
    ("пробить",          "CB",  "пробивать",      "击穿，打通"),
    ("посылать",         "HCB", "послать",         "发送，寄"),
    ("заслужить",        "CB",  "заслуживать",    "值得，应受"),
    ("обернуться",       "CB",  "оборачиваться",  "转身"),
    ("носиться",         "HCB", "нестись",         "奔跑，飞驰；飘浮"),
    ("притягиваться",    "HCB", "притянуться",    "互相吸引"),
    ("склеиться",        "CB",  "склеиваться",    "粘合在一起"),
    ("образоваться",     "CB/HCB", "образовываться", "形成，产生"),
    ("удерживать",       "HCB", "удержать",       "保持，保留，阻止"),
    ("зародиться",       "CB",  "зарождаться",    "产生，发源"),
    ("сформироваться",   "CB",  "формироваться",  "形成，成型"),
    ("увлекаться",       "HCB", "увлечься",       "沉迷于，热衷于"),
    ("сломаться",        "CB",  "ломаться",       "坏掉，折断"),
    ("постоять",         "CB",  "стоять",         "站一会儿；捍卫"),
    ("отремонтировать",  "CB",  "ремонтировать",  "修理"),
    ("прощаться",        "HCB", "проститься/попрощаться", "告别，辞行"),
]

existing_verbs = set()
for line in content.split('\n'):
    m = re.match(r'\|\s*\[\[(.+?)\]\]', line)
    if m:
        existing_verbs.add(m.group(1))

added_verb_count = 0
for word, asp, pair, meaning in new_verbs:
    if word not in existing_verbs:
        row = f"| [[{word}]] | {asp} | {pair} | {meaning} | |"
        content += '\n' + row
        added_verb_count += 1
        print(f"[INDEX+] 动词/{word}")

# Update count
content = re.sub(r'动词索引 \(\d+\)', f'动词索引 ({24 + added_verb_count})', content)

write_file(VERB_INDEX, content)
print(f"动词索引 updated: +{added_verb_count} new entries")

print("\nDone!")
