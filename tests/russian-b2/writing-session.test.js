const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'russian-b2', 'writing-session.js'), 'utf8');

function createSession(initial) {
  const values = new Map(Object.entries(initial || {}));
  const storage = { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) };
  const window = { localStorage: storage };
  vm.runInNewContext(source, { window, Date });
  return { api: window.RussianB2WritingSession, storage };
}

test('paper-writing stages persist independently per stable task ID', () => {
  const { api, storage } = createSession();
  api.setStage('ws-t4.1-w-p199-01', 'planned', true, storage, new Date('2026-08-06T00:00:00Z'));
  api.setStage('ws-t4.1-w-p199-01', 'paperDraft', true, storage, new Date('2026-08-06T00:01:00Z'));
  assert.equal(api.getStageCount('ws-t4.1-w-p199-01', storage), 2);
  assert.equal(api.getStageCount('ws-t4.1-w-p201-02', storage), 0);
  assert.equal(api.isTaskComplete('ws-t4.1-w-p199-01', storage), false);
  api.setStage('ws-t4.1-w-p199-01', 'revised', true, storage, new Date('2026-08-06T00:02:00Z'));
  assert.equal(api.isTaskComplete('ws-t4.1-w-p199-01', storage), true);
});

test('corrupt progress and legacy draft storage do not create paper-draft completion', () => {
  const { api, storage } = createSession({
    [apiKey()]: '{not json}',
    rr_ws_drafts_v1: JSON.stringify({ 'ws-t4.1-w-p199-01': { value: 'legacy browser draft' } })
  });
  assert.equal(Object.keys(api.getRecords(storage)).length, 0);
  assert.equal(api.isTaskComplete('ws-t4.1-w-p199-01', storage), false);
  function apiKey() { return 'rr_ws_learning_progress_v1'; }
});

test('chapter completion requires every task to reach self-checked revision', () => {
  const { api, storage } = createSession();
  const tasks = [{ taskId: 'one' }, { taskId: 'two' }];
  for (const stage of api.STAGES) api.setStage('one', stage, true, storage);
  assert.equal(api.getChapterSummary(tasks, storage).completed, 1);
  assert.equal(api.getChapterSummary(tasks, storage).isComplete, false);
  for (const stage of api.STAGES) api.setStage('two', stage, true, storage);
  assert.equal(api.getChapterSummary(tasks, storage).completed, 2);
  assert.equal(api.getChapterSummary(tasks, storage).isComplete, true);
});
