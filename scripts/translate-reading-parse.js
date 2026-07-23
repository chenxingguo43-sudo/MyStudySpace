#!/usr/bin/env node
/**
 * translate-reading-parse.js
 * Parse Gemini translation output for reading articles and save to mapping.
 * Usage: node scripts/translate-reading-parse.js <batchNum>
 */

const fs = require('fs');
const batchNum = parseInt(process.argv[2], 10);
if (!batchNum) { console.error('Usage: node scripts/translate-reading-parse.js <batchNum>'); process.exit(1); }

const bn = String(batchNum).padStart(2, '0');
const resultFile = 'data/translate-reading-batches/result-' + bn + '.txt';
if (!fs.existsSync(resultFile)) { console.error('No result file:', resultFile); process.exit(1); }

const result = fs.readFileSync(resultFile, 'utf8');
const lines = result.split('\n').filter(l => !l.startsWith('[gemini]'));

// Skip '说' + blank + preamble
let idx = 0;
while (idx < lines.length && lines[idx].trim() === '说') idx++;
while (idx < lines.length && lines[idx].trim() === '') idx++;
if (idx < lines.length && lines[idx].trim().startsWith('Вот точный')) idx++;
while (idx < lines.length && lines[idx].trim() === '') idx++;

// Parse: 'N. 中文翻译' or 'ТЕКСТ N / 文本 N' starts a new translation
const translations = {};
let currentNum = -1;
let buffer = [];

while (idx < lines.length) {
  const line = lines[idx].trim();
  const numMarker = line.match(/^(\d+)\.\s*中文翻译$/);
  const textMarker = line.match(/^ТЕКСТ\s+(\d+)\s*\/\s*文本\s*\d+$/);

  if (textMarker || numMarker) {
    if (currentNum >= 0 && buffer.length > 0) {
      translations[currentNum - 1] = buffer.join('\n').trim();
    }
    currentNum = textMarker ? parseInt(textMarker[1]) : parseInt(numMarker[1]);
    buffer = [];
  } else if (currentNum >= 0) {
    if (line) buffer.push(line);
    else if (buffer.length > 0) buffer.push(''); // preserve paragraph breaks
  }
  idx++;
}
// Save last
if (currentNum >= 0 && buffer.length > 0) {
  translations[currentNum - 1] = buffer.join('\n').trim();
}

// Remove trailing empty lines from each
for (const k of Object.keys(translations)) {
  translations[k] = translations[k].replace(/\n+$/, '');
}

console.log('Batch ' + batchNum + ': extracted ' + Object.keys(translations).length + ' translations');

// Save to mapping
const data = JSON.parse(fs.readFileSync('data/translate-reading.json', 'utf8'));
const BATCH_SIZE = 5;
const startIdx = (batchNum - 1) * BATCH_SIZE;
for (const [idx, zh] of Object.entries(translations)) {
  const i = startIdx + parseInt(idx);
  if (data[i]) {
    data[i].zh = zh;
    console.log('  [' + i + '] ' + data[i].source + ': ' + zh.substring(0, 60) + '...');
  }
}

fs.writeFileSync('data/translate-reading.json', JSON.stringify(data, null, 2), 'utf8');

const totalDone = data.filter(d => d.zh).length;
console.log('Done. Total translated: ' + totalDone + '/' + data.length);
