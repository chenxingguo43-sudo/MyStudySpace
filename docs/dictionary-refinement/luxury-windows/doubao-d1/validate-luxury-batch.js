/**
 * validate-luxury-batch.js — 校验豪华标准词条批次
 * 用法: node validate-luxury-batch.js <NN> [NN...]
 * v2: 新增西里尔字母检测 — 解释性字段（explainZh/synonyms.diff/antonyms/
 * confusions.note/special）必须中文，出现俄语句子视为不合格。
 */
const fs = require('node:fs');
const path = require('node:path');

const batchIds = process.argv.slice(2);
if (!batchIds.length) {
  console.error('用法: node validate-luxury-batch.js <NN> [NN...]');
  process.exit(2);
}

const HAS_ZH = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const CYR = /[\u0410-\u044f\u0401\u0451]/; // 西里尔字母
const hasZh = s => HAS_ZH.test(String(s || ''));

// 必须中文的解释性字段（西里尔占比 >20% 视为俄语）
function isRussianText(s) {
  const text = String(s || '');
  if (!text) return false;
  const cyrCount = (text.match(CYR) || []).length;
  const total = text.replace(/\s+/g, '').length;
  return total > 3 && cyrCount / total > 0.2;
}

// 允许含俄语的字段（词本身）：lemma/word/phrase/ru；其余一律中文
const RUSSIAN_OK = new Set(['lemma', 'word', 'phrase', 'ru', 'pair']);

function checkField(obj, fieldPath, problems) {
  const keys = fieldPath.split('.');
  let cur = obj;
  for (const k of keys) {
    if (cur === undefined || cur === null) return;
    cur = cur[k];
  }
  if (cur === undefined || cur === null) return;
  // 数组元素递归
  if (Array.isArray(cur)) {
    cur.forEach((item, i) => checkField(obj, keys.join('.') + '[' + i + ']', problems));
    return;
  }
  if (typeof cur === 'string' && RUSSIAN_OK.has(keys[keys.length - 1])) return;
  if (typeof cur === 'string' && isRussianText(cur)) {
    problems.push(`${fieldPath} 是俄语（应为中文）: ${cur.slice(0, 40)}`);
  }
}

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
    else e.collocations.forEach((c, i) => { if (!c.phrase || !c.ru || !hasZh(c.zh)) issues.push(`collocations[${i}]缺字段或翻译`); });
    if (!Array.isArray(e.synonyms) || !e.synonyms.length) issues.push('synonyms空');
    else e.synonyms.forEach((s, i) => { if (!s.word || !hasZh(s.diff)) issues.push(`synonyms[${i}]缺字段或中文区别`); });
    if (!Array.isArray(e.related) || e.related.length < 2) issues.push(`related<2(${Array.isArray(e.related) ? e.related.length : 0})`);
    if (e.antonyms && e.antonyms !== '—' && !hasZh(e.antonyms)) issues.push('antonyms缺中文');
    // v2: 西里尔检测（解释字段必须中文）
    for (const f of ['explainZh', 'antonyms', 'special', 'confusions']) {
      if (typeof e[f] === 'string' && isRussianText(e[f])) issues.push(`${f} 是俄语（应为中文）`);
    }
    if (Array.isArray(e.synonyms)) e.synonyms.forEach((s, i) => { if (s.diff && isRussianText(s.diff)) issues.push(`synonyms[${i}].diff 是俄语`); });
    if (Array.isArray(e.confusions)) e.confusions.forEach((c, i) => { if (c.note && isRussianText(c.note)) issues.push(`confusions[${i}].note 是俄语`); });
    if (issues.length) problems.push(`  ${lemma}: ${issues.join('; ')}`);
  }
  if (problems.length) {
    console.error(`[${id}] ${entries.length} 条中 ${problems.length} 条有问题:`);
    problems.slice(0, 20).forEach(p => console.error(p));
    if (problems.length > 20) console.error(`  ... 还有 ${problems.length - 20} 条`);
    allOk = false;
  } else {
    console.log(`[${id}] ✓ ${entries.length} 条全部通过（含中文语言检测）`);
  }
}

process.exit(allOk ? 0 : 1);
