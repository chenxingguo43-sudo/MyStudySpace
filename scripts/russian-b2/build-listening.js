const fs = require('node:fs');
const path = require('node:path');
const LISTENING_DIR = path.join('俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '听力');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function validateListeningUnit(unit) {
  const errors = [];
  if (!unit.id || !unit.title || unit.reviewStatus !== 'source-verified') errors.push(`${unit.id || 'unit'}: verified identity required`);
  if (!Array.isArray(unit.sourcePages) || !unit.sourcePages.length) errors.push(`${unit.id}: source pages required`);
  if (!Array.isArray(unit.transcriptSegments) || !unit.transcriptSegments.length) errors.push(`${unit.id}: transcript required`);
  if (!Array.isArray(unit.questions) || unit.questions.length !== 5) errors.push(`${unit.id}: five questions required`);
  if (unit.questions && unit.questions.some(q => !q.answer || !q.prompt)) errors.push(`${unit.id}: question answer and prompt required`);
  if (unit.media?.provenance !== 'reconstructed-tts') errors.push(`${unit.id}: reconstructed TTS provenance required`);
  return errors;
}
function buildListeningModule({root}) {
  const dir = path.join(root, LISTENING_DIR), index = readJson(path.join(dir, 'index.json'));
  const units = index.units.map(file => readJson(path.join(dir, file)));
  const errors = units.flatMap(validateListeningUnit); if (errors.length) throw new Error(errors.join('\n'));
  return {index, units};
}
function publishListeningReaderModule({root, outputDir}) {
  const {units} = buildListeningModule({root});
  fs.mkdirSync(outputDir, {recursive: true});
  const index = {title: '俄语 B2 全模块 · 听力', chapters: units.length, chapterTitles: units.map(unit => unit.title)};
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  units.forEach((unit, number) => {
    fs.writeFileSync(path.join(outputDir, `ch${String(number).padStart(4, '0')}.json`), JSON.stringify({...unit, format: 'listening-practice'}, null, 2) + '\n');
  });
  return {index, units};
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'listening');
  const result = publishListeningReaderModule({root, outputDir});
  process.stdout.write(`Published ${result.units.length} listening chapters to ${outputDir}\n`);
}
module.exports = {buildListeningModule, validateListeningUnit, publishListeningReaderModule};
