const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..', '..');
const chapterRoot = path.join(projectRoot, 'data', 'textbook', 'reading_speaking');
const repairedChapters = new Set([
  'ch0001.json',
  'ch0002.json',
  'ch0003.json',
  'ch0004.json',
  'ch0005.json',
  'ch0006.json',
  'ch0007.json',
  'ch0008.json',
  'ch0009.json',
  'ch0010.json',
  'ch0013.json',
  'ch0014.json',
  'ch0015.json',
  'ch0016.json',
  'ch0018.json',
]);

function extractOptionKey(optionText) {
  const match = optionText.match(/^([а-яё]+)\)/i);
  return match ? match[1].toLowerCase() : '';
}

test('reading-speaking exercises have valid answers and repair provenance', () => {
  const chapterFiles = fs.readdirSync(chapterRoot)
    .filter((filename) => /^ch\d{4}\.json$/.test(filename))
    .sort();
  let exerciseCount = 0;

  assert.equal(chapterFiles.length, 30);

  for (const filename of chapterFiles) {
    const chapterPath = path.join(chapterRoot, filename);
    const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));

    if (repairedChapters.has(filename)) {
      assert.ok(chapter.answerKeySource, `${filename} must record its answer source`);
      assert.match(chapter.answerKeySource.status, /^(source|content)-verified$/);

      if (chapter.answerKeySource.status === 'source-verified') {
        const sourcePath = path.resolve(chapterRoot, chapter.answerKeySource.source);
        assert.ok(fs.existsSync(sourcePath), `${filename} answer source must exist`);
      }
    }

    for (const exercise of chapter.exercises || []) {
      exerciseCount += 1;
      const optionKeys = exercise.options.map(extractOptionKey).filter(Boolean);
      assert.ok(exercise.answer, `${filename} question ${exercise.num} has no answer`);
      assert.ok(
        optionKeys.includes(exercise.answer),
        `${filename} question ${exercise.num} answer ${exercise.answer} is not in ${optionKeys.join(', ')}`,
      );
    }
  }

  assert.equal(exerciseCount, 192);
});
