const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const chapterRoot = path.resolve(__dirname, '..', 'data', 'textbook', 'reading_speaking');
const inputPath = path.join(os.tmpdir(), 'reading-speaking-translation-results.json');
const results = JSON.parse(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
const translations = new Map(results.map(({ id, translation }) => [id, translation]));
let applied = 0;

function optionPrefix(option) { return option.match(/^[^)]*\)\s*/)?.[0] || ''; }

for (const filename of fs.readdirSync(chapterRoot).filter((file) => /^ch\d{4}\.json$/.test(file)).sort()) {
  if (filename === 'ch0000.json') continue;
  const filePath = path.join(chapterRoot, filename);
  const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  for (const exercise of chapter.exercises || []) {
    const questionId = `${filename}:${exercise.num}:question`;
    if (!exercise.zhQuestion && translations.has(questionId)) {
      exercise.zhQuestion = translations.get(questionId);
      applied += 1; changed = true;
    }
    exercise.zhOptions = Array.isArray(exercise.zhOptions) ? exercise.zhOptions : [];
    for (let index = 0; index < exercise.options.length; index += 1) {
      const optionId = `${filename}:${exercise.num}:option:${index}`;
      if (!exercise.zhOptions[index] && translations.has(optionId)) {
        const translated = translations.get(optionId).replace(/^[A-Za-zА-Яа-я]\)\s*/, '');
        exercise.zhOptions[index] = `${optionPrefix(exercise.options[index])}${translated}`;
        applied += 1; changed = true;
      }
    }
  }
  if (changed) {
    chapter.translationSource = { status: 'ai-generated-study-support', scope: 'choice-question prompts and options' };
    fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  }
}

console.log(`Applied ${applied} translations.`);
