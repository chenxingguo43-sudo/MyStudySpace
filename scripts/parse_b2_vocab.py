#!/usr/bin/env python3
"""
Parse B2 vocabulary from pandoc grid-table text.

Robust approach: for each word, search nearby lines (within ±8) for the
nearest description with a POS prefix. Falls back to inline desc, then
desc without POS.
"""

import re
import os
from datetime import datetime

INPUT_FILE = r"C:\Users\梅子\AppData\Local\Temp\b2_vocab_raw.txt"
OUTPUT_DIR = r"D:\MyStudySpace\俄语笔记库\词汇\生词汇总"

POS_PATTERNS = [
    ("不定代词.", "pronoun", None),
    ("集合数词.", "numeral", None),
    ("未.完.", "verb", None),
    ("中,不变.", "noun", "neuter"),
    ("前,二格.", "preposition", None),
    ("阳.", "noun", "masculine"),
    ("阴.", "noun", "feminine"),
    ("中.", "noun", "neuter"),
    ("复.", "noun", "plural"),
    ("未.", "verb", None),
    ("完.", "verb", None),
    ("形.", "adjective", None),
    ("代.", "pronoun", None),
    ("数.", "numeral", None),
    ("副.", "adverb", None),
    ("连.", "conjunction", None),
    ("前.", "preposition", None),
    ("语.", "interjection", None),
    ("插.", "interjection", None),
    ("集.", "numeral", None),
    ("动.", "verb", None),
    ("名.", "noun", None),
]


def parse_description(desc):
    desc = desc.strip().rstrip(',')
    if not desc:
        return None, None, None
    for abbr, pos, gender in POS_PATTERNS:
        if desc.startswith(abbr):
            return pos, desc[len(abbr):].strip().rstrip(','), gender
    return None, desc, None


def parse_vocab_text(text):
    lines = text.split("\n")
    current_letter = None

    num_re = re.compile(
        r"\|\s*(\d{4})\s*\|\s*([а-яА-ЯёЁ][а-яА-ЯёЁ\s\-]*[а-яА-ЯёЁ])\s*\|\s*(.*?)\s*\|"
    )
    num_re_single = re.compile(
        r"\|\s*(\d{4})\s*\|\s*([а-яА-ЯёЁ][а-яА-ЯёЁ\-]*)\s*\|\s*(.*?)\s*\|"
    )
    desc_re = re.compile(r"\|\s*\|\s*\|\s*([^\+\|:][^\|]*)\s*\|")
    letter_re = re.compile(r"^[А-ЯЁ]$")

    # Pre-compute all desc lines
    desc_at = {}
    for i, line in enumerate(lines):
        stripped = line.strip()
        dm = desc_re.match(stripped)
        if dm:
            desc_text = dm.group(1).strip()
            pos, meaning, gender = parse_description(desc_text)
            if meaning:
                desc_at[i] = (pos, meaning, gender)

    def find_nearest_desc(word_line, prefer_above=True):
        """Find the nearest desc with POS prefix within ±8 lines."""
        candidates = []
        for offset in range(-8, 9):
            if offset == 0:
                continue
            j = word_line + offset
            if j in desc_at:
                dpos, dmeaning, dgender = desc_at[j]
                if dpos:  # Has POS prefix
                    dist = abs(offset)
                    # Prefer above (negative offset) slightly
                    bias = 0 if offset < 0 else 0.5
                    candidates.append((dist + bias, offset, dpos, dmeaning, dgender))

        if candidates:
            candidates.sort()
            _, offset, dpos, dmeaning, dgender = candidates[0]
            return dpos, dmeaning, dgender
        return None, None, None

    entries = []
    for i, line in enumerate(lines):
        stripped = line.strip()

        if letter_re.match(stripped):
            current_letter = stripped
            continue

        m = num_re.match(stripped)
        if not m:
            m = num_re_single.match(stripped)
        if not m:
            continue

        number = int(m.group(1))
        word = m.group(2).strip()
        same_desc = m.group(3).strip()

        # 1. Try inline desc with POS prefix
        pos, meaning, gender = parse_description(same_desc)
        if pos:
            entries.append({
                "number": number, "word": word, "pos": pos,
                "meaning": meaning, "gender": gender, "letter": current_letter,
            })
            continue

        # 2. Search nearby for desc with POS prefix
        pos, meaning, gender = find_nearest_desc(i)
        if pos:
            entries.append({
                "number": number, "word": word, "pos": pos,
                "meaning": meaning, "gender": gender, "letter": current_letter,
            })
            continue

        # 3. Inline desc without POS (multi-word phrases)
        if same_desc and len(same_desc.strip()) > 1:
            entries.append({
                "number": number, "word": word, "pos": "unknown",
                "meaning": same_desc.strip().rstrip(','), "gender": None,
                "letter": current_letter,
            })
            continue

        # 4. Nearby desc without POS
        for offset in range(-8, 9):
            if offset == 0:
                continue
            j = i + offset
            if j in desc_at:
                dpos, dmeaning, dgender = desc_at[j]
                if dmeaning and len(dmeaning) > 2:
                    entries.append({
                        "number": number, "word": word, "pos": "unknown",
                        "meaning": dmeaning, "gender": None, "letter": current_letter,
                    })
                    break
        else:
            entries.append({
                "number": number, "word": word, "pos": None,
                "meaning": None, "gender": None, "letter": current_letter,
            })

    return entries


def generate_markdown(entry):
    word = entry["word"]
    pos = entry["pos"]
    meaning = entry["meaning"]
    gender = entry.get("gender")
    meaning_esc = meaning.replace('"', '\\"') if meaning else ""

    yaml = [
        "---",
        f'word: "{word}"',
        f'type: "{pos}"',
        f'theme: "B2单词表"',
        f'meaning: "{meaning_esc}"',
        "mastery: 1",
        'tags: ["B2"]',
    ]
    if gender:
        yaml.append(f'gender: "{gender}"')
        yaml.append("animate: false")
    yaml += [
        "examples:",
        f'  - ru: "Пример с {word}."',
        f'    zh: "包含{meaning}的例句。"',
        f'created: "{datetime.now().strftime("%Y-%m-%d")}"',
        "---",
    ]

    md = ["", f"# {word}", ""]
    md += ["## 📖 释义", meaning or "待补充", ""]
    md += ["## ✍️ 例句", "", "| 俄语 | 中文 |", "|------|------|"]
    md += [f"| Пример с {word}. | 包含{meaning}的例句。 |", ""]

    if pos == "noun":
        md += ["## 📐 变位/变格/接格", "| 格 | 单数 | 复数 |", "|------|------|------|"]
        md += [f"| 主格 | {word} | ... |"]
        md += ["| 属格 | ... | ... |", "| 与格 | ... | ... |", "| 宾格 | ... | ... |",
               "| 工具格 | ... | ... |", "| 前格 | ... | ... |"]
    elif pos == "verb":
        md += ["## 📐 变位/变格/接格", "| 人称 | 现在时 | 过去时 |", "|------|--------|--------|"]
        for p in ["я", "ты", "он/она", "мы", "вы", "они"]:
            md += [f"| {p} | ... | ... |"]

    md += ["", "## 📚 相关词", f"- [[{word}]]"]
    return "\n".join(yaml + md)


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        text = f.read()

    entries = parse_vocab_text(text)
    with_desc = [e for e in entries if e["pos"]]
    without_desc = [e for e in entries if not e["pos"]]
    print(f"Total: {len(entries)}, with desc: {len(with_desc)}, without: {len(without_desc)}")

    if without_desc:
        print(f"Words without desc: {[(e['number'], e['word']) for e in without_desc]}")

    # Deduplicate
    seen = set()
    unique = []
    for e in with_desc:
        key = (e["word"], e["pos"])
        if key not in seen:
            seen.add(key)
            unique.append(e)
    print(f"Unique: {len(unique)} entries")

    # POS breakdown
    pos_counts = {}
    for e in unique:
        pos_counts[e["pos"]] = pos_counts.get(e["pos"], 0) + 1
    for p, c in sorted(pos_counts.items(), key=lambda x: -x[1]):
        print(f"  {p}: {c}")

    # Coverage check
    all_nums = set()
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            nm = re.search(r"\|\s*(\d{4})\s*\|", line)
            if nm:
                all_nums.add(int(nm.group(1)))
    parsed_nums = {e["number"] for e in unique}
    missing = all_nums - parsed_nums
    if missing:
        print(f"\nMissing {len(missing)} numbers: {sorted(missing)}")
    else:
        print(f"\nAll {len(all_nums)} numbers covered!")

    # Sample
    print("\nFirst 10:")
    for e in unique[:10]:
        print(f"  {e['number']}: {e['word']} ({e['pos']}) - {e['meaning']}")

    # Generate files
    pos_dirs = {
        "noun": "名词", "verb": "动词", "adjective": "形容词",
        "adverb": "副词", "pronoun": "代词", "numeral": "数词",
        "conjunction": "连词", "preposition": "前置词",
        "interjection": "感叹词",
        "unknown": "未分类",
    }
    for dirname in pos_dirs.values():
        os.makedirs(os.path.join(OUTPUT_DIR, dirname), exist_ok=True)

    generated = 0
    skipped = 0
    for entry in unique:
        dirname = pos_dirs.get(entry["pos"], "其他")
        dir_path = os.path.join(OUTPUT_DIR, dirname)
        os.makedirs(dir_path, exist_ok=True)
        filepath = os.path.join(dir_path, f"{entry['word']}.md")
        if os.path.exists(filepath):
            skipped += 1
            continue
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(generate_markdown(entry))
        generated += 1

    print(f"\nDone! Generated: {generated}, Skipped (exists): {skipped}")


if __name__ == "__main__":
    main()
