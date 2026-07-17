const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createRussianB2App } = require('../../js/russian-b2/core');

test('module runtime registers adapters and creates stable scoped storage keys', () => {
  const app = createRussianB2App({ storage: new Map() });
  const reading = { id: 'reading', renderHome() {} };

  app.registerModule('reading', reading);
  assert.equal(app.getModule('reading'), reading);
  assert.equal(app.key('writing', 'draft-01'), 'russian_b2:writing:draft-01');
});

test('generated B2 book manifest declares the seven learning modules in order', () => {
  const book = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'textbook', 'russian_b2', 'book.json'), 'utf8'));
  assert.deepEqual(book.modules.map(module => module.id), ['grammar', 'reading', 'writing', 'listening', 'speaking', 'exam', 'review']);
});
