'use strict';

const assert = require('assert');
const {
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
