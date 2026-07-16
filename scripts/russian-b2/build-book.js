const fs = require('node:fs');
const path = require('node:path');
const { validateUnit, validateUnitManifest } = require('./lib/contracts');

const VAULT = ['俄语资料库', '俄语B2·原书复刻与学习版'];
const DATA = [...VAULT, '规范数据', '语法词汇'];

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function pages(values) { return (values || []).map(page => 'PDF-' + String(page).padStart(3, '0')).join('、'); }
function buildMarkdown(unit) {
  const allPages = [...new Set([...(unit.sourcePages.questions || []), ...(unit.sourcePages.rules || []), ...(unit.sourcePages.answers || [])])].sort((a, b) => a - b);
  const lines = ['---', 'title: ' + unit.title, 'book: 俄语 B2 全模块', 'module: ' + unit.module, 'unit_id: ' + unit.id, 'source_pages: [' + allPages.join(', ') + ']', 'generated: true', '---', '', '# ' + unit.title, ''];
  unit.exercises.forEach(exercise => lines.push('## ' + exercise.id + '（原书题 ' + exercise.printedNumber + '）', '', exercise.question, '', ...exercise.options.map(option => '- ' + option.key + '. ' + option.text), '', '> [!success]- 答案与解析', '> **原书答案（已核对）：** ' + exercise.sourceAnswer, '>', '> **原书解析（已核对）：** ' + exercise.sourceExplanation, '>', '> **' + exercise.referenceExplanation.split('：')[0] + '：** ' + exercise.referenceExplanation.split('：').slice(1).join('：'), '>', '> **易错点：** ' + exercise.pitfalls.join('；'), '>', '> **原书页：** ' + pages(exercise.questionPages) + '；' + pages(exercise.answerPages), ''));
  return lines.join('\n');
}
function buildBook({ root }) {
  const manifestPath = path.join(root, ...DATA, 'index.json');
  const manifest = readJson(manifestPath);
  const published = manifest.units.filter(unit => unit.published).sort((a, b) => a.chapterIndex - b.chapterIndex);
  const units = published.map(entry => readJson(path.join(root, ...DATA, entry.source)));
  const manifestErrors = validateUnitManifest({ units });
  if (manifestErrors.length) throw new Error(manifestErrors.join('\n'));
  const readerPaths = [], markdownPaths = [], entries = [];
  units.forEach(unit => {
    const errors = validateUnit(unit); if (errors.length) throw new Error(errors.join('\n'));
    const readerPath = path.join(root, 'data', 'textbook', 'russian_b2', 'ch' + String(unit.chapterIndex).padStart(4, '0') + '.json');
    const markdownPath = path.join(root, ...VAULT, '学习单元', '语法词汇', unit.id + '.md');
    writeJson(readerPath, { id: unit.id, index: unit.chapterIndex, part: unit.part, title: unit.title, module: unit.module, format: unit.format, sourcePages: unit.sourcePages, exercises: unit.exercises });
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true }); fs.writeFileSync(markdownPath, buildMarkdown(unit), 'utf8');
    readerPaths.push(readerPath); markdownPaths.push(markdownPath);
    entries.push({ id: unit.id, module: unit.module, question_pages: unit.sourcePages.questions, explanation_pages: unit.sourcePages.rules, answer_pages: unit.sourcePages.answers, reader_chapter: 'data/textbook/russian_b2/' + path.basename(readerPath), markdown: '学习单元/语法词汇/' + path.basename(markdownPath) });
  });
  const rangeMapPath = path.join(root, ...VAULT, '_data', 'range_map.json');
  const qualityReportPath = path.join(root, ...VAULT, '质量报告', 'grammar-units.json');
  writeJson(rangeMapPath, { entries });
  writeJson(qualityReportPath, { units: units.map(unit => ({ id: unit.id, chapterIndex: unit.chapterIndex, exercises: unit.exercises.length, printedNumbers: unit.exercises.map(exercise => exercise.printedNumber), reviewStatus: unit.exercises.map(exercise => exercise.reviewStatus) })) });
  const indexPath = path.join(root, 'data', 'textbook', 'index.json'), index = readJson(indexPath), book = index.books.find(item => item.id === 'russian_b2'); book.chapters = published.length; writeJson(indexPath, index);
  return { readerPaths, markdownPaths, rangeMapPath, qualityReportPath };
}
if (require.main === module) console.log(buildBook({ root: path.resolve(__dirname, '..', '..') }));
module.exports = { buildBook };
