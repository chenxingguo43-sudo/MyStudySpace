const fs = require('node:fs');
const path = require('node:path');

const CARD_RELATIVE_PATH = ['俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法书映射', 'p2-time-cause-study-card.json'];

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function resolveGrammarRoot(root) {
  const direct = path.join(root, '俄语资料库', '新编俄语语法');
  const shared = path.resolve(root, '..', '..', '俄语资料库', '新编俄语语法');
  return fs.existsSync(direct) ? direct : shared;
}
function isExactArray(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function validateSource(card, source, grammarText) {
  const errors = [];
  if (!source || !source.kind) return [`${card.id}: source.kind is required`];
  if (source.kind === 'grammar-book') {
    if (!source.file || !source.section || !Array.isArray(source.pages) || !source.pages.length) errors.push(`${card.id}: grammar-book source is incomplete`);
    if (source.section && !grammarText.includes(source.section)) errors.push(`${card.id}: grammar section ${source.section} was not found`);
  } else if (source.kind === 'b2-original') {
    if (source.label !== 'B2 原书考点') errors.push(`${card.id}: B2 原书考点 must use the B2 原书考点 label`);
  } else if (source.kind === 'study-supplement') {
    if (source.label !== '学习补充') errors.push(`${card.id}: 学习补充 must use the 学习补充 label`);
  } else {
    errors.push(`${card.id}: unsupported source kind ${source.kind}`);
  }
  return errors;
}
function validateStudyCard({ card, chapter, grammarText }) {
  const errors = [];
  const point = (chapter.knowledgePoints || []).find(item => item.id === card.knowledgePointId);
  if (!point) errors.push(`${card.id}: knowledge point is missing from ${chapter.id}`);
  if (!point || !isExactArray(card.exerciseIds, point.exerciseIds)) errors.push(`${card.id}: exerciseIds must exactly match its knowledge point`);
  if ('answerAnalysis' in card) errors.push(`${card.id}: answerAnalysis is not allowed in a study card`);
  if (!Array.isArray(card.rules) || !card.rules.length) errors.push(`${card.id}: rules are required`);
  if (!Array.isArray(card.examples) || card.examples.length < 4 || card.examples.length > 6) errors.push(`${card.id}: four to six examples are required`);
  const examples = card.examples || [];
  if (examples.filter(example => example.source && example.source.kind === 'study-supplement').length > 2) errors.push(`${card.id}: at most two 学习补充 examples are allowed`);
  [...(card.rules || []), ...(card.comparisons || []), ...examples, ...(card.sources || [])].forEach(item => {
    errors.push(...validateSource(card, item.source || item, grammarText));
  });
  return errors;
}
function buildStudyCards({ root, write = true }) {
  const card = readJson(path.join(root, ...CARD_RELATIVE_PATH));
  const chapter = readJson(path.join(root, 'data', 'textbook', 'russian_b2', 'ch0001.json'));
  const grammarRoot = resolveGrammarRoot(root);
  const grammarText = fs.readFileSync(path.join(grammarRoot, '08 前置词.md'), 'utf8');
  const errors = validateStudyCard({ card, chapter, grammarText });
  if (errors.length) throw new Error(errors.join('\n'));
  const outputPath = path.join(root, 'data', 'textbook', 'russian_b2', 'study-cards', `${card.id}.json`);
  if (write) writeJson(outputPath, card);
  return { cards: [card], outputPaths: write ? [outputPath] : [] };
}

module.exports = { buildStudyCards, validateStudyCard, resolveGrammarRoot };
