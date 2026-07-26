// Imports the verified В мире людей. Выпуск 2 MOV package without changing it.
// Usage: node scripts/import-world-people-v2-media.js
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = 'E:\\Desktop\\в мире людей 音频\\в мире людей 音频';
const TEXTBOOK_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking');
const OUTPUT_DIR = path.join(TEXTBOOK_DIR, 'media', 'world-people-v2');
const MOCK_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking_mock', 'media');
const SEGMENTS_PATH = path.join(ROOT, 'data', 'listening_speaking_segments.json');
const AUDIT_PATH = path.join(TEXTBOOK_DIR, 'media-source-audit.json');
const REFRESH = process.argv.includes('--refresh');
const TRACKS_ARG = process.argv.find(arg => arg.startsWith('--tracks='));
const REFRESH_TRACKS = TRACKS_ARG ? new Set(TRACKS_ARG.slice('--tracks='.length).split(',').flatMap(part => {
  const bounds = part.split('-').map(Number);
  if (bounds.length === 1) return bounds;
  return Array.from({ length: bounds[1] - bounds[0] + 1 }, (_, index) => bounds[0] + index);
})) : null;

function sourceFile(number) {
  const files = fs.readdirSync(SOURCE_DIR);
  const prefix = String(number).padStart(2, '0') + ' ';
  const match = files.find(name => name.startsWith(prefix) && name.toLowerCase().endsWith('.mov'));
  if (!match) throw new Error('Missing source MOV ' + String(number).padStart(2, '0'));
  return path.join(SOURCE_DIR, match);
}
function targetFile(number, mock) {
  return path.join(mock ? MOCK_DIR : OUTPUT_DIR, String(number).padStart(2, '0') + '.mp4');
}
function probe(file) {
  const raw = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name', '-of', 'json', file], { encoding: 'utf8' });
  const info = JSON.parse(raw);
  return { durationSeconds: Math.round(Number(info.format.duration) * 1000) / 1000, codecs: info.streams.map(s => s.codec_type + ':' + s.codec_name) };
}
function transcode(number, input, output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const refreshThisTrack = REFRESH && (!REFRESH_TRACKS || REFRESH_TRACKS.has(number));
  if (fs.existsSync(output) && !refreshThisTrack) {
    try { return probe(output); } catch (error) { fs.rmSync(output, { force: true }); }
  }
  const temporary = output + '.part.mp4';
  fs.rmSync(temporary, { force: true });
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', temporary], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('ffmpeg failed: ' + path.basename(input) + '\n' + (result.stderr || ''));
  const metadata = probe(temporary);
  if (!metadata.codecs.includes('video:h264') || !metadata.codecs.includes('audio:aac')) throw new Error('Invalid output codecs: ' + output);
  fs.rmSync(output, { force: true });
  fs.renameSync(temporary, output);
  return metadata;
}
const outputs = [];
for (let number = 0; number <= 60; number++) {
  const mock = number >= 56;
  const input = sourceFile(number);
  const output = targetFile(number, mock);
  const sourceMetadata = probe(input);
  const outputMetadata = transcode(number, input, output);
  const presentation = number >= 16 && number <= 25 ? 'video' : 'audio';
  outputs.push({ number, sourceFile: path.basename(input), source: sourceMetadata, outputFile: path.relative(ROOT, output).replace(/\\/g, '/'), output: outputMetadata, presentation, use: number === 0 ? 'collection-introduction-not-bound' : mock ? 'trki2-mock-exam' : 'listening-speaking' });
  console.log('[' + String(number).padStart(2, '0') + '] ' + path.basename(input) + ' -> ' + path.basename(output));
}

const segments = JSON.parse(fs.readFileSync(SEGMENTS_PATH, 'utf8'));
function videoMedia(number) {
  const kind = number >= 16 && number <= 25 ? 'video' : 'audio';
  return { provenance: kind === 'video' ? 'verified-original-video' : 'verified-original-audio', status: 'verified', kind, file: 'media/world-people-v2/' + String(number).padStart(2, '0') + '.mp4', sourceCollection: 'В мире людей. Выпуск 2. Аудирование. Говорение', sourceTrack: String(number).padStart(2, '0') + '.mov' };
}
segments.forEach((segment, index) => {
  if (index <= 29) segment.media = videoMedia(index + 1);
  if (index >= 30 && index <= 34) {
    const start = 31 + (index - 30) * 5;
    segment.media = Object.assign(videoMedia(start), { playlist: Array.from({ length: 5 }, (_, offset) => {
      const number = start + offset;
      return Object.assign(videoMedia(number), { id: 'news-' + number, label: '新闻 ' + (offset + 1) });
    }) });
  }
  if (index <= 34) {
    segment.mediaStatus = 'verified';
    segment.mediaFile = segment.media.file;
  }
});
fs.writeFileSync(SEGMENTS_PATH, JSON.stringify(segments, null, 2) + '\n', 'utf8');
fs.writeFileSync(AUDIT_PATH, JSON.stringify({
  status: 'verified', verifiedAt: new Date().toISOString().slice(0, 10),
  collection: 'В мире людей. Выпуск 2. Аудирование. Говорение', publisher: 'Златоуст', year: 2016, isbn: '978-5-86547-916-1',
  sourceDirectory: SOURCE_DIR, sourcePolicy: 'Original MOV files are read-only and remain on E:\\Desktop. Browser MP4 outputs preserve the source orientation. Only tracks 16-25 are presented as video; all other supplied tracks use audio-only controls.',
  mappings: { singleMediaChapters: '01-30 -> ch0000-ch0029; tracks 16-25 are video and the rest are audio-only', newsPlaylists: '31-55 -> ch0030-ch0034, five audio-only files per chapter', mockExam: '56-60 -> listening_speaking_mock/ch0000 audio-only playlist', unavailable: 'ch0035-ch0062 are ТРКИ-3 and have no supplied companion media.' },
  outputs
}, null, 2) + '\n', 'utf8');
console.log('Imported ' + outputs.length + ' videos. Run node scripts/convert-listening-speaking.js next.');
