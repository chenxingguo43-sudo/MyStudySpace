const fs = require('node:fs');
const path = require('node:path');

const SPEAKING_DIR = path.join('俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '会话');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getSpeakingDir(root) {
  return path.join(root, SPEAKING_DIR);
}

function validateSpeakingUnit(unit) {
  const errors = [];
  for (const field of ['id', 'title', 'reviewStatus']) if (!unit[field]) errors.push(`missing ${field}`);
  if (unit.reviewStatus !== 'source-verified') errors.push(`${unit.id}: reviewStatus must be source-verified`);
  if (!Array.isArray(unit.sourcePages) || !unit.sourcePages.length) errors.push(`${unit.id}: missing sourcePages`);
  if (!unit.task || !unit.task.prompt) errors.push(`${unit.id}: missing task prompt`);
  if (!Array.isArray(unit.progression) || unit.progression.length < 2) errors.push(`${unit.id}: progressive practice is required`);
  if (!unit.recording || unit.recording.storage !== 'IndexedDB:russian_b2_recordings') errors.push(`${unit.id}: IndexedDB recording metadata is required`);
  if (!unit.sourceAnswer || !unit.sourceAnswer.text || unit.sourceAnswer.source?.kind !== 'b2-original') errors.push(`${unit.id}: B2-original reference answer is required`);
  if (!unit.media || !unit.media.provenance) errors.push(`${unit.id}: media provenance is required`);
  if (unit.media.provenance === 'original' && !unit.media.file) errors.push(`${unit.id}: original media requires an actual file`);
  return errors;
}

function buildSpeakingModule({ root, write = false }) {
  const speakingDir = getSpeakingDir(root);
  const index = readJson(path.join(speakingDir, 'index.json'));
  const units = index.units.map(file => readJson(path.join(speakingDir, file)));
  const errors = units.flatMap(validateSpeakingUnit);
  if (errors.length) throw new Error(`Speaking source validation failed:\n${errors.join('\n')}`);
  return { index, units };
}

function toReaderChapter(unit) {
  return {
    ...unit,
    format: 'speaking-practice',
    recording: { ...unit.recording, storage: 'IndexedDB:russian_b2_recordings' }
  };
}

function publishSpeakingReaderModule({ root, outputDir }) {
  const { units } = buildSpeakingModule({ root });
  fs.mkdirSync(outputDir, { recursive: true });
  const index = {
    title: '俄语 B2 全模块 · 会话',
    chapters: units.length,
    chapterTitles: units.map(unit => unit.title)
  };
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  units.forEach((unit, number) => {
    fs.writeFileSync(path.join(outputDir, `ch${String(number).padStart(4, '0')}.json`), JSON.stringify(toReaderChapter(unit), null, 2) + '\n');
  });
  return { index, units };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'speaking');
  const result = publishSpeakingReaderModule({ root, outputDir });
  process.stdout.write(`Published ${result.units.length} speaking chapters to ${outputDir}\n`);
}

module.exports = { buildSpeakingModule, validateSpeakingUnit, publishSpeakingReaderModule, toReaderChapter, getSpeakingDir };
