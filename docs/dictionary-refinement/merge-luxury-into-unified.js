/**
 * merge-luxury-into-unified.js
 * 把豪华标准词条（explainZh/synonyms/antonyms/related/confusions/special）
 * 合并进 unified-dictionary.json。只追加新字段，不覆盖现有
 * meaning/grammarTable/examples/collocations（保留旧数据）。
 *
 * 用法：node merge-luxury-into-unified.js <窗口输出目录> [更多目录...]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNIFIED = path.join(ROOT, 'data', 'dictionary', 'unified-dictionary.json');

function normKey(s) {
  return String(s || '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'е')
    .toLowerCase()
    .replace(/[^а-я\-]/g, '');
}

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error('用法: node merge-luxury-into-unified.js <输出目录> [更多目录...]');
  process.exit(1);
}

const unified = JSON.parse(fs.readFileSync(UNIFIED, 'utf-8'));
const LUXURY_FIELDS = ['explainZh', 'synonyms', 'antonyms', 'related', 'confusions', 'special'];

let merged = 0, notFound = 0, skipped = 0;

for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter(f => /^luxury-batch-\d+\.json$/.test(f));
  for (const file of files) {
    let entries;
    try {
      entries = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    } catch (e) {
      console.warn(`跳过 ${file}: ${e.message}`);
      skipped++;
      continue;
    }
    if (!Array.isArray(entries)) { skipped++; continue; }
    for (const e of entries) {
      const key = normKey(e.lemma || e.word || '');
      if (!key) continue;
      if (!unified[key]) { notFound++; continue; }
      // 只追加豪华字段，不覆盖已有字段
      let changed = false;
      for (const f of LUXURY_FIELDS) {
        if (e[f] !== undefined && !unified[key][f]) {
          unified[key][f] = e[f];
          changed = true;
        }
      }
      if (changed) {
        // 标记来源
        if (!Array.isArray(unified[key].source)) unified[key].source = [];
        if (!unified[key].source.includes('luxury')) unified[key].source.push('luxury');
        merged++;
      }
    }
  }
}

fs.writeFileSync(UNIFIED, JSON.stringify(unified, null, 2), 'utf-8');

console.log(`\n豪华词条合并完成`);
console.log(`  ✓ 追加豪华字段: ${merged} 条`);
console.log(`  ○ 词典无此词条: ${notFound} 条`);
console.log(`  ⚠ 文件解析跳过: ${skipped} 个`);
console.log(`  写入: ${UNIFIED}`);
console.log(`\n⚠️ 之后需：bump DICTIONARY_DATA_VERSION + 浏览器验证 + reader.html 展示新字段！`);
