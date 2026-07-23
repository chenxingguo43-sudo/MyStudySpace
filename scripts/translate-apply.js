#!/usr/bin/env node
/**
 * translate-apply.js
 *
 * 1. 解析 Gemini 翻译结果（按行对应 batch 中的条目）
 * 2. 将 zh 字段写回对应的 ch*.json 文件
 *
 * 用法:
 *   node scripts/translate-apply.js <batchFile> <resultFile>
 *   例如: node scripts/translate-apply.js data/translate-batches/batch-01.txt data/translate-batches/result-01.txt
 */
const fs = require('fs');

const [, , batchFile, resultFile] = process.argv;
if (!batchFile || !resultFile) {
  console.error('用法: node scripts/translate-apply.js <batch_prompt.txt> <result.txt>');
  process.exit(1);
}

// 1. Read the mapping (created when batches were split)
const mapping = JSON.parse(fs.readFileSync('data/translate-batches/_mapping.json', 'utf8'));

// 2. Read the batch prompt to figure out which items are in this batch
const batchContent = fs.readFileSync(batchFile, 'utf8');
const batchLines = batchContent.split('\n');

// Parse item numbers from the batch (format: "NN. [category] ru_text")
const batchEntries = [];
for (const line of batchLines) {
  const m = line.match(/^(\d+)\.\s*\[(.+?)\]\s+(.+)/);
  if (m) {
    batchEntries.push({ num: parseInt(m[1]), category: m[2], ru: m[3].trim() });
  }
}
console.log(`从 prompt 中提取了 ${batchEntries.length} 个条目`);

// 3. Read the Gemini result
const resultContent = fs.readFileSync(resultFile, 'utf8');
// Result is stdout with stderr mixed in. Extract only the actual translation lines.
// The translation output starts after the last error line and is the body.
// Strategy: find lines that are NOT [gemini] prefixed, skip empty lines
const allResultLines = resultContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const translations = [];
for (const line of allResultLines) {
  // Skip gemini log lines
  if (line.startsWith('[gemini]')) continue;
  // Skip lines that are clearly not translations (e.g., pure numbers)
  translations.push(line);
}

console.log(`从结果中提取了 ${translations.length} 行翻译`);

if (translations.length < batchEntries.length) {
  console.warn(`⚠ 翻译行数 (${translations.length}) < 条目数 (${batchEntries.length})，将尽力匹配`);
}

// 4. Match translations back to mapping entries
const applied = [];
const missing = [];
for (let i = 0; i < batchEntries.length; i++) {
  const entry = batchEntries[i];
  const mappedIdx = entry.num - 1; // 0-based index into full mapping
  if (mappedIdx >= 0 && mappedIdx < mapping.length) {
    const zh = translations[i] || '';
    mapping[mappedIdx]._translated = zh;
    applied.push({ ...mapping[mappedIdx], zh });
  }
}

// 5. Write back to ch*.json files
const dir = 'data/textbook/writing_speaking/';
const byFile = {};
for (const item of applied) {
  if (!byFile[item.file]) byFile[item.file] = [];
  byFile[item.file].push(item);
}

for (const [filename, items] of Object.entries(byFile)) {
  const filePath = dir + filename;
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!d.studySupport || !d.studySupport.expressions) {
    console.warn(`⚠ ${filename}: 没有 studySupport.expressions`);
    continue;
  }
  const exps = d.studySupport.expressions;
  let cnt = 0;
  for (const item of items) {
    // Find the matching expression by ru text
    let found = false;
    for (let i = 0; i < exps.length; i++) {
      if (exps[i].ru.trim() === item.ru.trim() && (!exps[i].zh || exps[i].zh.trim() === '')) {
        exps[i].zh = item.zh || item._translated || '';
        cnt++;
        found = true;
        break;
      }
    }
    if (!found) {
      // Try fuzzy match: ru starts with the stored ru
      for (let i = 0; i < exps.length; i++) {
        if ((exps[i].ru.trim().startsWith(item.ru.trim()) || item.ru.trim().startsWith(exps[i].ru.trim())) && (!exps[i].zh || exps[i].zh.trim() === '')) {
          exps[i].zh = item.zh || item._translated || '';
          cnt++;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.warn(`  ⚠ ${filename}: 未找到匹配的 expression: "${item.ru.substring(0, 40)}..."`);
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(d, null, 2), 'utf8');
  console.log(`✓ ${filename}: 写入 ${cnt} 条翻译`);
}

// 6. Update the mapping file
fs.writeFileSync('data/translate-batches/_mapping.json', JSON.stringify(mapping, null, 2), 'utf8');
console.log('映射文件已更新');
