const fs = require('node:fs');
const path = require('node:path');

const RELATIVE_DIR = path.join(
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '会话'
);

const VERIFIED_PAGES = {
  'negative-dialogue.json': [113, 114],
  'attitude-dialogue.json': [114, 115],
  'intonation.json': [115],
  'video-description.json': [115, 116],
  'editorial-phone-call.json': [116, 117],
  'examiner-discussion.json': [117]
};

function correctSpeakingSourcePages({ root, write = false }) {
  const result = [];
  for (const [fileName, sourcePages] of Object.entries(VERIFIED_PAGES)) {
    const filePath = path.join(root, RELATIVE_DIR, fileName);
    const unit = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    unit.sourcePages = sourcePages;
    if (unit.sourceAnswer?.source) unit.sourceAnswer.source.pages = sourcePages;
    if (write) fs.writeFileSync(filePath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
    result.push({ id: unit.id, sourcePages });
  }
  return result;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const result = correctSpeakingSourcePages({ root, write: true });
  process.stdout.write(`Corrected ${result.length} speaking source-page records.\n`);
}

module.exports = { correctSpeakingSourcePages, VERIFIED_PAGES };
