const fs = require('node:fs');
const path = require('node:path');

const WRITING_DIR = path.join('俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '写作');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getWritingDir(root) {
  return path.join(root, WRITING_DIR);
}

function validateWritingUnit(unit) {
  const errors = [];
  for (const field of ['id', 'title', 'reviewStatus']) if (!unit[field]) errors.push(`missing ${field}`);
  if (unit.reviewStatus !== 'source-verified') errors.push(`${unit.id}: reviewStatus must be source-verified`);
  if (!Array.isArray(unit.sourcePages) || !unit.sourcePages.length) errors.push(`${unit.id}: missing sourcePages`);
  if (!unit.task || !unit.task.prompt) errors.push(`${unit.id}: missing task prompt`);
  if (!unit.format || !Array.isArray(unit.format.requiredBlocks) || !unit.format.requiredBlocks.length) errors.push(`${unit.id}: missing format blocks`);
  if (!unit.model || !unit.model.text || !unit.model.source || unit.model.source.kind !== 'b2-original') errors.push(`${unit.id}: model must retain B2-original source`);
  if (!unit.studySupport || unit.studySupport.label !== '学习辅助') errors.push(`${unit.id}: study support must be labelled 学习辅助`);
  return errors;
}

function buildWritingModule({ root, write = false }) {
  const writingDir = getWritingDir(root);
  const index = readJson(path.join(writingDir, 'index.json'));
  const units = index.units.map(file => readJson(path.join(writingDir, file)));
  const errors = units.flatMap(validateWritingUnit);
  if (errors.length) throw new Error(`Writing source validation failed:\n${errors.join('\n')}`);
  return { index, units };
}

function toReaderChapter(unit) {
  return {
    id: unit.id,
    format: 'writing-workbench',
    title: unit.title,
    sourcePages: unit.sourcePages,
    reviewStatus: unit.reviewStatus,
    task: unit.task,
    formatGuide: unit.format,
    model: unit.model,
    studySupport: unit.studySupport,
    ai: { mode: 'server-or-copy-prompt', rubric: unit.rubric || [] }
  };
}

function publishWritingReaderModule({ root, outputDir }) {
  const { units } = buildWritingModule({ root });
  fs.mkdirSync(outputDir, { recursive: true });
  const index = { title: '俄语 B2 全模块 · 写作', chapters: units.length, chapterTitles: units.map(unit => unit.title) };
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  units.forEach((unit, indexNumber) => {
    fs.writeFileSync(path.join(outputDir, `ch${String(indexNumber).padStart(4, '0')}.json`), JSON.stringify(toReaderChapter(unit), null, 2) + '\n');
  });
  return { index, units };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'writing');
  const result = publishWritingReaderModule({ root, outputDir });
  process.stdout.write(`Published ${result.units.length} writing chapters to ${outputDir}\n`);
}

module.exports = { buildWritingModule, validateWritingUnit, publishWritingReaderModule, toReaderChapter, getWritingDir };
