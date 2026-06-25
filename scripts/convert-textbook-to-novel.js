/**
 * convert-textbook-to-novel.js
 * 将阅读口语学习单元转成小说阅读器JSON格式
 * 用法: node scripts/convert-textbook-to-novel.js
 */

const fs = require('fs');
const path = require('path');

const LEARNING_UNITS_DIR = path.join(__dirname, '..', '俄语资料库', 'В мире людей 阅读口语 Markdown版', '学习单元');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'textbook', 'reading_speaking');
const INDEX_FILE = path.join(__dirname, '..', 'data', 'textbook', 'index.json');

// 确保输出目录存在
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 提取练习和答案
function extractExercises(content) {
  const exercises = [];
  const lines = content.split('\n');

  // 找选择题部分
  let inChoiceSection = false;
  let currentQuestion = null;
  let questions = [];
  let answers = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测选择题开始
    if (line.match(/### 2\.\d*\s*选择题/) || line.match(/### \d+\.\d*\s*选择题/)) {
      inChoiceSection = true;
      continue;
    }

    // 检测选择题结束（其他section开始）
    if (inChoiceSection && line.match(/^### \d+\.\d*\s*(?!选择题)/)) {
      inChoiceSection = false;
    }

    // 解析选择题
    if (inChoiceSection) {
      // 匹配题目: "1. **题目内容**"
      const qMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*/);
      if (qMatch) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          num: parseInt(qMatch[1]),
          question: qMatch[2],
          options: [],
          zhQuestion: '',
          zhOptions: []
        };
        continue;
      }

      // 匹配选项: "- а) 选项内容"
      const optMatch = line.match(/^\s+-\s+([а-яё])\)\s+(.+)/);
      if (optMatch && currentQuestion) {
        currentQuestion.options.push(optMatch[1] + ') ' + optMatch[2]);
        continue;
      }
    }

    // 解析中文提示（在选择题区域内）
    if (inChoiceSection && line.includes('[!quote]- 中文提示')) {
      // 读取后续的中文行
      let zhLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('>') && lines[j].trim().length > 1) {
          zhLines.push(lines[j].replace(/^>\s*/, '').trim());
        } else {
          break;
        }
      }
      if (currentQuestion && zhLines.length > 0) {
        // 第一行是题目翻译
        currentQuestion.zhQuestion = zhLines[0];
        // 后续行是选项翻译
        for (let z = 1; z < zhLines.length; z++) {
          const zhOpt = zhLines[z].replace(/^-\s+/, '');
          if (zhOpt) currentQuestion.zhOptions.push(zhOpt);
        }
      }
    }

    // 解析答案表格
    if (line.includes('选择题答案与解析') || line.includes('| 题号 | 答案')) {
      // 读取答案表格
      for (let j = i + 1; j < lines.length; j++) {
        const rowMatch = lines[j].match(/\|\s*(\d+)\s*\|\s*([а-яёА-ЯЁ])\s*\|\s*(.+?)\s*\|/);
        if (rowMatch) {
          answers[parseInt(rowMatch[1])] = {
            answer: rowMatch[2],
            explanation: rowMatch[3].trim()
          };
        }
        if (lines[j].trim() === '' && j > i + 2) break;
      }
    }
  }

  if (currentQuestion) questions.push(currentQuestion);

  // 合并题目和答案
  for (const q of questions) {
    const ans = answers[q.num];
    exercises.push({
      type: 'choice',
      num: q.num,
      question: q.question,
      zhQuestion: q.zhQuestion,
      options: q.options,
      zhOptions: q.zhOptions,
      answer: ans ? ans.answer : '',
      explanation: ans ? ans.explanation : ''
    });
  }

  return exercises;
}

// 读取所有学习单元文件
const files = fs.readdirSync(LEARNING_UNITS_DIR)
  .filter(f => f.endsWith('.md') && f.startsWith('Текст'))
  .sort();

console.log(`Found ${files.length} learning units`);

const chapters = [];

for (let i = 0; i < files.length; i++) {
  const filePath = path.join(LEARNING_UNITS_DIR, files[i]);
  const content = fs.readFileSync(filePath, 'utf8');

  // 提取标题
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : files[i].replace('.md', '');

  // 提取中俄对照段落
  const original = [];
  const translated = [];

  // 分割成行
  const lines = content.split('\n');

  // 找到中俄对照部分的开始和结束
  let startIdx = -1;
  let endIdx = lines.length;

  for (let j = 0; j < lines.length; j++) {
    const line = lines[j];
    // 匹配各种格式的中俄对照section标题
    if (line.match(/^## \d+\.\s*(中俄对照|阅读正文)/) || line.match(/^## \d+\.\s*阅读/)) {
      startIdx = j;
    }
    // 中俄对照之后的section作为结束
    if (startIdx > 0 && j > startIdx && line.match(/^## \d+\.\s*(原书任务|主题理解|长难句|语法解析|词汇匹配|学习卡片|学习建议|俄语原文)/)) {
      endIdx = j;
      break;
    }
  }

  if (startIdx < 0) {
    // 尝试备选：搜索 **RU:** 段落区域
    startIdx = 0;
  }

  let currentRu = '';
  let currentZh = '';
  let inZhBlock = false;
  let zhLines = [];

  for (let j = startIdx; j < endIdx; j++) {
    const line = lines[j];

    // 检测 RU 段落（支持 **RU:** 和 ### RU 两种格式）
    if (line.match(/^\*\*RU:\*\*/) || line.match(/^### RU\s*$/)) {
      // 保存前一段
      if (currentRu.trim()) {
        original.push(currentRu.trim());
        translated.push(currentZh.trim());
      }
      if (line.match(/^\*\*RU:\*\*/)) {
        currentRu = line.replace(/\*\*RU:\*\*/, '').trim();
      } else {
        // ### RU 格式，下一行开始是内容
        currentRu = '';
      }
      currentZh = '';
      inZhBlock = false;
      continue;
    }

    // 检测中文译文块开始（支持多种格式）
    if (line.includes('[!quote]- 中文译文') || line.match(/^### ZH\s*$/)) {
      inZhBlock = true;
      zhLines = [];
      continue;
    }

    // 中文译文块内容
    if (inZhBlock) {
      if (line.startsWith('>') && line.trim().length > 1) {
        zhLines.push(line.replace(/^>\s*/, '').trim());
      } else if (line.trim() === '' || (!line.startsWith('>') && !line.startsWith(' '))) {
        currentZh = zhLines.join(' ');
        inZhBlock = false;
      }
      continue;
    }

    // 如果在RU段落后但还没到ZH块，可能是多行RU内容
    if (currentRu !== undefined && !inZhBlock && line.trim() &&
        !line.match(/^\*\*RU:\*\*/) && !line.match(/^###/) && !line.startsWith('>') && !line.startsWith('#')) {
      // 停止收集的条件：遇到练习题、选择题、表格等
      if (line.match(/^(Выберите|Задание|1\.\s*\*\*|Жизнь людей|Полина |Автор:|После|Вариант)/)) {
        break;
      }
      // 跳过练习相关内容
      if (line.match(/^\d+\.\s+[А-ЯЁ]/) || line.match(/^-\s+[а-яё]\)/)) {
        break;
      }
      if (line.trim() && !line.startsWith('**') && !line.match(/^\d+\./) && !line.startsWith('-')) {
        currentRu += (currentRu ? ' ' : '') + line.trim();
      }
    }
  }

  // 处理最后一段
  if (currentRu.trim()) {
    original.push(currentRu.trim());
    translated.push(currentZh.trim());
  }

  // 清理：移除 <mark> 标签
  const cleanOriginal = original.map(s => s.replace(/<\/?mark[^>]*>/g, ''));
  const cleanTranslated = translated.map(s => s.replace(/<\/?mark[^>]*>/g, ''));

  // 过滤空段落和练习内容
  const filteredOriginal = [];
  const filteredTranslated = [];
  for (let k = 0; k < cleanOriginal.length; k++) {
    const orig = cleanOriginal[k];
    if (orig.length < 10) continue;
    if (orig.match(/^(Выберите|Задание|Прослушайте|Прочитайте|Закончите)/)) continue;
    if (orig.match(/^\d+\.\s+[А-ЯЁ]/)) continue;
    if (orig.match(/^-\s+[а-яё]\)/)) continue;
    if (orig.includes('правильный вариант')) continue;
    if (orig.includes('中文译文') || orig.includes('中文提示')) continue;
    filteredOriginal.push(orig);
    filteredTranslated.push(cleanTranslated[k] || '');
  }

  if (filteredOriginal.length === 0) {
    console.log(`  ⚠️ ${title} — no paragraphs extracted`);
    continue;
  }

  // 提取练习和答案
  const exercises = extractExercises(content);

  // 生成JSON
  const chapter = {
    index: i,
    title: title,
    original: filteredOriginal,
    translated: filteredTranslated
  };
  if (exercises.length > 0) {
    chapter.exercises = exercises;
  }

  const chFileName = `ch${String(i).padStart(4, '0')}.json`;
  fs.writeFileSync(path.join(OUTPUT_DIR, chFileName), JSON.stringify(chapter, null, 2), 'utf8');

  chapters.push({
    id: `reading_speaking`,
    title: title,
    index: i,
    paragraphs: filteredOriginal.length
  });

  console.log(`  ✅ ${title} — ${filteredOriginal.length} paragraphs${exercises.length > 0 ? ', ' + exercises.length + ' exercises' : ''}`);
}

// 生成 index.json
const index = {
  books: [
    {
      id: 'reading_speaking',
      title: 'В мире людей — 阅读口语',
      author: 'М.Н. Макова, О.А. Ускова',
      direction: 'ru→cn',
      chapters: chapters.length,
      dir: 'reading_speaking',
      description: 'ТРКИ-2 阅读口语教材，30篇阅读文章（中俄对照）'
    }
  ]
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');

console.log(`\n========== 完成 ==========`);
console.log(`转换: ${chapters.length} 章节`);
console.log(`输出: ${OUTPUT_DIR}`);
console.log(`索引: ${INDEX_FILE}`);
