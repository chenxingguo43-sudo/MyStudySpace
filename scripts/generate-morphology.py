#!/usr/bin/env python3
"""俄语词态映射表生成器
读取 vocabulary.json，使用 pymorphy3 穷举常用变形，输出 morphology-map.json。
"""
import json
import sys
import os

# 优先 pymorphy3，回退 pymorphy2
try:
    import pymorphy3 as pm
    print("[OK] Using pymorphy3")
except ImportError:
    import pymorphy2 as pm
    print("[OK] Falling back to pymorphy2")

from collections import defaultdict

# ─── 配置 ───
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
VOCAB_PATH = os.path.join(PROJECT_DIR, 'data', 'vocabulary.json')
OUTPUT_MAP = os.path.join(PROJECT_DIR, 'data', 'morphology-map.json')
OUTPUT_VER = os.path.join(PROJECT_DIR, 'data', 'morphology-version.json')

# 需要处理的词性（归一化后）
TARGET_TYPES = {'verb', 'noun', 'adj', 'adjective', 'adv', 'adverb'}

# ─── 工具函数 ───
def is_multiple_words(word):
    """跳过短语/句子"""
    return len(word.split()) > 1 or len(word) < 2


def normalize_word_for_key(w):
    """生成映射表的键：去重音、ё→e、小写、去标点"""
    w = w.replace('́', '')  # 只移除重音符号（combining acute accent）
    w = w.replace('ё', 'е').replace('Ё', 'е').lower()
    return ''.join(c for c in w if c.isalpha())


# ─── 变形生成策略（按词性，只选阅读高频形式）───
def generate_verb_forms(lemma, morph):
    """动词：现在时6人称 + 过去时4性数 + 命令式2种 + 常用形动词短尾"""
    forms = set()
    parsed = morph.parse(lemma)[0]
    tag = parsed.tag

    try:
        for form in parsed.lexeme:
            form_tag = form.tag
            fword = form.word
            if any(c.isupper() for c in fword):
                continue

            if form_tag.POS == 'VERB' and form_tag.person and form_tag.number:
                forms.add(fword)
            elif form_tag.POS == 'VERB' and form_tag.tense == 'past':
                forms.add(fword)
            elif form_tag.POS == 'VERB' and form_tag.mood == 'impr':
                forms.add(fword)
            elif form_tag.POS == 'PRTF' or form_tag.POS == 'PRTS':
                forms.add(fword)
            elif form_tag.POS == 'GRND':
                forms.add(fword)
            elif form_tag.POS == 'INFN':
                forms.add(fword)
    except Exception:
        pass

    return list(forms)


def generate_noun_forms(lemma, morph):
    """名词：6格×单复数"""
    forms = set()
    parsed = morph.parse(lemma)[0]
    try:
        for form in parsed.lexeme:
            fword = form.word
            if any(c.isupper() for c in fword):
                continue
            tag = form.tag
            if tag.POS == 'NOUN':
                forms.add(fword)
    except Exception:
        pass
    return list(forms)


def generate_adj_forms(lemma, morph):
    """形容词：常用性数格组合 + 短尾 + 比较级"""
    forms = set()
    parsed = morph.parse(lemma)[0]
    try:
        for form in parsed.lexeme:
            fword = form.word
            if any(c.isupper() for c in fword):
                continue
            tag = form.tag
            if tag.POS in ('ADJF', 'ADJS'):
                forms.add(fword)
            elif tag.POS == 'COMP':
                forms.add(fword)
    except Exception:
        pass
    return list(forms)


# ─── 主流程 ───
def main():
    print(f"[*] Loading vocabulary from {VOCAB_PATH}")
    with open(VOCAB_PATH, 'r', encoding='utf-8') as f:
        vocab = json.load(f)

    print(f"[*] Total entries: {len(vocab)}")

    # 筛选目标词性
    words_by_type = defaultdict(list)
    for entry in vocab:
        t = (entry.get('type') or '').lower().strip()
        if t not in TARGET_TYPES:
            continue
        w = (entry.get('word') or '').strip()
        if not w or is_multiple_words(w):
            continue
        words_by_type[t].append(w)

    total_included = sum(len(v) for v in words_by_type.values())
    print(f"[*] Words to process: {total_included}")
    for t in sorted(words_by_type):
        print(f"    {t}: {len(words_by_type[t])}")

    print("[*] Initializing pymorphy3...")
    morph = pm.MorphAnalyzer()

    lemma_to_forms = {}
    failed = []

    for pos_type, words in words_by_type.items():
        print(f"[*] Processing {pos_type} ({len(words)} words)...")
        for i, lemma in enumerate(words):
            if (i + 1) % 200 == 0:
                print(f"    {i + 1}/{len(words)}")

            try:
                parsed_list = morph.parse(lemma)
                if not parsed_list:
                    failed.append(lemma)
                    continue

                if pos_type in ('verb',):
                    forms = generate_verb_forms(lemma, morph)
                elif pos_type in ('noun',):
                    forms = generate_noun_forms(lemma, morph)
                elif pos_type in ('adj', 'adjective',):
                    forms = generate_adj_forms(lemma, morph)
                elif pos_type in ('adv', 'adverb',):
                    forms = [lemma]
                else:
                    forms = [lemma]

                if forms:
                    lemma_to_forms[lemma] = list(set(forms))
            except Exception as e:
                failed.append(lemma)

    print(f"[*] Lemmas with forms: {len(lemma_to_forms)}")
    print(f"[*] Failed: {len(failed)}")
    if failed[:10]:
        print(f"    First 10 failures: {failed[:10]}")

    # ─── 反转映射：变形词 → [原形数组] ───
    form_to_lemmas = defaultdict(list)
    for lemma, forms in lemma_to_forms.items():
        for form in forms:
            form_to_lemmas[form].append(lemma)

    def sort_by_score(lemmas):
        def get_score(l):
            try:
                p = morph.parse(l)
                return p[0].score if p else 0.0
            except Exception:
                return 0.0
        return sorted(lemmas, key=get_score, reverse=True)

    # ─── Ё/Е 双写 ───
    extra_entries = {}
    for form_key, lemmas in form_to_lemmas.items():
        if 'ё' in form_key:
            ek = form_key.replace('ё', 'е')
            existing = extra_entries.get(ek, [])
            for l in lemmas:
                if l not in existing:
                    existing.append(l)
            extra_entries[ek] = existing
        if 'Ё' in form_key:
            ek = form_key.replace('Ё', 'е')
            existing = extra_entries.get(ek, [])
            for l in lemmas:
                if l not in existing:
                    existing.append(l)
            extra_entries[ek] = existing

    for ek, lemmas in extra_entries.items():
        if ek in form_to_lemmas:
            existing = form_to_lemmas[ek]
            for l in lemmas:
                if l not in existing:
                    existing.append(l)
        else:
            form_to_lemmas[ek] = lemmas

    # ─── 构建输出 ───
    output_map = {}
    for form_key, lemmas in form_to_lemmas.items():
        nk = normalize_word_for_key(form_key)
        if not nk:
            continue
        unique_lemmas = list(dict.fromkeys(lemmas))
        sorted_lemmas = sort_by_score(unique_lemmas)
        normalized_lemmas = [normalize_word_for_key(l) for l in sorted_lemmas]
        normalized_lemmas = [l for l in normalized_lemmas if l]
        normalized_lemmas = list(dict.fromkeys(normalized_lemmas))
        if normalized_lemmas:
            output_map[nk] = normalized_lemmas

    final_map = {}
    for form_key, lemmas in output_map.items():
        unique = list(dict.fromkeys(lemmas))
        if unique:
            final_map[form_key] = unique

    print(f"[*] Final map entries: {len(final_map)}")
    multi = sum(1 for v in final_map.values() if len(v) > 1)
    print(f"[*] Homograph entries (multi-value): {multi}")

    # 验证金样例
    golden = {
        'написанного': 'написать',         # PRTF form → verb lemma
        'видел': 'видеть',                 # past tense → verb lemma
        'читаю': 'читать',                 # present tense → verb lemma
        'берегу': ['берег', 'беречь'],     # homograph (noun + verb)
        'книги': 'книга',                  # noun genitive → nom
        'хорошего': 'хороший',             # adjective genitive → nom
    }
    print("\n[*] Golden sample verification:")
    for form, expected in golden.items():
        actual = final_map.get(form)
        if isinstance(expected, list):
            ok = actual and all(e in actual for e in expected)
        else:
            ok = actual and expected in actual
        status = 'OK' if ok else 'FAIL'
        print(f"    {form} -> {actual} ({status})")

    # ─── 写入文件 ───
    output = {
        "version": 1,
        "generated": "2026-06-26",
        "count": len(final_map),
        "map": final_map
    }

    print(f"\n[*] Writing {OUTPUT_MAP}")
    with open(OUTPUT_MAP, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = os.path.getsize(OUTPUT_MAP) / (1024 * 1024)
    print(f"    File size: {size_mb:.1f} MB")

    version_info = {
        "version": 1,
        "updated": "2026-06-26",
        "description": "B2核心词库 4,100 词形态映射表"
    }
    print(f"[*] Writing {OUTPUT_VER}")
    with open(OUTPUT_VER, 'w', encoding='utf-8') as f:
        json.dump(version_info, f, ensure_ascii=False)

    print("\n[DONE]")


if __name__ == '__main__':
    main()
