const test = require('node:test');
const assert = require('node:assert/strict');
const { auditCoverage } = require('../../scripts/russian-dictionary/audit-coverage');
const { splitMeanings, buildReport } = require('../../scripts/russian-dictionary/audit-freedict-quality');

test('reports distinct textbook coverage separately from weighted whole-reader coverage', () => {
  const report = auditCoverage({
    textbookDocuments: ['Я знаю тех людей.'],
    novelDocuments: ['Он он он редкость.'],
    resolve: form => ({ я: true, знаю: true, тех: true, людей: true, он: true })[form] || false,
    functionForms: new Set(['я', 'тех', 'он'])
  });
  assert.equal(report.functionWords.rate, 1);
  assert.equal(report.structuredTextbooks.distinctRate, 1);
  assert.equal(report.wholeReader.occurrenceRate, 7 / 8);
});

test('keeps unresolved definitions separate from excluded proper names', () => {
  const report = auditCoverage({
    textbookDocuments: ['Анна знает редкость.'], novelDocuments: [],
    resolve: form => form === 'знает',
    functionForms: new Set(),
    classify: form => form === 'анна' ? 'proper-name' : 'included'
  });
  assert.equal(report.exclusions['proper-name'], 1);
  assert.deepEqual(report.structuredTextbooks.unresolved, ['редкость']);
});

test('separates unusable FreeDict definitions from entries that still have usable meanings', () => {
  assert.deepEqual(splitMeanings(['期颐'], ['期颐']), {
    blocked: ['期颐'], usable: []
  });
  assert.deepEqual(splitMeanings(['问题', '动问'], ['动问']), {
    blocked: ['动问'], usable: ['问题']
  });
});

test('FreeDict quality report follows the learner-facing dictionary priority', () => {
  const report = buildReport();
  assert.equal(report.schemaVersion, 2);
  assert.ok(Array.isArray(report.blocked));
  assert.ok(Array.isArray(report.needsReview));
  assert.equal(report.blocked.some(entry => entry.lemma === 'столетний'), false);
  assert.equal(report.needsReview.some(entry => entry.lemma === 'вопрос'), false);
});
