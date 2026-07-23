/**
 * FreeDict 繁体→简体转换（使用 OpenCC，逐条转换）
 *
 * 用法: node scripts/convert-freedict-to-simplified.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INPUT = path.join(ROOT, 'data', 'dictionary', 'freedict-rus-zh.json');
const BACKUP = path.join(ROOT, 'data', 'dictionary', 'freedict-rus-zh.backup.json');

async function main() {
  const { Converter } = require('opencc-js');
  const converter = Converter({ from: 'twp', to: 'cn' }); // twp = Taiwan + common phrases

  console.log('读取 FreeDict...');
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const keys = Object.keys(data);
  console.log('总词条数: ' + keys.length);

  // 只备份一次
  if (!fs.existsSync(BACKUP)) {
    console.log('创建备份 → ' + BACKUP);
    fs.copyFileSync(INPUT, BACKUP);
  } else {
    console.log('备份已存在，跳过。如需重新创建请手动删除备份文件');
  }

  let changedEntries = 0;
  let changedMeanings = 0;
  let processed = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = data[key];
    if (!entry || !Array.isArray(entry.meanings)) continue;

    let entryChanged = false;
    for (let j = 0; j < entry.meanings.length; j++) {
      const original = entry.meanings[j];
      if (typeof original !== 'string' || original.length === 0) continue;

      try {
        const converted = converter(original);
        if (converted !== original) {
          entry.meanings[j] = converted;
          entryChanged = true;
          changedMeanings++;
        }
      } catch (e) {
        // 个别字符可能导致 opencc 抛异常，保留原文
      }
    }

    if (entryChanged) changedEntries++;
    processed++;

    if (processed % 10000 === 0) {
      console.log('  进度: ' + processed + ' / ' + keys.length + ' (已转换 ' + changedEntries + ' 词条)');
    }
  }

  console.log('转换完成: ' + changedEntries + ' 个词条 / ' + changedMeanings + ' 处释义');

  // 写入
  console.log('写入 ' + INPUT + ' ...');
  fs.writeFileSync(INPUT, JSON.stringify(data, null, 2), 'utf-8');
  console.log('文件大小: ' + (fs.statSync(INPUT).size / 1024 / 1024).toFixed(1) + ' MB');

  // 验证
  console.log('\n─── 验证 ───');
  const reloaded = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const testWords = ['кабинет', 'книга', 'дом', 'политика', 'школа', 'работа'];
  testWords.forEach(function(word) {
    const e = reloaded[word];
    if (!e) { console.log('  - ' + word + ': 不在词典'); return; }
    const shown = (e.meanings || []).slice(0, 6).join('；');
    console.log('  ' + word + ': ' + shown);
  });

  console.log('\n✓ 完成');
}

main().catch(function(err) { console.error(err); process.exit(1); });
