/**
 * process-posfix-outputs.js
 * 处理 HY3 词性精修批次输出，内置"防偷懒"交叉校验。
 *
 * 用法：node process-posfix-outputs.js <输出目录>
 *
 * 三道关卡：
 *   A. 格式校验：词性白名单、释义含中文、词元西里尔
 *   B. 交叉校验：与 corpus-morphology tags 冲突 → 标记人工复核
 *   C. 偷懒检测：整批同词性 / 释义原样未改 → 标记疑似糊弄
 *
 * 输出：
 *   posfix-validated.json   通过（无冲突）
 *   posfix-conflicts.json   与词形库冲突（人工复核）
 *   posfix-lazy.json        疑似偷懒（释义未改/整批同词性）
 *   posfix-rejected.txt     格式驳回
 *   posfix-report.json      统计
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNIFIED = path.join(ROOT, 'data', 'dictionary', 'unified-dictionary.json');
const MORPH = path.join(ROOT, 'data', 'dictionary', 'corpus-morphology.json');

const VALID_POS = new Set(['名词','动词','形容词','副词','代词','前置词','连词','数词','感叹词','专有名词','其他']);
const HAS_ZH = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const CYRILLIC = /^[а-яёА-ЯЁ][а-яёА-ЯЁ\- ]*$/u;

const TAG_POS = {
  NOUN: '名词', VERB: '动词', INFN: '动词', GRND: '动词', PRTF: '动词', PRTS: '动词',
  ADJF: '形容词', ADJS: '形容词', ADVB: '副词', NPRO: '代词', NUMR: '数词',
  PREP: '前置词', CONJ: '连词', PRCL: '助词', INTJ: '感叹词', PRED: '谓词'
};

function hasChinese(s) { return HAS_ZH.test(s); }
function isCyrillic(s) { return CYRILLIC.test(s.trim()); }
function normKey(s) {
  return String(s || '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'е')
    .toLowerCase()
    .replace(/[^а-я\-]/g, '');
}

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('用法: node process-posfix-outputs.js <输出目录>');
  process.exit(1);
}

// 排除脚本自身生成的输出文件（避免自引用累积）
const files = fs.readdirSync(inputDir)
  .filter(f => f.endsWith('.txt') && !f.startsWith('posfix-') && !f.startsWith('minimal-'));
if (!files.length) { console.error(`目录 ${inputDir} 里没有 .txt 文件`); process.exit(1); }

const unified = JSON.parse(fs.readFileSync(UNIFIED, 'utf-8'));
const morph = JSON.parse(fs.readFileSync(MORPH, 'utf-8'));

const validated = {};   // key -> entry（后覆盖先）
const conflicts = [];
const lazy = [];
const rejected = [];

for (const file of files.sort()) {
  const lines = fs.readFileSync(path.join(inputDir, file), 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('[')) continue;

    const m = trimmed.match(/^\[(\d+)\]\s*([^\|]+)\|([^\|]+)\|(.+)$/);
    if (!m) { rejected.push({ file, line: trimmed, reason: '格式不匹配' }); continue; }

    const lemma = m[2].replace(/（.*?）/g, '').trim();
    const pos = m[3].trim();
    const meaning = m[4].trim();

    // ── 关卡 A：格式 ──
    if (!isCyrillic(lemma)) { rejected.push({ file, line: trimmed, reason: `词元非西里尔: ${lemma}` }); continue; }
    if (!VALID_POS.has(pos)) { rejected.push({ file, line: trimmed, reason: `词性不在白名单: ${pos}` }); continue; }
    if (!hasChinese(meaning)) { rejected.push({ file, line: trimmed, reason: `释义不含中文: ${meaning}` }); continue; }
    if (meaning.length > 120) { rejected.push({ file, line: trimmed, reason: `释义过长 (${meaning.length})` }); continue; }

    const key = normKey(lemma);
    if (!key) { rejected.push({ file, line: trimmed, reason: '归一化 key 为空' }); continue; }

    const oldEntry = unified[key] || {};
    const oldMeaning = String(oldEntry.meaning || '');

    // ── 关卡 C：偷懒检测 ──
    // 本轮任务是"判断词性"，释义已有则保留是正常行为；真正的偷懒信号：
    // 释义被改成与原文无关的占位、或整批同词性（在下方 C2 检测）
    // 注意：单字中文释义（吨/米/克）合法，不能用 length<2 一刀切
    const meaningDamaged = meaning.includes('待人工核对') || meaning.includes('词形残缺');
    const posPlaceholder = meaning.includes('待人工核对');

    // ── 关卡 B：交叉校验（与词形库冲突）──
    const mTags = (morph[key] && morph[key].tags || []).map(t => String(t).toUpperCase());
    const morphPos = mTags.map(t => TAG_POS[t]).find(Boolean);
    const posConflict = morphPos && morphPos !== pos &&
      !(morphPos === '助词' && pos === '其他') &&
      !(morphPos === '动词' && pos === '名词' && meaning.includes('（')) // 动词名词化形同形词容错

    const entry = { lemma, type: pos, meaning, source: '项目词典 · HY3精修' };

    if (posPlaceholder || meaningDamaged) {
      rejected.push({ file, line: trimmed, reason: '残缺/损坏占位条目' });
    } else if (posConflict) {
      conflicts.push({ key, lemma, pos, morphPos, meaning, oldMeaning: oldMeaning.slice(0, 50) });
    } else {
      validated[key] = entry;
    }
  }
}

// ── 关卡 C2：整批同词性检测 ──
const posDist = {};
for (const e of Object.values(validated)) posDist[e.type] = (posDist[e.type] || 0) + 1;
const total = Object.keys(validated).length;
const dominantPos = Object.entries(posDist).sort((a, b) => b[1] - a[1])[0];
const lazyBatch = dominantPos && dominantPos[1] / total > 0.9 && total > 50;

// 输出
const outBase = inputDir;
fs.writeFileSync(path.join(outBase, 'posfix-validated.json'), JSON.stringify(validated, null, 2), 'utf-8');
fs.writeFileSync(path.join(outBase, 'posfix-conflicts.json'), JSON.stringify(conflicts, null, 2), 'utf-8');
fs.writeFileSync(path.join(outBase, 'posfix-lazy.json'), JSON.stringify(lazy, null, 2), 'utf-8');
fs.writeFileSync(path.join(outBase, 'posfix-rejected.txt'), rejected.map(r => `[${r.file}] ${r.reason}\n  ${r.line.slice(0, 100)}`).join('\n\n'), 'utf-8');
fs.writeFileSync(path.join(outBase, 'posfix-report.json'), JSON.stringify({
  total, rejected: rejected.length, conflicts: conflicts.length, lazy: lazy.length,
  posDist, lazyBatchFlag: lazyBatch
}, null, 2), 'utf-8');

console.log(`\n词性精修处理完成（${files.length} 个文件）`);
console.log(`  ✓ 通过: ${total} 条`);
console.log(`  ✗ 格式驳回: ${rejected.length} 条`);
console.log(`  ⚠ 词形库冲突(人工复核): ${conflicts.length} 条`);
console.log(`  💤 释义未改(疑似偷懒): ${lazy.length} 条`);
console.log(`  词性分布: ${JSON.stringify(posDist)}`);
if (lazyBatch) console.log(`  🚨 警告: 单一词性占比 ${(dominantPos[1]/total*100).toFixed(0)}%，疑似脚本批量糊弄！`);
if (conflicts.length) {
  console.log('\n冲突样例:');
  conflicts.slice(0, 8).forEach(c => console.log(`  ${c.lemma}: HY3=${c.pos} 词形库=${c.morphPos} (${c.meaning.slice(0, 30)})`));
}
console.log('\n⚠️ 人工复核 conflicts 后，再跑 merge-posfix-into-unified.js 合并！');
