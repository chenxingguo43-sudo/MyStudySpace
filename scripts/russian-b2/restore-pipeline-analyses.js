const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const inputDirectory = path.join(root, '.reader-pipeline', 'russian-b2-grammar', 'inputs');
const readerDirectory = path.join(root, 'data', 'textbook', 'russian_b2');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }

const updatesByChapter = new Map();
for (const file of fs.readdirSync(inputDirectory)) {
  if (!file.endsWith('.json')) continue;
  const input = readJson(path.join(inputDirectory, file));
  const analysis = input.question && input.question.existingAnalysis;
  const match = /^ch(\d{4}):/.exec(input.taskId || '');
  if (!analysis || !match || !input.question.id) continue;
  const chapterId = 'ch' + match[1];
  if (!updatesByChapter.has(chapterId)) updatesByChapter.set(chapterId, new Map());
  updatesByChapter.get(chapterId).set(input.question.id, analysis);
}

let restored = 0;
for (const [chapterId, analyses] of updatesByChapter) {
  const file = path.join(readerDirectory, chapterId + '.json');
  const chapter = readJson(file);
  for (const exercise of chapter.exercises || []) {
    const analysis = analyses.get(exercise.id);
    if (!analysis) continue;
    exercise.answerAnalysis = analysis;
    restored += 1;
  }
  writeJson(file, chapter);
}

if (restored !== 330) throw new Error(`Expected 330 saved analyses, restored ${restored}`);
console.log(JSON.stringify({ restored, chapters: updatesByChapter.size }));
