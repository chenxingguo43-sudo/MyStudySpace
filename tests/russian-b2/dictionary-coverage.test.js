const test = require('node:test');
const assert = require('node:assert/strict');
const { auditCoverage } = require('../../scripts/russian-dictionary/audit-coverage');

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
