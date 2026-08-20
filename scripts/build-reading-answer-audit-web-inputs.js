/* Build refreshed web-AI packages from the full-book MinerU Markdown and the
 * answers already verified against the printed key. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const audit = require('./audit-reading-answers-against-full-mineru.js');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const outputRoot = path.join(root, 'docs', 'reader-ai-reading', 'answer-audit', 'web-inputs-12');
const sourcePath = String.raw`D:\下载\MinerU\文件转换\В мире людей 阅读口语.pdf-4d908977-e819-4950-8fce-f552d6171ca4\MinerU_markdown_202608191105372_6e8347d7.md`;

const chapters = [
  ['1.4.2', 'ch0007.json'], ['1.5.1', 'ch0008.json'], ['1.5.2', 'ch0009.json'],
  ['2.5.1', 'ch0018.json'], ['3.1.2', 'ch0021.json'], ['3.2.2', 'ch0023.json'],
  ['3.3.1', 'ch0024.json'], ['3.3.2', 'ch0025.json'], ['3.4.1', 'ch0026.json'],
  ['3.4.2', 'ch0027.json'], ['3.5.1', 'ch0028.json'], ['3.5.2', 'ch0029.json']
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function titleWithoutCode(title) {
  return String(title || '').replace(/^Текст\s+[^—]+—\s*/, '').trim();
}

function sourceFor(chapter, sections) {
  let source = String(sections.get(chapter) || '').trim();
  // Some MinerU chapter sections run into the book-wide answer area because
  // the next chapter heading is not consistently recognized. Keep only the
  // chapter material before the printed answer heading.
  const keyIndex = source.search(/\n\s*(?:#{1,6}\s*)?КЛЮЧИ\s*\n/i);
  if (keyIndex >= 0) source = source.slice(0, keyIndex).trim();
  if (chapter === '3.4.2') {
    // MinerU places a continuation of the body directly after question 7.
    // Preserve it for questions 8-10, but put an explicit separator before it
    // so it cannot be read as part of question 7's stem or options.
    const q7 = source.indexOf('7. Строев узнал об Александре');
    const q8 = source.indexOf('8. По мнению Юрия Александровича', q7 + 1);
    if (q7 >= 0 && q8 > q7) {
      const beforeQ8 = source.slice(q7, q8);
      const continuationStart = beforeQ8.indexOf('\n\n');
      if (continuationStart >= 0) {
        const head = beforeQ8.slice(0, continuationStart).trimEnd();
        const continuation = beforeQ8.slice(continuationStart).trim();
        source = source.slice(0, q7)
          + `${head}\n\n### 正文续段（MinerU 排版纠正，不属于第 7 题题干）\n\n${continuation}\n\n`
          + source.slice(q8);
      }
    }
  }
  return source;
}

function renderExercises(exercises) {
  const lines = ['## 三、Reader 题目与已确认答案', '',
    '> 答案已经根据原书答案页核对；网页端 AI 只负责找原文证据和解释，不得重新改答案。'];
  for (const exercise of exercises) {
    lines.push('', `### 第 ${exercise.num} 题`, '', `题干（俄语）：${exercise.question}`, '', '选项：');
    for (const option of exercise.options || []) lines.push(`- ${option}`);
    lines.push('', `已确认正确答案：${exercise.answer}`, `答案来源：${exercise.answerSource || '原书答案页 + 全书 MinerU OCR 交叉核对'}`);
  }
  return lines.join('\n');
}

function promptFor(chapter, title, count) {
  return `# ${chapter} 网页端原文定位解析提示词

你正在处理同目录的 input.md，文章是《${title}》。只处理其中已有的 ${count} 道阅读题。

## 事实边界

- “二、全书 MinerU Markdown 原文”是唯一原文事实来源；它可能包含 OCR 断行或字母误识别。
- “三、Reader 题目与已确认答案”中的答案已根据原书答案页核对，不能修改、重猜或质疑。
- 俄语证据必须逐字引用 input.md；不能用常识补写不存在的句子。
- 如果 OCR 证据不足，明确写“证据不足/需要人工核对”，不要编造引用。

## 每道题必须输出

## 第 N 题

重要：上面的 N 和下面的 X 只是格式占位符。输出时必须替换为实际题号和该题已确认的答案字母（а/б/в），绝不能原样输出 N 或 X。

### 原文证据
- 标明原文位置或段落，并逐字引用俄语。
- 需要时列出多个证据片段。

### 为什么正确答案是 X
标题中的 X 必须替换成该题的实际答案字母（а、б 或 в）。
保留关键俄语短语，并用简体中文说明它如何支持答案。

### 其他选项为什么错
- 每个错误选项单独说明，指出它改变了对象、时间、数量、范围、程度、因果关系或事实状态中的哪一项。

### 易错提醒

### 一句话复盘

## 最后追加

### 证据完整性检查
逐题说明证据是否完整、是否需要多个片段、是否存在 OCR 风险或证据不足。

只返回解析内容，不要重写原文，不要新增题目，不要修改已确认答案。解释使用简体中文，俄语证据保持原样。`;
}

function buildPackage(chapter, file, index, sections) {
  const data = readJson(path.join(dataRoot, file));
  const title = titleWithoutCode(data.title);
  const slug = `${String(index + 1).padStart(2, '0')}-${chapter}`;
  const destination = path.join(outputRoot, slug);
  fs.mkdirSync(path.join(destination, 'output'), { recursive: true });
  const input = [
    `# ${data.title}`,
    '',
    '> 用途：交给网页端 AI，生成基于完整全书 OCR 原文的阅读题定位解析。',
    '> 本包是 Reader 答案审计后的刷新版本；未核对前不要把 AI 输出写回 Reader。',
    '',
    '## 一、处理说明',
    '',
    '- 原文来自全书 MinerU Markdown 重扫结果。',
    '- 题目和标准答案来自已完成答案页核对的 Reader 数据。',
    '- OCR 的字母混淆和断行必须在解析中标注，不得自行修饰引用。',
    '',
    '## 二、全书 MinerU Markdown 原文',
    '',
    sourceFor(chapter, sections),
    '',
    renderExercises(data.exercises || [])
  ].join('\n');
  fs.writeFileSync(path.join(destination, 'input.md'), `${input.trim()}\n`, 'utf8');
  fs.writeFileSync(path.join(destination, 'prompt.md'), `${promptFor(chapter, title, (data.exercises || []).length)}\n`, 'utf8');
  fs.writeFileSync(path.join(destination, 'README.md'), `# ${chapter} · ${title}\n\n这是答案审计后的网页端输入包。\n\n1. 上传 input.md。\n2. 复制 prompt.md 全部内容发送。\n3. 返回结果保存为 output/analysis.md。\n4. 先核对俄语引用，再决定是否进入 Reader。\n\n题目数量：${(data.exercises || []).length}\n`, 'utf8');
  fs.writeFileSync(path.join(destination, 'output', 'README.md'), '# 网页端返回结果\n\n将网页端完整返回保存为 `analysis.md`。\n', 'utf8');
  return { chapter, title, directory: slug, input: 'input.md', prompt: 'prompt.md', output: 'output/analysis.md', exerciseCount: (data.exercises || []).length };
}

function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Source Markdown not found: ${sourcePath}`);
  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const sections = audit.extractBodySections(markdown);
  fs.mkdirSync(outputRoot, { recursive: true });
  const manifest = chapters.map(([chapter, file], index) => buildPackage(chapter, file, index, sections));
  fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'README.md'), `# Reader 答案审计后网页端输入包（12 篇）\n\n按 manifest.json 顺序逐篇处理。每篇上传 input.md，再发送 prompt.md。网页端返回结果保存到 output/analysis.md。\n\n这 12 篇对应本次答案和题目修复：${chapters.map(([chapter]) => chapter).join('、')}。\n\n不要把网页端返回结果直接覆盖 Reader；先核对俄语引用和答案。\n`, 'utf8');
  console.log(`Built ${manifest.length} refreshed web-AI packages in ${outputRoot}`);
}

if (require.main === module) main();
