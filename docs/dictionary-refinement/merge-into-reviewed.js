/**
 * merge-into-reviewed.js
 * 用法：node merge-into-reviewed.js <hy3-validated.json>
 *
 * 把校验通过的 HY3 结果合并进 reviewed-lexical-entries.json（最高优先级覆盖层）。
 * 已存在的人工核对条目（source 含"人工核对"）不会被覆盖。
 * 合并完成后提示你手动 bump DICTIONARY_DATA_VERSION。
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..', '..');
const REVIEWED  = path.join(ROOT, 'data', 'dictionary', 'reviewed-lexical-entries.json');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('用法: node merge-into-reviewed.js <hy3-validated.json>');
  process.exit(1);
}

const incoming = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const existing = JSON.parse(fs.readFileSync(REVIEWED,  'utf-8'));

let added = 0, skipped = 0;

for (const [key, entry] of Object.entries(incoming)) {
  if (existing[key] && String(existing[key].source || '').includes('人工核对')) {
    skipped++;
    continue;
  }
  existing[key] = entry;
  added++;
}

fs.writeFileSync(REVIEWED, JSON.stringify(existing, null, 2), 'utf-8');

console.log(`\n合并完成`);
console.log(`  新增/更新: ${added} 条`);
console.log(`  跳过（人工核对保护）: ${skipped} 条`);
console.log(`  写入: ${REVIEWED}`);
console.log(`\n⚠️  记得 bump reader.html 里的 DICTIONARY_DATA_VERSION，否则浏览器不会刷新缓存！`);
console.log(`   当前位于 reader.html 约第 6701 行：var DICTIONARY_DATA_VERSION = '...'`);
