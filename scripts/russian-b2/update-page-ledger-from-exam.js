const fs = require('node:fs');
const path = require('node:path');

const DATA_ROOT = [
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '全书覆盖'
];

// PDF-118 is the B2 exam divider. PDF-119–149 contain the grammar-and-lexicon
// paper and its original answer/explanation pages, visually checked from scans.
const GRAMMAR_LEXICON_PAGES = Array.from({ length: 32 }, (_, index) => index + 118);
const EXAM_BLOCKS = {
  'grammar-lexicon': GRAMMAR_LEXICON_PAGES,
  reading: Array.from({ length: 8 }, (_, index) => index + 150),
  writing: Array.from({ length: 6 }, (_, index) => index + 158),
  listening: Array.from({ length: 13 }, (_, index) => index + 164),
  speaking: Array.from({ length: 13 }, (_, index) => index + 177),
  bibliography: [190]
};
const BOOK_MATTER_PAGES = [1, 2, 3, 4];
const GRAMMAR_CONTEXT_PAGE = 73;

function updateExamLedger({ root }) {
  const ledgerPath = path.join(root, ...DATA_ROOT, 'pdf-page-ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const pageToUnit = new Map(
    Object.entries(EXAM_BLOCKS).flatMap(([unit, pages]) => pages.map(pdfPage => [pdfPage, unit]))
  );
  ledger.pages = ledger.pages.map(page => {
    const unit = pageToUnit.get(page.pdfPage);
    if (unit) return { ...page, status: 'mapped', module: 'exam', unit };
    if (BOOK_MATTER_PAGES.includes(page.pdfPage)) {
      return { ...page, status: 'mapped', module: 'book-metadata', unit: 'front-matter' };
    }
    if (page.pdfPage === 5) return { ...page, status: 'mapped', module: 'grammar', unit: 'part-one-divider' };
    if (page.pdfPage === GRAMMAR_CONTEXT_PAGE) {
      return { ...page, status: 'mapped', module: 'grammar', unit: 'p6-context-source-material' };
    }
    return page;
  });

  fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  return {
    ledgerPath,
    pages: [
      ...BOOK_MATTER_PAGES,
      5,
      GRAMMAR_CONTEXT_PAGE,
      ...Object.values(EXAM_BLOCKS).flat()
    ]
  };
}

if (require.main === module) {
  const result = updateExamLedger({ root: path.resolve(__dirname, '..', '..') });
  console.log(`Mapped ${result.pages.length} visually checked exam pages.`);
}

module.exports = { GRAMMAR_LEXICON_PAGES, EXAM_BLOCKS, updateExamLedger };
