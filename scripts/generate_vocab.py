"""Generate Obsidian markdown files from the docx vocabulary data."""
import json, hashlib, os, re

# Load the extracted data
with open(r'D:\MyStudySpace\temp_docx_output.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

rows = data['tables'][0]['rows'][1:]  # skip header

# Word classifications: (original_form, dict_form, chinese, type, extra_fields)
# extra_fields is a dict with type-specific fields
vocab = [
    # ---- verbs (imperfective) ----
    ("осознавая", "осознавать", "意识到，认识到", "verb", {"aspect": "несов.", "pair": "осознать", "case_gov": "что"}),
    ("пробить", "пробить", "击穿，打通", "verb", {"aspect": "сов.", "pair": "пробивать", "case_gov": "что"}),
    ("посылать", "посылать", "发送，寄", "verb", {"aspect": "несов.", "pair": "послать", "case_gov": "что / кому"}),
    ("поддерживать", "поддерживать", "支持，维持", "verb", {"aspect": "несов.", "pair": "поддержать", "case_gov": "кого/что"}),
    ("заслужить", "заслужить", "值得，应受", "verb", {"aspect": "сов.", "pair": "заслуживать", "case_gov": "что"}),
    ("обернуться", "обернуться", "转身", "verb", {"aspect": "сов.", "pair": "оборачиваться"}),
    ("носиться", "носиться", "奔跑，飞驰；飘浮", "verb", {"aspect": "несов.", "pair": "нестись"}),
    ("притягиваться", "притягиваться", "互相吸引", "verb", {"aspect": "несов.", "pair": "притянуться"}),
    ("склеились", "склеиться", "粘合在一起", "verb", {"aspect": "сов.", "pair": "склеиваться"}),
    ("образоваться", "образоваться", "形成，产生", "verb", {"aspect": "сов./несов.", "pair": "образовываться"}),
    ("удерживать", "удерживать", "保持，保留，阻止", "verb", {"aspect": "несов.", "pair": "удержать", "case_gov": "кого/что"}),
    ("зародиться", "зародиться", "产生，发源", "verb", {"aspect": "сов.", "pair": "зарождаться"}),
    ("сформироваться", "сформироваться", "形成，成型", "verb", {"aspect": "сов.", "pair": "формироваться"}),
    ("увлекаться", "увлекаться", "沉迷于，热衷于", "verb", {"aspect": "несов.", "pair": "увлечься", "case_gov": "кем/чем"}),
    ("сломаться", "сломаться", "坏掉，折断", "verb", {"aspect": "сов.", "pair": "ломаться"}),
    ("постоять", "постоять", "站一会儿；捍卫", "verb", {"aspect": "сов.", "pair": "стоять"}),
    ("отремонтировать", "отремонтировать", "修理", "verb", {"aspect": "сов.", "pair": "ремонтировать", "case_gov": "что"}),
    ("прощаться", "прощаться", "告别，辞行", "verb", {"aspect": "несов.", "pair": "проститься/попрощаться", "case_gov": "с кем"}),

    # ---- nouns ----
    ("пожилую даму", "пожилая дама", "老妇人，年长的女士", "phrase", {"gender": "ж.", "animate": True}),
    ("спиной", "спина", "背部", "noun", {"gender": "ж.", "animate": False}),
    ("Вселенной", "Вселенная", "宇宙", "noun", {"gender": "ж.", "animate": False}),
    ("взрыв", "взрыв", "爆炸", "noun", {"gender": "м.", "animate": False}),
    ("пустоте", "пустота", "空虚，真空", "noun", {"gender": "ж.", "animate": False}),
    ("шары", "шар", "球，球体", "noun", {"gender": "м.", "animate": False}),
    ("галактики", "галактика", "星系", "noun", {"gender": "ж.", "animate": False}),
    ("коньках", "коньки", "溜冰鞋（通常只用复数）", "noun", {"gender": "pl.", "animate": False, "noun_kind": "pluralia tantum"}),
    ("механикой", "механика", "机械学，力学", "noun", {"gender": "ж.", "animate": False}),
    ("одеяло", "одеяло", "毯子，被子", "noun", {"gender": "ср.", "animate": False}),
    ("фотоаппарат", "фотоаппарат", "照相机", "noun", {"gender": "м.", "animate": False}),
    ("продукт", "продукт", "产品，食品", "noun", {"gender": "м.", "animate": False}),
    ("посуду", "посуда", "餐具", "noun", {"gender": "ж.", "animate": False}),
    ("груз", "груз", "货物，负荷", "noun", {"gender": "м.", "animate": False}),
    ("рюкзак", "рюкзак", "背包", "noun", {"gender": "м.", "animate": False}),
    ("плечи", "плечо", "肩膀", "noun", {"gender": "ср.", "animate": False}),
    ("пыль", "пыль", "灰尘，尘埃", "noun", {"gender": "ж.", "animate": False}),
    ("пружина", "пружина", "弹簧", "noun", {"gender": "ж.", "animate": False}),
    ("беде", "беда", "灾难，不幸，麻烦", "noun", {"gender": "ж.", "animate": False}),
    ("кусочков плотного вещества", "кусочек плотного вещества", "致密物质的碎片", "phrase", {}),

    # ---- adjectives ----
    ("очаровательная", "очаровательный", "迷人的，可爱的", "adj", {"short_form": "очарователен"}),
    ("честный", "честный", "诚实的", "adj", {"short_form": "честен"}),
    ("порядочный", "порядочный", "正派的，体面的", "adj", {"short_form": "порядочен"}),
    ("огненной", "огненный", "火的，燃烧的", "adj", {}),

    # ---- adverbs ----
    ("постепенно", "постепенно", "逐渐地", "adv", {}),
    ("молча", "молча", "默默地，无言地", "adv", {}),
    ("медленно", "медленно", "缓慢地", "adv", {}),

    # ---- particles / conjunctions / phrases ----
    ("ведь", "ведь", "毕竟，要知道（语气词/连词）", "particle", {}),
    ("по счёту", "по счёту", "依次，按顺序", "adv", {}),
]


OUTPUT_DIR = r'D:\MyStudySpace\俄语笔记库\词汇'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def hash8(s):
    return hashlib.md5(s.encode()).hexdigest()[:8]

def make_filename(word):
    # Truncate Russian word to ~50 chars for filename
    safe = word[:50]
    h = hash8(word)
    return f"{safe}-{h}.md"

def build_frontmatter(entry):
    orig, lemma, zh, wtype, extra = entry

    fm = {
        "word": lemma,
        "type": wtype,
        "meaning": zh,
        "mastery": 1,
        "tags": ["B2", "词汇"],
        "created": "2026-05-21",
    }

    if wtype == "verb":
        if "aspect" in extra:
            fm["aspect"] = extra["aspect"]
        if "pair" in extra:
            fm["pair"] = extra["pair"]
        if "case_gov" in extra:
            fm["case_gov"] = extra["case_gov"]
    elif wtype == "noun":
        if "gender" in extra:
            fm["gender"] = extra["gender"]
        if "animate" in extra:
            fm["animate"] = extra["animate"]
        if "noun_kind" in extra:
            fm["noun_kind"] = extra["noun_kind"]
        if "plural_gen" in extra:
            fm["plural_gen"] = extra["plural_gen"]
    elif wtype == "adj":
        if "short_form" in extra:
            fm["short_form"] = extra["short_form"]
        if "comparative" in extra:
            fm["comparative"] = extra["comparative"]
    elif wtype == "phrase":
        if "gender" in extra:
            fm["gender"] = extra["gender"]

    fm["examples"] = [{"ru": "", "zh": ""}]
    return fm


def build_yaml(fm):
    """Minimal YAML emitter for frontmatter without pyyaml."""
    lines = []
    for key, val in fm.items():
        if key == "examples":
            lines.append("examples:")
            for ex in val:
                lines.append(f'  - ru: ""')
                lines.append(f'    zh: ""')
        elif isinstance(val, bool):
            lines.append(f"{key}: {str(val).lower()}")
        elif isinstance(val, list):
            items = ", ".join(f'"{v}"' for v in val)
            lines.append(f"{key}: [{items}]")
        elif isinstance(val, int):
            lines.append(f"{key}: {val}")
        else:
            # Escape quotes in string values
            sval = str(val).replace('"', '\\"')
            lines.append(f'{key}: "{sval}"')
    return "\n".join(lines)


count = 0
for entry in vocab:
    orig, lemma, zh, wtype, extra = entry
    fm = build_frontmatter(entry)
    yaml_str = build_yaml(fm)

    # Build the note body
    note_type_section = ""
    if wtype == "verb":
        conj = extra.get("conj_pattern", "")
        pair_info = f"**体偶**: {extra.get('aspect', '')} — {extra.get('pair', '')}"
        gov_info = f"**接格**: {extra.get('case_gov', '—')}" if extra.get('case_gov') else ""
        note_type_section = f"""
## 变位/变格/接格
- {pair_info}
- {gov_info}
"""
    elif wtype == "noun":
        gender_info = f"**性**: {extra.get('gender', '—')}"
        anim_info = "**动物名词**" if extra.get('animate') else "**非动物名词**"
        note_type_section = f"""
## 变位/变格/接格
- {gender_info}
- {anim_info}
"""
    elif wtype == "adj":
        sf = extra.get('short_form', '')
        note_type_section = f"""
## 变位/变格/接格
- **短尾**: {sf if sf else '—'}
"""
    elif wtype == "adv":
        note_type_section = """
## 用法
- 副词，修饰动词
"""
    elif wtype == "phrase":
        note_type_section = """
## 用法
- 固定短语
"""
    elif wtype == "particle":
        note_type_section = """
## 用法
- 语气词/连词
"""

    content = f"""---
{yaml_str}
---

# {lemma}

## 释义
{zh}

> 笔记中出现形式: **{orig}**
{note_type_section}
## 例句

*（待补充）*

## 相关词
- [[]]
"""

    fname = make_filename(lemma)
    fpath = os.path.join(OUTPUT_DIR, fname)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    count += 1
    print(f"Created: {fname}")

print(f"\nDone! {count} files created in {OUTPUT_DIR}")
