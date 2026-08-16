/**
 * merge-grammar-tables.js
 * 把 HY3 生成的变格变位表（紧凑格式）转换为 reader.html 渲染所需的
 * markdown 表格格式，合并进 reviewed-lexical-entries.json 的 grammarTable 字段。
 *
 * 用法：node merge-grammar-tables.js
 *
 * 输入：docs/dictionary-refinement/hy3-batches-grammar/hy3-grammar-all.json
 *       (records: [{lemma, pos, pos_source, paradigm, note}])
 * 输出：data/dictionary/reviewed-lexical-entries.json 增加 grammarTable
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ALL_JSON = path.join(__dirname, 'hy3-batches-grammar', 'hy3-grammar-all.json');
const REVIEWED = path.join(ROOT, 'data', 'dictionary', 'reviewed-lexical-entries.json');

const GRAM_NOMN = ['主格', '属格', '与格', '宾格', '工具格', '前格'];
const VERB_PERSONS = ['я', 'ты', 'он/она', 'мы', 'вы', 'они'];

/** 紧凑名词范式 → markdown 表格 */
function nounToMarkdown(paradigm) {
  const sgM = paradigm.match(/单数:([^;]*)/);
  const plM = paradigm.match(/复数:([^;]*)/);
  if (!sgM || !plM) return '';
  const sg = sgM[1].split(',').map(s => s.replace(/^(主格|属格|与格|宾格|工具格|前格)\s*/, '').trim());
  const pl = plM[1].split(',').map(s => s.replace(/^(主格|属格|与格|宾格|工具格|前格)\s*/, '').trim());
  if (sg.length < 6 || pl.length < 6) return '';
  const rows = GRAM_NOMN.map((g, i) => `| ${g} | ${sg[i]} | ${pl[i]} |`);
  return `| 格 | 单数 | 复数 |\n|---|---|---|\n${rows.join('\n')}`;
}

/** 紧凑动词范式 → markdown 表格 */
function verbToMarkdown(paradigm) {
  const tenseLabel = paradigm.includes('将来时') ? '将来时' : '现在时';
  const presM = paradigm.match(new RegExp(tenseLabel + ':([^;]*)'));
  const pastM = paradigm.match(/过去时:([^;]*)/);
  if (!presM) return '';
  const forms = presM[1].split(',').map(s => s.replace(/^(я|ты|он\/она|мы|вы|они)\s*/, '').trim());
  if (forms.length < 6) return '';
  // 过去时：4 形式（阳/阴/中/复）→ 按人称映射
  const past = pastM ? pastM[1].split(',').map(s => s.trim()) : [];
  function pastFor(personIdx) {
    if (!past.length) return '—';
    // я/ты→阳, он/она→阳/阴, мы/вы/они→复
    if (personIdx === 2) return past[0] + (past[1] ? '/' + past[1] : '');
    if (personIdx >= 3) return past[3] || past[0];
    return past[0];
  }
  const rows = VERB_PERSONS.map((p, i) => `| ${p} | ${forms[i]} | ${pastFor(i)} |`);
  return `| 人称 | ${tenseLabel} | 过去时 |\n|---|---|---|\n${rows.join('\n')}`;
}

/** 紧凑形容词范式 → markdown 表格 */
function adjToMarkdown(paradigm) {
  const shortM = paradigm.match(/短尾:([^;]*)/);
  const compM = paradigm.match(/比较级:([^;]*)/);
  if (!shortM) return '';
  const short = shortM[1].split(',').map(s => s.replace(/^[мжс]{1,2}[ ]*/, '').trim());
  const comp = compM ? compM[1].trim() : '—';
  if (short.length >= 4) {
    return `| 短尾形式 | 阳性 | 阴性 | 中性 | 复数 |\n|---|---|---|---|---|\n| 短尾 | ${short[0]} | ${short[1]} | ${short[2]} | ${short[3]} |\n| 比较级 | ${comp} | — | — | — |`;
  }
  if (short.length >= 3) {
    return `| 短尾形式 | 阳性 | 阴性 | 中性 |\n|---|---|---|---|\n| 短尾 | ${short[0]} | ${short[1]} | ${short[2]} |\n| 比较级 | ${comp} | — | — |`;
  }
  return `| 短尾 | 比较级 |\n|---|---|\n| ${short.join('/')} | ${comp} |`;
}

// ── 主流程 ──
const all = JSON.parse(fs.readFileSync(ALL_JSON, 'utf-8'));
const records = all.records;
const reviewed = JSON.parse(fs.readFileSync(REVIEWED, 'utf-8'));

let merged = 0, noEntry = 0, converted = 0, skipped = 0;
const samples = [];

for (const rec of records) {
  const key = String(rec.lemma || '').replace(/ё/g, 'е').toLowerCase();
  if (!reviewed[key]) { noEntry++; continue; }

  let md = '';
  if (rec.pos === '名词') md = nounToMarkdown(rec.paradigm);
  else if (rec.pos === '动词') md = verbToMarkdown(rec.paradigm);
  else if (rec.pos === '形容词') md = adjToMarkdown(rec.paradigm);

  if (!md) { skipped++; continue; }

  reviewed[key] = { ...reviewed[key], grammarTable: md };
  merged++;
  if (samples.length < 4) samples.push({ key, pos: rec.pos, md });
}

fs.writeFileSync(REVIEWED, JSON.stringify(reviewed, null, 2), 'utf-8');

console.log(`转换合并完成`);
console.log(`  ✓ 合并 grammarTable: ${merged} 条`);
console.log(`  ○ 词典无此词条（跳过）: ${noEntry} 条`);
console.log(`  ✗ 范式解析失败（跳过）: ${skipped} 条`);
console.log(`\n样例:`);
for (const s of samples) {
  console.log(`\n■ ${s.key} (${s.pos})`);
  console.log(s.md);
}
console.log(`\n⚠️  还需改 reader.html 让 reviewed-lexical 透传 grammarTable！`);
