/* Build one Markdown input file per reading article for manual web-AI review. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const outputRoot = path.join(root, 'docs', 'reader-ai-reading', 'inputs');

function cleanMarkdown(value) {
  return String(value || '').replace(/\*\*/g, '').trim();
}

function chapterLabel(data) {
  const match = String(data.title || '').match(/^Текст\s+([^\s]+)\s+—/);
  return match ? match[1] : `chapter-${String(data.index).padStart(2, '0')}`;
}

function renderQuestion(exercise) {
  const lines = [
    `### 第 ${exercise.num} 题`,
    '',
    `题干（俄语）：${cleanMarkdown(exercise.question)}`,
    ''
  ];
  if (exercise.zhQuestion) lines.push(`题干提示（中文）：${exercise.zhQuestion}`, '');
  lines.push('选项：');
  (exercise.options || []).forEach((option, index) => {
    const zh = exercise.zhOptions && exercise.zhOptions[index] ? `（${exercise.zhOptions[index]}）` : '';
    lines.push(`- ${cleanMarkdown(option)}${zh}`);
  });
  lines.push('', `已确认正确答案：${exercise.answer || '待确认'}`);
  if (exercise.answerSource) lines.push(`答案来源：${exercise.answerSource}`);
  if (exercise.sourceAnchor && exercise.sourceAnchor.quote) {
    lines.push('', `现有定位线索（仅供核对，不代表完整证据）：第 ${exercise.sourceAnchor.paragraphIndex} 段；“${exercise.sourceAnchor.quote}”`);
  }
  return lines.join('\n');
}

function getCoverage(data) {
  const originalText = (data.original || []).join('\n').trim();
  const translatedText = (data.translated || []).join('\n').trim();
  const warnings = [];
  if (!translatedText) warnings.push('中文翻译缺失');
  if (originalText.includes('id:') || originalText.includes('needs_review')) warnings.push('原文字段包含学习单元摘要或待复核标记');
  if (originalText.length < 500) warnings.push('原文长度异常偏短，可能不是完整文章');
  return { status: warnings.length ? 'needs-source-recovery' : 'ready', warnings };
}

function renderChapter(data, coverage) {
  const label = chapterLabel(data);
  const lines = [
    `# 阅读 ${label}：${data.title || ''}`,
    '',
    '> 用途：请先定位原文证据，再解释正确答案和其他选项为什么错误。不要重新判定已确认的标准答案。',
    '',
    '## 处理边界',
    '',
    '- 原文和中文翻译是唯一事实来源。',
    '- 题目中的“已确认正确答案”不能被修改。',
    '- 证据可以由多个句子或多个段落组成。',
    '- 不要编造原文引用；引用必须逐字来自下方原文。',
    '- 如果证据不足，请明确写“证据不足”，不要强行补充。',
    '',
    `- 本文件来源完整性：${coverage.status}`,
    ...(coverage.warnings.length ? coverage.warnings.map((warning) => `- 警告：${warning}`) : []),
    '',
    '## 一、俄语原文',
    ''
  ];
  (data.original || []).forEach((paragraph, index) => {
    lines.push(`### 第 ${index + 1} 段`, '', cleanMarkdown(paragraph), '');
  });
  lines.push('## 二、中文翻译', '');
  (data.translated || []).forEach((paragraph, index) => {
    lines.push(`### 第 ${index + 1} 段`, '', cleanMarkdown(paragraph), '');
  });
  lines.push('## 三、阅读题与正确答案', '');
  (data.exercises || []).forEach((exercise) => lines.push(renderQuestion(exercise), ''));
  return `${lines.join('\n').trim()}\n`;
}

fs.mkdirSync(outputRoot, { recursive: true });
const files = fs.readdirSync(dataRoot).filter((name) => /^ch\d+\.json$/.test(name)).sort();
const manifest = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dataRoot, file), 'utf8'));
  const label = chapterLabel(data);
  const coverage = getCoverage(data);
  const outputName = `${String(data.index + 1).padStart(2, '0')}-${label}.md`;
  fs.writeFileSync(path.join(outputRoot, outputName), renderChapter(data, coverage), 'utf8');
  manifest.push({
    index: data.index,
    chapter: label,
    title: data.title,
    inputFile: outputName,
    exerciseCount: (data.exercises || []).length,
    answers: (data.exercises || []).every((exercise) => !!exercise.answer) ? 'complete' : 'incomplete',
    sourceCoverage: coverage.status,
    coverageWarnings: coverage.warnings
  });
}
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Built ${manifest.length} Markdown inputs with ${manifest.reduce((sum, item) => sum + item.exerciseCount, 0)} exercises.`);
