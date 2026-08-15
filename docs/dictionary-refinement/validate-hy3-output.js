/**
 * validate-hy3-output.js
 * 用法：node validate-hy3-output.js <HY3输出文件.txt>
 * 
 * 校验 HY3 返回的词条格式，生成两个文件：
 *   hy3-validated.json   —— 通过校验的条目（可直接合并进词典）
 *   hy3-rejected.txt     —— 未通过的行（可重新提交 HY3）
 */

const fs = require('fs');
const path = require('path');

const VALID_POS = new Set(['名词','动词','形容词','副词','代词','前置词','连词','数词','感叹词','专有名词','其他']);
const HAS_ZH = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const CYRILLIC = /^[а-яёА-ЯЁ][а-яёА-ЯЁ\- ]*$/u;

function hasChinese(s) { return HAS_ZH.test(s); }
function isCyrillic(s) { return CYRILLIC.test(s.trim()); }

// ё→е 小写归一化（匹配 reader.html normalizeLookupWord）
function normKey(s) {
  return String(s || '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'е')
    .toLowerCase()
    .replace(/[^а-я\-]/g, '');
}

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('用法: node validate-hy3-output.js <输出文件.txt>');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, 'utf-8');
const lines = raw.split('\n');

const validated = {};
const rejected = [];
let parsed = 0, skipped = 0;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  // 期望格式：[序号] 词元 | 词性 | 释义
  const m = trimmed.match(/^\[(\d+)\]\s*([^\|]+)\|([^\|]+)\|(.+)$/);
  if (!m) {
    rejected.push({ line: trimmed, reason: '格式不匹配（不含两个 | 分隔符）' });
    skipped++;
    continue;
  }

  const [, idx, lemmaRaw, posRaw, meaningRaw] = m;
  const lemma = lemmaRaw.trim();
  const pos   = posRaw.trim();
  const meaning = meaningRaw.trim();

  // 校验 1：词元必须是西里尔字母
  if (!isCyrillic(lemma)) {
    rejected.push({ line: trimmed, reason: `词元非西里尔字母: "${lemma}"` });
    skipped++; continue;
  }
  // 校验 2：词性必须在白名单内
  if (!VALID_POS.has(pos)) {
    rejected.push({ line: trimmed, reason: `词性不在白名单: "${pos}"` });
    skipped++; continue;
  }
  // 校验 3：释义必须含中文
  if (!hasChinese(meaning)) {
    rejected.push({ line: trimmed, reason: `释义不含中文: "${meaning}"` });
    skipped++; continue;
  }
  // 校验 4：释义不超过 200 字（防止输出失控）
  if (meaning.length > 200) {
    rejected.push({ line: trimmed, reason: `释义过长 (${meaning.length} 字符)` });
    skipped++; continue;
  }

  const key = normKey(lemma);
  if (!key) {
    rejected.push({ line: trimmed, reason: '归一化后 key 为空' });
    skipped++; continue;
  }

  validated[key] = {
    lemma: lemma,
    meaning: meaning,
    type: pos,
    source: '项目词典 · HY3精修'
  };
  parsed++;
}

const outDir = path.dirname(inputFile);
const validatedPath = path.join(outDir, 'hy3-validated.json');
const rejectedPath  = path.join(outDir, 'hy3-rejected.txt');

fs.writeFileSync(validatedPath, JSON.stringify(validated, null, 2), 'utf-8');
fs.writeFileSync(rejectedPath, rejected.map(r => `[REJECTED] ${r.reason}\n  ${r.line}`).join('\n\n'), 'utf-8');

console.log(`\n校验完成`);
console.log(`  ✓ 通过: ${parsed} 条  → ${validatedPath}`);
console.log(`  ✗ 驳回: ${skipped} 条  → ${rejectedPath}`);

if (skipped > 0) {
  console.log('\n驳回明细：');
  rejected.forEach(r => console.log(`  [${r.reason}]  ${r.line.slice(0, 80)}`));
}
