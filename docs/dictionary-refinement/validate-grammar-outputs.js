/**
 * validate-grammar-outputs.js
 * 校验并合并 HY3 生成的变格变位表批次。
 *
 * 用法：node validate-grammar-outputs.js <输出目录>
 *   <输出目录> 里放所有 HY3 回复的 .txt（每行 [序号] 词元 | 词性 | 变格变位表）
 *
 * 输出：
 *   grammar-validated.json   校验通过的条目（含 grammarTable 字段）
 *   grammar-rejected.txt     驳回明细
 *   grammar-merged-report.json 合并统计
 *
 * 合并目标：reviewed-lexical-entries.json 的对应词条增加 grammarTable 字段。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REVIEWED = path.join(ROOT, 'data', 'dictionary', 'reviewed-lexical-entries.json');

const CYRILLIC = /^[а-яёА-ЯЁ][а-яёА-ЯЁ\- ]*$/u;

function normKey(s) {
  return String(s || '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'е')
    .toLowerCase()
    .replace(/[^а-я\-]/g, '');
}

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('用法: node validate-grammar-outputs.js <输出目录>');
  process.exit(1);
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
if (!files.length) {
  console.error(`目录 ${inputDir} 里没有 .txt 文件`);
  process.exit(1);
}

const validated = {};
const rejected = [];

for (const file of files.sort()) {
  const raw = fs.readFileSync(path.join(inputDir, file), 'utf-8');
  const lines = raw.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 跳过提示词头部（示例等）
    if (!trimmed.startsWith('[')) continue;

    const m = trimmed.match(/^\[(\d+)\]\s*([^\|]+)\|([^\|]+)\|(.+)$/);
    if (!m) { rejected.push({ file, line: trimmed, reason: '格式不匹配' }); continue; }

    const [, idx, lemmaRaw, posRaw, grammarRaw] = m;
    const lemma = lemmaRaw.replace(/（.*?）/, '').trim();
    const pos = posRaw.trim();
    const grammar = grammarRaw.trim();

    // 校验 1：词元西里尔
    if (!CYRILLIC.test(lemma)) { rejected.push({ file, line: trimmed, reason: `词元非西里尔: ${lemma}` }); continue; }
    // 校验 2：词性
    if (!['名词','动词','形容词'].includes(pos)) { rejected.push({ file, line: trimmed, reason: `词性异常: ${pos}` }); continue; }

    // 校验 3：按词性检查表格结构
    let ok = true;
    let reason = '';
    if (pos === '名词') {
      const m_sg = grammar.match(/单数:([^;]+)/);
      const m_pl = grammar.match(/复数:([^;]+)/);
      if (!m_sg || !m_pl) { ok = false; reason = '缺少单数/复数部分'; }
      else {
        const sg = m_sg[1].split(',').filter(x => x.trim() && x.trim() !== '—');
        const pl = m_pl[1].split(',').filter(x => x.trim() && x.trim() !== '—');
        if (sg.length < 6 || pl.length < 6) { ok = false; reason = `格数不足 (单${sg.length}/复${pl.length})`; }
      }
    } else if (pos === '动词') {
      const m_pres = grammar.match(/(?:现在时|将来时):([^;]+)/);
      const m_past = grammar.match(/过去时:([^;]+)/);
      if (!m_pres || !m_past) { ok = false; reason = '缺少现在时/过去时部分'; }
      else {
        const pres = m_pres[1].split(',').filter(x => x.trim());
        if (pres.length < 6) { ok = false; reason = `人称不足 (${pres.length}/6)`; }
      }
    } else if (pos === '形容词') {
      const m_short = grammar.match(/短尾:([^;]+)/);
      if (!m_short) { ok = false; reason = '缺少短尾部分'; }
      else {
        const short = m_short[1].split(',').filter(x => x.trim() && x.trim() !== '—');
        if (short.length < 4) { ok = false; reason = `短尾不足 (${short.length}/4)`; }
      }
    }

    if (!ok) { rejected.push({ file, line: trimmed, reason }); continue; }

    const key = normKey(lemma);
    validated[key] = { lemma, pos, grammarTable: grammar };
  }
}

// 合并进 reviewed-lexical-entries.json
const existing = JSON.parse(fs.readFileSync(REVIEWED, 'utf-8'));
let added = 0, noEntry = 0;
for (const [key, entry] of Object.entries(validated)) {
  if (!existing[key]) { noEntry++; continue; }
  existing[key] = { ...existing[key], grammarTable: entry.grammarTable };
  added++;
}
fs.writeFileSync(REVIEWED, JSON.stringify(existing, null, 2), 'utf-8');

// 输出
fs.writeFileSync(path.join(inputDir, 'grammar-validated.json'), JSON.stringify(validated, null, 2), 'utf-8');
fs.writeFileSync(path.join(inputDir, 'grammar-rejected.txt'),
  rejected.map(r => `[${r.file}] ${r.reason}\n  ${r.line.slice(0,120)}`).join('\n\n'), 'utf-8');
fs.writeFileSync(path.join(inputDir, 'grammar-merged-report.json'),
  JSON.stringify({ merged: added, noEntry, rejected: rejected.length, total: Object.keys(validated).length }, null, 2), 'utf-8');

console.log(`\n变位表处理完成（${files.length} 个文件）`);
console.log(`  ✓ 通过: ${Object.keys(validated).length} 条`);
console.log(`  ✗ 驳回: ${rejected.length} 条 → ${path.join(inputDir, 'grammar-rejected.txt')}`);
console.log(`  ➕ 合并进词典: ${added} 条（词典无此词条跳过: ${noEntry}）`);
if (rejected.length) {
  console.log('\n驳回样例:');
  rejected.slice(0, 5).forEach(r => console.log(`  [${r.reason}] ${r.line.slice(0, 90)}`));
}
console.log(`\n⚠️  记得 bump reader.html DICTIONARY_DATA_VERSION！`);
