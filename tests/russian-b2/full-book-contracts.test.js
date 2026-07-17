const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const ledgerPath = path.join(
  root,
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '全书覆盖',
  'pdf-page-ledger.json'
);
const manifestPath = path.join(
  root,
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '全书覆盖',
  'full-book-manifest.json'
);
const { validateFullBookManifest, validatePageLedger } = require('../../scripts/russian-b2/lib/full-book-contracts');
const { buildFullBook } = require('../../scripts/russian-b2/build-full-book');

test('full book ledger accounts for PDF pages 1 through 190', () => {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const pages = ledger.pages.map(item => item.pdfPage);
  assert.deepEqual(pages, Array.from({ length: 190 }, (_, index) => index + 1));
  assert.deepEqual(validatePageLedger(ledger, { strict: false }), []);
});

test('full book manifest declares the seven reader modules in learning order', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(manifest.modules.map(module => module.id), [
    'grammar', 'reading', 'writing', 'listening', 'speaking', 'exam', 'review'
  ]);
  assert.deepEqual(validateFullBookManifest(manifest), []);
});

test('full book build accepts the strict, fully classified page ledger', () => {
  const result = buildFullBook({ root, write: false, strict: true });
  assert.equal(result.manifest.id, 'russian-b2-full-book');
  assert.equal(result.ledger.pages.length, 190);
  assert.deepEqual(validatePageLedger(result.ledger, { strict: true }), []);
});

test('ledger records the published grammar source pages from the canonical source units', () => {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const mappedGrammarPages = ledger.pages
    .filter(page => page.status === 'mapped' && page.module === 'grammar' && Array.isArray(page.sourceUnits) && page.sourceUnits.length > 0)
    .map(page => page.pdfPage);

  assert.deepEqual(mappedGrammarPages, [
    ...Array.from({ length: 67 }, (_, index) => index + 6),
    74,
    75
  ]);
});

test('ledger records the listening task and transcript pages that have been visually checked', () => {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const listeningPages = ledger.pages
    .filter(page => page.status === 'mapped' && page.module === 'listening')
    .map(page => page.pdfPage);

  assert.deepEqual(listeningPages, Array.from({ length: 9 }, (_, index) => index + 104));
});

test('ledger records the speaking task pages that have been visually checked', () => {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const speakingPages = ledger.pages
    .filter(page => page.status === 'mapped' && page.module === 'speaking')
    .map(page => page.pdfPage);

  assert.deepEqual(speakingPages, [113, 114, 115, 116, 117]);
});

test('ledger records the visually checked B2 exam grammar-and-lexicon block', () => {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const examPages = ledger.pages
    .filter(page => page.status === 'mapped' && page.module === 'exam' && page.unit === 'grammar-lexicon')
    .map(page => page.pdfPage);

  assert.deepEqual(examPages, Array.from({ length: 32 }, (_, index) => index + 118));
});

test('ledger records the remaining visually checked B2 exam subtests and bibliography', () => {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const mapped = (unit) => ledger.pages
    .filter(page => page.status === 'mapped' && page.module === 'exam' && page.unit === unit)
    .map(page => page.pdfPage);

  assert.deepEqual(mapped('reading'), Array.from({ length: 8 }, (_, index) => index + 150));
  assert.deepEqual(mapped('writing'), Array.from({ length: 6 }, (_, index) => index + 158));
  assert.deepEqual(mapped('listening'), Array.from({ length: 13 }, (_, index) => index + 164));
  assert.deepEqual(mapped('speaking'), Array.from({ length: 13 }, (_, index) => index + 177));
  assert.deepEqual(mapped('bibliography'), [190]);
});
