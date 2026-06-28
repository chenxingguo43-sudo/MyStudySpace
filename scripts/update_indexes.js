// Update index files and import .txt files with new CET-6 words
const fs = require('fs');
const path = require('path');

const BASE = '俄语笔记库';

// ── New words to add (that don't already exist in indexes) ──
const newVerbs = [
  ['наста́ивать', '坚持，主张'],
  ['сли́пнуться', '粘在一起'],
  ['оде́ться', '穿好衣服'],
  ['дости́чь', '达到，获得，取得'],
  ['соблюда́ться', '被遵守，被执行'],
  ['возде́йствовать', '影响，作用'],
  ['постуча́ть', '敲了敲'],
  ['извини́ться', '道歉，请原谅'],
  ['определя́ть', '确定，定义，分配'],
  ['поступа́ть', '行为，做，进入'],
  ['взве́сить', '称重，权衡'],
  ['прису́тствовать', '出席，存在'],
];

const newNouns = [
  ['кусо́чек', '小块，碎片'],
  ['счёт', '计算，账户，比分'],
  ['проду́кты', '食品，农产品'],
  ['жени́х', '未婚夫，新郎'],
  ['слу́жба', '服务，工作，服役'],
  ['кровь', '血，血液'],
  ['бой', '战斗，战役'],
  ['генера́л', '将军'],
  ['долг', '职责，债务，义务'],
  ['церемо́ния', '仪式，典礼'],
  ['гармо́ния', '和谐，融洽'],
  ['мно́жество', '许多，大量'],
  ['раскры́тие', '揭露，展现，启示'],
  ['разнови́дность', '种类，变体'],
  ['сопровожде́ние', '伴随，伴奏，护送'],
  ['сочета́ние', '结合，配合'],
  ['листо́чек', '小叶子，便条纸'],
  ['пове́рхность', '表面'],
  ['выраже́ние', '表达，词语'],
  ['наме́рение', '意图，打算'],
  ['отве́тственность', '责任，职责'],
  ['брак', '婚姻；次品，废品'],
];

const newAdjs = [
  ['пло́тный', '密集的，浓厚的，结实的'],
  ['перечи́сленный', '被列举的，上述的'],
  ['определённый', '确定的，一定的，具体的'],
  ['со́бственный', '自己的，本身的'],
  ['винова́тый', '有过错的，愧疚的'],
  ['актуа́льный', '迫切的，现实的，具有现实意义的'],
];

const newAdvs = [
  ['персона́льно', '亲自，个别地'],
  ['осо́бенно', '特别，非常'],
];

const newFuncs = [
  ['пусть', '让，愿，哪怕（语气词）'],
];

// ── Update index files ──
function updateIndex(dirName, newWords, countDelta) {
  const indexPath = path.join(BASE, '词汇', dirName, dirName + '索引.md');
  let content = fs.readFileSync(indexPath, 'utf-8');

  // Update count in header
  content = content.replace(/^# 📝 (.+?) \((\d+)\)/m, (match, title, count) => {
    const newCount = parseInt(count) + countDelta;
    return `# 📝 ${title} (${newCount})`;
  });

  // Add new words to the "未分类" section (before the final blank line)
  const newRows = newWords.map(([w, m]) => `| [[${w}]] | ${m} |`).join('\n');

  // Find the last entry in the 未分类 section and append after it
  const lines = content.split('\n');
  // Find the 未分类 section
  let unclassifiedIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## 未分类')) {
      unclassifiedIdx = i;
      break;
    }
  }

  if (unclassifiedIdx >= 0) {
    // Find the last table row in this section (before the trailing blank lines)
    let lastRowIdx = unclassifiedIdx;
    for (let i = unclassifiedIdx + 3; i < lines.length; i++) {
      if (lines[i].startsWith('| [[')) {
        lastRowIdx = i;
      } else if (lines[i].trim() === '' && lastRowIdx > unclassifiedIdx) {
        break;
      }
    }
    // Insert after the last row
    lines.splice(lastRowIdx + 1, 0, ...newRows.split('\n'));
    content = lines.join('\n');
  } else {
    // No 未分类 section yet, add one at the end
    const section = `\n## 未分类 (${newWords.length})\n\n| 单词 | 释义 |\n| --- | --- |\n${newRows}\n`;
    content = content.trimEnd() + '\n' + section + '\n';
  }

  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log('Updated index: ' + indexPath + ' (+' + newWords.length + ' words)');
}

updateIndex('动词', newVerbs, 12);
updateIndex('名词', newNouns, 22);
updateIndex('形容词', newAdjs, 6);
updateIndex('副词', newAdvs, 2);
updateIndex('功能词', newFuncs, 1);

// ── Update import .txt files ──
function updateImportTxt(fileName, newWords) {
  const txtPath = path.join(BASE, fileName);
  let content = fs.readFileSync(txtPath, 'utf-8');
  // Append new words
  const newLines = newWords.map(([w, m]) => `\n${w}, ${m}`).join('');
  content = content.trimEnd() + newLines + '\n';
  fs.writeFileSync(txtPath, content, 'utf-8');
  console.log('Updated import: ' + txtPath + ' (+' + newWords.length + ' words)');
}

updateImportTxt('动词导入.txt', newVerbs);
updateImportTxt('名词导入.txt', newNouns);
updateImportTxt('形容词导入.txt', newAdjs);
updateImportTxt('副词导入.txt', newAdvs);
updateImportTxt('功能词导入.txt', newFuncs);

console.log('\nAll indexes and import files updated!');
