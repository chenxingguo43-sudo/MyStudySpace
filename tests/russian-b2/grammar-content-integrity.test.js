const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const grammarRoot = path.join(ROOT, 'data', 'textbook', 'russian_b2');

function loadPart(index) {
  return JSON.parse(fs.readFileSync(path.join(grammarRoot, `ch000${index}.json`), 'utf8'));
}

test('B2 grammar answer keys always point to the displayed option', () => {
  for (let index = 0; index < 6; index += 1) {
    const chapter = loadPart(index);
    for (const exercise of chapter.exercises) {
      assert.equal(exercise.answer, exercise.sourceAnswer, `${exercise.id} answer/sourceAnswer mismatch`);
      assert.ok(exercise.options.some(option => option.key === exercise.answer), `${exercise.id} answer is not displayed`);
    }
  }
});

test('B2 grammar keeps the OCR-repaired answer positions', () => {
  const expected = {
    'P1-Q018': 'В',
    'P2-Q013': 'В', 'P2-Q015': 'В', 'P2-Q016': 'В',
    'P3-Q005': 'В', 'P3-Q007': 'В', 'P3-Q014': 'В', 'P3-Q044': 'В', 'P3-Q046': 'В',
    'P4-Q001': 'В', 'P4-Q003': 'В', 'P4-Q032': 'В', 'P4-Q037': 'В', 'P4-Q039': 'В',
    'P4-Q043': 'В', 'P4-Q044': 'В', 'P4-Q050': 'В',
    'P5-Q006': 'В', 'P5-Q011': 'В', 'P5-Q012': 'В', 'P5-Q027': 'В', 'P5-Q035': 'В', 'P5-Q042': 'В',
    'P6-Q014': 'Б', 'P6-Q016': 'В'
  };
  const all = Array.from({ length: 6 }, (_, index) => loadPart(index).exercises).flat();
  for (const [id, answer] of Object.entries(expected)) {
    assert.equal(all.find(item => item.id === id)?.answer, answer, `${id} answer position regressed`);
  }
});

test('B2 grammar prompts do not contain known OCR truncation fragments', () => {
  const all = Array.from({ length: 6 }, (_, index) => loadPart(index).exercises).flat();
  // Match the truncated OCR token only when it ends there; the repaired
  // sentence legitimately contains the full word "не понадобится".
  const forbidden = [/не понадо(?:\s|$|[.,!?])/, /редкостьки/, /делегации реску/];
  for (const exercise of all) {
    assert.ok(!forbidden.some(fragment => typeof fragment === 'string'
      ? exercise.question.includes(fragment)
      : fragment.test(exercise.question)), `${exercise.id} still contains OCR fragment`);
  }
  for (const id of ['P6-Q038', 'P6-Q041', 'P6-Q042', 'P6-Q044', 'P6-Q046', 'P6-Q047', 'P6-Q048', 'P6-Q049', 'P6-Q050']) {
    const exercise = all.find(item => item.id === id);
    assert.ok(exercise && exercise.question !== '…', `${id} is still an unexplained placeholder`);
  }
});
