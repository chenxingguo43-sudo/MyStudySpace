/**
 * build-unified-dictionary.js
 * 全量合并 7 个词库 → 统一词典 unified-dictionary.json
 * 同时做质量检测，输出需要 HY3 修复的清单 refine-list.json
 *
 * 用法：node build-unified-dictionary.js
 * 输出：
 *   docs/dictionary-refinement/unified-dictionary.json  统一词典（全量）
 *   docs/dictionary-refinement/refine-list.json        需要精修的词清单
 *   docs/dictionary-refinement/merge-report.txt        合并统计报告
 *
 * 优先级（低 → 高，高者覆盖低者）：
 *   FreeDict(6) < salad-vocab(5) < markdown-glossary(4) < external-vocab(3)
 *   < vocabulary.json(2) < reviewed-lexical/function(1)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT  = __dirname;

// ═══════════════ 工具函数 ═══════════════

function norm(v) {
  return String(v || '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'е')
    .toLowerCase()
    .replace(/[^а-я\-]/g, '');
}

function hasChinese(s) { return /[\u4e00-\u9fff]/.test(String(s || '')); }

function splitMeanings(s) {
  return String(s || '').split(/[；;、，,]/).map(x => x.trim()).filter(Boolean);
}

/** 古汉语垃圾：义项全为 1-3 字短词，且数量 ≥2 */
function isGarbageMeaning(s) {
  const items = splitMeanings(s);
  if (items.length < 2) return false;
  const short = items.filter(x => x.length <= 3).length;
  return short / items.length > 0.7;
}

/** OCR 乱码：含无法识别的非词字符序列 */
function isOcrCorrupt(s) {
  return /[\u0000-\u001f]|\uFFFD|\[!|\*\*[^*]+\*\*|\\u[0-9a-f]{4}/i.test(String(s || ''));
}

/** 例句误填释义：以句号/叹号/问号结尾的长句，或含"我/你/他"开头的口语句 */
function isMisplacedMeaning(s) {
  const t = String(s || '').trim();
  if (t.length < 15) return false;
  return /[。！？!?]$/.test(t) || /^(我|你|他|她|我们|你们|他们|空闲|平时|今天|昨天)/.test(t);
}

/** 词性归一化：英文/中文/缩写 → 统一英文标签 */
const POS_MAP = {
  noun: 'noun', n: 'noun', 名词: 'noun', 名: 'noun', 'сущ': 'noun',
  verb: 'verb', v: 'verb', infn: 'verb', grnd: 'verb', prtf: 'verb', prts: 'verb',
  动词: 'verb', 动: 'verb', 'гл': 'verb',
  adjective: 'adjective', adj: 'adjective', adjf: 'adjective', adjs: 'adjective',
  comp: 'adjective', 形容词: 'adjective', 形: 'adjective', 'прил': 'adjective',
  adverb: 'adverb', adv: 'adverb', advb: 'adverb', 副词: 'adverb', 'нар': 'adverb',
  pronoun: 'pronoun', npro: 'pronoun', 代词: 'pronoun', 'мест': 'pronoun',
  numeral: 'numeral', numr: 'numeral', 数词: 'numeral', 'числ': 'numeral',
  preposition: 'preposition', prep: 'preposition', 前置词: 'preposition', 'предл': 'preposition',
  conjunction: 'conjunction', conj: 'conjunction', 连词: 'conjunction', 'союз': 'conjunction',
  particle: 'particle', prcl: 'particle', 助词: 'particle', 'част': 'particle',
  interjection: 'interjection', intj: 'interjection', 感叹词: 'interjection', 'межд': 'interjection',
  predicative: 'predicative', pred: 'predicative', 谓词: 'predicative',
  专有名词: 'proper noun', proper: 'proper noun', name: 'proper noun'
};

function normPos(p) {
  const key = String(p || '').trim().toLowerCase();
  return POS_MAP[key] || (key.includes('动') ? 'verb' : key.includes('名') ? 'noun' : key.includes('形') ? 'adjective' : '');
}

/** 检查示例句子里的噪音（OCR 乱码、任务前缀等） */
function exampleIsClean(ex) {
  const ru = String(ex.ru || '');
  if (!ru) return false;
  if (/\*\*Задание|\[!|^>/.test(ru)) return false; // 任务/提示符噪音
  if (/[a-zA-Z]{5,}/.test(ru) && !/OK|IT|CEO|PR|URL|Wi-Fi/.test(ru)) return false; // 长拉丁串
  return true;
}

// ═══════════════ 加载词库 ═══════════════

const voc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocabulary.json'), 'utf-8'));
const ev  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/external-vocab.json'), 'utf-8'));
const mg  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/markdown-glossary.json'), 'utf-8'));
const sv  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/salad-vocab.json'), 'utf-8'));
const rl  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/reviewed-lexical-entries.json'), 'utf-8'));
const rf  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/reviewed-function-entries.json'), 'utf-8'));
const fd  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/freedict-rus-zh.json'), 'utf-8'));
const fq  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dictionary/freedict-quality-rules.json'), 'utf-8'));
const deprecated = new Set(fq.deprecatedMeanings || []);

// ═══════════════ 合并（优先级高的覆盖） ═══════════════

const dict = new Map(); // key -> entry

function add(key, entry, priority) {
  const k = norm(key);
  if (!k || !entry || !hasChinese(entry.meaning || '')) return;
  const prev = dict.get(k);
  if (!prev || priority < prev._priority) {
    dict.set(k, { ...entry, _priority: priority, _sourceKeys: [k] });
  } else if (priority === prev._priority && !prev._sourceKeys.includes(k)) {
    prev._sourceKeys.push(k);
  }
}

// FreeDict（最低优先，古汉语垃圾标记 needs-refine）
for (const [k, v] of Object.entries(fd)) {
  const meanings = (v.meanings || []).filter(m => !deprecated.has(m));
  if (!meanings.length) continue;
  const joined = meanings.slice(0, 8).join('；');
  add(k, {
    display: k, meaning: joined, meanings: meanings.slice(0, 8),
    source: ['freedict'],
    quality: isGarbageMeaning(joined) ? 'needs-refine' : 'minimal'
  }, 6);
}

// salad-vocab
for (const [k, v] of Object.entries(sv)) {
  if (!hasChinese(v)) continue;
  const meaning = String(v);
  add(k, {
    display: k, meaning, meanings: splitMeanings(meaning),
    source: ['salad-vocab'], quality: 'standard'
  }, 5);
}

// markdown-glossary
for (const [k, v] of Object.entries(mg)) {
  const meanings = (Array.isArray(v.meanings) ? v.meanings : []).filter(hasChinese);
  if (!meanings.length) continue;
  add(k, {
    display: k, meaning: meanings[0], meanings: meanings.slice(0, 6),
    source: ['markdown-glossary'], quality: 'standard'
  }, 4);
}

// external-vocab
for (const [k, v] of Object.entries(ev)) {
  if (!v.meaning) continue;
  add(k, {
    display: k, meaning: v.meaning, meanings: splitMeanings(v.meaning),
    pos: normPos(v.type), source: ['external-vocab'], quality: 'standard'
  }, 3);
}

// vocabulary.json（学习型词条）
for (const w of voc) {
  if (!w.word || !w.meaning) continue;
  const hasGrammar = w.grammarTable && w.grammarTable.includes('|') && !w.grammarTable.includes('待补充');
  const cleanExamples = (Array.isArray(w.examples) ? w.examples : []).filter(exampleIsClean);
  const isFull = hasGrammar && cleanExamples.length > 0;
  add(w.word, {
    display: w.word,
    pos: normPos(w.type),
    gender: w.gender || '',
    aspect: w.aspect || '',
    meaning: w.meaning,
    meanings: splitMeanings(w.meaning),
    grammarTable: hasGrammar ? w.grammarTable : '',
    examples: cleanExamples,
    collocations: Array.isArray(w.collocations) ? w.collocations : [],
    detailZh: w.detailZh || '',
    caseGov: w.case_gov || '',
    pair: w.pair || '',
    source: ['vocabulary'],
    quality: isFull ? 'full' : 'standard'
  }, 2);
}

// reviewed-lexical（最高优先）
for (const [k, v] of Object.entries(rl)) {
  if (!v.meaning) continue;
  add(k, {
    display: v.lemma || k, meaning: v.meaning, meanings: splitMeanings(v.meaning),
    pos: normPos(v.type), source: ['reviewed-lexical'], quality: 'full',
    grammarTable: v.grammarTable || ''
  }, 1);
}
for (const [k, v] of Object.entries(rf)) {
  if (!v.meaning) continue;
  add(k, {
    display: k, meaning: v.meaning, meanings: splitMeanings(v.meaning),
    pos: 'function word', source: ['reviewed-function'], quality: 'full'
  }, 1);
}

// ═══════════════ 质量检测 ═══════════════

const refineList = [];  // 需要 HY3 重写
const issueStats = { garbage: 0, misplaced: 0, ocr: 0, noPos: 0, noGrammar: 0 };

for (const [key, e] of dict) {
  const issues = [];

  if (e.quality === 'needs-refine') {
    issues.push('古汉语垃圾释义');
    issueStats.garbage++;
  }
  if (isMisplacedMeaning(e.meaning)) {
    issues.push('例句误填释义');
    issueStats.misplaced++;
  }
  if (isOcrCorrupt(e.meaning) || (Array.isArray(e.examples) && e.examples.some(x => isOcrCorrupt(x.ru)))) {
    issues.push('OCR乱码');
    issueStats.ocr++;
  }
  if (e.pos === 'vocab' || e.pos === 'sentence' || e.pos === 'tip' || e.pos === 'insert' || e.pos === '') {
    issues.push('词性缺失/异常');
    issueStats.noPos++;
  }

  // 完整度：实词（名词/动词/形容词/副词）缺变位表 → 建议升级
  const lexicalPos = ['noun', 'verb', 'adjective', 'adverb'];
  if (lexicalPos.includes(e.pos) && !e.grammarTable && e.quality !== 'full') {
    issues.push('缺变格变位表');
    issueStats.noGrammar++;
  }

  if (issues.length) {
    refineList.push({
      key, display: e.display, pos: e.pos, meaning: String(e.meaning).slice(0, 80),
      quality: e.quality, source: e.source, issues
    });
  }
}

// ═══════════════ 输出 ═══════════════

// 去 _ 前缀内部字段，输出最终词典；过滤 needs-refine（古汉语垃圾，无学习价值）
const finalDict = {};
for (const [key, e] of dict) {
  const { _priority, _sourceKeys, ...rest } = e;
  if (rest.quality === 'needs-refine') continue;
  finalDict[key] = rest;
}

const unifiedPath = path.join(ROOT, 'data', 'dictionary', 'unified-dictionary.json');
const refinePath  = path.join(OUT, 'refine-list.json');
const reportPath  = path.join(OUT, 'merge-report.txt');

fs.writeFileSync(unifiedPath, JSON.stringify(finalDict, null, 2), 'utf-8');
fs.writeFileSync(refinePath, JSON.stringify(refineList, null, 2), 'utf-8');

// 统计
const qualityCount = {};
const sourceCount = {};
for (const e of Object.values(finalDict)) {
  qualityCount[e.quality] = (qualityCount[e.quality] || 0) + 1;
  (e.source || []).forEach(s => { sourceCount[s] = (sourceCount[s] || 0) + 1; });
}

const report = [];
report.push('═ 统一词典合并报告 ═');
report.push(`总词条: ${Object.keys(finalDict).length}`);
report.push('');
report.push('质量分层:');
for (const [q, c] of Object.entries(qualityCount).sort((a, b) => b[1] - a[1])) {
  report.push(`  ${q.padEnd(12)} ${String(c).padStart(6)} 条`);
}
report.push('');
report.push('最终来源分布:');
for (const [s, c] of Object.entries(sourceCount).sort((a, b) => b[1] - a[1])) {
  report.push(`  ${s.padEnd(18)} ${String(c).padStart(6)} 条`);
}
report.push('');
report.push(`需要精修/修复的词条: ${refineList.length}`);
report.push(`  古汉语垃圾: ${issueStats.garbage}`);
report.push(`  例句误填释义: ${issueStats.misplaced}`);
report.push(`  OCR乱码: ${issueStats.ocr}`);
report.push(`  词性缺失/异常: ${issueStats.noPos}`);
report.push(`  缺变格变位表(实词): ${issueStats.noGrammar}`);
fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');

console.log(report.join('\n'));
console.log(`\n输出文件:`);
console.log(`  ${unifiedPath}`);
console.log(`  ${refinePath}`);
console.log(`  ${reportPath}`);
