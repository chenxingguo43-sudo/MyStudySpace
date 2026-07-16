const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildStudyCards, validateStudyCard } = require('../../scripts/russian-b2/lib/study-cards');

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
