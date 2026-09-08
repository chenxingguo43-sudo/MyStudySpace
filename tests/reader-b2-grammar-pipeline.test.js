const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveProfile, loadState, verifyState } = require('../scripts/reader-book-pipeline');

const profile = resolveProfile('russian-b2-grammar');

test('B2 grammar unattended inventory contains all questions and cards', () => {
  const state = loadState(profile);
  assert.equal(state.chapters.length, 6);
  assert.equal(state.chapters.reduce((sum, chapter) => sum + chapter.exerciseCount, 0), 330);
  assert.equal(state.tasks.filter((task) => task.type === 'question-explanation').length, 330);
  assert.equal(state.tasks.filter((task) => task.type === 'knowledge-card').length, 34);
  assert.equal(state.tasks.filter((task) => task.status === 'completed' && task.type === 'knowledge-card').length, 34);
});

test('B2 grammar unattended state is resumable and valid', () => {
  const result = verifyState(profile, loadState(profile));
  assert.equal(result.ok, true, result.errors.join('\n'));
});
