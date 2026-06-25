/**
 * add-cognate-words.js
 * 自动补充同词根词到 📚 相关词汇 表格
 * 用法: node scripts/add-cognate-words.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const B2_DIR = path.join(__dirname, '..', '俄语笔记库', '词汇', 'B2单词表');

// 读取所有B2单词并分类
console.log('Loading B2 word list...');
const allWords = {}; // word -> {file, type, meaning}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      scanDir(fullPath);
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      const wordMatch = fm.match(/^word:\s*"?([^"\r\n]+)"?$/m);
      const typeMatch = fm.match(/^type:\s*"?([^"\r\n]+)"?$/m);
      const meaningMatch = fm.match(/^meaning:\s*"?([^"\r\n]+)"?$/m);
      if (wordMatch) {
        const word = wordMatch[1].replace(/^"|"$/g, '').trim();
        allWords[word] = {
          file: fullPath,
          content: content,
          fm: fm,
          type: typeMatch ? typeMatch[1].replace(/^"|"$/g, '') : '',
          meaning: meaningMatch ? meaningMatch[1].replace(/^"|"$/g, '') : ''
        };
      }
    }
  }
}

scanDir(B2_DIR);
console.log(`  ${Object.keys(allWords).length} words loaded`);

// 提取词干（改进版）
function extractStem(word) {
  let s = word.toLowerCase();

  // 重音符号
  s = s.replace(/[áàâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[íìîï]/g,'i')
       .replace(/[óòôö]/g,'o').replace(/[úùûü]/g,'u');

  // 去除后缀
  if (s.endsWith('ться') || s.endsWith('тся')) s = s.slice(0, -4);
  else if (s.endsWith('тся')) s = s.slice(0, -3);
  else if (s.endsWith('ть')) s = s.slice(0, -3);
  else if (s.endsWith('ти')) s = s.slice(0, -2);
  else if (s.endsWith('чь')) s = s.slice(0, -3);
  else if (s.endsWith('тся')) s = s.slice(0, -3);

  // 如果是副词以 -о 结尾，去掉 (наверно → наверн)
  // 但保留核心部分

  // 去掉常见名词后缀
  let stripped = false;
  const nounSuffixes = ['ация', 'яция', 'ение', 'ание', 'ение', 'ность', 'тельство',
    'ство', 'ость', 'есть', 'ция', 'сия', 'чка', 'шка', 'жка',
    'ьба', 'вка', 'нка', 'ота', 'ета'];
  for (const suf of nounSuffixes) {
    if (s.endsWith(suf) && s.length > suf.length + 2) {
      s = s.slice(0, -suf.length);
      stripped = true;
      break;
    }
  }
  // 如果没匹配到长后缀，尝试短后缀
  if (!stripped) {
    const shortSuffixes = ['ие', 'ие', 'ка', 'ок', 'ёк', 'ик', 'ец', 'ица', 'ня', 'ля', 'ач', 'яч'];
    for (const suf of shortSuffixes) {
      if (s.endsWith(suf) && s.length > suf.length + 2) {
        s = s.slice(0, -suf.length);
        break;
      }
    }
  }

  // 去掉常见形容词后缀
  const adjSuffixes = ['ический', 'ичный', 'альный', 'ельный', 'ованный',
    'енный', 'ённый', 'ивный', 'ущий', 'ющий',
    'ческий', 'еский', 'истый', 'атый', 'ятый',
    'овый', 'евый', 'ский', 'цкий', 'чный'];
  for (const suf of adjSuffixes) {
    if (s.endsWith(suf) && s.length > suf.length + 2) {
      s = s.slice(0, -suf.length);
      stripped = true;
      break;
    }
  }
  if (!stripped) {
    const shortAdj = ['ный', 'ний', 'ой', 'ый', 'ий', 'ая', 'яя', 'ое', 'ее'];
    for (const suf of shortAdj) {
      if (s.endsWith(suf) && s.length > suf.length + 2) {
        s = s.slice(0, -suf.length);
        break;
      }
    }
  }

  // 去掉-ся/сь结尾
  if (s.endsWith('ся') || s.endsWith('сь')) s = s.slice(0, -2);

  // 排除本身就是功能词/前置词/连接词的情况
  const shortWords = ['в','к','с','у','на','за','до','по','под','над','от','о','об',
    'и','а','но','да','или','же','ни','не','без','для','через','перед','между',
    'раз','вы','при','про','со','из','во','обо','ото','подо','пред'];
  if (shortWords.includes(s)) return '';

  // 去除前缀，但要有足够基础长度且保留部分常见短前缀
  const prefixes = ['без', 'бес', 'вз', 'вос', 'воз', 'вы', 'до', 'за',
    'из', 'ис', 'на', 'над', 'не', 'низ', 'о', 'об', 'обо',
    'от', 'ото', 'пере', 'по', 'под', 'подо', 'пред', 'пре',
    'при', 'про', 'раз', 'рас', 'роз', 'с', 'со'];
  // 'у' 不在这里 - 因为它太短，容易误删导致词根不匹配
  for (const p of prefixes) {
    if (s.startsWith(p) && s.length > p.length + 3) {
      s = s.slice(p.length);
      break;
    }
  }

  // 结果太短则无效
  if (s.length < 3) return '';

  // 标准化：处理常见的语音交替
  s = s.replace(/ь$/, '');  // 去掉末尾软音符号
  s = s.replace(/ё/g, 'е'); // е=ё统一

  return s;
}

// 按词干分组
console.log('Grouping words by stem...');
const stemGroups = {};
for (const [word, info] of Object.entries(allWords)) {
  const stem = extractStem(word);
  if (!stem) continue;
  if (!stemGroups[stem]) stemGroups[stem] = [];
  stemGroups[stem].push(word);
}

// 过滤：只有2个以上同词干的才记录
const significantStems = Object.entries(stemGroups)
  .filter(([stem, words]) => words.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`  ${significantStems.length} stems with 2+ words`);

// 输出一些示例看看效果
console.log('\nSample cognate groups:');
significantStems.slice(0, 10).forEach(([stem, words]) => {
  console.log(`  ${stem}: ${words.slice(0, 5).join(', ')}`);
});

// 现在，对每个文件，找到同词根词并添加到相关词汇表
console.log('\nAdding cognates to related words tables...');

// 获取词干 -> word 的反向映射
const wordToStem = {};
for (const [word] of Object.entries(allWords)) {
  const stem = extractStem(word);
  if (stem && stemGroups[stem] && stemGroups[stem].length >= 2) {
    wordToStem[word] = stem;
  }
}

let modified = 0;

for (const [word, info] of Object.entries(allWords)) {
  const stem = wordToStem[word];
  if (!stem) continue;

  // 同源词
  const cognates = stemGroups[stem].filter(w => w !== word);
  if (cognates.length === 0) continue;

  // 检查是否已经在相关词汇表里
  const content = info.content;
  const tableMatch = content.match(/## 📚 相关词汇\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/);

  // 构建要添加的行
  let newRows = [];
  for (const cog of cognates) {
    const cogInfo = allWords[cog];
    if (!cogInfo) continue;

    // 检查是否已经表格里
    if (tableMatch) {
      const existingSection = tableMatch[1];
      if (existingSection.includes(cog) || existingSection.includes(`[[${cog}]]`)) {
        continue; // 已存在
      }
    }

    // 检查是否在独立的 📚 相关词 列表里
    if (content.includes(`[[${cog}]]`) || content.includes(`- ${cog}`)) {
      continue;
    }

    newRows.push(`| [[${cog}]] | ${cogInfo.type} | ${cogInfo.meaning} |`);
  }

  if (newRows.length === 0) continue;

  // 添加到文件
  let newContent = content;
  if (tableMatch) {
    // 在表格末尾追加
    const afterTable = content.indexOf(tableMatch[0]) + tableMatch[0].length;
    newContent = content.slice(0, afterTable) + '\n' + newRows.join('\n') + content.slice(afterTable);
  } else {
    // 没有表格，在 📚 相关词 之后插入
    const relatedSection = content.match(/## 📚 相关词\r?\n[\s\S]*?(?=\r?\n## |\r?\n$|$)/);
    if (relatedSection) {
      const newSection = relatedSection[0] + '\n\n## 📚 相关词汇\n| 词 | 词性 | 含义 |\n|---|---|---|\n' + newRows.join('\n') + '\n';
      newContent = content.replace(relatedSection[0], newSection);
    } else {
      // 在文件末尾追加
      newContent = content + `\n## 📚 相关词汇\n| 词 | 词性 | 含义 |\n|---|---|---|\n` + newRows.join('\n') + '\n';
    }
  }

  if (newContent !== content) {
    if (!DRY_RUN) {
      fs.writeFileSync(info.file, newContent, 'utf8');
    }
    modified++;
    if (modified % 100 === 0) process.stderr.write('.');
    if (modified <= 5 || DRY_RUN) {
      console.log(`  ${word} → ${newRows.length} cognates: ${cognates.slice(0, 3).join(', ')}`);
    }
  }
}

console.log(`\n\nModified: ${modified} files`);
if (DRY_RUN) console.log('(dry-run mode)');
