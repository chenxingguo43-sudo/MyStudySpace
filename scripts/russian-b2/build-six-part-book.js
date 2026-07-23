const fs = require('node:fs');
const path = require('node:path');
const { validateChapter, validateStudyNavigation, getStudyPointExerciseIds } = require('./lib/contracts');

const VAULT = ['俄语资料库', '俄语B2·原书复刻与学习版'];
const DATA = [...VAULT, '规范数据', '语法词汇'];
const STUDY_CARD_INDEX = [...VAULT, '规范数据', '语法书映射', 'index.json'];

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function mergePages(units, key) {
  return [...new Set(units.flatMap(unit => (unit.sourcePages && unit.sourcePages[key]) || []))].sort((a, b) => a - b);
}
function normalizeKnowledgePoints(part, byExercise, studyCardIds) {
  return part.knowledgePoints.map(point => ({
    ...point,
    exerciseIds: getStudyPointExerciseIds(point, part.part, byExercise),
    ...(studyCardIds.get(point.id) ? { studyCardId: studyCardIds.get(point.id) } : {})
  }));
}
function buildPart(part, units, byExercise, studyCardIds) {
  const byUnit = new Map(units.map(unit => [unit.id, unit]));
  const selected = part.unitIds.map(id => byUnit.get(id));
  return {
    id: part.id,
    index: part.part - 1,
    part: part.part,
    title: part.title,
    module: part.title,
    format: 'quiz-first',
    sourcePages: {
      questions: mergePages(selected, 'questions'),
      rules: mergePages(selected, 'rules'),
      answers: mergePages(selected, 'answers')
    },
    knowledgePoints: normalizeKnowledgePoints(part, byExercise, studyCardIds),
    contextGroups: selected.flatMap(unit => unit.contextGroups || []),
    exercises: selected.flatMap(unit => unit.exercises).sort((left, right) => left.printedNumber - right.printedNumber)
  };
}
function loadPublished(root) {
  const base = path.join(root, ...DATA);
  const manifest = readJson(path.join(base, 'index.json'));
  const units = manifest.units.filter(unit => unit.published)
    .map(unit => readJson(path.join(base, unit.source)));
  const cardIndex = readJson(path.join(root, ...STUDY_CARD_INDEX));
  const studyCardIds = new Map((cardIndex.cards || [])
    .filter(card => card.status === 'approved')
    .map(card => [card.knowledgePointId, card.id]));
  return { base, manifest, units, studyCardIds };
}
function buildSixPartBook({ root, write = true }) {
  const { base, units, studyCardIds } = loadPublished(root);
  const navigation = readJson(path.join(base, 'part-study-navigation.json'));
  const navigationErrors = validateStudyNavigation({ navigation, units });
  if (navigationErrors.length) throw new Error(navigationErrors.join('\n'));
  const byExercise = new Map(units.flatMap(unit => unit.exercises.map(exercise => [exercise.id, { exercise, unit }])));
  const parts = navigation.parts.map(part => buildPart(part, units, byExercise, studyCardIds));
  const chapterErrors = parts.flatMap(part => validateChapter(part).map(error => `${part.id}: ${error}`));
  if (chapterErrors.length) throw new Error(chapterErrors.join('\n'));
  if (!write) return { parts, readerPaths: [], indexPath: path.join(root, 'data', 'textbook', 'index.json') };

  const readerDir = path.join(root, 'data', 'textbook', 'russian_b2');
  const readerPaths = parts.map(part => {
    const readerPath = path.join(readerDir, 'ch' + String(part.index).padStart(4, '0') + '.json');
    writeJson(readerPath, part);
    return readerPath;
  });
  for (let index = parts.length; index < 30; index++) {
    const stalePath = path.join(readerDir, 'ch' + String(index).padStart(4, '0') + '.json');
    if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath);
  }
  const indexPath = path.join(root, 'data', 'textbook', 'index.json');
  const index = readJson(indexPath);
  const book = index.books.find(item => item.id === 'russian_b2');
  const dashboard = readJson(path.join(readerDir, 'book.json'));
  book.chapters = (dashboard.modules || []).length;
  book.unitIds = parts.map(part => part.id);
  book.chapterTitles = parts.map(part => part.title);
  writeJson(indexPath, index);
  return { parts, readerPaths, indexPath };
}

if (require.main === module) console.log(buildSixPartBook({ root: path.resolve(__dirname, '..', '..') }));

module.exports = { buildSixPartBook };
