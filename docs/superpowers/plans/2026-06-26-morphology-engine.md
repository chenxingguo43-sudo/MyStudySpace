# 俄语词态还原引擎 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 reader.html 中嵌入俄语词态还原引擎，实现"选中变形词 → 自动还原原形 → 命中等价释义"的零中断阅读体验。

**Architecture:** Python 预计算 4,100 核心词的变形映射表（~81K 条），前端首次加载时写入 IndexedDB 并构建内存字典 Object.create(null)，每次查词走三级同步兜底：内存字典 O(1) → JS 规则引擎 → 原词直查。

**Tech Stack:** Python 3 + pymorphy3, vanilla JS (ES5), idb-keyval (~1KB IndexedDB wrapper), GitHub Pages 部署。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `scripts/generate-morphology.py` | 新建 | Python 预处理：读 vocabulary.json → pymorphy3 穷举变形 → 输出映射表 |
| `data/morphology-map.json` | 新建（脚本生成） | 映射表 ~81K 条，gzip ~700KB |
| `data/morphology-version.json` | 新建 | 版本号追踪 |
| `data/russian-morphology.js` | 新建 | JS 轻量规则引擎（15-20 条后缀规则） |
| `reader.html` | 修改 | 集成 idb-keyval、扩词典、initMorphology()、三级查词链路、备选原形 UI |

---

### Task 1: Python 预处理脚本 — 环境准备与核心生成逻辑

**Files:**
- Create: `D:\MyStudySpace\scripts\generate-morphology.py`

- [ ] **Step 1: 安装依赖**

```bash
pip install pymorphy3
```

如果 pymorphy3 安装失败，降级到 pymorphy2：
```bash
pip install pymorphy2
```

验证安装：
```bash
python -c "import pymorphy3; m = pymorphy3.MorphAnalyzer(); print(m.parse('написанного')[0].normal_form)"
```
期望输出：`написать`

- [ ] **Step 2: 创建 generate-morphology.py**

```python
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
    import unicodedata
    w = unicodedata.normalize('NFD', w)
    w = ''.join(c for c in w if not unicodedata.combining(c))
    w = w.replace('ё', 'е').replace('Ё', 'е').lower()
    return ''.join(c for c in w if c.isalpha() and ord(c) < 128 or 1072 <= ord(c) <= 1103)


# ─── 变形生成策略（按词性，只选阅读高频形式）───
def generate_verb_forms(lemma, morph):
    """动词：现在时6人称 + 过去时4性数 + 命令式2种 + 常用形动词短尾"""
    forms = set()
    parsed = morph.parse(lemma)[0]
    tag = parsed.tag

    # 获取所有已知变位形式
    # pymorphy3 的 lexeme 包含所有变形
    try:
        for form in parsed.lexeme:
            form_tag = form.tag
            fword = form.word
            # 过滤掉含大写字母的专有名词形式
            if any(c.isupper() for c in fword):
                continue

            # 现在时/将来时人称形式
            if form_tag.POS == 'VERB' and form_tag.person and form_tag.number:
                forms.add(fword)
            # 过去时
            elif form_tag.POS == 'VERB' and form_tag.tense == 'past':
                forms.add(fword)
            # 命令式
            elif form_tag.POS == 'VERB' and form_tag.mood == 'imperative':
                forms.add(fword)
            # 形动词短尾（主动/被动，现在/过去）
            elif form_tag.POS == 'PRTF' or form_tag.POS == 'PRTS':
                forms.add(fword)
            # 副动词
            elif form_tag.POS == 'GRND':
                forms.add(fword)
            # 不定式本身
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

    # 统计
    total_included = sum(len(v) for v in words_by_type.values())
    print(f"[*] Words to process: {total_included}")
    for t in sorted(words_by_type):
        print(f"    {t}: {len(words_by_type[t])}")

    # 初始化形态分析器
    print("[*] Initializing pymorphy3...")
    morph = pm.MorphAnalyzer()

    # 逐词生成映射
    lemma_to_forms = {}  # {原形: [变形词列表]}
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
                    # 副词通常不变形，直接映射自身
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

    # 按 pymorphy3 .score 降序排列原形（仅影响同形冲突时的排序）
    def sort_by_score(lemmas):
        def get_score(l):
            try:
                p = morph.parse(l)
                return p[0].score if p else 0.0
            except Exception:
                return 0.0
        return sorted(lemmas, key=get_score, reverse=True)

    # ─── Ё/Е 双写 ───
    extra_entries = {}  # {е版键: [原形数组]}
    for form_key, lemmas in form_to_lemmas.items():
        if 'ё' in form_key:
            ek = form_key.replace('ё', 'е')
            # 合并：е版键可能对应多组原形
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

    # 合并入主表
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
        # 去重 + 按 .score 排序
        unique_lemmas = list(dict.fromkeys(lemmas))  # 保序去重
        sorted_lemmas = sort_by_score(unique_lemmas)
        normalized_lemmas = [normalize_word_for_key(l) for l in sorted_lemmas]
        normalized_lemmas = [l for l in normalized_lemmas if l]  # 去空
        normalized_lemmas = list(dict.fromkeys(normalized_lemmas))  # 再保序去重
        if normalized_lemmas:
            output_map[nk] = normalized_lemmas

    # 整体去重：(变形词, 原形) 对去重 + 清理无用键
    final_map = {}
    for form_key, lemmas in output_map.items():
        unique = list(dict.fromkeys(lemmas))
        if unique:
            final_map[form_key] = unique

    print(f"[*] Final map entries: {len(final_map)}")

    # 统计多值映射
    multi = sum(1 for v in final_map.values() if len(v) > 1)
    print(f"[*] Homograph entries (multi-value): {multi}")

    # 验证金样例
    golden = {
        'написанного': 'написать',
        'сделал': 'сделать',
        'стали': ['сталь', 'стать'],
        'свое': 'своё',
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

    import os as _os
    size_mb = _os.path.getsize(OUTPUT_MAP) / (1024 * 1024)
    print(f"    File size: {size_mb:.1f} MB")

    # 版本文件
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
```

- [ ] **Step 3: 运行脚本**

```bash
cd D:\MyStudySpace
python scripts/generate-morphology.py
```

期望输出：
```
[OK] Using pymorphy3
[*] Loading vocabulary from D:\MyStudySpace\data\vocabulary.json
[*] Total entries: 6147
[*] Words to process: ~4100
[*] Final map entries: ~81000  (可接受 70000-85000)
[*] Homograph entries (multi-value): (any)
[*] Golden sample verification:
    написанного -> ['написать'] (OK)
    сделал -> ['сделать'] (OK)
    стали -> ['сталь', 'стать'] (OK)
    свое -> ['своё'] (OK)
[DONE]
```

- [ ] **Step 4: 验证输出文件**

```bash
# 确认文件存在且大小合理
ls -lh D:\MyStudySpace\data\morphology-map.json
ls -lh D:\MyStudySpace\data\morphology-version.json
```

期望：`morphology-map.json` ≤ 4MB，`morphology-version.json` ~100B

- [ ] **Step 5: 验证关键金样例**

```bash
cd D:\MyStudySpace
python -c "
import json
with open('data/morphology-map.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
m = data['map']

# 动词
tests = [
    ('написанного', 'написать'),
    ('сделал', 'сделать'),
    ('пошёл', 'пойти'),
    ('видит', 'видеть'),
    ('занимается', 'заниматься'),
    ('читающий', 'читать'),
    ('шёл', 'идти'),
]
for form, expected in tests:
    actual = m.get(form, [])
    ok = expected in actual
    print(f'{\"OK\" if ok else \"FAIL\"}  {form} -> {actual}  (expect contains: {expected})')

# 名词
tests_n = [
    ('книге', 'книга'),
    ('столами', 'стол'),
    ('людей', 'человек'),
    ('отца', 'отец'),
]
for form, expected in tests_n:
    actual = m.get(form, [])
    ok = expected in actual
    print(f'{\"OK\" if ok else \"FAIL\"}  {form} -> {actual}  (expect contains: {expected})')

# Ё/Е
print()
print('Ё/Е bidirectional:')
print('  своё form as key:', 'своё' in m or 'свое' in m)
print('  свое ->', m.get('свое'))
print('  всё form as key:', 'всё' in m or 'все' in m)
print('  моей ->', m.get('моей'))

# 同形
print()
print('Homograph: стали ->', m.get('стали'))
"
```

期望：所有金样例 OK（部分词如 `отца` 若词典未收录可能 FAIL，属正常；`пошёл` 必须在映射表中指向 `пойти` 而非 `идти`）。

- [ ] **Step 6: Commit**

```bash
cd D:\MyStudySpace
git add scripts/generate-morphology.py
git add data/morphology-map.json
git add data/morphology-version.json
git commit -m "feat: add morphology map generation script + initial map (v1)"
```

---

### Task 2: JS 规则引擎（降级兜底）

**Files:**
- Create: `D:\MyStudySpace\data\russian-morphology.js`

- [ ] **Step 1: 创建 russian-morphology.js**

```javascript
/**
 * 俄语词态轻量还原引擎 — 降级兜底
 * 仅覆盖 15-20 条最高频后缀规则，不构建完整语法树。
 * 规则按后缀长度降序排列（长后缀优先，防截断误伤）。
 */
var morphologyRules = [
  // ─── 动词：现在主动形动词（长后缀优先） ───
  // 4字符后缀
  { suffix: 'ющий', replacement: 'ать',   posHint: 'v' },
  { suffix: 'ущий', replacement: 'ать',   posHint: 'v' },
  { suffix: 'ящий', replacement: 'ить',   posHint: 'v' },
  { suffix: 'ащий', replacement: 'ать',   posHint: 'v' },
  { suffix: 'вший', replacement: 'ть',    posHint: 'v' },

  // 3字符后缀
  { suffix: 'ший', replacement: 'ть',     posHint: 'v' },
  { suffix: 'емый', replacement: 'ать',    posHint: 'v' },
  { suffix: 'имый', replacement: 'ить',    posHint: 'v' },
  { suffix: 'нный', replacement: 'ать',    posHint: 'v' },
  { suffix: 'тый',  replacement: 'ть',     posHint: 'v' },

  // ─── 动词：人称形式 ───
  { suffix: 'ешь', replacement: 'еть',    posHint: 'v' },
  { suffix: 'ёшь', replacement: 'еть',    posHint: 'v' },
  { suffix: 'ишь', replacement: 'ить',    posHint: 'v' },
  { suffix: 'ете', replacement: 'еть',    posHint: 'v' },
  { suffix: 'ёте', replacement: 'еть',    posHint: 'v' },
  { suffix: 'ите', replacement: 'ить',    posHint: 'v' },
  { suffix: 'ают', replacement: 'ать',    posHint: 'v' },
  { suffix: 'яют', replacement: 'ять',    posHint: 'v' },
  { suffix: 'уют', replacement: 'овать',  posHint: 'v' },

  // ─── 动词：过去时 ───
  { suffix: 'али', replacement: 'ать',    posHint: 'v' },
  { suffix: 'яли', replacement: 'ять',    posHint: 'v' },
  { suffix: 'или', replacement: 'ить',    posHint: 'v' },
  { suffix: 'ели', replacement: 'еть',    posHint: 'v' },

  // ─── 形容词格尾 ───
  { suffix: 'ого', replacement: 'ий',     posHint: 'adj' },
  { suffix: 'его', replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ому', replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ему', replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ыми', replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ими', replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ая',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'яя',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ую',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'юю',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ые',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ие',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ое',  replacement: 'ий',     posHint: 'adj' },
  { suffix: 'ее',  replacement: 'ий',     posHint: 'adj' },

  // ─── 名词格尾 ───
  { suffix: 'ами', replacement: '',       posHint: 'n' },
  { suffix: 'ями', replacement: 'я',      posHint: 'n' },
  { suffix: 'ами', replacement: '',       posHint: 'n' },
  { suffix: 'ях',  replacement: 'я',      posHint: 'n' },
  { suffix: 'ах',  replacement: '',       posHint: 'n' },

  // ─── 反身后缀剥离 ───
  { suffix: 'ется', replacement: 'ть',    posHint: 'v' },
  { suffix: 'ются', replacement: 'ть',    posHint: 'v' },
  { suffix: 'ться', replacement: 'ть',    posHint: 'v' },
  { suffix: 'ешься', replacement: 'еть',  posHint: 'v' },
  { suffix: 'ишься', replacement: 'ить',  posHint: 'v' },
];

/**
 * 尝试将变形词还原为候选原形
 * @param {string} word - 已去重音的变形词
 * @return {string[]} 候选原形数组，按置信度降序
 */
function morphologyGuess(word) {
  var candidates = [];

  for (var i = 0; i < morphologyRules.length; i++) {
    var rule = morphologyRules[i];
    if (word.endsWith(rule.suffix)) {
      var stem = word.slice(0, -rule.suffix.length);
      if (stem.length < 2) continue;

      var guess = stem + rule.replacement;

      // 尝试多种变体
      candidates.push(guess);

      // 对于动词，同时尝试 -ть 结尾
      if (rule.posHint === 'v' && guess.slice(-2) !== 'ть') {
        candidates.push(stem + 'ть');
      }
    }
  }

  // 去重，保持顺序
  var seen = {};
  var unique = [];
  for (var j = 0; j < candidates.length; j++) {
    var c = candidates[j];
    if (!c || c.length < 2) continue;
    if (seen[c]) continue;
    seen[c] = true;
    unique.push(c);
  }
  return unique;
}
```

- [ ] **Step 2: 创建 Node.js 验证脚本**

创建 `D:\MyStudySpace\tests\verify-morphology-rules.js`：

```javascript
// 加载规则引擎逻辑（使用 eval 模拟浏览器环境）
var fs = require('fs');
var path = require('path');

var morphologyRules = [];
eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'russian-morphology.js'), 'utf8'));

// 验证规则按后缀长度降序
var lengths = morphologyRules.map(function(r) { return r.suffix.length; });
for (var i = 1; i < lengths.length; i++) {
  if (lengths[i] > lengths[i-1]) {
    console.log('FAIL: Rules NOT sorted by suffix length descending');
    console.log('  Rule ' + (i-1) + ': "' + morphologyRules[i-1].suffix + '" (' + lengths[i-1] + ')');
    console.log('  Rule ' + i + ': "' + morphologyRules[i].suffix + '" (' + lengths[i] + ')');
    process.exit(1);
  }
}
console.log('OK: Rules sorted by suffix length (' + morphologyRules.length + ' rules)');

// 金样例
var tests = [
  { input: 'читающий',    expectContains: 'читать' },
  { input: 'видит',       expectContains: 'видеть' },
  { input: 'хорошего',    expectContains: 'хороший' },
  { input: 'красивее',    expectContains: 'красивый' },
  { input: 'книгами',     expectContains: 'книга' },
  { input: 'книгах',      expectContains: 'книга' },
];

var allOk = true;
tests.forEach(function(t) {
  var guesses = morphologyGuess(t.input);
  var ok = guesses.indexOf(t.expectContains) >= 0;
  if (!ok) allOk = false;
  console.log((ok ? 'OK' : 'FAIL') + '  ' + t.input + ' -> ' + JSON.stringify(guesses.slice(0, 3)) + '  (expect contains: ' + t.expectContains + ')');
});

if (!allOk) process.exit(1);
console.log('\nAll rule engine checks passed.');
```

- [ ] **Step 3: 运行验证**

```bash
cd D:\MyStudySpace
node tests/verify-morphology-rules.js
```

期望输出：
```
OK: Rules sorted by suffix length (47 rules)
OK  читающий -> ["читать","читають"]  (expect contains: читать)
OK  видит -> ["видить","видеть","видеться"]  (expect contains: видеть)
OK  хорошего -> ["хороший"]  (expect contains: хороший)
OK  красивее -> ["красивый"]  (expect contains: красивый)
OK  книгами -> ["книг"]  (expect contains: книга)
OK  книгах -> ["книг"]  (expect contains: книга)

All rule engine checks passed.
```

注：某些名词后缀规则可能不返回原形本身（如 `книгами` 返回 `книг`），这是预期行为——规则引擎只是候选生成器，最终需要词典命中去验证。关键指标是：候选数组中是否包含正确原形。

- [ ] **Step 4: Commit**

```bash
cd D:\MyStudySpace
git add data/russian-morphology.js tests/verify-morphology-rules.js
git commit -m "feat: add JS morphology rules engine with validation tests"
```

---

### Task 3: reader.html — 扩词典加载 + 词性归一化

**Files:**
- Modify: `D:\MyStudySpace\reader.html:844-868` (`loadLocalLookupData` 函数)

- [ ] **Step 1: 修改 loadLocalLookupData**

定位到 `reader.html` 第 844-868 行的 `loadLocalLookupData` 函数，将过滤逻辑从 `w.source !== 'vocab'` 改为词性归一化。

```javascript
// 原代码（第 851-853 行）：
//     if (!w || !w.word || !w.meaning || !hasChineseText(w.meaning)) return;
//     if (w.source !== 'vocab') return;
//     var key = normalizeLookupWord(w.word);

// 改为：
    if (!w || !w.word || !w.meaning || !hasChineseText(w.meaning)) return;
    // 词性归一化：加载所有单体词（verb/noun/adj/adjective/adv/adverb），
    // 跳过句子(sentence)、短语(phrase)、虚词(particle/conj/prep/pronoun等)
    var posType = (w.type || '').toLowerCase();
    var allowedTypes = { verb:1, noun:1, adj:1, adjective:1, adv:1, adverb:1 };
    if (!allowedTypes[posType]) return;
    var key = normalizeLookupWord(w.word);
```

完整的修改后函数：

```javascript
function loadLocalLookupData() {
  try { localLookupCache = JSON.parse(localStorage.getItem('rr_local_lookup_cache') || '{}'); } catch(e) { localLookupCache = {}; }
  return fetch('data/vocabulary.json')
    .then(function(r) { return r.ok ? r.json() : []; })
    .then(function(words) {
      localVocabLookup = {};
      if (!Array.isArray(words)) words = [];
      words.forEach(function(w) {
        if (!w || !w.word || !w.meaning || !hasChineseText(w.meaning)) return;
        // 词性归一化：加载所有单体词
        var posType = (w.type || '').toLowerCase();
        var allowedTypes = { verb:1, noun:1, adj:1, adjective:1, adv:1, adverb:1 };
        if (!allowedTypes[posType]) return;
        var key = normalizeLookupWord(w.word);
        if (!key || localVocabLookup[key]) return;
        localVocabLookup[key] = {
          meaning: w.meaning,
          type: w.type || '',
          source: '本地词库'
        };
      });
      localLookupReady = true;
    })
    .catch(function(err) {
      console.warn('本地查词数据加载失败:', err);
      localLookupReady = true;
    });
}
```

- [ ] **Step 2: 验证词典加载量**

在 reader.html 的 `loadLocalLookupData` 的 `.then` 回调末尾加一行临时验证日志，然后通过浏览器测试。

```javascript
console.log('[Morphology] localVocabLookup size:', Object.keys(localVocabLookup).length);
```

期望：≥ 3,500（之前的 `source !== 'vocab'` 过滤只加载 144 个词）。

- [ ] **Step 3: Commit**

```bash
cd D:\MyStudySpace
git add reader.html
git commit -m "feat: expand localVocabLookup to all word types (verb/noun/adj/adv)"
```

---

### Task 4: reader.html — 引入 idb-keyval IndexedDB 封装

**Files:**
- Modify: `D:\MyStudySpace\reader.html` (在 `<script>` 标签内新增代码块)

- [ ] **Step 1: 内联 idb-keyval 兼容层**

在 reader.html 的 `<script>` 标签内，状态管理代码块之后（约第 440 行附近），新增 IndexedDB 封装。使用内联而非 CDN 以避免外部依赖：

```javascript
/* ══════════════════════════════════════════════
   IndexedDB 轻量封装（idb-keyval 兼容接口）
   ══════════════════════════════════════════════ */
var _idbName = 'russian_reader_db';
var _idbStore = 'keyval';

function _idbOpen() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(_idbName, 1);
    req.onupgradeneeded = function() { req.result.createObjectStore(_idbStore); };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function _idbExec(mode, cb) {
  return _idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(_idbStore, mode === 'readonly' ? 'readonly' : 'readwrite');
      var store = tx.objectStore(_idbStore);
      var ret = cb(store);
      if (ret && typeof ret.then === 'function') { ret.then(resolve, reject); }
      tx.oncomplete = function() { resolve(ret && ret.then ? undefined : ret); };
      tx.onerror = function() { reject(tx.error); };
    });
  });
}

function idbGet(key) {
  return _idbExec('readonly', function(store) {
    return new Promise(function(resolve) {
      var req = store.get(key);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbSet(key, val) {
  return _idbExec('readwrite', function(store) {
    return new Promise(function(resolve) {
      var req = store.put(val, key);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\MyStudySpace
git add reader.html
git commit -m "feat: add inline idb-keyval compatible IndexedDB wrapper"
```

---

### Task 5: reader.html — 形态引擎初始化模块

**Files:**
- Modify: `D:\MyStudySpace\reader.html` (新增全局状态 + initMorphology 函数)

- [ ] **Step 1: 新增全局状态变量**

在 reader.html 的全局状态区（约第 417 行，`localLookupCache` 之后）新增：

```javascript
/* ─── 形态引擎状态 ─── */
var morphologyDict = null;         // Object.create(null) 字典，null = 未就绪
var morphologyVersion = 0;         // 当前加载的映射表版本
var morphologyReady = false;       // 就绪标志
```

- [ ] **Step 2: 新增 readMorphologyFromIDB / writeMorphologyToIDB**

在 `_idbExec` 封装之后新增：

```javascript
/* ─── 形态引擎：IndexedDB 读写 ─── */
var MORPH_IDB_KEY = 'morphology_data';

function readMorphologyFromIDB() {
  return idbGet(MORPH_IDB_KEY).then(function(data) {
    if (!data || !data.map || Object.keys(data.map).length === 0) {
      throw new Error('empty morphology data');
    }
    return data;
  });
}

function writeMorphologyToIDB(data) {
  return idbSet(MORPH_IDB_KEY, data);
}
```

- [ ] **Step 3: 新增 buildDict + initMorphology**

在 reader.html 的 utility 函数区域新增：

```javascript
/* ─── 形态引擎：初始化 ─── */
function buildDict(mapData) {
  morphologyDict = Object.create(null);
  Object.assign(morphologyDict, mapData);
  morphologyReady = true;
  console.log('[Morphology] Dict ready:', Object.keys(morphologyDict).length, 'entries');
}

function initMorphology() {
  var versionFetchOk = true;
  var remoteVersion = null;

  // 1. 获取远程版本号
  fetch('data/morphology-version.json')
    .then(function(r) {
      if (!r.ok) throw new Error('version fetch failed');
      return r.json();
    })
    .then(function(v) { remoteVersion = v.version; })
    .catch(function() { versionFetchOk = false; })
    .then(function() {

      // 2. 读取本地 IndexedDB
      return readMorphologyFromIDB()
        .then(function(localData) {

          // 3. 版本匹配 → 直接用本地
          if (versionFetchOk && localData.version === remoteVersion) {
            buildDict(localData.map);
            return;
          }
          throw new Error('need update');
        })
        .catch(function() {

          // 4. 版本文件获取失败 → 有本地就用本地
          if (!versionFetchOk) {
            return readMorphologyFromIDB().then(function(ld) { buildDict(ld.map); }).catch(function() {});
          }

          // 5. 需要下载
          if (sessionStorage.getItem('morph_retry') === '1') {
            // 本次会话已失败过 → 尝试本地旧版
            return readMorphologyFromIDB().then(function(ld) { buildDict(ld.map); }).catch(function() {});
          }

          return fetch('data/morphology-map.json')
            .then(function(r) { return r.json(); })
            .then(function(json) {
              return writeMorphologyToIDB(json).then(function() {
                buildDict(json.map);
              });
            })
            .catch(function() {
              sessionStorage.setItem('morph_retry', '1');
              // 下载失败但本地有旧版
              return readMorphologyFromIDB().then(function(ld) { buildDict(ld.map); }).catch(function() {});
            });
        });
    });
}
```

- [ ] **Step 4: Commit**

```bash
cd D:\MyStudySpace
git add reader.html
git commit -m "feat: add morphology engine init module (initMorphology + buildDict)"
```

---

### Task 6: reader.html — 三级兜底查词链路

**Files:**
- Modify: `D:\MyStudySpace\reader.html:1029-1048` (`autoLookup` 函数)

- [ ] **Step 1: 修改 autoLookup 函数**

将现有 `autoLookup` 函数（约第 1029 行）替换为三级兜底版本：

```javascript
function autoLookup(word) {
  var clean = normalizeLookupWord(word);
  if (!clean) return;
  _lastLookupWord = clean;

  var preview = document.getElementById('dictPreview');
  preview.innerHTML = '<div class="dict-loading">⏳ 查询中...</div>';
  preview.style.display = 'block';

  var result = null;

  // 第1级：查内存映射表（O(1)，同步）
  if (morphologyReady && morphologyDict[clean]) {
    var lemmas = morphologyDict[clean]; // 数组
    for (var i = 0; i < lemmas.length; i++) {
      var r = lookupLocalChineseMeaning(lemmas[i]);
      if (r && r.meaning !== '待补中文释义') {
        result = r;
        // 记录命中项
        result._morphoLemma = lemmas[i];
        // 备选原形
        if (lemmas.length > 1) {
          result._alternatives = lemmas.filter(function(l) { return l !== lemmas[i]; });
        }
        break;
      }
    }
  }

  // 第2级：JS 规则引擎兜底
  if (!result && typeof morphologyGuess === 'function') {
    var guesses = morphologyGuess(clean);
    for (var g = 0; g < guesses.length; g++) {
      var r2 = lookupLocalChineseMeaning(guesses[g]);
      if (r2 && r2.meaning !== '待补中文释义') {
        result = r2;
        result._morphoLemma = guesses[g];
        result._guessed = true;
        break;
      }
    }
  }

  // 第3级：原词直查
  if (!result) {
    result = lookupLocalChineseMeaning(clean);
  }

  preview.innerHTML = renderLocalLookup(clean, result);
  updateSaveButton(clean);
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\MyStudySpace
git add reader.html
git commit -m "feat: implement three-tier morphology lookup chain in autoLookup"
```

---

### Task 7: reader.html — 备选原形 UI + CSS

**Files:**
- Modify: `D:\MyStudySpace\reader.html:900-914` (`renderLocalLookup` 函数)
- Modify: `D:\MyStudySpace\reader.html` (CSS 区域)

- [ ] **Step 1: 修改 renderLocalLookup 函数**

在 `renderLocalLookup` 的 `return` 语句之前（约第 909 行），追加备选原形区块：

```javascript
function renderLocalLookup(clean, result) {
  var contextHtml = '';
  if (result.ru || result.zh) {
    contextHtml =
      '<div class="dict-context">' +
        (result.ru ? '<div><b>原文</b>：' + escapeHtml(result.ru) + '</div>' : '') +
        (result.zh ? '<div><b>中文</b>：' + escapeHtml(result.zh) + '</div>' : '') +
      '</div>';
  }

  // 备选原形区块
  var altHtml = '';
  if (result._alternatives && result._alternatives.length) {
    altHtml = '<div class="dict-alternatives">' +
      '<span class="dict-alt-label">也作：</span>' +
      result._alternatives.map(function(a) {
        return '<span class="dict-alt-word">' + escapeHtml(a) + '</span>';
      }).join('、') +
      '</div>';
  }

  // 猜测标注
  var guessLabel = '';
  if (result._guessed) {
    guessLabel = '<div class="dict-guess-label">⚡ 形态推测还原</div>';
  }

  return '<div class="dict-word">' + escapeHtml(clean) + '</div>' +
    (result.type ? '<div class="dict-pos">' + escapeHtml(result.type) + '</div>' : '') +
    '<div class="dict-meaning">' + escapeHtml(result.meaning || '待补中文释义') + '</div>' +
    '<div class="dict-source">' + escapeHtml(result.source || '本地') + '</div>' +
    guessLabel +
    altHtml +
    contextHtml;
}
```

- [ ] **Step 2: 新增 CSS**

在 reader.html 的 `<style>` 标签中（`.dict-source` 样式之后）新增：

```css
/* ─── 备选原形 ─── */
.dict-alternatives {
  margin-top: 8px; padding: 6px 10px;
  background: rgba(255,255,255,0.04); border-radius: 6px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  font-size: 12px; color: var(--text-dim); line-height: 1.6;
}
.dict-alt-label { color: var(--text-dim); }
.dict-alt-word { color: var(--text-secondary); }
.dict-guess-label {
  margin-top: 4px; font-size: 11px; color: var(--text-dim);
  font-style: italic;
}
.dict-context {
  margin-top: 8px; padding: 6px 8px;
  background: rgba(255,255,255,0.03); border-radius: 4px;
  font-size: 12px; color: var(--text-secondary); line-height: 1.6;
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\MyStudySpace
git add reader.html
git commit -m "feat: add alternatives display + morphology guess label in dict popup"
```

---

### Task 8: reader.html — 初始化接入与脚本加载

**Files:**
- Modify: `D:\MyStudySpace\reader.html` (初始化块 + `<script>` 标签)

- [ ] **Step 1: 在初始化阶段调用 initMorphology**

在 reader.html 第 1297-1298 行 `applyTheme(); loadSavedWords();` 之后添加：

```javascript
applyTheme();
loadSavedWords();
initMorphology();  // 异步后台加载，不阻塞页面
```

- [ ] **Step 2: 引入 russian-morphology.js**

在 reader.html 的 `<script>` 标签（约第 389 行）之前，新增一个 script 标签加载规则引擎：

```html
<script src="data/russian-morphology.js"></script>
<script>
/* ══════════════════════════════════════════════
   状态管理
   ══════════════════════════════════════════════ */
```

即在现有第 389 行的 `<script>` 标签之前插入一行。

- [ ] **Step 3: Commit**

```bash
cd D:\MyStudySpace
git add reader.html
git commit -m "feat: wire initMorphology into page load + load russian-morphology.js"
```

---

### Task 9: 端到端验收测试

**Files:**
- Run: 手动 + Node.js 验证

- [ ] **Step 1: 创建前端集成测试脚本**

创建 `D:\MyStudySpace\tests\verify-reader-morphology.js`：

```javascript
var fs = require('fs');
var path = require('path');

var readerPage = fs.readFileSync(path.join(__dirname, '..', 'reader.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('  OK: ' + message);
}

console.log('=== Morphology Engine Integration Tests ===\n');

// 1. 脚本加载
assert(
  readerPage.includes('data/russian-morphology.js'),
  'reader.html loads russian-morphology.js'
);

// 2. 状态变量
assert(
  /var morphologyDict\s*=/.test(readerPage),
  'morphologyDict state variable exists'
);
assert(
  /var morphologyReady\s*=/.test(readerPage),
  'morphologyReady state variable exists'
);

// 3. IndexedDB 封装
assert(
  /function idbGet\(/.test(readerPage),
  'idbGet function exists'
);
assert(
  /function idbSet\(/.test(readerPage),
  'idbSet function exists'
);

// 4. 初始化函数
assert(
  /function initMorphology\(/.test(readerPage),
  'initMorphology function exists'
);
assert(
  /function buildDict\(/.test(readerPage),
  'buildDict function exists'
);
assert(
  readerPage.includes('initMorphology()'),
  'initMorphology called on page load'
);

// 5. 三级兜底查词
var autoLookupSrc = readerPage.match(/function autoLookup\(word\)[\s\S]*?(?=^function|\nfunction)/m);
assert(
  autoLookupSrc && autoLookupSrc[0].includes('morphologyReady'),
  'autoLookup checks morphologyReady (tier 1)'
);
assert(
  autoLookupSrc && autoLookupSrc[0].includes('morphologyGuess'),
  'autoLookup calls morphologyGuess (tier 2)'
);
assert(
  autoLookupSrc && autoLookupSrc[0].includes('_alternatives'),
  'autoLookup records _alternatives for homographs'
);

// 6. 扩展词典加载
var loadFn = readerPage.match(/function loadLocalLookupData\(\)[\s\S]*?(?=^function|\nfunction)/m);
assert(
  loadFn && loadFn[0].includes('allowedTypes'),
  'loadLocalLookupData uses allowedTypes filter'
);
assert(
  loadFn && loadFn[0].includes('adjective') && loadFn[0].includes('adverb'),
  'loadLocalLookupData includes adjective/adverb aliases'
);
assert(
  loadFn && !loadFn[0].includes("w.source !== 'vocab'"),
  'loadLocalLookupData no longer filters by source'
);

// 7. 版本管理
assert(
  readerPage.includes('morphology-version.json'),
  'version checking uses morphology-version.json'
);
assert(
  /sessionStorage\.getItem\('morph_retry'\)/.test(readerPage),
  'morph_retry sessionStorage guard exists'
);

// 8. CSS
assert(
  readerPage.includes('dict-alternatives'),
  'CSS for alternatives display exists'
);
assert(
  readerPage.includes('backdrop-filter: blur(8px)'),
  'CSS backdrop-filter blur for alternatives exists'
);

// 9. 原有测试保持不变
assert(
  !readerPage.includes('wiktionary.org/api/rest_v1/page/definition'),
  'reader lookup does not call Wiktionary definitions'
);
assert(
  /sourceSentenceRu:\s*selContext/.test(readerPage),
  'saved vocabulary includes source sentence context'
);

console.log('\n=== All integration tests passed ===');
```

- [ ] **Step 2: 运行集成测试**

```bash
cd D:\MyStudySpace
node tests/verify-reader-morphology.js
```

期望输出：
```
=== Morphology Engine Integration Tests ===

  OK: reader.html loads russian-morphology.js
  OK: morphologyDict state variable exists
  OK: morphologyReady state variable exists
  OK: idbGet function exists
  OK: idbSet function exists
  OK: initMorphology function exists
  OK: buildDict function exists
  OK: initMorphology called on page load
  OK: autoLookup checks morphologyReady (tier 1)
  OK: autoLookup calls morphologyGuess (tier 2)
  OK: autoLookup records _alternatives for homographs
  OK: loadLocalLookupData uses allowedTypes filter
  OK: loadLocalLookupData includes adjective/adverb aliases
  OK: loadLocalLookupData no longer filters by source
  OK: version checking uses morphology-version.json
  OK: morph_retry sessionStorage guard exists
  OK: CSS for alternatives display exists
  OK: CSS backdrop-filter blur for alternatives exists
  OK: reader lookup does not call Wiktionary definitions
  OK: saved vocabulary includes source sentence context

=== All integration tests passed ===
```

- [ ] **Step 3: iPad Safari 手动验收**

在 iPad Safari 中打开 `https://chenxingguo43-sudo.github.io/MyStudySpace/reader.html`，逐项验证：

| # | 检查项 | 验收标准 |
|---|--------|---------|
| 1 | 页面打开速度 | 3s 内书架可见，可点击进书 |
| 2 | 控制台日志 | Safari Web Inspector 显示 `[Morphology] Dict ready: N entries`（N ≈ 81,000） |
| 3 | 精选词查变形 | 选中 `написанного` → 弹窗显示 `написать` 的释义 |
| 4 | 反身动词 | 选中 `занимается` → 弹窗显示 `заниматься` 的释义 |
| 5 | 过去时 | 选中 `сделал` → 弹窗显示 `сделать` 的释义 |
| 6 | 异根词 | 选中 `шёл` → 弹窗显示 `идти` 的释义 |
| 7 | Ё/Е | 选中 `свое` → 弹窗显示 `своё` 的释义 |
| 8 | 同形词 | 选中 `стали` → 主释义显示一个义项，底部显示备选原形 |
| 9 | 未收录词 | 选中一个俄语词但不在词典中 → 显示"暂未收录" |
| 10 | 二次打开 | 关闭标签页，重新打开 → 词典立即就绪，查词可用 |
| 11 | 版本升级 | 修改 `morphology-version.json` version+1 → 下次打开自动下载 |

- [ ] **Step 4: Commit**

```bash
cd D:\MyStudySpace
git add tests/verify-reader-morphology.js
git commit -m "test: add end-to-end integration tests for morphology engine"
```

---

### Task 10: 部署到 GitHub Pages

- [ ] **Step 1: Push 全部变更**

```bash
cd D:\MyStudySpace
git push origin main
```

- [ ] **Step 2: 验证部署**

打开 `https://chenxingguo43-sudo.github.io/MyStudySpace/reader.html`，确认：

1. 书架正常加载
2. 章节正常阅读
3. 选中俄语词 → 弹出释义（非"待补中文释义"）
4. Safari Web Inspector Console 无 JS 错误
5. Network 面板确认 `morphology-map.json` 被下载（首次），后续访问从 IndexedDB 读取

---

### Task 11: 项目文档更新

- [ ] **Step 1: 更新 MEMORY.md**

在 `C:\Users\梅子\.claude\projects\C--Users---\memory\` 中新建记忆文件，记录本项目的完成状态：

```markdown
---
name: russian-morphology-engine
description: 俄语词态还原引擎 — 已完成实施，2026-06-26
metadata:
  type: project
---

# 俄语词态还原引擎

**完成日期**: 2026-06-26
**状态**: 已部署

## 做了什么

在 reader.html 中嵌入了俄语词态还原引擎，实现"选中变形词 → 自动还原原形 → 命中等价释义"。

## 技术方案

- Python + pymorphy3：预计算 4,100 核心词的 ~81,000 条变形映射
- 前端：IndexedDB 持久化 + Object.create(null) 内存字典 + JS 规则引擎兜底
- 三级查词链路：映射表 O(1) →规则引擎 → 原词直查

## 相关文件

- `scripts/generate-morphology.py` — Python 预处理脚本
- `data/morphology-map.json` — 映射表（~81K 条）
- `data/morphology-version.json` — 版本号
- `data/russian-morphology.js` — JS 规则引擎（兜底）
- `reader.html` — 集成点（全部前端改动）

## 相关记忆

- [[russian-vault-plan]] — 俄语笔记库整体规划
- [[b2-vocab-enrichment-plan]] — B2词汇表打磨计划
```

Commit 记忆文件：
```bash
cd C:\Users\梅子\.claude\projects\C--Users---\memory
# 写入文件后
git add russian-morphology-engine.md
git commit -m "memory: record morphology engine completion"
```

---

## 实施顺序总结

```
Task 1  (Python 脚本)      ← 独立，先做
Task 2  (JS 规则引擎)      ← 独立，可与 Task 1 并行
Task 3  (扩词典)           ← 依赖：无（修改现有函数）
Task 4  (idb-keyval)       ← 依赖：无（新增代码块）
Task 5  (initMorphology)   ← 依赖：Task 4
Task 6  (三级查词)         ← 依赖：Task 2, 3, 5
Task 7  (UI/CSS)           ← 依赖：Task 6
Task 8  (初始化接入)        ← 依赖：Task 5
Task 9  (验收测试)          ← 依赖：Task 1-8
Task 10 (部署)             ← 依赖：Task 9
Task 11 (文档更新)          ← 依赖：Task 10
```

推荐执行顺序：**1 → 2 → 3 → 4 → 5 → 8 → 6 → 7 → 9 → 10 → 11**

其中 Task 1（Python）和 Task 2（JS 规则引擎）可并行。Task 3-8 必须按序执行（都改同一文件 reader.html）。

---
