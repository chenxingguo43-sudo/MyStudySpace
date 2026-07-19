const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  safeObject,
  buildDashboardProgress,
  chapterInventory,
  getDashboardChapterPaths,
  createB2LastReadRecord
} = require('../../js/russian-b2/dashboard');

const root = path.resolve(__dirname, '..', '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

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

test('requires the module-specific inventory id arrays before aggregating progress', () => {
  ['grammar', 'reading'].forEach(moduleId => {
    const result = buildDashboardProgress({ manifest, inventories: { ...inventories, [moduleId]: [{ id: 'missing-ids' }] }, records: {} });
    assert.equal(result.modules[moduleId].progressAvailable, false);
    assert.equal(result.modules[moduleId].completed, 0);
  });

  const emptyExam = buildDashboardProgress({ manifest, inventories: { ...inventories, exam: [{ id: 'empty-exam' }] }, records: {} });
  assert.equal(emptyExam.modules.exam.progressAvailable, false);
  assert.equal(emptyExam.modules.exam.completed, 0);

  const writingOnlyExam = buildDashboardProgress({ manifest: { modules: [{ id: 'exam' }] }, inventories: { exam: [{ id: 'writing', questionIds: [], taskIds: ['task'] }] }, records: { examCompleted: { 'writing:task': { completed: true, updatedAt: '2026-07-19T10:00:00Z' } } } });
  assert.equal(writingOnlyExam.modules.exam.completed, 1);
});

test('degrades modules whose inventory chapters have no usable id', () => {
  ['grammar', 'exam'].forEach(moduleId => {
    const entry = moduleId === 'grammar' ? { questionIds: ['q'] } : { questionIds: ['q'] };
    const result = buildDashboardProgress({ manifest, inventories: { ...inventories, [moduleId]: [entry] }, records: {
      grammar: { 'russian_b2:undefined': { q: { submitted: true } } }, exam: { q: { answered: true } }
    } });
    assert.equal(result.modules[moduleId].completed, 0);
    assert.equal(result.modules[moduleId].progressAvailable, false);
    assert.equal(result.modules[moduleId].secondaryLabel, '进度暂不可用');
  });
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

test('dashboard keeps module entry available when one inventory cannot be loaded', () => {
  const result = buildDashboardProgress({ manifest, inventories: { grammar: null }, records: 'broken', lastRead: {} });
  const grammar = result.modules.grammar;
  assert.equal(grammar.progressAvailable, false);
  assert.equal(grammar.secondaryLabel, '进度暂不可用');
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

test('normalizes verified chapter ids and rejects source-indexed chapters with no exercises or tasks', () => {
  assert.deepEqual(chapterInventory({ id: 'p1', exercises: [{ id: 'g1' }] }), {
    id: 'p1', questionIds: ['g1'], taskIds: []
  });
  assert.deepEqual(chapterInventory({ id: 'writing-1', task: { prompt: 'write' } }), {
    id: 'writing-1', questionIds: [], taskIds: ['writing-1']
  });
  assert.equal(chapterInventory({ id: 'source-only', instructions: 'not interactive' }), null);
});

test('real source-indexed exam gaps make exam progress unavailable instead of inventing completion', () => {
  const book = readJson(path.join('data', 'textbook', 'russian_b2', 'book.json'));
  const exam = book.modules.find(module => module.id === 'exam');
  const index = readJson(path.join('data', 'textbook', exam.dir, 'index.json'));
  const inventory = Array.from({ length: index.chapters }, (_, chapter) => chapterInventory(
    readJson(path.join('data', 'textbook', exam.dir, 'ch' + String(chapter).padStart(4, '0') + '.json'))
  ));
  const result = buildDashboardProgress({ manifest: { modules: [exam] }, inventories: { exam: inventory }, records: {} });

  assert.equal(inventory.filter(item => item === null).length, 3);
  assert.equal(result.modules.exam.progressAvailable, false);
  assert.equal(result.modules.exam.completed, 0);
});

test('grammar chapter paths come from the manifest while indexed modules require their index count', () => {
  const book = readJson(path.join('data', 'textbook', 'russian_b2', 'book.json'));
  const grammar = book.modules.find(module => module.id === 'grammar');
  const reading = book.modules.find(module => module.id === 'reading');
  const readingIndex = readJson(path.join('data', 'textbook', reading.dir, 'index.json'));
  const grammarPaths = getDashboardChapterPaths(grammar);
  const grammarInventory = grammarPaths.map(relative => chapterInventory(readJson(relative)));
  const grammarProgress = buildDashboardProgress({
    manifest: { modules: [grammar] }, inventories: { grammar: grammarInventory }, records: {}
  });

  assert.deepEqual(grammarPaths, Array.from({ length: 6 }, (_, chapter) =>
    'data/textbook/russian_b2/ch' + String(chapter).padStart(4, '0') + '.json'
  ));
  assert.equal(grammarProgress.modules.grammar.progressAvailable, true);
  assert.equal(grammarProgress.modules.grammar.completed, 0);
  assert.equal(grammarProgress.modules.grammar.total, 6);
  assert.equal(getDashboardChapterPaths(reading), null);
  assert.equal(getDashboardChapterPaths(reading, readingIndex).length, readingIndex.chapters);
});

test('creates B2 last-read records that retain active questions and listening view mode', () => {
  const grammar = createB2LastReadRecord({
    book: { id: 'russian_b2', moduleId: 'grammar' }, chapter: 2, scroll: 420,
    activeQuestionId: 'P3-Q017', updatedAt: '2026-07-19T12:00:00Z'
  });
  const listening = createB2LastReadRecord({
    book: { id: 'russian_b2', moduleId: 'listening' }, chapter: 1, scroll: 88,
    viewMode: 'intensive', updatedAt: '2026-07-19T12:05:00Z'
  });

  assert.equal(grammar.activeQuestionId, 'P3-Q017');
  assert.equal(grammar.scroll, 420);
  assert.equal(listening.viewMode, 'intensive');
  assert.equal(listening.scroll, 88);
  assert.deepEqual(buildDashboardProgress({ manifest, inventories, records: {}, lastRead: listening }).continueLearning, {
    moduleId: 'listening', chapter: 1, activeQuestionId: undefined, scroll: 88,
    viewMode: 'intensive', updatedAt: '2026-07-19T12:05:00Z'
  });
});
