const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildListeningModule } = require('../../scripts/russian-b2/build-listening');
const { buildWritingModule } = require('../../scripts/russian-b2/build-writing');
const { buildFullBook } = require('../../scripts/russian-b2/build-full-book');

const root = path.resolve(__dirname, '..', '..');

test('rebuilt listening writing and dashboard meet the final release contract', () => {
  const listening = buildListeningModule({ root, write: false }).units;
  const writing = buildWritingModule({ root, write: false }).units;
  const book = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'russian_b2', 'book.json'), 'utf8'));
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'index.json'), 'utf8'));
  assert.equal(listening.flatMap(unit => unit.questions).length, 25);
  assert.equal(writing.length, 13);
  assert.deepEqual(book.modules.map(module => module.id), ['grammar', 'reading', 'writing', 'listening', 'speaking', 'exam', 'review']);
  assert.equal(catalogue.books.filter(item => item.id === 'russian_b2' || String(item.id).startsWith('russian_b2_')).length, 1);
  for (const unit of listening) {
    for (const segment of unit.transcriptSegments || []) {
      if (segment.speechText) assert.doesNotMatch(segment.speechText, /^(?:А|Б|A|B)\s*:/);
    }
  }
});

test('writing and listening page ledger matches the verified source ranges', () => {
  const { ledger } = buildFullBook({ root, strict: true });
  const byPage = Object.fromEntries(ledger.pages.map(page => [page.pdfPage, page]));
  assert.match(byPage[94].unit, /recommendation-letter/);
  assert.match(byPage[96].unit, /recommendation-letter\/application/);
  assert.match(byPage[97].unit, /invitation\/autobiography\/receipt/);
  assert.match(byPage[100].unit, /congratulation-letter\/announcement\/complaint/);
  assert.match(byPage[102].unit, /complaint\/internship-report/);
  assert.equal(byPage[103].unit, 'introduction-letter');
  assert.equal(byPage[104].unit, 'dialogues');
  assert.equal(byPage[112].unit, 'interview');
});
