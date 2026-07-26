const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const chapterPath = path.resolve(__dirname, '..', '..', 'data', 'textbook', 'reading_speaking', 'ch0001.json');

function normalizeRussian(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/g, ' ').trim();
}

test('chapter 2 choice explanations use the detailed learning-support structure', () => {
  const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  assert.deepEqual(chapter.analysisSource, {
    status: 'ai-generated-study-support',
    scope: 'choice-question explanations',
  });
  assert.equal(chapter.exercises.length, 8);

  for (const exercise of chapter.exercises) {
    const detail = exercise.detailed_explanation || '';
    assert.match(detail, /【学习辅助·原文定位】/);
    assert.match(detail, /【正确项】/);
    assert.match(detail, /【排除项】/);
    assert.match(detail, /【关键词】/);
    assert.match(detail, /【原文逐句拆解】|【推理链】|【篇章结构】|【时间线核对】/);
    assert.match(detail, /【进一步辨析】/);
    assert.match(detail, /【一句话复盘】/);
    assert.ok(detail.length >= 800, `question ${exercise.num} explanation is too short`);
    const sectionHeadings = [...detail.matchAll(/【[^\n]+】/g)].map((match) => match[0]);
    assert.equal(
      new Set(sectionHeadings).size,
      sectionHeadings.length,
      `question ${exercise.num} repeats an explanation section`,
    );

    assert.ok(exercise.sourceAnchor, `question ${exercise.num} has no source anchor`);
    assert.ok(Number.isInteger(exercise.sourceAnchor.paragraphIndex));
    const sourceParagraph = chapter.original[exercise.sourceAnchor.paragraphIndex];
    assert.ok(sourceParagraph, `question ${exercise.num} source paragraph does not exist`);
    assert.ok(
      normalizeRussian(sourceParagraph).includes(normalizeRussian(exercise.sourceAnchor.quote)),
      `question ${exercise.num} source quote is not present in its paragraph`,
    );
  }
});
