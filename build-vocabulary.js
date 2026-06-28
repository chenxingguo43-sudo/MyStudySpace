#!/usr/bin/env node
// build-vocabulary.js
// 扫描俄语笔记库中的 Markdown 笔记，提取词条，生成 data/vocabulary.json
//
// 数据来源：
//   1. 俄语笔记库/词汇/            → 生词卡片（word/type/meaning/...）
//   2. 俄语笔记库/B2口语素材/       → 口语语料（ru/zh/chapter/...）
//   3. 俄语笔记库/B2高频词/         → 高频词（word/frequency/...）
//
// 用法：node build-vocabulary.js

const fs = require('fs');
const path = require('path');

const VAULT = path.join(__dirname, '俄语笔记库');
const OUT_DIR = path.join(__dirname, 'data');
const OUT_FILE = path.join(OUT_DIR, 'vocabulary.json');

// ─── YAML frontmatter 解析（轻量版，不引入第三方库） ───────────────────

function parseFrontmatter(src) {
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    const yaml = m[1];
    const result = {};
    let currentKey = null;
    let inArray = false;
    let arrayItems = [];
    let inObj = false;
    let objItem = {};

    for (const rawLine of yaml.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // 数组项 "- key: val" 或 "- val"
        if (/^\s+-\s+/.test(line)) {
            const itemStr = line.replace(/^\s+-\s+/, '').trim();
            // 对象数组项：key: val
            if (itemStr.includes(':')) {
                const [k, ...rest] = itemStr.split(':');
                const v = rest.join(':').trim();
                objItem[k.trim()] = unquote(v);
                inObj = true;
            } else {
                if (inObj && Object.keys(objItem).length) {
                    arrayItems.push({ ...objItem });
                    objItem = {};
                    inObj = false;
                }
                arrayItems.push(unquote(itemStr));
            }
            inArray = true;
            continue;
        }

        // 对象数组内的续行键值对（缩进比 "- " 更深）
        // 例如 examples 数组内的 "    zh: 值"
        if (inArray && inObj && /^\s+\w[\w-]*:\s+/.test(line)) {
            const kvMatch2 = line.match(/^\s+(\w[\w-]*):\s*(.*)/);
            if (kvMatch2) {
                objItem[kvMatch2[1]] = unquote(kvMatch2[2].trim());
                continue;
            }
        }

        // 如果之前在数组中，先收尾
        if (inArray) {
            if (inObj && Object.keys(objItem).length) {
                arrayItems.push({ ...objItem });
                objItem = {};
                inObj = false;
            }
            if (currentKey) result[currentKey] = arrayItems;
            arrayItems = [];
            inArray = false;
        }

        // 普通键值对 "key: value"
        const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
        if (kvMatch) {
            currentKey = kvMatch[1];
            const val = kvMatch[2].trim();
            if (val === '' || val === '|' || val === '>') {
                result[currentKey] = '';
            } else if (val.startsWith('[') && val.endsWith(']')) {
                result[currentKey] = parseInlineArray(val);
            } else {
                result[currentKey] = unquote(val);
            }
            continue;
        }

        // 多行字符串续行（缩进的非键值行）
        if (currentKey && /^\s+/.test(line) && !inArray) {
            const existing = result[currentKey];
            if (typeof existing === 'string') {
                result[currentKey] = existing + ' ' + trimmed;
            }
        }
    }

    // 收尾最后一个数组
    if (inArray && currentKey) {
        if (inObj && Object.keys(objItem).length) {
            arrayItems.push({ ...objItem });
        }
        result[currentKey] = arrayItems;
    }

    return result;
}

function parseInlineArray(s) {
    // 解析 ["a", "b"] 或 [a, b] 格式
    s = s.trim();
    if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
    if (!s.trim()) return [];
    // 按逗号分割，但要注意引号内的逗号
    const items = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inQuote) {
            if (c === quoteChar) { inQuote = false; }
            else { current += c; }
        } else {
            if (c === '"' || c === "'") { inQuote = true; quoteChar = c; }
            else if (c === ',') { items.push(current.trim()); current = ''; }
            else { current += c; }
        }
    }
    if (current.trim()) items.push(current.trim());
    return items.map(unquote);
}

function unquote(s) {
    if (typeof s !== 'string') return s;
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    // 布尔
    if (s === 'true') return true;
    if (s === 'false') return false;
    // 数字
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
    return s;
}

// ─── 文件扫描 ────────────────────────────────────────────────────────

function walkMd(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // 跳过非内容目录
            if (['.obsidian', '.claude', '.claudian', '.stfolder', '.trash',
                 '模板', '每日练习', '考试词汇表', '语法', 'wiki', 'raw',
                 'scripts', '附件'].includes(entry.name)) continue;
            results = results.concat(walkMd(full));
        } else if (entry.name.endsWith('.md') && entry.name !== '章节索引.md') {
            results.push(full);
        }
    }
    return results;
}

// ─── type 字段规范化 ────────────────────────────────────────────────────
function normalizeType(type) {
  if (!type) return 'vocab';
  const map = {
    'adj': 'adjective',
    'adv': 'adverb',
    'n': 'noun',
    'v': 'verb',
    '高频词': 'vocab',
    'prep': 'preposition',
    'conj': 'conjunction',
    '小说': 'vocab',
  };
  return (map[type] || type).toLowerCase();
}

// ─── 条目提取 ────────────────────────────────────────────────────────

function extractVocab(file) {
    const src = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(src);
    const rel = path.relative(VAULT, file).replace(/\\/g, '/');

    // 词汇/ 目录：生词卡片
    if (rel.startsWith('词汇/')) {
        if (!fm.word || !fm.meaning) return null;
        const dirParts = rel.split('/');
        const chapter = dirParts.length > 2 ? dirParts[1] : '';
        const entry = {
            id: rel.replace(/\.md$/, ''),
            word: normalizeStress(String(fm.word)),
            meaning: normalizeStress(String(fm.meaning)),
            extra: '',
            examples: normalizeExamples(fm.examples),
            type: normalizeType(fm.type || ''),
            source: 'vocab',
            chapter: chapter,
            section: '',
            theme: fm.theme || '',
            tags: normalizeTags(fm.tags),
            mastery: typeof fm.mastery === 'number' ? fm.mastery : 1,
            gender: fm.gender || '',
            aspect: fm.aspect || '',
            file: rel
        };
        // 提取语法相关字段
        if (fm.case_gov) entry.case_gov = normalizeStress(String(fm.case_gov));
        if (fm.conj_pattern) entry.conj_pattern = normalizeStress(String(fm.conj_pattern));
        if (fm.pair) entry.pair = normalizeStress(String(fm.pair));
        if (fm.short_form) entry.short_form = normalizeStress(String(fm.short_form));
        if (fm.morphology) entry.morphology = String(fm.morphology);
        if (fm.animate !== undefined) entry.animate = fm.animate;
        // 从 body 提取变位/变格表格
        const grammarTable = extractGrammarTable(src);
        if (grammarTable) entry.grammarTable = grammarTable;
        const rich = extractRichVocabFields(src);
        if (rich.detailZh) entry.detailZh = rich.detailZh;
        if (rich.collocations && rich.collocations.length) entry.collocations = rich.collocations;
        return entry;
    }

    // B2口语素材/ 目录：口语语料
    if (rel.startsWith('B2口语素材/')) {
        if (!fm.ru) return null;
        let word = String(fm.ru);
        let meaning = fm.zh || '';
        const section = fm.section || '';
        const chapter = fm.chapter || '';

        // 正反面检测：如果 word（ru字段）没有俄语字母，说明正反面写反了
        const wordHasCyrillic = /[а-яА-ЯёЁ]/.test(word);
        const meaningHasCyrillic = /[а-яА-ЯёЁ]/.test(meaning);
        if (!wordHasCyrillic && meaningHasCyrillic) {
            // 翻转：把俄语放到正面
            const tmp = word;
            word = meaning;
            meaning = tmp;
        } else if (!wordHasCyrillic && !meaningHasCyrillic) {
            // 两边都没俄语，跳过这条垃圾数据
            return null;
        }

        // 修复 meaning 是标签/序号而非翻译的情况
        const extraStr = fm.extra || '';
        if (meaning.length < 4 && extraStr.length >= meaning.length) {
            meaning = extraStr;
        }
        // 如果 meaning 是纯数字（文件序号泄露），强制使用 extra
        if (/^\d+$/.test(meaning) && extraStr) {
            meaning = extraStr;
        }

        // 卡类型：tip=技巧/指令, sentence=对话/句型, vocab=词汇小灶
        let cardType = 'sentence';
        const secLC = section.toLowerCase();
        if (secLC.includes('技巧') || secLC.includes('小贴士') || secLC.includes('练习计划')) {
            cardType = 'tip';
        } else if (secLC.includes('词汇小灶')) {
            cardType = 'vocab';
        } else if (secLC.includes('重音') || secLC.includes('功能句')) {
            cardType = 'tip';
        }

        return {
            id: rel.replace(/\.md$/, ''),
            word: normalizeStress(word),
            meaning: normalizeStress(meaning),
            extra: normalizeStress(fm.extra || ''),
            examples: [],
            type: cardType,
            source: 'b2',
            chapter: chapter,
            section: section,
            theme: '',
            tags: normalizeTags(fm.tags),
            mastery: typeof fm.mastery === 'number' ? fm.mastery : 1,
            gender: '',
            aspect: '',
            file: rel
        };
    }

    // 小说词汇/ 目录：从阅读器保存的生词
    if (rel.startsWith('小说词汇/')) {
        if (!fm.word) return null;
        const source = fm.source || '';
        const chapter = source.replace(/\s*第\d+章\s*/, '').trim() || '小说';
        // 从 markdown body 提取引用块作为例句上下文
        const ctxMatch = src.match(/^>\s*(.+)$/m);
        const novExamples = ctxMatch ? [{ ru: normalizeStress(ctxMatch[1].trim()), zh: '' }] : [];
        return {
            id: rel.replace(/\.md$/, ''),
            word: normalizeStress(String(fm.word)),
            meaning: normalizeStress(String(fm.meaning || '')),
            extra: source ? '来源: ' + source : '',
            examples: novExamples,
            type: normalizeType('小说'),
            source: 'novel',
            chapter: chapter,
            section: '',
            theme: '',
            tags: normalizeTags(fm.tags),
            mastery: typeof fm.mastery === 'number' ? fm.mastery : 0,
            gender: '',
            aspect: '',
            file: rel
        };
    }

    if (rel.startsWith('B2高频词/')) {
        if (!fm.word) return null;
        const wordStr = String(fm.word).trim();
        // 从文件 body 提取例句和常见形式
        const examples = extractExamplesFromBody(src);
        const forms = extractFormsFromBody(src);
        const stem = fm.stem || '';
        const freq = fm.frequency || 0;
        var extraParts = [];
        if (stem && stem !== wordStr) extraParts.push('词根: ' + stem);
        if (freq) extraParts.push('频率: ' + freq);
        // 修复 word === meaning 问题
        let meaning = forms || '';
        if (!meaning || meaning === wordStr) {
            // 尝试从 frontmatter 获取
            meaning = fm.meaning || '';
        }
        if (!meaning || meaning === wordStr) {
            // 尝试从第一个例句的中文翻译获取
            if (examples.length > 0 && examples[0].zh) {
                meaning = examples[0].zh.slice(0, 30);
            }
        }
        if (!meaning || meaning === wordStr) {
            meaning = '高频词'; // 最终兜底
        }
        return {
            id: rel.replace(/\.md$/, ''),
            word: normalizeStress(wordStr),
            meaning: normalizeStress(meaning),
            extra: normalizeStress(extraParts.join(' | ')),
            examples: examples,
            type: normalizeType('高频词'),
            source: 'freq',
            chapter: 'B2高频词',
            section: '',
            theme: '',
            tags: normalizeTags(fm.tags),
            mastery: 1,
            gender: '',
            aspect: '',
            file: rel
        };
    }

    return null;
}

function normalizeTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map(String);
    return [String(tags)];
}

function normalizeExamples(ex) {
    if (!ex) return [];
    if (!Array.isArray(ex)) return [];
    return ex.filter(e => e && (e.ru || e.zh)).map(e => ({
        ru: normalizeStress(e.ru || ''),
        zh: e.zh || ''
    }));
}

// ─── 重音标记归一化 ──────────────────────────────────────────────────
// 在俄语上下文中：
// 1. 将 Latin 同形字母（OCR/打字错误）→ Cyrillic 正确字母
// 2. 将预组合拉丁带重音字母 → Cyrillic 基础字母 + U+0301
const ACUTE = '́';
// Latin 同形字母 → Cyrillic（仅在含俄语的文本中转换）
// Latin 同形小写字母 → Cyrillic（仅在含俄语的文本中，且只转小写）
const LOOKALIKE = {
    'a':'а','c':'с','e':'е','o':'о','p':'р','x':'х','y':'у',
    'r':'р','n':'н','m':'м','v':'в','d':'д','g':'г',
    'k':'к','l':'л','h':'н','i':'и','s':'ѕ','t':'т','u':'у','z':'з',
};
// 不用正则预过滤，逐字符查 LOOKALIKE 表即可
const LAT_ACCENT_TO_CYR = {
    'á':'а','é':'е','í':'и','ó':'о','ú':'у','ý':'ы',
    'Á':'А','É':'Е','Í':'И','Ó':'О','Ú':'У','Ý':'Ы',
    'à':'а','è':'е','ì':'и','ò':'о','ù':'у',
    'À':'А','È':'Е','Ì':'И','Ò':'О','Ù':'У',
    'ä':'я','ë':'е','ï':'и','ö':'о','ü':'у',
    'Ä':'Я','Ë':'Е','Ï':'И','Ö':'О','Ü':'У',
};
const LAT_ACCENT_RE = /[áéíóúýÁÉÍÓÚÝàèìòùÀÈÌÒÙäëïöüÄËÏÖÜ]/g;
function hasCyrillic(s) { return /[а-яА-ЯёЁ]/.test(s); }
function normalizeStress(s) {
    if (!s) return '';
    if (!hasCyrillic(s)) return s;
    let result = '';
    for (let i = 0; i < s.length; i++) {
        let ch = s[i];
        // 1) 预组合拉丁重音字母 → Cyrillic + 组合锐音符
        if (LAT_ACCENT_TO_CYR[ch]) {
            result += LAT_ACCENT_TO_CYR[ch] + ACUTE;
            continue;
        }
        // 2) Latin 同形字母 → Cyrillic
        if (LOOKALIKE[ch]) {
            result += LOOKALIKE[ch];
            continue;
        }
        result += ch;
    }
    return result;
}

function extractSection(src, title) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('##\\s*(?:[^\\r\\n#]*?\\s*)?' + escaped + '\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s|\\r?\\n---|$)');
    const m = src.match(re);
    return m ? m[1].trim() : '';
}

function isUsefulRichText(text) {
    if (!text) return false;
    const compact = String(text).replace(/\s+/g, '');
    if (!compact) return false;
    return !/(待补充|待AI补充|暂无|无常见|无固定|无特别|无特殊)/.test(compact);
}

function cleanRichLine(line) {
    return String(line || '')
        .replace(/^\s*[-*+]\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^中文解释[:：]\s*/, '')
        .replace(/^俄语解释[:：]\s*/, '')
        .trim();
}

function extractDetailZh(src) {
    const section = extractSection(src, '详细释义');
    if (!section) return '';
    const lines = section.split(/\r?\n/)
        .map(cleanRichLine)
        .filter(function(line) {
            return line && !line.startsWith('|') && !/^[-:|]+$/.test(line);
        });
    const markedZh = lines.filter(function(line) {
        return line.indexOf('中文解释') >= 0;
    }).map(function(line) {
        return line.replace(/^.*?中文解释[:：]\s*/, '').trim();
    });
    const sourceLines = markedZh.length ? markedZh : lines;
    const zhLines = sourceLines.filter(function(line) {
        return /[\u4e00-\u9fff]/.test(line) && line.indexOf('俄语解释') < 0;
    });
    const detail = zhLines.join(' ').replace(/\s+/g, ' ').trim();
    return isUsefulRichText(detail) ? detail.slice(0, 260) : '';
}

function extractCollocations(src) {
    const section = extractSection(src, '补充搭配');
    if (!section) return [];
    const rows = [];
    section.split(/\r?\n/).forEach(function(rawLine) {
        const line = rawLine.trim();
        if (!line.startsWith('|') || !line.endsWith('|')) return;
        if (/^\|?\s*-+\s*\|/.test(line)) return;
        const cells = line.split('|').slice(1, -1).map(function(cell) {
            return cell.replace(/\*\*/g, '').trim();
        });
        if (cells.length < 2) return;
        if (cells.some(function(cell) { return /搭配|例句|翻译/.test(cell); })) return;
        const phrase = cells[0] || '';
        const ru = cells[1] || '';
        const zh = cells[2] || '';
        const joined = [phrase, ru, zh].join(' ');
        if (!isUsefulRichText(joined)) return;
        rows.push({
            phrase: normalizeStress(phrase),
            ru: normalizeStress(ru),
            zh: zh
        });
    });
    return rows.slice(0, 5);
}

function extractRichVocabFields(src) {
    return {
        detailZh: extractDetailZh(src),
        collocations: extractCollocations(src)
    };
}


function extractFormsFromBody(src) {
    const m = src.match(/##\s*常见形式([\s\S]*?)(?=\n##\s|\n---|$)/);
    if (!m) return '';
    return m[1].split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l && !l.startsWith('#'); }).join(', ');
}

function extractExamplesFromBody(src) {
    const examples = [];
    // 匹配 "## 例句" 部分
    const exSection = src.match(/##\s*例句([\s\S]*?)(?=\n##\s|\n---|$)/);
    if (!exSection) return examples;
    const text = exSection[1];
    // 匹配 **Ru:** ... **Zh:** ... 对（可能跨行）
    const ruBlocks = text.split(/[-•]\s*\*\*Ru:\*\*/);
    for (let i = 1; i < ruBlocks.length; i++) {
        const block = ruBlocks[i];
        const zhSplit = block.split(/\*\*Zh:\*\*/);
        const ru = normalizeStress(zhSplit[0].trim().replace(/\n\s*/g, ' '));
        const zh = zhSplit[1] ? zhSplit[1].trim().replace(/\n\s*/g, ' ') : '';
        if (ru) examples.push({ ru, zh });
    }
    return examples;
}

// 从 body 中提取 变位/变格/接格 表格
function extractGrammarTable(src) {
    const section = src.match(/##\s*📐\s*变位\/变格\/接格([\s\S]*?)(?=\n##\s|\n---|$)/);
    if (!section) return '';
    const text = section[1].trim();
    // 如果只是"参见变位规则"之类的简短说明，直接返回
    if (!text.includes('|')) return text.replace(/^[-\s]*/m, '').trim();
    // 提取 markdown 表格（从第一个 | 到最后一个 | 行）
    const tableLines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('|') && l.endsWith('|'));
    if (tableLines.length < 2) return '';
    return tableLines.join('\n');
}

// ─── 主流程 ────────────────────────────────────────────────────────

function main() {
    const scanDirs = [
        { label: '词汇/', path: path.join(VAULT, '词汇'), source: 'vocab' },
        { label: 'B2口语素材/', path: path.join(VAULT, 'B2口语素材'), source: 'b2' },
        { label: 'B2高频词/', path: path.join(VAULT, 'B2高频词'), source: 'freq' },
        { label: '小说词汇/', path: path.join(VAULT, '小说词汇'), source: 'novel' },
    ];

    console.log('📂 扫描俄语笔记库...');
    console.log(`   vault: ${VAULT}`);
    console.log('');

    const entries = [];
    let skipped = 0;
    const stats = {};

    for (const dir of scanDirs) {
        const files = walkMd(dir.path);
        let added = 0;
        for (const f of files) {
            try {
                const entry = extractVocab(f);
                if (entry) { entries.push(entry); added++; }
                else skipped++;
            } catch (err) {
                console.warn(`   ⚠ ${path.relative(VAULT, f)}: ${err.message}`);
                skipped++;
            }
        }
        stats[dir.source] = { label: dir.label, scanned: files.length, added };
        console.log(`   ${dir.label} → 扫描 ${files.length} 文件, 提取 ${added} 条`);
    }

    // 跨源去重：同一单词如果在 vocab 和 novel 中都出现，保留 vocab（手动维护的更完整）
    const wordSeen = {};
    const deduped = [];
    for (const e of entries) {
        const key = (e.word || '').toLowerCase();
        if (!key) { deduped.push(e); continue; }
        if (!wordSeen[key]) {
            wordSeen[key] = e;
            deduped.push(e);
        } else {
            // 如果已有条目是 novel，当前是 vocab → 替换
            if (wordSeen[key].source === 'novel' && e.source !== 'novel') {
                const idx = deduped.indexOf(wordSeen[key]);
                if (idx >= 0) deduped[idx] = e;
                wordSeen[key] = e;
            }
            // 否则跳过（保留先出现的）
        }
    }
    if (deduped.length < entries.length) {
        console.log(`   🔄 跨源去重: ${entries.length} → ${deduped.length} 条`);
    }
    entries.length = 0;
    entries.push(...deduped);

    // 排序：按 source → chapter → word，确保输出确定性
    entries.sort(function(a, b) {
        if (a.source !== b.source) return a.source.localeCompare(b.source);
        if (a.chapter !== b.chapter) return (a.chapter || '').localeCompare(b.chapter || '');
        return (a.word || '').localeCompare(b.word || '');
    });

    // 输出 JSON
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2), 'utf-8');

    // 输出构建清单
    var manifest = {
        version: 1,
        builtAt: new Date().toISOString(),
        vault: VAULT,
        totalEntries: entries.length,
        skipped: skipped,
        sources: {}
    };
    for (const [src, info] of Object.entries(stats)) {
        manifest.sources[src] = { label: info.label, scanned: info.scanned, added: info.added };
    }
    // 按 type 统计
    const byType = {};
    for (const e of entries) {
        const t = e.type || 'unknown';
        byType[t] = (byType[t] || 0) + 1;
    }
    manifest.byType = byType;

    var manifestPath = path.join(OUT_DIR, 'vocabulary-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // 汇总
    console.log('');
    console.log(`✅ 生成 ${OUT_FILE}（${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB）`);
    console.log(`   清单 ${manifestPath}`);
    console.log(`   共 ${entries.length} 条, 跳过 ${skipped} 个文件`);
    console.log('');
    console.log('   按来源:');
    for (const [src, info] of Object.entries(stats)) {
        console.log(`     ${src}: ${info.added} 条（扫描 ${info.scanned} 文件）`);
    }
    console.log('   按类型:');
    for (const [t, count] of Object.entries(byType).sort(function(a,b){ return b[1]-a[1]; })) {
        console.log(`     ${t}: ${count}`);
    }

    // ─── 质量报告 ────────────────────────────────────────────────
    const hasCyrillic = /[а-яА-ЯёЁ]/;
    const issues = [];

    for (const e of entries) {
        // 正面无俄语字母
        if (!hasCyrillic.test(e.word || '')) {
            issues.push({ id: e.id, word: (e.word||'').slice(0,60), meaning: (e.meaning||'').slice(0,60),
                file: e.file, reason: '正面无俄语字母' });
        }
        // 空释义
        if (!e.meaning || e.meaning.trim() === '') {
            issues.push({ id: e.id, word: (e.word||'').slice(0,60), meaning: '',
                file: e.file, reason: '释义为空' });
        }
        // 正反面疑似相同
        if (e.word && e.meaning && e.word.trim() === e.meaning.trim()) {
            issues.push({ id: e.id, word: (e.word||'').slice(0,60), meaning: (e.meaning||'').slice(0,60),
                file: e.file, reason: '正反面内容相同' });
        }
    }

    // 重复 id 检测
    const idCount = {};
    entries.forEach(function(e) { idCount[e.id] = (idCount[e.id]||0)+1; });
    for (const [id, count] of Object.entries(idCount)) {
        if (count > 1) {
            const e = entries.find(function(x){ return x.id===id; });
            issues.push({ id: id, word: (e.word||'').slice(0,60), meaning: (e.meaning||'').slice(0,60),
                file: e.file, reason: '重复 id（出现 ' + count + ' 次）' });
        }
    }

    const reportPath = path.join(OUT_DIR, 'vocabulary-quality-report.json');
    const report = { generatedAt: new Date().toISOString(), totalEntries: entries.length, issues: issues };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log('');
    console.log(`📋 质量报告 ${reportPath}（${issues.length} 个问题）`);
}

main();
