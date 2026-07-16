const fs = require('node:fs');
const path = require('node:path');
const { buildSixPartBook } = require('../build-six-part-book');

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
  const grammarKinds = new Set(['grammar-book', 'grammar-book-rule', 'grammar-book-example']);
  const b2Kinds = new Set(['b2-original', 'b2-original-focus']);
  const supplementKinds = new Set(['study-supplement', 'supplement-example']);
  const labelledKinds = new Set(['learning-explanation', 'related-extension']);
  if (grammarKinds.has(source.kind)) {
    if (!source.file || !source.section || !Array.isArray(source.pages) || !source.pages.length) errors.push(`${card.id}: grammar-book source is incomplete`);
    if (source.section && !grammarText.includes(source.section)) errors.push(`${card.id}: grammar section ${source.section} was not found`);
  } else if (b2Kinds.has(source.kind)) {
    if (source.label !== 'B2 原书考点') errors.push(`${card.id}: B2 原书考点 must use the B2 原书考点 label`);
  } else if (supplementKinds.has(source.kind)) {
    if (!['学习补充', '补充例句'].includes(source.label)) errors.push(`${card.id}: 学习补充 source requires a supplement label`);
  } else if (labelledKinds.has(source.kind)) {
    if (!source.label) errors.push(`${card.id}: ${source.kind} requires a visible label`);
  } else {
    errors.push(`${card.id}: unsupported source kind ${source.kind}`);
  }
  return errors;
}

function validateCheck(card, check) {
  const errors = [];
  if (!check || !['choice', 'judgment', 'reveal'].includes(check.type)) errors.push(`${card.id}: unsupported study check type`);
  if (!check || !check.id || !check.prompt || !check.rationale) errors.push(`${card.id}: study check requires id, prompt, and rationale`);
  if (check && check.type !== 'reveal' && !('answer' in check)) errors.push(`${card.id}: scored study check requires answer`);
  if (check && check.type === 'choice' && (!Array.isArray(check.options) || check.options.length < 2)) errors.push(`${card.id}: choice study check requires at least two options`);
  return errors;
}

function validateRichSection(card, section, grammarText) {
  const errors = [];
  const requiredArrays = ['conditions', 'caseChanges', 'examples', 'boundaries', 'instantChecks', 'sources'];
  if (!section || !section.id || !section.title || !section.meaning || !section.structure) errors.push(`${card.id}: rich lesson requires id, title, meaning, and structure`);
  requiredArrays.forEach(field => {
    if (!section || !Array.isArray(section[field]) || !section[field].length) errors.push(`${card.id}: rich lesson ${section && section.id || 'unknown'} requires ${field}`);
  });
  (section && section.instantChecks || []).forEach(check => errors.push(...validateCheck(card, check)));
  (section && section.examples || []).forEach(example => errors.push(...validateSource(card, example.source, grammarText)));
  (section && section.sources || []).forEach(source => errors.push(...validateSource(card, source, grammarText)));
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
  const isRich = 'reviewStatus' in card || 'lessons' in card || 'quickReference' in card || 'checks' in card;
  if (isRich) {
    if (card.reviewStatus !== 'approved') errors.push(`${card.id}: rich study card must be approved before publication`);
    if (!card.quickReference || !Array.isArray(card.quickReference.semanticQuestions) || !Array.isArray(card.quickReference.structures)) errors.push(`${card.id}: quickReference requires semanticQuestions and structures`);
    if (!Array.isArray(card.lessons) || !card.lessons.length) errors.push(`${card.id}: rich lessons are required`);
    if (!Array.isArray(card.relatedExtensions)) errors.push(`${card.id}: relatedExtensions must be an array`);
    if (!Array.isArray(card.checks) || card.checks.length < 3 || card.checks.length > 5) errors.push(`${card.id}: three to five comprehensive checks are required`);
    (card.lessons || []).forEach(section => errors.push(...validateRichSection(card, section, grammarText)));
    (card.relatedExtensions || []).forEach(section => errors.push(...validateRichSection(card, section, grammarText)));
    (card.checks || []).forEach(check => errors.push(...validateCheck(card, check)));
  }
  return errors;
}
function buildStudyCards({ root, write = true }) {
  const card = readJson(path.join(root, ...CARD_RELATIVE_PATH));
  const chapter = buildSixPartBook({ root, write: false }).parts.find(part => part.id === card.partId);
  const grammarRoot = resolveGrammarRoot(root);
  const grammarText = fs.readFileSync(path.join(grammarRoot, '08 前置词.md'), 'utf8');
  const errors = validateStudyCard({ card, chapter, grammarText });
  if (errors.length) throw new Error(errors.join('\n'));
  const outputPath = path.join(root, 'data', 'textbook', 'russian_b2', 'study-cards', `${card.id}.json`);
  if (write) writeJson(outputPath, card);
  return { cards: [card], outputPaths: write ? [outputPath] : [] };
}

module.exports = { buildStudyCards, validateStudyCard, validateRichSection, validateCheck, resolveGrammarRoot };
