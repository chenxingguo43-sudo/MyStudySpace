const test = require('node:test');
const assert = require('node:assert/strict');
const { safeObject, buildDashboardProgress } = require('../../js/russian-b2/dashboard');

const manifest = { modules: [
  { id: 'grammar', status: 'available' }, { id: 'reading', status: 'available' },
  { id: 'writing', status: 'available' }, { id: 'listening', status: 'available' },
  { id: 'speaking', status: 'available' }, { id: 'exam', status: 'available' },
  { id: 'review', status: 'available' }
] };
const inventories = {
  grammar: [{ id: 'p1', questionIds: ['g1', 'g2'] }],
  reading: [{ id: 'r1', questionIds: ['r1q1', 'r1q2'] }],
  writing: [{ id: 'w1', taskIds: ['w1t1'] }],
  listening: [{ id: 'l1', questionIds: ['l1q1'] }],
  speaking: [{ id: 's1', taskIds: ['s1t1'] }],
  exam: [{ id: 'e1', questionIds: ['e1q1'], taskIds: ['e1t1'] }]
};

test('safeObject accepts only non-array objects', () => {
  assert.deepEqual(safeObject(null), {});
  assert.deepEqual(safeObject([]), {});
  assert.deepEqual(safeObject('broken'), {});
  assert.deepEqual(safeObject({ yes: true }), { yes: true });
});

test('aggregates empty, partial, and complete objective-module progress', () => {
  const empty = buildDashboardProgress({ manifest, inventories, records: {} });
  assert.deepEqual(empty.modules.grammar, {
    moduleId: 'grammar', progressAvailable: true, total: 1, completed: 0, percent: 0, summary: '0/1', secondaryLabel: '', lastActivityAt: undefined
  });

  const partial = buildDashboardProgress({ manifest, inventories, records: {
    grammar: { 'russian_b2:p1': { g1: { submitted: true } } },
    reading: { r1q1: { answered: true } }, listening: { l1q1: { answered: true } }
  } });
  assert.equal(partial.modules.grammar.completed, 0);
  assert.equal(partial.modules.reading.completed, 0);
  assert.equal(partial.modules.listening.completed, 1);

  const complete = buildDashboardProgress({ manifest, inventories, records: {
    grammar: { 'russian_b2:p1': { g1: { submitted: true }, g2: { submitted: true } } },
    reading: { r1q1: { answered: true }, r1q2: { answered: true } }
  } });
  assert.equal(complete.modules.grammar.percent, 100);
  assert.equal(complete.modules.reading.completed, 1);
});

test('manual completion ignores drafts and reports draft and note summaries', () => {
  const result = buildDashboardProgress({ manifest, inventories, records: {
    writing: { w1t1: { completed: false, updatedAt: '2026-07-18T10:00:00Z' } },
    writingDrafts: { w1t1: { value: 'draft', updatedAt: '2026-07-18T10:00:00Z' } },
    speakingNotes: { s1t1: { value: 'note', updatedAt: '2026-07-18T11:00:00Z' } },
    speaking: { s1t1: { completed: true, updatedAt: '2026-07-18T12:00:00Z' } }
  } });
  assert.equal(result.modules.writing.completed, 0);
  assert.equal(result.modules.writing.secondaryLabel, '草稿 1');
  assert.equal(result.modules.speaking.completed, 1);
  assert.equal(result.modules.speaking.secondaryLabel, '笔记 1');
  assert.equal(result.modules.speaking.lastActivityAt, '2026-07-18T12:00:00Z');
});

test('exam completion requires both objective answers and completed manual writing', () => {
  const unansweredWriting = buildDashboardProgress({ manifest, inventories, records: {
    exam: { e1q1: { answered: true } }, examCompleted: { 'e1:e1t1': { completed: false } }
  } });
  assert.equal(unansweredWriting.modules.exam.completed, 0);

  const complete = buildDashboardProgress({ manifest, inventories, records: {
    exam: { e1q1: { answered: true, answeredAt: '2026-07-18T12:00:00Z' } },
    examCompleted: { 'e1:e1t1': { completed: true, updatedAt: '2026-07-18T12:01:00Z' } }
  } });
  assert.equal(complete.modules.exam.completed, 1);

  const missingTimestamp = buildDashboardProgress({ manifest, inventories, records: {
    exam: { e1q1: { answered: true } }, examCompleted: { 'e1:e1t1': { completed: true } }
  } });
  assert.equal(missingTimestamp.modules.exam.completed, 0);

  const objectiveOnly = buildDashboardProgress({ manifest: { modules: [{ id: 'exam' }] }, inventories: { exam: [{ id: 'objective', questionIds: ['q'] }] }, records: { exam: { q: { answered: true } } } });
  assert.equal(objectiveOnly.modules.exam.completed, 1);
});

test('degrades a module when a chapter inventory declares malformed question ids', () => {
  const result = buildDashboardProgress({ manifest, inventories: {
    ...inventories, grammar: [{ id: 'p1', questionIds: 'bad' }]
  }, records: {} });
  assert.equal(result.modules.grammar.progressAvailable, false);
  assert.equal(result.modules.grammar.completed, 0);
  assert.equal(result.modules.grammar.secondaryLabel, '进度暂不可用');
});

test('degrades safely for damaged records and unavailable inventories', () => {
  const result = buildDashboardProgress({ manifest, inventories: { grammar: null, reading: 'bad' }, records: { grammar: [], reading: null } });
  assert.equal(result.modules.grammar.progressAvailable, false);
  assert.equal(result.modules.grammar.secondaryLabel, '进度暂不可用');
  assert.equal(result.modules.reading.percent, null);
  assert.deepEqual(result.modules.review, {
    moduleId: 'review', progressAvailable: true, total: 0, completed: 0, percent: null, summary: '暂无可统计进度', secondaryLabel: '', lastActivityAt: undefined
  });
});

test('only retains a valid B2 last-read location and parseable activity timestamps', () => {
  const valid = buildDashboardProgress({ manifest, inventories, records: {
    reading: { r1q1: { answered: true, answeredAt: '2026-07-18T10:00:00Z' }, r1q2: { answered: true, answeredAt: 'not-a-date' } }
  }, lastRead: { bookId: 'russian_b2', moduleId: 'reading', chapter: 0, activeQuestionId: 'r1q1', scroll: 42, viewMode: 'exam', updatedAt: '2026-07-18T11:00:00Z' } });
  assert.deepEqual(valid.continueLearning, { moduleId: 'reading', chapter: 0, activeQuestionId: 'r1q1', scroll: 42, viewMode: 'exam', updatedAt: '2026-07-18T11:00:00Z' });
  assert.equal(valid.modules.reading.lastActivityAt, '2026-07-18T10:00:00Z');

  const invalid = buildDashboardProgress({ manifest, inventories, records: {}, lastRead: { bookId: 'russian_b2', moduleId: 'missing', chapter: 0, updatedAt: 'today' } });
  assert.equal(invalid.continueLearning, undefined);

  const unavailable = buildDashboardProgress({ manifest: { modules: [{ id: 'reading', status: 'coming-soon' }] }, inventories: { reading: [] }, records: {}, lastRead: { bookId: 'russian_b2', moduleId: 'reading', chapter: 0, updatedAt: '2026-07-18T11:00:00Z' } });
  assert.equal(unavailable.continueLearning, undefined);
});
