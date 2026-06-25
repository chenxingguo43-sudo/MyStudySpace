/**
 * match-textbook.js
 * 从俄语资料库（教材）中匹配例句到B2单词表
 * 用法: node scripts/match-textbook.js [--dry-run]
 *
 * 数据源：
 * - В мире людей 阅读口语 Markdown版（RU/ZH段落对照）
 * - В мире людей 听力口语 Markdown版（俄语原文/中文翻译句对）
 * - В мире людей 写作口语 Markdown版（OCR页面）
 * - 新编俄语语法 Markdown版（语法例词/例句）
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VAULT = path.join(__dirname, '..', '俄语笔记库');
const B2_DIR = path.join(VAULT, '词汇', 'B2单词表');
const RESOURCE_DIR = path.join(__dirname, '..', '俄语资料库');

// 去除重音标记
function stripStress(text) {
  return text
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ы́/g, 'ы')
    .replace(/э́/g, 'э').replace(/ю́/g, 'ю').replace(/я́/g, 'я')
    .replace(/А́/g, 'А').replace(/Е́/g, 'Е').replace(/И́/g, 'И')
    .replace(/О́/g, 'О').replace(/У́/g, 'У').replace(/Ы́/g, 'Ы')
    .replace(/Э́/g, 'Э').replace(/Ю́/g, 'Ю').replace(/Я́/g, 'Я');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========== 解析各种格式的中俄对照 ==========

// 阅读口语: ### RU / ### ZH 或 #### RU / #### ZH 段落对照
function parseReadingSpeaking(content) {
  const pairs = [];
  // 支持 ### 和 #### 两种标题级别
  const sections = content.split(/(?=^#{2,4}\s+(?:RU|ZH)\s*$)/m);
  for (let i = 0; i < sections.length - 1; i++) {
    const ruMatch = sections[i].match(/^#{2,4}\s+RU\s*\n([\s\S]*?)(?=\n#{2,4}\s|$)/);
    const zhMatch = sections[i + 1] && sections[i + 1].match(/^#{2,4}\s+ZH\s*\n([\s\S]*?)(?=\n#{2,4}\s|$)/);
    if (ruMatch && zhMatch) {
      const ru = ruMatch[1].trim();
      const zh = zhMatch[1].trim();
      if (ru.length > 10 && zh.length > 5) {
        pairs.push({ ru, zh });
      }
    }
  }
  return pairs;
}

// 听力口语: **俄语原文：** / **中文翻译：** 句对
function parseListeningSpeaking(content) {
  const pairs = [];
  // 匹配 "俄语原文：xxx" 和紧随的 "中文翻译：xxx"
  const regex = /\*\*俄语原文[：:]\*\*\s*\n?([\s\S]*?)(?=\*\*中文翻译[：:]\*\*|$)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const ru = m[1].trim();
    // 找对应的中文
    const afterRu = content.slice(m.index + m[0].length);
    const zhMatch = afterRu.match(/^\s*\*\*中文翻译[：:]\*\*\s*\n?([\s\S]*?)(?=\n---|\n\*\*俄语|\n##|\n\*\*\d|$)/);
    if (zhMatch) {
      const zh = zhMatch[1].trim();
      if (ru.length > 10 && zh.length > 5 && !ru.startsWith('1.') && !ru.startsWith('а)')) {
        pairs.push({ ru, zh });
      }
    }
  }
  return pairs;
}

// 写作口语: OCR页面格式，提取俄语句子
function parseWritingSpeaking(content) {
  const pairs = [];
  // 匹配 ## r0015-XXXX 段落
  const sections = content.split(/^## r\d+-\d+/m);
  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim() && !l.startsWith('-') && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('```'));
    const ruText = lines.join(' ').trim();
    if (ruText.length > 20 && /[а-яА-ЯёЁ]{3,}/.test(ruText)) {
      // 写作口语没有中文翻译，标记 source 为 different
      pairs.push({ ru: ruText, zh: '', source: 'textbook_writing' });
    }
  }
  return pairs;
}

// 语法: 表格中的例词和例句
function parseGrammar(content) {
  const pairs = [];
  // 匹配表格行中的俄语单词+中文: | word [中文] |
  const tableRows = content.match(/\|[^\n]*\|[^\n]*\|/g) || [];
  for (const row of tableRows) {
    // 匹配 "слово [翻译]" 模式
    const cellMatches = row.match(/([а-яА-ЯёЁ][а-яА-ЯёЁ\s-]*)\[([^\]]+)\]/g) || [];
    for (const cell of cellMatches) {
      const m = cell.match(/([а-яА-ЯёЁ][а-яА-ЯёЁ\s-]*)\[([^\]]+)\]/);
      if (m) {
        const ru = m[1].trim();
        const zh = m[2].trim();
        if (ru.length > 1) {
          pairs.push({ ru, zh, source: 'textbook_grammar' });
        }
      }
    }
  }
  // 也匹配行内 "word — 翻译" 格式
  const inlineMatches = content.match(/([а-яА-ЯёЁ]+)\s*[—–-]\s*([^\n,;]{2,30})/g) || [];
  for (const match of inlineMatches) {
    const m = match.match(/([а-яА-ЯёЁ]+)\s*[—–-]\s*(.+)/);
    if (m && /[一-鿿]/.test(m[2])) {
      pairs.push({ ru: m[1].trim(), zh: m[2].trim(), source: 'textbook_grammar' });
    }
  }
  return pairs;
}

// ========== 加载所有教材句子 ==========

console.log('Loading textbook resources...');
const allSentences = []; // {ru, zh, book, stripped}

function loadDir(dirPath, bookName, parser) {
  if (!fs.existsSync(dirPath)) return;
  const files = [];
  scanFiles(dirPath, files);
  let count = 0;
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const pairs = parser(content);
    for (const p of pairs) {
      if (p.ru.length > 10) {
        allSentences.push({
          ru: p.ru,
          zh: p.zh || '',
          book: bookName,
          stripped: stripStress(p.ru).toLowerCase(),
          source: p.source || bookName
        });
        count++;
      }
    }
  }
  console.log(`  ${bookName}: ${count} sentences from ${files.length} files`);
}

function scanFiles(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name === '卡片草稿' || entry.name === '备份') continue;
      scanFiles(fullPath, files);
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(fullPath);
    }
  }
}

// 加载4个教材目录
loadDir(
  path.join(RESOURCE_DIR, 'В мире людей 阅读口语 Markdown版'),
  'textbook_reading',
  parseReadingSpeaking
);
loadDir(
  path.join(RESOURCE_DIR, 'В мире людей 听力口语 Markdown版'),
  'textbook_listening',
  parseListeningSpeaking
);
loadDir(
  path.join(RESOURCE_DIR, 'В мире людей 写作口语 Markdown版'),
  'textbook_writing',
  parseWritingSpeaking
);
loadDir(
  path.join(RESOURCE_DIR, '新编俄语语法 Markdown版'),
  'textbook_grammar',
  parseGrammar
);

console.log(`\nTotal: ${allSentences.length} sentences loaded`);

// ========== 匹配逻辑 ==========

function findExamples(word, maxExamples = 3) {
  const wordLower = word.toLowerCase();
  const wordNoYo = wordLower.replace(/ё/g, 'е');
  const results = [];
  const seen = new Set();

  for (const sent of allSentences) {
    if (results.length >= maxExamples) break;

    const s = sent.stripped;
    let matched = false;
    let matchedWord = wordLower;

    // 精确匹配（去重音后）
    if (s.includes(wordLower)) {
      matched = true;
    } else if (wordNoYo !== wordLower && s.includes(wordNoYo)) {
      matched = true;
      matchedWord = wordNoYo;
    }

    if (matched) {
      // 在原始句子中标记目标词
      const regex = new RegExp(`(${escapeRegex(word).replace(/ё/g, '[её]')})`, 'gi');
      let marked = sent.ru.replace(regex, '==$1==');

      // 如果原始标记失败（因为重音），尝试去重音版本
      if (marked === sent.ru) {
        const strippedWord = stripStress(word);
        const regex2 = new RegExp(`(${escapeRegex(strippedWord)})`, 'gi');
        marked = sent.ru.replace(regex2, '==$1==');
      }

      if (marked !== sent.ru && !seen.has(marked)) {
        seen.add(marked);
        results.push({
          ru: marked,
          zh: sent.zh,
          source: sent.source
        });
      }
    }
  }

  return results;
}

// ========== 处理文件 ==========

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const fmBlock = fmMatch[1];
  const wordMatch = fmBlock.match(/^word:\s*"?(.+?)"?\s*$/m);
  if (!wordMatch) return null;

  const word = wordMatch[1].replace(/^"|"$/g, '');

  // 检查是否已有 textbook_ 来源的例句
  if (content.includes('source: "textbook_')) return null;

  const examples = findExamples(word, 3);
  if (examples.length === 0) return null;

  // 构建 YAML 例句块
  const yamlLines = examples.map(ex => {
    const ruEscaped = ex.ru.replace(/"/g, '\\"');
    const zhEscaped = (ex.zh || '').replace(/"/g, '\\"');
    const lines = [`  - ru: "${ruEscaped}"`];
    if (ex.zh) lines.push(`    zh: "${zhEscaped}"`);
    lines.push(`    primary: true`);
    lines.push(`    source: "${ex.source}"`);
    return lines.join('\n');
  });

  const yamlBlock = 'examples:\n' + yamlLines.join('\n');

  // 替换或追加 examples
  let newContent;
  if (fmBlock.includes('examples: []')) {
    newContent = content.replace('examples: []', yamlBlock);
  } else if (fmBlock.includes('examples:\n') || fmBlock.includes('examples:\r\n')) {
    // 已有 examples，检查是否需要追加
    const exMatch = fmBlock.match(/examples:[\s\S]*?(?=\n\w|\r?\n\w|\r?\n---)/);
    if (exMatch && exMatch[0].includes('- ru:')) {
      // 已有例句，追加新的
      const existingRu = [];
      const ruRegex = /- ru:\s*"([^"]+)"/g;
      let m;
      while ((m = ruRegex.exec(exMatch[0])) !== null) {
        existingRu.push(m[1].replace(/==/g, ''));
      }

      const newExamples = examples.filter(ex => {
        const cleanRu = ex.ru.replace(/==/g, '');
        return !existingRu.some(e => stripStress(e) === stripStress(cleanRu));
      });

      if (newExamples.length === 0) return null;

      const newLines = newExamples.map(ex => {
        const ruEscaped = ex.ru.replace(/"/g, '\\"');
        const zhEscaped = (ex.zh || '').replace(/"/g, '\\"');
        const lines = [`  - ru: "${ruEscaped}"`];
        if (ex.zh) lines.push(`    zh: "${zhEscaped}"`);
        lines.push(`    primary: true`);
        lines.push(`    source: "${ex.source}"`);
        return lines.join('\n');
      });

      const insertPoint = content.indexOf(exMatch[0]) + exMatch[0].length;
      newContent = content.slice(0, insertPoint) + '\n' + newLines.join('\n') + content.slice(insertPoint);
      return { word, examples: newExamples, newContent, appended: true };
    } else {
      newContent = content.replace(
        /examples:[\s\S]*?(?=\n\w|\r?\n\w|\r?\n---)/,
        yamlBlock + '\n'
      );
    }
  } else {
    newContent = content.replace(/(^created:)/m, yamlBlock + '\n$1');
  }

  return { word, examples, newContent, appended: false };
}

// ========== 主流程 ==========

function main() {
  console.log('\nScanning B2单词表...');
  const files = [];
  scanVocabDir(B2_DIR, files);
  console.log(`  ${files.length} files to process`);

  let matched = 0;
  let appended = 0;
  let failed = 0;
  const failedWords = [];

  for (const filePath of files) {
    const result = processFile(filePath);
    if (result) {
      matched++;
      if (result.appended) appended++;
      console.log(`  ✅ ${result.word} — ${result.examples.length} examples${result.appended ? ' (appended)' : ''}`);
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, result.newContent, 'utf8');
      }
    } else {
      failed++;
      const word = path.basename(filePath, '.md');
      failedWords.push(word);
    }
  }

  console.log(`\n========== 结果 ==========`);
  console.log(`匹配成功: ${matched} (其中追加: ${appended})`);
  console.log(`未匹配: ${failed}`);
  if (DRY_RUN) console.log(`(dry-run 模式，未实际写入文件)`);
}

function scanVocabDir(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      scanVocabDir(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
}

main();
