/**
 * fix-standard-pos.js
 * 修复 unified-dictionary.json standard 层词性缺失/异常：
 *   1. 释义前缀（阳./形./未./完.等）→ pos 字段，释义去前缀
 *   2. corpus-morphology tags → pos（无前缀时）
 *   3. 输出修复后的 unified-dictionary.json + 待 HY3 精修清单
 *
 * 用法：node fix-standard-pos.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNIFIED = path.join(ROOT, 'data', 'dictionary', 'unified-dictionary.json');
const MORPH = path.join(ROOT, 'data', 'dictionary', 'corpus-morphology.json');

const u = JSON.parse(fs.readFileSync(UNIFIED, 'utf-8'));
const cm = JSON.parse(fs.readFileSync(MORPH, 'utf-8'));

// 前缀 → pos
const PREFIX_POS = {
  '阳': 'noun', '阴': 'noun', '中': 'noun', '复': 'noun', '阳/阴': 'noun',
  '形': 'adjective', '动': 'verb', '副': 'adverb',
  '未': 'verb', '完': 'verb', '未/完': 'verb',
  '代': 'pronoun', '数': 'numeral', '感': 'interjection',
  '前': 'preposition', '连': 'conjunction', '插': 'interjection',
  '语': 'phrase', '短尾': 'adjective'
};
const PREFIX_RE = /^(阳|阴|中|形|动|副|未|完|代|数|感|前|连|语|插|复|未\/完|阳\/阴|短尾)[.．]\s*/;

// tags → pos
const TAG_POS = {
  NOUN: 'noun', VERB: 'verb', INFN: 'verb', GRND: 'verb', PRTF: 'verb', PRTS: 'verb',
  ADJF: 'adjective', ADJS: 'adjective', ADVB: 'adverb', NPRO: 'pronoun',
  NUMR: 'numeral', PREP: 'preposition', CONJ: 'conjunction', PRCL: 'particle',
  INTJ: 'interjection', PRED: 'predicative'
};

let fixedPrefix = 0, fixedMorph = 0, conflictFixed = 0, needsHy3 = 0;
const hy3List = [];

for (const [key, e] of Object.entries(u)) {
  if (e.quality !== 'standard') continue;
  const meaning = String(e.meaning || '');
  const m = meaning.match(PREFIX_RE);

  if (m) {
    const prefix = m[1];
    const pos = PREFIX_POS[prefix];
    if (pos) {
      // 冲突修正：pos 存在但不同于前缀推断
      if (e.pos && e.pos !== pos) conflictFixed++;
      e.pos = pos;
      e.meaning = meaning.replace(PREFIX_RE, '');
      fixedPrefix++;
      continue;
    }
  }

  if (!e.pos) {
    const morph = cm[key];
    const tags = (morph && morph.tags || []).map(t => String(t).toUpperCase());
    const pos = tags.map(t => TAG_POS[t]).find(Boolean);
    if (pos) {
      e.pos = pos;
      fixedMorph++;
      continue;
    }
    needsHy3++;
    if (hy3List.length < 100000) hy3List.push({ key, meaning: meaning.slice(0, 60) });
  }
}

// 写回
fs.writeFileSync(UNIFIED, JSON.stringify(u, null, 2), 'utf-8');
fs.writeFileSync(path.join(__dirname, 'hy3-pos-fix-list.json'), JSON.stringify(hy3List, null, 2), 'utf-8');

console.log(`修复完成`);
console.log(`  ✓ 释义前缀提取: ${fixedPrefix} 条`);
console.log(`  ✓ 词形库推断: ${fixedMorph} 条`);
console.log(`  ✎ 前缀/pos 冲突修正: ${conflictFixed} 条`);
console.log(`  ⏳ 需 HY3 精修: ${needsHy3} 条 → hy3-pos-fix-list.json`);
