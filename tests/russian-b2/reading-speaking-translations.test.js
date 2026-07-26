const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..', '..');
const chapterRoot = path.join(projectRoot, 'data', 'textbook', 'reading_speaking');

test('reading-speaking choice questions include Chinese prompts and option translations', () => {
  const chapterFiles = fs.readdirSync(chapterRoot)
    .filter((filename) => /^ch\d{4}\.json$/.test(filename))
    .sort();
  let exerciseCount = 0;

  for (const filename of chapterFiles) {
    const chapter = JSON.parse(fs.readFileSync(path.join(chapterRoot, filename), 'utf8'));
    for (const exercise of chapter.exercises || []) {
      exerciseCount += 1;
      assert.ok(exercise.zhQuestion?.trim(), `${filename} question ${exercise.num} has no Chinese prompt`);
      assert.equal(
        exercise.zhOptions?.length,
        exercise.options.length,
        `${filename} question ${exercise.num} has incomplete option translations`,
      );
      for (const [index, option] of exercise.zhOptions.entries()) {
        assert.ok(option?.trim(), `${filename} question ${exercise.num} option ${index + 1} has no Chinese translation`);
      }
    }
  }

  assert.equal(exerciseCount, 192);
});
