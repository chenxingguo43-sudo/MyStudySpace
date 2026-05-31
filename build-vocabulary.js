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
        return {
            id: rel.replace(/\.md$/, ''),
            word: String(fm.word),
            meaning: String(fm.meaning),
            extra: '',
            examples: normalizeExamples(fm.examples),
            type: fm.type || '',
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
            word: word,
            meaning: meaning,
            extra: fm.extra || '',
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

    // B2高频词/ 目录
    if (rel.startsWith('B2高频词/')) {
        if (!fm.word) return null;
        // 从文件 body 提取例句和常见形式
        const examples = extractExamplesFromBody(src);
        const forms = extractFormsFromBody(src);
        const stem = fm.stem || '';
        const freq = fm.frequency || 0;
        var extraParts = [];
        if (stem && stem !== String(fm.word)) extraParts.push('词根: ' + stem);
        if (freq) extraParts.push('频率: ' + freq);
        return {
            id: rel.replace(/\.md$/, ''),
            word: String(fm.word),
            meaning: forms || '高频词',
            extra: extraParts.join(' | '),
            examples: examples,
            type: '高频词',
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
        ru: e.ru || '',
        zh: e.zh || ''
    }));
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
        const ru = zhSplit[0].trim().replace(/\n\s*/g, ' ');
        const zh = zhSplit[1] ? zhSplit[1].trim().replace(/\n\s*/g, ' ') : '';
        if (ru) examples.push({ ru, zh });
    }
    return examples;
}

// ─── 主流程 ────────────────────────────────────────────────────────

function main() {
    const scanDirs = [
        { label: '词汇/', path: path.join(VAULT, '词汇'), source: 'vocab' },
        { label: 'B2口语素材/', path: path.join(VAULT, 'B2口语素材'), source: 'b2' },
        { label: 'B2高频词/', path: path.join(VAULT, 'B2高频词'), source: 'freq' },
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
}

main();
