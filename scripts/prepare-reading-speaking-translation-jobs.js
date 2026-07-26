const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const chapterRoot = path.resolve(__dirname, '..', 'data', 'textbook', 'reading_speaking');
const outputPath = path.join(os.tmpdir(), 'reading-speaking-translation-jobs.json');
const jobs = [];

for (const filename of fs.readdirSync(chapterRoot).filter((file) => /^ch\d{4}\.json$/.test(file)).sort()) {
  if (filename === 'ch0000.json') continue;
  const chapter = JSON.parse(fs.readFileSync(path.join(chapterRoot, filename), 'utf8'));
  for (const exercise of chapter.exercises || []) {
    if (!exercise.zhQuestion) jobs.push({ id: `${filename}:${exercise.num}:question`, text: exercise.question });
    for (let index = 0; index < exercise.options.length; index += 1) {
      if (!exercise.zhOptions?.[index]) jobs.push({ id: `${filename}:${exercise.num}:option:${index}`, text: exercise.options[index] });
    }
  }
}

fs.writeFileSync(outputPath, `\uFEFF${JSON.stringify(jobs)}\n`, 'utf8');
console.log(`${jobs.length} strings prepared at ${outputPath}`);
