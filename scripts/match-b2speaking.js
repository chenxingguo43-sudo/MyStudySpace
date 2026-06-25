/**
 * match-b2speaking.js
 * 从B2口语素材中匹配例句到B2单词表
 * 用法: node scripts/match-b2speaking.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VAULT = path.join(__dirname, '..', '俄语笔记库');
const B2_DIR = path.join(VAULT, '词汇', 'B2单词表');
const SPEAKING_DIR = path.join(VAULT, 'B2口语素材');

// 去除重音标记: á→a, é→e, и́→и, о́→о, у́→у, ы́→ы, э́→э, ю́→ю, я́→я
function stripStress(text) {
  return text
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/и́/g, 'и')
    .replace(/о́/g, 'о').replace(/у́/g, 'у').replace(/ы́/g, 'ы')
    .replace(/э́/g, 'э').replace(/ю́/g, 'ю').replace(/я́/g, 'я')
    .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
    .replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ы́/g, 'Ы')
    .replace(/Э́/g, 'Э').replace(/Ю́/g, 'Ю').replace(/Я́/g, 'Я');
}

// 加载B2口语素材
console.log('Loading B2口语素材...');
const speakingSentences = []; // {ru, zh, chapter, section}

function loadSpeakingDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      loadSpeakingDir(fullPath);
    } else if (entry.name.endsWith('.md') && entry.name !== 'B2口语素材总索引.md') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];

      const ruMatch = fm.match(/^ru:\s*"?(.+?)"?\s*$/m);
      const zhMatch = fm.match(/^zh:\s*"?(.+?)"?\s*$/m);
      const chapterMatch = fm.match(/^chapter:\s*"?(.+?)"?\s*$/m);
      const sectionMatch = fm.match(/^section:\s*"?(.+?)"?\s*$/m);

      if (ruMatch) {
        const ru = ruMatch[1].replace(/^"|"$/g, '');
        const zh = zhMatch ? zhMatch[1].replace(/^"|"$/g, '') : '';
        const chapter = chapterMatch ? chapterMatch[1].replace(/^"|"$/g, '') : '';
        const section = sectionMatch ? sectionMatch[1].replace(/^"|"$/g, '') : '';

        if (ru.length > 5) { // 跳过太短的（单个词）
          speakingSentences.push({ ru, zh, chapter, section });
        }
      }
    }
  }
}

loadSpeakingDir(SPEAKING_DIR);
console.log(`  ${speakingSentences.length} sentences loaded`);

// 构建去重音的搜索索引
const strippedSentences = speakingSentences.map(s => ({
  ...s,
  ruStripped: stripStress(s.ru).toLowerCase()
}));

// 查找单词的例句
function findExamples(word, maxExamples = 3) {
  const wordLower = word.toLowerCase();
  const wordNoYo = wordLower.replace(/ё/g, 'е');
  const results = [];

  for (const sent of strippedSentences) {
    if (results.length >= maxExamples) break;

    // 检查是否包含目标词（忽略重音）
    const ruStripped = sent.ruStripped;

    // 用词边界匹配：检查单词是否作为独立词出现
    // 简单方案：检查是否包含该子串
    let matched = false;
    if (ruStripped.includes(wordLower)) {
      matched = true;
    } else if (wordNoYo !== wordLower && ruStripped.includes(wordNoYo)) {
      matched = true;
    }

    if (matched) {
      // 在原始句子中标记目标词（保留重音）
      const regex = new RegExp(`(${escapeRegex(word).replace(/ё/g, '[её]')})`, 'gi');
      let marked = sent.ru.replace(regex, '==$1==');

      // 如果原始标记没成功（因为重音），尝试用去重音版本标记
      if (marked === sent.ru) {
        const strippedWord = stripStress(word);
        const regex2 = new RegExp(`(${escapeRegex(strippedWord)})`, 'gi');
        marked = sent.ru.replace(regex2, '==$1==');
      }

      // 确保确实标记了
      if (marked !== sent.ru) {
        results.push({
          ru: marked,
          zh: sent.zh,
          chapter: sent.chapter,
          section: sent.section,
          source: 'b2_speaking'
        });
      }
    }
  }

  return results;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 处理单个文件
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const fmBlock = fmMatch[1];
  const wordMatch = fmBlock.match(/^word:\s*"?(.+?)"?\s*$/m);
  if (!wordMatch) return null;

  const word = wordMatch[1].replace(/^"|"$/g, '');

  // 查找例句
  const examples = findExamples(word, 3);
  if (examples.length === 0) return null;

  // 构建 YAML 例句块
  const yamlLines = examples.map(ex => {
    const ruEscaped = ex.ru.replace(/"/g, '\\"');
    const zhEscaped = (ex.zh || '').replace(/"/g, '\\"');
    const lines = [`  - ru: "${ruEscaped}"`];
    if (ex.zh) lines.push(`    zh: "${zhEscaped}"`);
    lines.push(`    primary: true`);
    lines.push(`    source: "b2_speaking"`);
    return lines.join('\n');
  });

  const yamlBlock = 'examples:\n' + yamlLines.join('\n');

  // 替换 frontmatter 中的 examples 字段
  let newContent;
  if (fmBlock.includes('examples: []')) {
    newContent = content.replace('examples: []', yamlBlock);
  } else if (fmBlock.includes('examples:\n') || fmBlock.includes('examples:\r\n')) {
    // 检查是否已有 examples 内容
    const exMatch = fmBlock.match(/examples:[\s\S]*?(?=\n\w|\r?\n\w|\r?\n---)/);
    if (exMatch && exMatch[0].includes('- ru:')) {
      // 已有例句，追加新的（去重）
      const existingRu = [];
      const ruRegex = /- ru:\s*"([^"]+)"/g;
      let m;
      while ((m = ruRegex.exec(exMatch[0])) !== null) {
        existingRu.push(m[1].replace(/==/g, ''));
      }

      // 过滤掉已存在的例句
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
        lines.push(`    source: "b2_speaking"`);
        return lines.join('\n');
      });

      // 在现有 examples 块末尾追加
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
    newContent = content.replace(
      /(^created:)/m,
      yamlBlock + '\n$1'
    );
  }

  return { word, examples, newContent, appended: false };
}

// 主流程
function main() {
  // 扫描所有没有例句或需要补充的文件
  console.log('\nScanning for files to process...');
  const files = [];
  scanDir(B2_DIR, files);
  console.log(`  ${files.length} files found (without b2_speaking examples)`);

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

  if (failedWords.length > 0 && failedWords.length <= 50) {
    console.log(`\n未匹配的单词:`);
    failedWords.forEach(w => console.log(`  - ${w}`));
  } else if (failedWords.length > 50) {
    console.log(`\n未匹配: ${failedWords.length} 个单词（太多不列出）`);
  }
}

function scanDir(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      scanDir(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // 检查是否已有 b2_speaking 例句
      if (!content.includes('source: "b2_speaking"')) {
        files.push(fullPath);
      }
    }
  }
}

main();
