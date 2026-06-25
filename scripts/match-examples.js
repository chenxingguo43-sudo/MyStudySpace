/**
 * match-examples.js
 * 为没有例句的B2单词表文件匹配真实例句
 * 用法: node scripts/match-examples.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VAULT = path.join(__dirname, '..', '俄语笔记库');
const B2_DIR = path.join(VAULT, '词汇', 'B2单词表');
const SENTENCES_FILE = path.join(__dirname, '..', 'data', 'sentences.json');
const LEXEME_FILE = path.join(__dirname, '..', 'data', 'lexeme_index.json');
const NOVEL_DIR = path.join(__dirname, '..', 'data', 'novel');

// 加载数据
console.log('Loading sentences.json...');
const sentences = JSON.parse(fs.readFileSync(SENTENCES_FILE, 'utf8'));
console.log(`  ${sentences.length} sentences loaded`);

console.log('Loading lexeme_index.json...');
const lexemeIndex = JSON.parse(fs.readFileSync(LEXEME_FILE, 'utf8'));
const lexemeKeys = Object.keys(lexemeIndex);
console.log(`  ${lexemeKeys.length} lexeme entries loaded`);

// 构建 sentence_id -> sentence 映射
const sentenceMap = {};
for (const s of sentences) {
  sentenceMap[s.sentence_id] = s;
}

// 加载小说文本，构建搜索索引
console.log('Loading novel chapters...');
const novelLines = []; // {ru, zh, bookId, chapter}
try {
  const indexFile = JSON.parse(fs.readFileSync(path.join(NOVEL_DIR, 'index.json'), 'utf8'));
  for (const book of indexFile.books) {
    const bookDir = path.join(NOVEL_DIR, book.dir);
    if (!fs.existsSync(bookDir)) continue;
    const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const chapter = JSON.parse(fs.readFileSync(path.join(bookDir, f), 'utf8'));
      if (!chapter.translated) continue;
      for (let i = 0; i < chapter.translated.length; i++) {
        const ru = chapter.translated[i];
        const zh = chapter.original ? chapter.original[i] : '';
        if (ru && ru.length > 15) {
          novelLines.push({ ru, zh: zh || '', bookId: book.id, chapter: chapter.index || 0 });
        }
      }
    }
  }
} catch (e) {
  console.log('  Warning: could not load novels:', e.message);
}
console.log(`  ${novelLines.length} novel lines loaded`);

// 查找单词的例句
function findExamples(word, maxExamples = 3) {
  const wordLower = word.toLowerCase();
  const wordNoYo = wordLower.replace(/ё/g, 'е'); // ё→е 变体
  const results = [];

  // 生成搜索变体
  const searchVariants = [wordLower];
  if (wordNoYo !== wordLower) searchVariants.push(wordNoYo);

  // 1. 精确匹配 lexeme_index（含变体）
  for (const variant of searchVariants) {
    const entry = lexemeIndex[variant];
    if (entry && entry.sentence_ids) {
      for (const sid of entry.sentence_ids) {
        const sent = sentenceMap[sid];
        if (sent && sent.ru && sent.zh) {
          results.push({
            ru: sent.ru,
            zh: sent.zh,
            source: sent.source_id && sent.source_id.startsWith('r') ? 'novel' : 'sentences_db',
            score: sent.quality_score || 0,
            confidence: sent.confidence || 'medium'
          });
        }
      }
    }
  }

  // 2. 在 sentences.json 中直接搜索包含该单词的句子（含变体）
  if (results.length < maxExamples) {
    const seen = new Set(results.map(r => r.ru));
    for (const sent of sentences) {
      if (results.length >= maxExamples + 2) break;
      if (!sent.ru || !sent.zh) continue;
      if (seen.has(sent.ru)) continue;

      const ruLower = sent.ru.toLowerCase();
      let matchedVariant = null;
      for (const variant of searchVariants) {
        if (ruLower.includes(variant)) {
          matchedVariant = variant;
          break;
        }
      }
      if (matchedVariant) {
        const regex = new RegExp(`(${escapeRegex(matchedVariant)})`, 'gi');
        const marked = sent.ru.replace(regex, '==$1==');
        if (marked !== sent.ru) {
          results.push({
            ru: marked,
            zh: sent.zh,
            source: sent.source_id && sent.source_id.startsWith('r') ? 'novel' : 'sentences_db',
            score: sent.quality_score || 0,
            confidence: sent.confidence || 'low'
          });
          seen.add(sent.ru);
        }
      }
    }
  }

  // 3. 在小说文本中搜索（含变体）
  if (results.length < maxExamples) {
    const seen = new Set(results.map(r => r.ru.replace(/==/g, '')));
    for (const line of novelLines) {
      if (results.length >= maxExamples + 2) break;
      const ruLower = line.ru.toLowerCase();
      let matchedVariant = null;
      for (const variant of searchVariants) {
        if (ruLower.includes(variant)) {
          matchedVariant = variant;
          break;
        }
      }
      if (matchedVariant && !seen.has(line.ru)) {
        const regex = new RegExp(`(${escapeRegex(matchedVariant)})`, 'gi');
        const marked = line.ru.replace(regex, '==$1==');
        if (marked !== line.ru) {
          results.push({
            ru: marked,
            zh: line.zh,
            source: `novel_${line.bookId}`,
            score: 80,
            confidence: 'medium'
          });
          seen.add(line.ru);
        }
      }
    }
  }

  // 3. 按质量排序，取前 maxExamples 个
  results.sort((a, b) => {
    // 优先选有 zh 翻译的
    if (a.zh && !b.zh) return -1;
    if (!a.zh && b.zh) return 1;
    // 然后按 score 降序
    return b.score - a.score;
  });

  // 去重并限制数量
  const seen2 = new Set();
  const final = [];
  for (const r of results) {
    if (final.length >= maxExamples) break;
    const key = r.ru.replace(/==/g, '');
    if (seen2.has(key)) continue;
    seen2.add(key);
    final.push(r);
  }

  return final;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 给例句中的目标词加 == == 标记
function markWord(sentence, word) {
  const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
  return sentence.replace(regex, '==$1==');
}

// 处理单个文件
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const fmBlock = fmMatch[1];
  // 提取 word 字段
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
    lines.push(`    source: "${ex.source}"`);
    return lines.join('\n');
  });

  const yamlBlock = 'examples:\n' + yamlLines.join('\n');

  // 替换 frontmatter 中的 examples 字段
  let newContent;
  if (fmBlock.includes('examples: []')) {
    newContent = content.replace('examples: []', yamlBlock);
  } else if (fmBlock.includes('examples:\n') || fmBlock.includes('examples:\r\n')) {
    // 替换现有的 examples 块（可能为空或有内容）
    newContent = content.replace(
      /examples:[\s\S]*?(?=\n\w|\r?\n\w|\r?\n---)/,
      yamlBlock + '\n'
    );
  } else {
    // 在 created 之前插入
    newContent = content.replace(
      /(^created:)/m,
      yamlBlock + '\n$1'
    );
  }

  return { word, examples, newContent };
}

// 主流程
function main() {
  // 读取所有没有例句的文件
  const listFile = path.join(__dirname, '..', '..', 'tmp', 'all_no_examples.txt');
  let files;
  if (fs.existsSync(listFile)) {
    files = fs.readFileSync(listFile, 'utf8').trim().split('\n').filter(Boolean);
  } else {
    // 扫描目录
    console.log('Scanning for files without examples...');
    files = [];
    scanDir(B2_DIR, files);
  }

  console.log(`\nProcessing ${files.length} files...`);

  let matched = 0;
  let failed = 0;
  const failedWords = [];

  for (const filePath of files) {
    const relPath = path.relative(path.join(__dirname, '..'), filePath);
    const result = processFile(filePath);

    if (result) {
      matched++;
      console.log(`  ✅ ${result.word} — ${result.examples.length} examples`);
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, result.newContent, 'utf8');
      }
    } else {
      failed++;
      const word = path.basename(filePath, '.md');
      failedWords.push(word);
      console.log(`  ❌ ${word} — no match found`);
    }
  }

  console.log(`\n========== 结果 ==========`);
  console.log(`匹配成功: ${matched}`);
  console.log(`未匹配: ${failed}`);
  if (DRY_RUN) {
    console.log(`(dry-run 模式，未实际写入文件)`);
  }

  if (failedWords.length > 0) {
    console.log(`\n未匹配的单词:`);
    failedWords.forEach(w => console.log(`  - ${w}`));
  }
}

function scanDir(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue; // skip backups
      scanDir(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!/^\s*- ru:/m.test(content)) {
        files.push(fullPath);
      }
    }
  }
}

main();
