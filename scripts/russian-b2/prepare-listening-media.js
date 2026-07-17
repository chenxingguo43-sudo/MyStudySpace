const fs = require('node:fs');
const path = require('node:path');

const LISTENING_DIR = path.join(
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '听力'
);

function prepareListeningMedia({ root, write = false }) {
  const sourceDir = path.join(root, LISTENING_DIR);
  const index = JSON.parse(fs.readFileSync(path.join(sourceDir, 'index.json'), 'utf8'));
  const units = index.units.map(fileName => {
    const filePath = path.join(sourceDir, fileName);
    const unit = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segmentVoices = Object.fromEntries(
      (unit.transcriptSegments || [])
        .filter(segment => segment.displayLabel && segment.voice)
        .map(segment => [segment.displayLabel, segment.voice])
    );
    unit.media = {
      ...unit.media,
      provenance: 'reconstructed-tts',
      file: `media/listening/${unit.id}.mp3`,
      captions: `media/listening/${unit.id}.vtt`
    };
    if (Object.keys(segmentVoices).length > 1) {
      unit.media.voices = segmentVoices;
      delete unit.media.voice;
    } else if (!unit.media.voice) {
      unit.media.voice = Object.values(segmentVoices)[0] || 'ru-RU-SvetlanaNeural';
    }
    if (write) fs.writeFileSync(filePath, `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
    return unit;
  });
  return units;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const units = prepareListeningMedia({ root, write: true });
  process.stdout.write(`Prepared media metadata for ${units.length} listening units.\n`);
}

module.exports = { prepareListeningMedia };
