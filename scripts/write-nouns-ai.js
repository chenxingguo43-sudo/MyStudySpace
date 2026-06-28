const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('data/noun_analysis_20.json', 'utf8'));
const B2_DIR = path.join(__dirname, '..', '俄语笔记库', '词汇', 'B2单词表');

function writeToMd(word, info) {
  const dirs = fs.readdirSync(B2_DIR, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_'));
  for (const dir of dirs) {
    const fp = path.join(B2_DIR, dir.name, word + '.md');
    if (!fs.existsSync(fp)) continue;
    let content = fs.readFileSync(fp, 'utf8');

    // Definitions
    content = content.replace(
      /\*\*俄语解释：\*\*[\s\S]*?\*\*中文解释：\*\* [\s\S]*?(?=\n## )/,
      '**俄语解释：** ' + info.definition_ru + '\n\n**中文解释：** ' + info.definition_zh
    );

    // Collocations
    const collRows = info.collocations.map(c => '| ' + c.phrase + ' | ' + c.ru + ' | ' + c.zh + ' |').join('\n');
    content = replaceSection(content, /## ✍️ 补充搭配\r?\n/,
      '| 搭配 | 例句 | 翻译 |\n|---|---|---|\n' + collRows + '\n');

    // Synonyms
    const synRows = info.synonyms.map(s => '| **' + s.word + '** | ' + s.diff + ' |').join('\n');
    content = replaceSection(content, /## 🎯 近义词辨析\r?\n/,
      '| 词 | 区别 |\n|---|---|\n' + synRows + '\n');

    // Antonyms
    if (info.antonyms && info.antonyms.length > 0) {
      const antItems = info.antonyms.map(a => '- **' + a + '**').join('\n');
      content = replaceSection(content, /## ⚡ 反义词\r?\n/, antItems + '\n');
    }

    // Confusable
    if (info.confusable && info.confusable.length > 0) {
      const confItems = info.confusable.map(c => '- ' + c).join('\n');
      content = replaceSection(content, /## ⚠️ 易混淆词\r?\n/, confItems + '\n');
    }

    // Special usage
    if (info.special_usage && info.special_usage.length > 0) {
      const usageItems = info.special_usage.map(u => '- ' + u).join('\n');
      content = replaceSection(content, /## 💡 特殊用法\r?\n/, usageItems + '\n');
    }

    // Remove 待AI补充 placeholders
    content = content.replace(/（待AI补充详细俄语解释）\n\n/g, '\n');
    content = content.replace(/。（待AI补充详细中文解释）\n\n/g, '。\n\n');

    fs.writeFileSync(fp, content, 'utf8');
    console.log('✅ ' + word);
    return;
  }
  console.log('❌ ' + word + ' (not found)');
}

function replaceSection(content, marker, replacement) {
  const start = content.search(marker);
  if (start < 0) return content;
  const afterHeader = content.indexOf('\n', start) + 1;
  const nextSection = content.indexOf('\n## ', afterHeader);
  const end = nextSection > 0 ? nextSection : content.length;
  return content.substring(0, afterHeader) + replacement + content.substring(end);
}

for (const item of data) {
  writeToMd(item.word, item);
}

console.log('\nDone: ' + data.length + ' files');
