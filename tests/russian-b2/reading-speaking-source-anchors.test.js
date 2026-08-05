const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const chapterDir = path.join(root, 'data', 'textbook', 'reading_speaking');

function normalizeRussian(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-я-]+/g, ' ')
    .trim();
}

test('every restored reading-speaking source anchor points to its own article', () => {
  const files = fs.readdirSync(chapterDir)
    .filter((file) => /^ch\d+\.json$/.test(file))
    .sort();
  const anchored = [];

  for (const file of files) {
    const chapter = JSON.parse(fs.readFileSync(path.join(chapterDir, file), 'utf8'));
    for (const exercise of chapter.exercises || []) {
      if (!exercise.sourceAnchor) continue;
      const { paragraphIndex, quote } = exercise.sourceAnchor;
      assert.ok(Number.isInteger(paragraphIndex), `${file}#${exercise.num}: invalid paragraph index`);
      assert.ok(paragraphIndex >= 0 && paragraphIndex < chapter.original.length,
        `${file}#${exercise.num}: paragraph index is outside the article`);
      assert.ok(normalizeRussian(chapter.original[paragraphIndex]).includes(normalizeRussian(quote)),
        `${file}#${exercise.num}: quote is not present in the selected paragraph`);
      const correctIndex = 'абв'.indexOf(exercise.answer);
      const correctOption = (exercise.options || [])[correctIndex];
      assert.ok(correctOption, `${file}#${exercise.num}: answer does not select an option`);
      assert.ok(normalizeRussian(exercise.detailed_explanation).includes(normalizeRussian(correctOption)),
        `${file}#${exercise.num}: explanation does not discuss the current correct option`);
      anchored.push(`${file}#${exercise.num}`);
    }
  }

  assert.equal(anchored.length, 24, 'the first verified recovery batch must contain exactly 24 anchors');
});

test('Reader turns both historical source-location headings into source buttons', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /sectionTitle === '【学习辅助·原文定位】'/);
  assert.match(reader, /sectionTitle === '【定位原文】'/);
});
