/* 组装真题模拟六章（幂等）：
 *   ch0000 考试说明（build-exam-intro 产物）、ch0001 语法（build-exam-grammar）、
 *   ch0002 阅读（原 ch0001 保留）、ch0003 写作（原 ch0002 保留）、
 *   ch0004 听力（build-exam-listening）、ch0005 会话（build-exam-speaking）。
 * 原始内容以 payload 文件为准，本脚本可重复运行。 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXAM_DIR = path.join(ROOT, 'data', 'textbook', 'russian_b2', 'modules', 'exam');
const BOOK_JSON = path.join(ROOT, 'data', 'textbook', 'russian_b2', 'book.json');

const PLAN = [
  { payload: 'exam-intro.json', chapter: 'ch0000', title: '考试说明' },
  { payload: 'exam-grammar.json', chapter: 'ch0001', title: '语法和词汇' },
  { payload: 'exam-reading.json', chapter: 'ch0002', title: '阅读' },
  { payload: 'exam-writing.json', chapter: 'ch0003', title: '写作' },
  { payload: 'exam-listening.json', chapter: 'ch0004', title: '听力' },
  { payload: 'exam-speaking.json', chapter: 'ch0005', title: '会话' }
];

function ensurePayloads() {
  // 首次迁移：原 ch0001=阅读 / ch0002=写作 / ch0003=听力占位 / ch0004=会话占位
  const fallbacks = [
    ['ch0001.json', 'exam-reading.json', 'reading'],
    ['ch0002.json', 'exam-writing.json', 'writing'],
    ['ch0003.json', 'exam-listening.json', 'listening'],
    ['ch0004.json', 'exam-speaking.json', 'speaking']
  ];
  // payload 缺失且新章节已在位时，从现有 ch 文件自举（此后每次构建都从 payload 读取）
  for (const item of PLAN) {
    const payloadPath = path.join(EXAM_DIR, item.payload);
    if (fs.existsSync(payloadPath)) continue;
    const chapterPath = path.join(EXAM_DIR, `${item.chapter}.json`);
    if (fs.existsSync(chapterPath)) fs.copyFileSync(chapterPath, payloadPath);
  }
  for (const [legacyName, payloadName, expectedId] of fallbacks) {
    const payloadPath = path.join(EXAM_DIR, payloadName);
    if (fs.existsSync(payloadPath)) continue;
    const legacyPath = path.join(EXAM_DIR, legacyName);
    if (!fs.existsSync(legacyPath)) continue;
    const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    if (legacy.id === expectedId) fs.copyFileSync(legacyPath, payloadPath);
  }
}

function writeChapters() {
  for (const item of PLAN) {
    const payloadPath = path.join(EXAM_DIR, item.payload);
    if (!fs.existsSync(payloadPath)) throw new Error(`missing payload ${item.payload}`);
    const data = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    const target = path.join(EXAM_DIR, `${item.chapter}.json`);
    fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    if (data.title !== item.title) throw new Error(`chapter ${item.chapter} title mismatch: ${data.title} != ${item.title}`);
  }
  for (const item of PLAN) {
    if (item.payload !== `${item.chapter}.json`) {
      const p = path.join(EXAM_DIR, item.payload);
      if (fs.existsSync(p)) fs.rmSync(p);
    }
  }
}

function updateIndex() {
  const indexPath = path.join(EXAM_DIR, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  index.chapters = PLAN.length;
  index.chapterTitles = PLAN.map(item => item.title);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

function updateBook() {
  const book = JSON.parse(fs.readFileSync(BOOK_JSON, 'utf8'));
  const exam = (book.modules || []).find(module => module.id === 'exam');
  if (!exam) throw new Error('exam module not found in book.json');
  exam.chapters = PLAN.length;
  exam.chapterTitles = PLAN.map(item => item.title);
  fs.writeFileSync(BOOK_JSON, `${JSON.stringify(book, null, 2)}\n`, 'utf8');
}

function main() {
  ensurePayloads();
  writeChapters();
  updateIndex();
  updateBook();
  const files = fs.readdirSync(EXAM_DIR).filter(f => /^ch\d{4}\.json$/.test(f)).sort();
  process.stdout.write(`Exam chapters now: ${files.join(', ')}\n`);
}

if (require.main === module) main();

module.exports = { PLAN };
