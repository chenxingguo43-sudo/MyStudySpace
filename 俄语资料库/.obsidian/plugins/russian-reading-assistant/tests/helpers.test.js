'use strict';

const assert = require('assert');
const {
  formatDate,
  extractRussianSelectionParts,
  normalizeRussianWord,
  buildInboxPath,
  getCurrentLineText,
  buildNewWordNote,
  mergeWordNote,
} = require('../helpers');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('extracts word and keeps punctuation outside mark', () => {
  assert.deepStrictEqual(extractRussianSelectionParts('«Муромчане,»'), {
    leading: '«',
    word: 'Муромчане',
    trailing: ',»',
  });
});

test('normalizes Russian word for file names', () => {
  assert.strictEqual(normalizeRussianWord('Муромчане,'), 'муромчане');
  assert.strictEqual(normalizeRussianWord('ГОРДЯТСЯ'), 'гордятся');
});

test('rejects non-Russian selections', () => {
  assert.strictEqual(normalizeRussianWord('hello'), '');
  assert.strictEqual(normalizeRussianWord('中文'), '');
});

test('builds inbox path', () => {
  assert.strictEqual(buildInboxPath('Муромчане,'), '词汇/未归档/муромчане.md');
});

test('gets current line context', () => {
  const editor = {
    getCursor: () => ({ line: 2 }),
    getLine: (line) => ['a', 'b', 'RU: Муромчане гордятся.'][line],
  };
  assert.strictEqual(getCurrentLineText(editor), 'RU: Муромчане гордятся.');
});

test('builds new inbox word note', () => {
  const note = buildNewWordNote({
    word: 'Муромчане',
    normalized: 'муромчане',
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Муромчане гордятся.',
  });
  assert.match(note, /word: "Муромчане"/);
  assert.match(note, /normalized: "муромчане"/);
  assert.match(note, /count: 1/);
  assert.match(note, /> RU: Муромчане гордятся\./);
});

test('merges note count and deduplicates sources', () => {
  const existing = buildNewWordNote({
    word: 'Муромчане',
    normalized: 'муромчане',
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Муромчане гордятся.',
  });
  const merged = mergeWordNote(existing, {
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Другие муромчане читают.',
  });
  assert.match(merged, /count: 2/);
  assert.strictEqual((merged.match(/学习单元\/text\.md/g) || []).length, 1);
  assert.match(merged, /> RU: Другие муромчане читают\./);
});

test('merges with different date adds both dates to encounter_dates', () => {
  const existing = buildNewWordNote({
    word: 'Муромчане',
    normalized: 'муромчане',
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Муромчане гордятся.',
  });
  const merged = mergeWordNote(existing, {
    date: '2026-06-23',
    sourcePath: '学习单元/other.md',
    sourceName: 'other',
    contextLine: 'RU: Муромчане уехали.',
  });
  assert.match(merged, /count: 2/);
  assert.match(merged, /- "2026-06-22"/);
  assert.match(merged, /- "2026-06-23"/);
  assert.strictEqual((merged.match(/- "2026-06-22"/g) || []).length, 1);
  assert.strictEqual((merged.match(/- "2026-06-23"/g) || []).length, 1);
  assert.strictEqual((merged.match(/学习单元\/text\.md/g) || []).length, 1);
  assert.strictEqual((merged.match(/学习单元\/other\.md/g) || []).length, 1);
});

test('formatDate produces YYYY-MM-DD with zero-padded values', () => {
  const d1 = new Date(2026, 0, 5);   // Jan 5
  assert.strictEqual(formatDate(d1), '2026-01-05');
  const d2 = new Date(2026, 11, 31); // Dec 31
  assert.strictEqual(formatDate(d2), '2026-12-31');
  const d3 = new Date(2026, 5, 1);   // Jun 1
  assert.strictEqual(formatDate(d3), '2026-06-01');
});

test('extractRussianSelectionParts handles empty string', () => {
  assert.deepStrictEqual(extractRussianSelectionParts(''), {
    leading: '',
    word: '',
    trailing: '',
  });
});

test('extractRussianSelectionParts handles null', () => {
  assert.deepStrictEqual(extractRussianSelectionParts(null), {
    leading: '',
    word: '',
    trailing: '',
  });
});

test('normalizeRussianWord returns empty for empty string', () => {
  assert.strictEqual(normalizeRussianWord(''), '');
});

test('normalizeRussianWord returns empty for digits-only input', () => {
  assert.strictEqual(normalizeRussianWord('123'), '');
});
