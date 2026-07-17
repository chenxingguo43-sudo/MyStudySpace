const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SOURCE_PATH = path.join(
  'D:',
  'MyStudySpace',
  '俄语资料库',
  '俄语B2 全模块 Markdown版',
  '章节',
  '04-听力.md'
);
const LISTENING_DIR = path.join(
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '听力'
);

function findBlocks(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== heading) continue;
    const block = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].startsWith('## ')) break;
      block.push(lines[cursor]);
    }
    blocks.push(block);
  }
  return blocks;
}

function normalizeTranscript(lines) {
  return lines
    .filter(line => !line.startsWith('## ◎'))
    .join(' ')
    .replace(/([\p{L}])-\s+/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function importListeningTranscripts({ root, sourcePath = DEFAULT_SOURCE_PATH, write = false }) {
  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const audioBlocks = findBlocks(markdown, '## 听力录音材料');
  const videoBlocks = findBlocks(markdown, '## 视频录音材料');
  if (audioBlocks.length < 2 || videoBlocks.length < 3) {
    throw new Error('Legacy listening source does not contain all expected transcript blocks');
  }

  const transcriptByFile = {
    'dialogues.json': normalizeTranscript(audioBlocks[0]),
    'advertisements.json': normalizeTranscript(audioBlocks[1]),
    'film.json': normalizeTranscript(videoBlocks[0]),
    'news.json': normalizeTranscript(videoBlocks[1]),
    'interview.json': normalizeTranscript(videoBlocks[2])
  };
  const result = [];
  for (const [fileName, transcript] of Object.entries(transcriptByFile)) {
    const filePath = path.join(root, LISTENING_DIR, fileName);
    const unit = readJson(filePath);
    unit.transcriptSegments = [{ speaker: '原书录音材料', text: transcript }];
    if (write) writeJson(filePath, unit);
    result.push({ id: unit.id, length: transcript.length });
  }
  return result;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const result = importListeningTranscripts({ root, write: true });
  process.stdout.write(`${result.map(item => `${item.id}:${item.length}`).join(', ')}\n`);
}

module.exports = { findBlocks, normalizeTranscript, importListeningTranscripts };
