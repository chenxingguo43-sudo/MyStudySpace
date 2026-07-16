const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSixPartBook } = require('../../scripts/russian-b2/build-six-part-book');
const { buildStudyCards, loadStudyCardIndex, validateStudyCard, resolveGrammarRoot } = require('../../scripts/russian-b2/lib/study-cards');

const root = path.resolve(__dirname, '..', '..');

test('study-card index reserves all 32 stable knowledge-point cards', () => {
  const index = loadStudyCardIndex(root);
  assert.equal(index.cards.length, 32);
  assert.equal(new Set(index.cards.map(card => card.id)).size, 32);
  assert.deepEqual(index.cards.find(card => card.knowledgePointId === 'p2-time-cause'), {
    id: 'p2-time-cause',
    partId: 'p2',
    knowledgePointId: 'p2-time-cause',
    source: 'p2-time-cause-study-card.json',
    status: 'approved'
  });
});

test('six-part grammar data attaches approved study-card IDs to knowledge points', () => {
  const p2 = buildSixPartBook({ root, write: false }).parts.find(part => part.id === 'p2');
  const point = p2.knowledgePoints.find(item => item.id === 'p2-time-cause');
  assert.equal(point.studyCardId, 'p2-time-cause');
  assert.equal(p2.knowledgePoints.find(item => item.id === 'p2-adjective-case').studyCardId, 'p2-adjective-case');
});

test('P1 publishes six approved rich cards in navigation order', () => {
  const expected = [
    'p1-subject-predicate',
    'p1-perfective-once',
    'p1-imperfective-process',
    'p1-imperative-aspect',
    'p1-infinitive-negation',
    'p1-motion-return'
  ];
  const cards = buildStudyCards({ root, write: false }).cards.filter(card => card.partId === 'p1');
  assert.deepEqual(cards.map(card => card.id), expected);
  assert.ok(cards.every(card => card.reviewStatus === 'approved'));
  assert.ok(cards.every(card => card.lessons.length >= 4 && card.checks.length >= 3));
  const lessonExamples = cards.flatMap(card => card.lessons.flatMap(lesson => lesson.examples));
  assert.ok(lessonExamples.every(example => example.zh !== '示例：请结合该结构理解句子成分。'));
  assert.ok(lessonExamples.every(example => /[.!?。！？]$/.test(example.ru)));
});

test('P2 publishes all eight approved rich cards in navigation order', () => {
  const expected = [
    'p2-adjective-case', 'p2-verb-case-1', 'p2-verb-case-2', 'p2-verb-objects',
    'p2-lexical-phrases', 'p2-time-cause', 'p2-prepositional-phrases', 'p2-nonconcordant-attribute'
  ];
  const cards = buildStudyCards({ root, write: false }).cards.filter(card => card.partId === 'p2');
  assert.deepEqual(cards.map(card => card.id), expected);
  assert.ok(cards.every(card => card.reviewStatus === 'approved'));
  assert.ok(cards.every(card => card.lessons.length >= 4 && card.checks.length >= 3));
});

test('P2 time-and-cause card is source-traceable and scoped to Q051–Q058', () => {
  const result = buildStudyCards({ root, write: false });
  const card = result.cards.find(item => item.id === 'p2-time-cause');
  assert.ok(card);
  assert.equal(card.id, 'p2-time-cause');
  assert.deepEqual(card.exerciseIds, ['P2-Q051', 'P2-Q052', 'P2-Q053', 'P2-Q054', 'P2-Q055', 'P2-Q056', 'P2-Q057', 'P2-Q058']);
  assert.ok(card.rules.every(rule => ['grammar-book', 'b2-original'].includes(rule.source.kind)));
  assert.ok(card.rules.filter(rule => rule.source.kind === 'b2-original').every(rule => rule.source.label === 'B2 原书考点'));
  assert.ok(card.examples.filter(example => example.source.kind === 'study-supplement').length <= 2);
  assert.deepEqual(card.answerAnalysis, undefined);
});

test('study-card validation rejects missing grammar headings and unlabelled supplements', () => {
  const card = {
    id: 'p2-time-cause', partId: 'p2', knowledgePointId: 'p2-time-cause', exerciseIds: ['P2-Q051'],
    rules: [{ text: 'x', source: { kind: 'grammar-book', file: '08 前置词.md', section: '不存在的小节', pages: [1] } }],
    examples: [{ ru: 'x', zh: 'x', source: { kind: 'study-supplement' } }]
  };
  const chapter = { id: 'p2', knowledgePoints: [{ id: 'p2-time-cause', exerciseIds: ['P2-Q051'] }] };
  const errors = validateStudyCard({ card, chapter, grammarText: '# 前置词' });
  assert.ok(errors.some(error => error.includes('不存在的小节')));
  assert.ok(errors.some(error => error.includes('学习补充')));
});

test('rich P2 card requires approved layered lesson content', () => {
  const card = structuredClone(buildStudyCards({ root, write: false }).cards.find(item => item.id === 'p2-time-cause'));
  const chapter = buildSixPartBook({ root, write: false }).parts.find(part => part.id === card.partId);
  const grammarText = fs.readFileSync(path.join(resolveGrammarRoot(root), '08 前置词.md'), 'utf8');
  Object.assign(card, {
    reviewStatus: 'approved',
    quickReference: { semanticQuestions: ['持续多久'], structures: ['за + В.п.'] },
    lessons: [{
      id: 'duration', title: '持续多久', scope: 'core', meaning: '持续时间', conditions: ['动作持续'],
      structure: 'В.п.', caseChanges: [{ from: 'день', to: 'день' }],
      examples: [{ ru: 'Я ждал день', zh: '我等了一天', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [34] } }],
      boundaries: ['不表示未来起点'],
      instantChecks: [{ id: 'duration-check', type: 'judgment', prompt: '判断', answer: true, rationale: '持续', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [34] } }],
      sources: [{ kind: 'b2-original', label: 'B2 原书考点', pages: [34] }]
    }],
    relatedExtensions: [],
    checks: [
      { id: 'check-1', type: 'judgment', prompt: '判断1', answer: true, rationale: '依据1', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [34] } },
      { id: 'check-2', type: 'judgment', prompt: '判断2', answer: false, rationale: '依据2', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [34] } },
      { id: 'check-3', type: 'reveal', prompt: '回忆', rationale: '依据3', source: { kind: 'b2-original', label: 'B2 原书考点', pages: [35] } }
    ]
  });
  assert.deepEqual(validateStudyCard({ card, chapter, grammarText }), []);
  card.reviewStatus = 'pending-review';
  assert.match(validateStudyCard({ card, chapter, grammarText }).join('\n'), /approved/);
});

test('P2 rich card covers the approved lesson sequence and independent checks', () => {
  const card = buildStudyCards({ root, write: false }).cards.find(item => item.id === 'p2-time-cause');
  assert.equal(card.reviewStatus, 'approved');
  assert.deepEqual(card.lessons.map(lesson => lesson.title), [
    '持续多久', '计划或维持多久', '多久以后发生', '在多久内完成',
    '先后与期限', '原因关系', '关联扩展', '综合辨析'
  ]);
  assert.ok(card.lessons.some(lesson => lesson.scope === 'related-extension'));
  const caseChanges = JSON.stringify(card.lessons.flatMap(lesson => lesson.caseChanges));
  ['дождь', 'из-за дождя', 'ошибка', 'из-за ошибки', 'плохая погода', 'из-за плохой погоды', 'проблемы', 'из-за проблем'].forEach(value => assert.match(caseChanges, new RegExp(value)));
  const comparisons = JSON.stringify(card.comparisons);
  assert.match(comparisons, /через неделю/);
  assert.match(comparisons, /за неделю/);
  assert.ok(card.checks.length >= 3 && card.checks.length <= 5);
  assert.equal(card.answerAnalysis, undefined);
});
