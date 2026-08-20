const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chapters = {
  ch0011: { count: 4, pending: 0 },
  ch0012: { count: 7, pending: 0 },
  ch0017: { count: 4, pending: 0 },
  ch0019: { count: 6, pending: 0 },
  ch0020: { count: 10, pending: 0 },
  ch0022: { count: 10, pending: 0 }
};

test('restored reading chapters expose the source questions', () => {
  for (const [chapter, expected] of Object.entries(chapters)) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'reading_speaking', `${chapter}.json`), 'utf8'));
    assert.equal(data.exerciseSource.status, 'restored-from-study-unit');
    assert.equal(data.exercises.length, expected.count, chapter);
    assert.equal(data.exercises.filter((exercise) => exercise.answerStatus === 'unverified').length, expected.pending, chapter);
    for (const exercise of data.exercises) {
      assert.ok(exercise.question, `${chapter} question text`);
      assert.ok(exercise.options.length >= 2, `${chapter} options`);
      assert.ok(exercise.options.every((option) => option.length > 3), `${chapter} option text`);
    }
  }
});

test('Reader does not mark a question without a verified answer as wrong', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /record\.unverified = !isReadingSpeakingAnswerVerified\(ex\)/);
  assert.match(reader, /已记录，标准答案待确认/);
});

test('reading completion waits for all submitted questions and never appears from article scrolling', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /curBook\.id !== 'reading_speaking'/);
  assert.match(reader, /progress\.completed !== progress\.total/);
  assert.match(reader, /requestReadingSpeakingChapterCompletion\(\)/);
  assert.match(reader, /已完成 ' \+ progress\.total \+ ' 道题。确定标记本篇完成吗？/);
  assert.doesNotMatch(reader, /fab-group-bottom[\s\S]{0,500}markDoneBtn[\s\S]{0,500}reading_speaking/);
});

test('Reader clearly distinguishes exact, paragraph, and unavailable source locators', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /定位原文句子/);
  assert.match(reader, /定位相关段落/);
  assert.match(reader, /原文待核对/);
  assert.match(reader, /已定位到相关段落；原句存在 OCR 或版本差异/);
});
