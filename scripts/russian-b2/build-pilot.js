const fs = require('node:fs');
const path = require('node:path');
const { validateChapter, assertPilotAnswerVector } = require('./lib/contracts');

const VAULT = ['俄语资料库', '俄语B2·原书复刻与学习版'];
const CANONICAL = [...VAULT, '规范数据', '语法词汇', '02-名词与形容词接格-题1-10.json'];
const MARKDOWN = [...VAULT, '学习单元', '语法词汇', '02-名词与形容词接格-题1-10.md'];

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildMarkdown(chapter) {
  const header = [
    '---',
    'title: 名词与形容词接格（题 1–10）',
    'book: 俄语 B2 全模块',
    'module: 语法词汇',
    'source_pages: [18, 19, 24, 25, 26, 27]',
    'generated: true',
    '---',
    '',
    '# 名词与形容词接格（题 1–10）',
    '',
    '> [!note] 原书页码',
    '> 题目：PDF 18–19；规则：PDF 24；答案与原书解析：PDF 25–27。',
    ''
  ];
  const exercises = chapter.exercises.map(function(exercise) {
    return [
      '## ' + exercise.id,
      '',
      exercise.question,
      '',
      ...exercise.options.map(function(option) { return '- ' + option.key + '. ' + option.text; }),
      '',
      '> [!success]- 答案与解析',
      '> **原书答案（已核对）：** ' + exercise.sourceAnswer,
      '>',
      '> **原书依据：** ' + exercise.sourceEvidence,
      '>',
      '> **原书解析：** ' + exercise.sourceExplanation,
      '>',
      '> **' + exercise.referenceExplanation.split('：')[0] + '：** ' + exercise.referenceExplanation.split('：').slice(1).join('：'),
      '>',
      '> **易错点：** ' + exercise.pitfalls.join('；'),
      '>',
      '> **原书页：** ' + exercise.questionPages.map(function(page) { return 'PDF-' + String(page).padStart(3, '0'); }).join('、') + '；' + exercise.answerPages.map(function(page) { return 'PDF-' + String(page).padStart(3, '0'); }).join('、'),
      ''
    ].join('\n');
  });
  return header.concat(exercises).join('\n');
}

function buildPilot({ root }) {
  const canonicalPath = path.join(root, ...CANONICAL);
  const chapter = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  const errors = validateChapter(chapter);
  if (errors.length) throw new Error(errors.join('\n'));
  assertPilotAnswerVector(chapter);

  const readerPath = path.join(root, 'data', 'textbook', 'russian_b2', 'ch0000.json');
  const markdownPath = path.join(root, ...MARKDOWN);
  const rangeMapPath = path.join(root, ...VAULT, '_data', 'range_map.json');
  writeJson(readerPath, {
    index: chapter.index,
    title: chapter.title,
    module: chapter.module,
    format: 'quiz-first',
    sourcePages: chapter.sourcePages,
    exercises: chapter.exercises
  });
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, buildMarkdown(chapter), 'utf8');
  writeJson(rangeMapPath, {
    entries: [{
      id: 'russian_b2-grammar-02',
      module: chapter.module,
      question_pages: chapter.sourcePages.questions,
      explanation_pages: chapter.sourcePages.rules,
      answer_pages: chapter.sourcePages.answers,
      reader_chapter: 'data/textbook/russian_b2/ch0000.json',
      markdown: '学习单元/语法词汇/02-名词与形容词接格-题1-10.md'
    }]
  });
  return { readerPath, markdownPath, rangeMapPath };
}

if (require.main === module) {
  console.log(buildPilot({ root: path.resolve(__dirname, '..', '..') }));
}

module.exports = { buildPilot };
