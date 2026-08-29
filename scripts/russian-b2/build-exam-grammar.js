/* 组装"俄语 B2 真题模拟"六个章节文件：
 *   ch0000 考试说明（新）、ch0001 语法和词汇（150 题）、ch0002 阅读、ch0003 写作、
 *   ch0004 听力（25 题+TTS 媒体）、ch0005 会话（材料）。
 * 数据来源：新扫描 full.md + images/ 原书表格截图（scripts/russian-b2/data/exam-grammar/），
 * 每题带原书 PDF 页码（新扫描 origin.pdf，1 起算）。 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXAM_DIR = path.join(ROOT, 'data', 'textbook', 'russian_b2', 'modules', 'exam');
const DATA_DIR = path.join(__dirname, 'data', 'exam-grammar');

// 新扫描 origin.pdf 的每题页码（题目页 / 答案解析页），由 content_list.json 推得并人工复核
const QUESTION_PAGES = buildQuestionPages();
const ANSWER_PAGES = buildAnswerPages();

const PART_RANGES = [
  { part: 1, from: 1, to: 25 },
  { part: 2, from: 26, to: 50 },
  { part: 3, from: 51, to: 75 },
  { part: 4, from: 76, to: 100 },
  { part: 5, from: 101, to: 125 },
  { part: 6, from: 126, to: 150 }
];

function pageFor(map, number) {
  const page = map[number];
  if (!page) throw new Error(`missing PDF page for question ${number}`);
  return page;
}

function buildQuestionPages() {
  const pages = {};
  const tableRanges = [
    [1, 25, 120], [26, 33, 122], [34, 42, 123], [43, 50, 124],
    [51, 58, 125], [59, 73, 126], [74, 90, 128], [91, 97, 130],
    [98, 105, 131], [106, 123, 132], [124, 132, 134], [133, 140, 135],
    [141, 145, 136], [146, 146, 136], [147, 150, 137]
  ];
  for (const range of tableRanges) {
    const [from, to, page] = range;
    for (let n = from; n <= (to || from); n += 1) pages[n] = page;
  }
  return pages;
}

function buildAnswerPages() {
  const pages = {};
  const ranges = [
    [1, 3, 138], [4, 14, 139], [15, 22, 140], [23, 38, 141], [39, 50, 142],
    [51, 63, 143], [64, 83, 144], [84, 102, 145], [103, 120, 146],
    [121, 137, 147], [138, 143, 148], [144, 150, 149]
  ];
  for (const [from, to, page] of ranges) {
    for (let n = from; n <= to; n += 1) pages[n] = page;
  }
  return pages;
}

function buildExamGrammarQuestions() {
  const questions = [];
  for (const range of PART_RANGES) {
    const part = require(path.join(DATA_DIR, `part${range.part}.js`));
    const partQuestions = part.questions
      .slice()
      .sort((a, b) => a.printedNumber - b.printedNumber);
    partQuestions.forEach(question => {
      if (question.printedNumber < range.from || question.printedNumber > range.to) {
        throw new Error(`part${range.part} contains question ${question.printedNumber} outside ${range.from}-${range.to}`);
      }
      const labels = question.options.map(option => option.label);
      if (!labels.includes(question.answer)) {
        throw new Error(`question ${question.printedNumber}: answer ${question.answer} not among options`);
      }
      questions.push({
        id: `exam-grammar-q${String(question.printedNumber).padStart(2, '0')}`,
        printedNumber: question.printedNumber,
        part: range.part,
        prompt: question.prompt,
        promptZh: question.promptZh,
        options: question.options,
        answer: question.answer,
        sourceExplanation: question.sourceExplanation,
        answerSource: {
          kind: 'b2-original-answer-key',
          pdfPages: [pageFor(QUESTION_PAGES, question.printedNumber), pageFor(ANSWER_PAGES, question.printedNumber)],
          label: 'B2 原书真题参考答案与解析（新扫描原书 PDF 页）'
        }
      });
    });
  }
  questions.sort((a, b) => a.printedNumber - b.printedNumber);
  if (questions.length !== 150) throw new Error(`expected 150 questions, got ${questions.length}`);
  const seen = new Set();
  questions.forEach(question => {
    if (seen.has(question.printedNumber)) throw new Error(`duplicate question ${question.printedNumber}`);
    seen.add(question.printedNumber);
  });
  return questions;
}

function buildGrammarChapter(questions) {
  return {
    id: 'grammar-lexicon',
    title: '语法和词汇',
    printedSubtest: 1,
    durationMinutes: 90,
    questionCount: 150,
    sourcePages: [119, 149],
    reviewStatus: 'source-verified',
    sourceMarkdown: '新扫描 full.md（第二部分真题·语法和词汇），题面以 images/ 原书表格截图为底稿',
    importStatus: 'source-verified',
    format: 'exam-practice',
    parts: [
      { part: 1, title: 'ЧАСТЬ 1 · 1–25', instructionRu: 'В заданиях №№ 1–25 выберите свой вариант ответа и отметьте его в матрице №1.', instructionZh: '第 1–25 题：主谓一致与动词体。把答案标在答题卡 1 上。' },
      { part: 2, title: 'ЧАСТЬ 2 · 26–50', instructionRu: 'В заданиях №№ 26–50 выберите свой вариант ответа и отметьте его в матрице №2.', instructionZh: '第 26–50 题：名词、动词、形容词、前置词的接格关系。把答案标在答题卡 2 上。' },
      { part: 3, title: 'ЧАСТЬ 3 · 51–75', instructionRu: 'В заданиях №№ 51–58 выберите свой вариант ответа и отметьте его в матрице №3. В заданиях №№ 59–75 установите синонимические соответствия между выделенными конструкциями и вариантами ответов.', instructionZh: '第 51–58 题为形动词、副动词选择题；第 59–75 题选出与标出部分同义的选项。把答案标在答题卡 3 上。' },
      { part: 4, title: 'ЧАСТЬ 4 · 76–100', instructionRu: 'В заданиях №№ 76–93 выберите свой вариант ответа и отметьте его в матрице №4. В заданиях №№ 94–100 установите синонимические соответствия между выделенными конструкциями и вариантами ответа.', instructionZh: '第 76–93 题为复合句连接词、关联词选择题；第 94–100 题选出同义结构。把答案标在答题卡 4 上。' },
      { part: 5, title: 'ЧАСТЬ 5 · 101–125', instructionRu: 'В заданиях №№ 101–125 выберите свой вариант ответа и отметьте его в матрице №5.', instructionZh: '第 101–125 题：名词、动词、形容词辨析。把答案标在答题卡 5 上。' },
      { part: 6, title: 'ЧАСТЬ 6 · 126–150', instructionRu: 'В заданиях №№ 126–150 выберите свой вариант ответа и отметьте его в матрице №6.', instructionZh: '第 126–150 题：功能语体（126–132 罗蒙诺索夫短文、133–140 申请书、141–145 图书摘要、146–150 报刊政论例句）。把答案标在答题卡 6 上。' }
    ],
    examInstructions: {
      durationZh: '考试时间为 90 分钟。试卷包括 6 个部分，共 150 题。考试时不可使用词典。',
      answerCardZh: '选出正确答案后在答题卡上标出。修改答案时不要涂改，把正确答案填在答题卡最后一个空格中。答案不要标注在试卷上，阅卷时只看答题卡。'
    },
    questions
  };
}

function main() {
  const questions = buildExamGrammarQuestions();
  const grammar = buildGrammarChapter(questions);
  const target = path.join(EXAM_DIR, 'exam-grammar.json');
  fs.writeFileSync(target, `${JSON.stringify(grammar, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${questions.length} exam grammar questions to ${path.relative(ROOT, target)}\n`);
}

if (require.main === module) main();

module.exports = { buildExamGrammarQuestions, buildGrammarChapter };
