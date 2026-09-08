const fs = require('node:fs');
const path = require('node:path');
const { buildSixPartBook } = require('../build-six-part-book');

const CARD_DIRECTORY_RELATIVE_PATH = ['俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法书映射'];
const CARD_INDEX_RELATIVE_PATH = [...CARD_DIRECTORY_RELATIVE_PATH, 'index.json'];

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
function loadStudyCardIndex(root) {
  const index = readJson(path.join(root, ...CARD_INDEX_RELATIVE_PATH));
  if (!Array.isArray(index.cards)) throw new Error('study-card index requires cards');
  const ids = new Set();
  index.cards.forEach(entry => {
    if (!entry || !/^[a-z0-9-]+$/.test(entry.id || '')) throw new Error('study-card index requires stable card ids');
    if (ids.has(entry.id)) throw new Error(`duplicate study-card id ${entry.id}`);
    if (!/^(p[1-6])$/.test(entry.partId || '')) throw new Error(`${entry.id}: partId must be p1 through p6`);
    if (entry.knowledgePointId !== entry.id) throw new Error(`${entry.id}: knowledgePointId must equal card id`);
    if (!String(entry.source || '').trim()) throw new Error(`${entry.id}: source is required`);
    if (!['planned', 'approved'].includes(entry.status)) throw new Error(`${entry.id}: invalid card status`);
    ids.add(entry.id);
  });
  return index;
}
function grammarFilesForCard(card) {
  const files = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value.file === 'string') files.add(value.file);
    Object.values(value).forEach(visit);
  };
  visit(card);
  return [...files];
}
function loadGrammarTexts(root, card) {
  const grammarRoot = resolveGrammarRoot(root);
  return grammarFilesForCard(card).reduce((texts, file) => {
    texts[file] = fs.readFileSync(path.join(grammarRoot, file), 'utf8');
    return texts;
  }, {});
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
    const text = typeof grammarText === 'string' ? grammarText : grammarText && grammarText[source.file];
    if (source.section && (!text || !text.includes(source.section))) errors.push(`${card.id}: grammar section ${source.section} was not found`);
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

function validateTeachingNarrativeV2(card) {
  const narrative = card && card.teachingNarrative;
  const errors = [];
  if (!narrative || typeof narrative !== 'object' || Array.isArray(narrative)) {
    return [`${card?.id || 'study-card'}: teachingNarrative v2 is required`];
  }
  if (narrative.version !== 2) errors.push(`${card.id}: teachingNarrative.version must be 2`);
  if (narrative.progressKey !== 'teachingV2') errors.push(`${card.id}: teachingNarrative.progressKey must be teachingV2`);
  if (!['accepted', 'accepted-pilot'].includes(narrative.status)) errors.push(`${card.id}: teachingNarrative.status must be accepted`);
  ['label', 'intro'].forEach(field => {
    if (!String(narrative[field] || '').trim()) errors.push(`${card.id}: teachingNarrative.${field} is required`);
  });
  if (narrative.version === 2 && !String(narrative.heroProblem || narrative.objectives?.[0] || '').trim()) errors.push(`${card.id}: teachingNarrative.heroProblem is required`);
  if (narrative.version === 2 && !String(narrative.decisionTitle || '').trim() && narrative.status !== 'accepted-pilot') errors.push(`${card.id}: teachingNarrative.decisionTitle is required`);
  if (narrative.version === 2 && !String(narrative.decisionCriterion || '').trim() && narrative.status !== 'accepted-pilot') errors.push(`${card.id}: teachingNarrative.decisionCriterion is required`);
  ['objectives', 'decisionSteps', 'mindMap', 'sections', 'transferTasks', 'mappings', 'pitfalls', 'sources'].forEach(field => {
    if (!Array.isArray(narrative[field]) || !narrative[field].length) errors.push(`${card.id}: teachingNarrative.${field} is required`);
  });
  const sections = Array.isArray(narrative.sections) ? narrative.sections : [];
  if (sections.length < 4) errors.push(`${card.id}: teachingNarrative requires at least four concept sections`);
  const sectionIds = new Set();
  sections.forEach(section => {
    if (!section || !section.id || sectionIds.has(section.id)) errors.push(`${card.id}: teachingNarrative section ids must be unique`);
    if (section?.id) sectionIds.add(section.id);
    ['id', 'title', 'lede', 'paragraphs', 'examples', 'check'].forEach(field => {
      const value = section?.[field];
      const empty = Array.isArray(value) ? !value.length : (value && typeof value === 'object' ? !Object.keys(value).length : !String(value || '').trim());
      if (empty) errors.push(`${card.id}: teachingNarrative section ${section?.id || 'unknown'} requires ${field}`);
    });
    if (section && section.exerciseIds !== undefined && (!Array.isArray(section.exerciseIds))) errors.push(`${card.id}: teachingNarrative section ${section.id} exerciseIds must be an array`);
    if (section?.check && (!section.check.feedback || !section.check.retry)) errors.push(`${card.id}: teachingNarrative section ${section.id} requires feedback and retry`);
    if (section?.examples && !section.examples.some(example => example?.ru && example?.zh)) errors.push(`${card.id}: teachingNarrative section ${section.id} requires a bilingual example`);
  });
  const exerciseIds = new Set(card.exerciseIds || []);
  const mappings = Array.isArray(narrative.mappings) ? narrative.mappings : [];
  const mapped = new Set();
  mappings.forEach(mapping => {
    if (!mapping?.exerciseId || !exerciseIds.has(mapping.exerciseId)) errors.push(`${card.id}: mapping references an unknown exercise`);
    if (!mapping?.sectionId || !sectionIds.has(mapping.sectionId)) errors.push(`${card.id}: mapping references an unknown section`);
    if (mapping?.exerciseId && mapped.has(mapping.exerciseId)) errors.push(`${card.id}: each exercise must have one primary mapping`);
    if (mapping?.exerciseId) mapped.add(mapping.exerciseId);
  });
  exerciseIds.forEach(id => { if (!mapped.has(id)) errors.push(`${card.id}: exercise ${id} is missing a primary mapping`); });
  if (!narrative.neighboringScope || !String(narrative.neighboringScope.covered || '').trim() || !Array.isArray(narrative.neighboringScope.handOff) || !narrative.neighboringScope.handOff.length) {
    errors.push(`${card.id}: teachingNarrative.neighboringScope must declare covered scope and handoff`);
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
  if (card.teachingNarrative) errors.push(...validateTeachingNarrativeV2(card));
  return errors;
}
function buildStudyCards({ root, write = true }) {
  const index = loadStudyCardIndex(root);
  const parts = buildSixPartBook({ root, write: false }).parts;
  const cardDirectory = path.join(root, ...CARD_DIRECTORY_RELATIVE_PATH);
  const cards = index.cards.filter(entry => entry.status === 'approved').map(entry => {
    const card = readJson(path.join(cardDirectory, entry.source));
    if (card.id !== entry.id || card.partId !== entry.partId || card.knowledgePointId !== entry.knowledgePointId) {
      throw new Error(`${entry.id}: card metadata does not match index`);
    }
    const chapter = parts.find(part => part.id === card.partId);
    const errors = validateStudyCard({ card, chapter, grammarText: loadGrammarTexts(root, card) });
    if (errors.length) throw new Error(errors.join('\n'));
    return card;
  });
  const outputDirectory = path.join(root, 'data', 'textbook', 'russian_b2', 'study-cards');
  const outputPaths = cards.map(card => path.join(outputDirectory, `${card.id}.json`));
  const indexPath = path.join(outputDirectory, 'index.json');
  if (write) {
    cards.forEach((card, index) => writeJson(outputPaths[index], card));
    writeJson(indexPath, { cards: cards.map(card => ({ id: card.id, partId: card.partId, knowledgePointId: card.knowledgePointId })) });
  }
  return { cards, outputPaths: write ? outputPaths : [], indexPath };
}

module.exports = { buildStudyCards, loadStudyCardIndex, validateStudyCard, validateRichSection, validateCheck, validateTeachingNarrativeV2, resolveGrammarRoot };
