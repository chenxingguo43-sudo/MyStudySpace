/**
 * process-hy3-outputs.js
 * 批量处理 Workbuddy 返回的所有批次输出文件。
 *
 * 用法：node process-hy3-outputs.js <输出目录>
 *   <输出目录> 里放所有 Workbuddy 返回的 .txt（每行 [序号] 词元 | 词性 | 释义）
 *
 * 流程：
 *   1. 解析并校验每行（复用 validate 规则）
 *   2. 过滤"词形残缺，待人工核对"条目
 *   3. 合并去重（同一词元取最后一次出现的释义）
 *   4. 生成：
 *        hy3-all-validated.json   全部通过条目（可直接 merge）
 *        hy3-all-rejected.txt     驳回明细
 *        hy3-all-merged.json      已合并进 reviewed-lexical-entries.json 的结果
 *   5. 打印统计
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REVIEWED = path.join(ROOT, 'data', 'dictionary', 'reviewed-lexical-entries.json');

const VALID_POS = new Set(['名词','动词','形容词','副词','代词','前置词','连词','数词','感叹词','专有名词','其他']);
const HAS_ZH = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const CYRILLIC = /^[а-яёА-ЯЁ][а-яёА-ЯЁ\- ]*$/u;

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
  console.error('用法: node process-hy3-outputs.js <输出目录>');
  process.exit(1);
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
if (!files.length) {
  console.error(`目录 ${inputDir} 里没有 .txt 文件`);
  process.exit(1);
}

const validated = {};   // key -> entry（后出现的覆盖先出现的）
const rejected = [];

for (const file of files.sort()) {
  const raw = fs.readFileSync(path.join(inputDir, file), 'utf-8');
  const lines = raw.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[') === false) continue;
    if (trimmed.startsWith('[') && !trimmed.includes('|')) {
      rejected.push({ file, line: trimmed, reason: '格式不匹配（无 | 分隔符）' });
      continue;
    }

    const m = trimmed.match(/^\[(\d+)\]\s*([^\|]+)\|([^\|]+)\|(.+)$/);
    if (!m) {
      rejected.push({ file, line: trimmed, reason: '格式不匹配' });
      continue;
    }

    const [, idx, lemmaRaw, posRaw, meaningRaw] = m;
    const lemma = lemmaRaw.trim();
    const pos   = posRaw.trim();
    const meaning = meaningRaw.trim();

    if (!isCyrillic(lemma)) { rejected.push({ file, line: trimmed, reason: `词元非西里尔字母: "${lemma}"` }); continue; }
    if (!VALID_POS.has(pos)) { rejected.push({ file, line: trimmed, reason: `词性不在白名单: "${pos}"` }); continue; }
    if (!hasChinese(meaning)) { rejected.push({ file, line: trimmed, reason: `释义不含中文: "${meaning}"` }); continue; }
    if (meaning.length > 200) { rejected.push({ file, line: trimmed, reason: `释义过长 (${meaning.length})` }); continue; }
    if (meaning.includes('待人工核对') || meaning.includes('词形残缺')) {
      rejected.push({ file, line: trimmed, reason: '残缺占位条目' });
      continue;
    }

    const key = normKey(lemma);
    if (!key) { rejected.push({ file, line: trimmed, reason: '归一化后 key 为空' }); continue; }

    validated[key] = {
      lemma, meaning, type: pos,
      source: '项目词典 · HY3精修'
    };
  }
}

// 合并进 reviewed-lexical-entries.json
const existing = JSON.parse(fs.readFileSync(REVIEWED, 'utf-8'));
let added = 0, protected_ = 0;
for (const [key, entry] of Object.entries(validated)) {
  if (existing[key] && String(existing[key].source || '').includes('人工核对')) {
    protected_++;
    continue;
  }
  existing[key] = entry;
  added++;
}
fs.writeFileSync(REVIEWED, JSON.stringify(existing, null, 2), 'utf-8');

// 输出
const outV = path.join(inputDir, 'hy3-all-validated.json');
const outR = path.join(inputDir, 'hy3-all-rejected.txt');
const outM = path.join(inputDir, 'hy3-all-merged.json');
fs.writeFileSync(outV, JSON.stringify(validated, null, 2), 'utf-8');
fs.writeFileSync(outR, rejected.map(r => `[${r.file}] ${r.reason}\n  ${r.line.slice(0,100)}`).join('\n\n'), 'utf-8');
fs.writeFileSync(outM, JSON.stringify({ merged: added, protected: protected_, totalInReviewed: Object.keys(existing).length }, null, 2), 'utf-8');

console.log(`\n处理完成（${files.length} 个文件）`);
console.log(`  ✓ 通过: ${Object.keys(validated).length} 条`);
console.log(`  ✗ 驳回: ${rejected.length} 条 → ${outR}`);
console.log(`  ➕ 合并进词典: ${added} 条（人工核对保护跳过: ${protected_}）`);
console.log(`  📦 reviewed-lexical-entries.json 现有: ${Object.keys(existing).length} 条`);
console.log(`\n⚠️  记得 bump reader.html DICTIONARY_DATA_VERSION！`);
