/**
 * build-unified-dictionary.sample.js
 * 原型：把 7 个词库合并成统一词典，输出 20 个词的小样验证格式。
 *
 * 用法：node build-unified-dictionary.sample.js
 * 输出：docs/dictionary-refinement/unified-dictionary.sample.json
 *
 * 字段设计（学习型词典 schema）：
 *   lemma        词元（归一化 key）
 *   display      展示词形（带重音或原文）
 *   pos          词性（noun/verb/adjective/adverb/...）
 *   gender       性属（名词）
 *   aspect       体（动词：imperfective/perfective）
 *   meaning      中文释义（主释义）
 *   meanings     义项数组（多义项）
 *   grammarTable 变格变位表（markdown）
 *   examples     例句 [{ru, zh}]
 *   collocations 搭配 [{phrase, ru, zh}]
 *   detailZh     详细中文讲解
 *   caseGov      支配关系
 *   pair         对应体/对应词
 *   source       来源（多个来源用数组，按优先级）
 *   quality      full(完整) / standard(标准) / minimal(兜底) / needs-refine(待精修)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function norm(v) {
  return String(v || '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'е')
    .toLowerCase()
    .replace(/[^а-я\-]/g, '');
}

function hasChinese(s) { return /[\u4e00-\u9fff]/.test(String(s || '')); }

function isGarbageMeaning(s) {
  // 古汉语垃圾：义项全是 1-3 字短词
  const items = String(s || '').split(/[；;、，,]/).map(x => x.trim()).filter(Boolean);
  if (items.length < 2) return false;
  const short = items.filter(x => x.length <= 3).length;
  return short / items.length > 0.7;
}

// ── 加载全部词库 ──
const voc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocabulary.json'), 'utf-8'));
const ev  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/external-vocab.json'), 'utf-8'));
const mg  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/markdown-glossary.json'), 'utf-8'));
const sv  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/salad-vocab.json'), 'utf-8'));
const rl  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/reviewed-lexical-entries.json'), 'utf-8'));
const rf  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/reviewed-function-entries.json'), 'utf-8'));
const fd  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/freedict-rus-zh.json'), 'utf-8'));
const fq  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/freedict-quality-rules.json'), 'utf-8'));
const deprecated = new Set(fq.deprecatedMeanings || []);

// ── 建立各源索引 ──
const byKey = new Map(); // key -> entry

function addSource(key, entry, priority) {
  const k = norm(key);
  if (!k || !entry) return;
  const existing = byKey.get(k);
  if (!existing || priority < existing._priority) {
    byKey.set(k, { ...entry, _priority: priority });
  }
}

// 优先级：1=人工核对, 2=vocabulary(完整), 3=external, 4=glossary, 5=salad, 6=FreeDict
// reviewed-lexical（最高）
for (const [k, v] of Object.entries(rl)) {
  if (v.meaning) {
    addSource(k, {
      display: v.lemma || k,
      pos: v.type || '',
      meaning: v.meaning,
      source: ['reviewed-lexical'],
      quality: 'full'
    }, 1);
  }
}
for (const [k, v] of Object.entries(rf)) {
  if (v.meaning) {
    addSource(k, { display: k, pos: 'function word', meaning: v.meaning, source: ['reviewed-function'], quality: 'full' }, 1);
  }
}
// vocabulary.json
for (const w of voc) {
  if (!w.word || !w.meaning) continue;
  const pos = w.type || '';
  const hasGrammar = w.grammarTable && w.grammarTable.includes('|') && !w.grammarTable.includes('待补充');
  const isFull = hasGrammar && Array.isArray(w.examples) && w.examples.length > 0;
  addSource(w.word, {
    display: w.word,
    pos,
    gender: w.gender || '',
    aspect: w.aspect || '',
    meaning: w.meaning,
    meanings: w.meaning ? [w.meaning] : [],
    grammarTable: hasGrammar ? w.grammarTable : '',
    examples: Array.isArray(w.examples) ? w.examples : [],
    collocations: Array.isArray(w.collocations) ? w.collocations : [],
    detailZh: w.detailZh || '',
    caseGov: w.case_gov || '',
    pair: w.pair || '',
    source: ['vocabulary'],
    quality: isFull ? 'full' : 'standard'
  }, 2);
}
// external-vocab
for (const [k, v] of Object.entries(ev)) {
  if (!v.meaning) continue;
  addSource(k, { display: k, pos: v.type || '', meaning: v.meaning, source: ['external-vocab'], quality: 'standard' }, 3);
}
// markdown-glossary
for (const [k, v] of Object.entries(mg)) {
  const meanings = Array.isArray(v.meanings) ? v.meanings.filter(hasChinese) : [];
  if (!meanings.length) continue;
  addSource(k, { display: k, meaning: meanings[0], meanings: meanings, source: ['markdown-glossary'], quality: 'standard' }, 4);
}
// salad-vocab
for (const [k, v] of Object.entries(sv)) {
  if (!hasChinese(v)) continue;
  addSource(k, { display: k, meaning: String(v), source: ['salad-vocab'], quality: 'standard' }, 5);
}
// FreeDict
for (const [k, v] of Object.entries(fd)) {
  const meanings = (v.meanings || []).filter(m => !deprecated.has(m));
  if (!meanings.length) continue;
  const joined = meanings.slice(0, 8).join('；');
  addSource(k, {
    display: k,
    meaning: joined,
    meanings: meanings.slice(0, 8),
    source: ['freedict'],
    quality: isGarbageMeaning(joined) ? 'needs-refine' : 'minimal'
  }, 6);
}

// ── 挑 20 个代表性词 ──
const samples = [
  // 完整学习型（vocabulary 有变位表+例句）
  'работать', 'день', 'маленький', 'знать',
  // 简单释义（salad）
  'абажур', 'лампа',
  // 古汉语垃圾（FreeDict，需要 HY3 精修）
  'говорить', 'человек', 'делать', 'большой',
  // 人工核对
  'столетний', 'образованный',
  // 已 HY3 精修
  'айтишник', 'автовладелец',
  // 其他常见
  'время', 'жизнь', 'книга', 'стол', 'учиться', 'город'
];

const out = {};
for (const w of samples) {
  const e = byKey.get(norm(w));
  if (e) {
    const { _priority, ...rest } = e;
    out[norm(w)] = rest;
  }
}

const outPath = path.join(__dirname, 'unified-dictionary.sample.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
console.log(`小样已生成: ${outPath} (${Object.keys(out).length} 词)`);
for (const [k, v] of Object.entries(out)) {
  console.log(`\n■ ${k} [${v.quality}] <- ${v.source.join('+')}`);
  console.log(`  释义: ${String(v.meaning).slice(0, 60)}`);
  console.log(`  词性: ${v.pos || '—'}  变位表: ${v.grammarTable ? '✓' : '—'}  例句: ${v.examples ? v.examples.length : 0}  搭配: ${v.collocations ? v.collocations.length : 0}`);
}
