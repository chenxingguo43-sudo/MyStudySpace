/**
 * merge-posfix-into-unified.js
 * 把复核通过的 HY3 词性精修条目合并进 unified-dictionary.json。
 *
 * 用法：node merge-posfix-into-unified.js <输出目录>
 *   <输出目录> 需含 process-posfix-outputs.js 生成的 posfix-validated.json
 *   （可选：posfix-conflicts.json 中人工确认通过的条目可合并后再次运行）
 *
 * 合并规则：仅更新已有词条的 pos/type 与释义；不新增词条。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UNIFIED = path.join(ROOT, 'data', 'dictionary', 'unified-dictionary.json');

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('用法: node merge-posfix-into-unified.js <输出目录>');
  process.exit(1);
}

const validatedPath = path.join(inputDir, 'posfix-validated.json');
if (!fs.existsSync(validatedPath)) {
  console.error(`缺少 ${validatedPath}，先跑 process-posfix-outputs.js`);
  process.exit(1);
}

const validated = JSON.parse(fs.readFileSync(validatedPath, 'utf-8'));
const unified = JSON.parse(fs.readFileSync(UNIFIED, 'utf-8'));

let updated = 0, notFound = 0;

const POS_ZH_TO_EN = {
  '名词': 'noun', '动词': 'verb', '形容词': 'adjective', '副词': 'adverb',
  '代词': 'pronoun', '前置词': 'preposition', '连词': 'conjunction', '数词': 'numeral',
  '感叹词': 'interjection', '专有名词': 'proper noun', '其他': 'other', '助词': 'particle'
};

for (const [key, entry] of Object.entries(validated)) {
  if (!unified[key]) { notFound++; continue; }
  unified[key].pos = POS_ZH_TO_EN[entry.type] || entry.type;
  unified[key].meaning = entry.meaning;
  unified[key].source = Array.isArray(unified[key].source)
    ? unified[key].source.includes('reviewed-lexical') ? unified[key].source : [...unified[key].source, 'hy3-posfix']
    : ['hy3-posfix'];
  updated++;
}

fs.writeFileSync(UNIFIED, JSON.stringify(unified, null, 2), 'utf-8');

console.log(`\n合并完成`);
console.log(`  ✓ 更新词性: ${updated} 条`);
console.log(`  ○ 词典无此词条（跳过）: ${notFound} 条`);
console.log(`  写入: ${UNIFIED}`);
console.log(`\n⚠️ 之后需：bump DICTIONARY_DATA_VERSION + 浏览器验证！`);
