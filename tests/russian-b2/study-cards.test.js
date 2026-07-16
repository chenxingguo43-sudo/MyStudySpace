const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSixPartBook } = require('../../scripts/russian-b2/build-six-part-book');
const { buildStudyCards, validateStudyCard, resolveGrammarRoot } = require('../../scripts/russian-b2/lib/study-cards');

const root = path.resolve(__dirname, '..', '..');

test('P2 time-and-cause card is source-traceable and scoped to Q051–Q058', () => {
  const result = buildStudyCards({ root, write: false });
  assert.equal(result.cards.length, 1);
  const card = result.cards[0];
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
  const card = structuredClone(buildStudyCards({ root, write: false }).cards[0]);
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
