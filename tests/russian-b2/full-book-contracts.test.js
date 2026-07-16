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

test('full book build accepts the initial non-strict ledger but rejects strict publication', () => {
  const draft = buildFullBook({ root, write: false, strict: false });
  assert.equal(draft.manifest.id, 'russian-b2-full-book');
  assert.equal(draft.ledger.pages.length, 190);
  assert.throws(
    () => buildFullBook({ root, write: false, strict: true }),
    /PDF-1: remains unmapped/
  );
});
