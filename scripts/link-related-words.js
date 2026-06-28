/**
 * link-related-words.js
 * 给 📚 相关词汇 表格中的词加上 [[]] 双链
 * 用法: node scripts/link-related-words.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const B2_DIR = path.join(__dirname, '..', '俄语笔记库', '词汇', 'B2单词表');

let changed = 0;
let total = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      scanDir(path.join(dir, entry.name));
    } else if (entry.name.endsWith('.md')) {
      processFile(path.join(dir, entry.name));
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 找到 📚 相关词汇 section
  const regex = /## 📚 相关词汇\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/;
  const match = content.match(regex);
  if (!match) return;

  const section = match[1];
  let newSection = section;

  // 匹配表格行: | 词 | 词性 | 含义 |
  const rows = section.split('\n');
  let changedInFile = false;

  let isHeader = true;  // 第一行是表头 "| 词 | 词性 | 含义 |"
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.startsWith('|') || row.includes('---')) continue;

    // 跳过表头行
    if (isHeader && row.includes('词')) { isHeader = false; continue; }
    isHeader = false;

    const cells = row.split('|').filter(c => c.trim());
    if (cells.length < 1) continue;

    const firstCell = cells[0].trim();
    // 跳过已经链接触和包含非俄语词内容的行
    if (firstCell && !firstCell.includes('[[') && !firstCell.includes('http')) {
      // 提取词 (可能有空格、逗号分隔等多个词)
      const words = firstCell
        .replace(/`/g, '')
        .replace(/\*\*/g, '')
        .split(/[,，\s]+/)
        .filter(w => w && w.length > 0 && !w.includes('|'));

      if (words.length > 0) {
        const linked = words.map(w => `[[${w}]]`).join(', ');
        // 替换第一个单元格
        const cols = row.split('|');
        const origFirst = cols[1]; // 第一个单元格内容 (索引1因为split从空开始)
        if (origFirst !== undefined) {
          cols[1] = ' ' + linked + ' ';
          const newRow = cols.join('|');
          rows[i] = newRow;
          changedInFile = true;
        }
      }
    }
  }

  if (changedInFile) {
    newSection = rows.join('\n');
    content = content.replace(match[1], newSection);

    if (content !== original) {
      changed++;
      const word = path.basename(filePath, '.md');
      if (DRY_RUN) {
        console.log(`  ✅ ${word} — linked`);
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ ${word} — linked`);
      }
    }
  }

  total++;
}

console.log('Scanning B2单词表...');
scanDir(B2_DIR);
console.log(`\nDone: ${changed} files modified out of ${total} total`);
if (DRY_RUN) console.log('(dry-run mode, no files written)');
