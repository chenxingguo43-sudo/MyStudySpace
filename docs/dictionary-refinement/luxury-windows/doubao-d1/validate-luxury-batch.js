/**
 * validate-luxury-batch.js — 校验豆包/Workbuddy 产出的豪华标准词条批次
 * 用法: node validate-luxury-batch.js <NN> [NN...]
 * 读取 output/luxury-batch-<NN>.json（数组），逐条检查字段完整性。
 */
const fs = require('node:fs');
const path = require('node:path');

const batchIds = process.argv.slice(2);
if (!batchIds.length) {
  console.error('用法: node validate-luxury-batch.js <NN> [NN...]');
  process.exit(2);
}

const HAS_ZH = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const hasZh = s => HAS_ZH.test(String(s || ''));

let allOk = true;

for (const id of batchIds) {
  const file = path.join('output', `luxury-batch-${id}.json`);
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[${id}] 无法读取或解析 ${file}: ${e.message}`);
    allOk = false;
    continue;
  }
  if (!Array.isArray(entries)) {
    console.error(`[${id}] ${file} 不是数组`);
    allOk = false;
    continue;
  }
  const problems = [];
  for (const e of entries) {
    const lemma = e.lemma || e.word || '?';
    const issues = [];
    if (!hasZh(e.meaning)) issues.push('meaning缺中文');
    if (!hasZh(e.explainZh)) issues.push('explainZh缺中文');
    if (!Array.isArray(e.collocations) || e.collocations.length < 3) issues.push(`collocations<3(${Array.isArray(e.collocations) ? e.collocations.length : 0})`);
    else e.collocations.forEach((c, i) => { if (!c.phrase || !c.ru || !hasZh(c.zh)) issues.push(`collocations[${i}]缺字段`); });
    if (!Array.isArray(e.synonyms) || !e.synonyms.length) issues.push('synonyms空');
    else e.synonyms.forEach((s, i) => { if (!s.word || !hasZh(s.diff)) issues.push(`synonyms[${i}]缺字段`); });
    if (!Array.isArray(e.related) || e.related.length < 2) issues.push(`related<2(${Array.isArray(e.related) ? e.related.length : 0})`);
    if (e.antonyms && e.antonyms !== '—' && !hasZh(e.antonyms)) issues.push('antonyms缺中文');
    if (issues.length) problems.push(`  ${lemma}: ${issues.join('; ')}`);
  }
  if (problems.length) {
    console.error(`[${id}] ${entries.length} 条中 ${problems.length} 条有问题:`);
    problems.forEach(p => console.error(p));
    allOk = false;
  } else {
    console.log(`[${id}] ✓ ${entries.length} 条全部通过字段校验`);
  }
}

process.exit(allOk ? 0 : 1);
