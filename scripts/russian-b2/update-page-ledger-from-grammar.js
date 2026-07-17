const fs = require('node:fs');
const path = require('node:path');

const SOURCE_RELATIVE_PATH = path.join(
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '语法词汇'
);
const LEDGER_RELATIVE_PATH = path.join(
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '全书覆盖',
  'pdf-page-ledger.json'
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectGrammarPageMappings(sourceDir) {
  const byPage = new Map();
  for (const fileName of fs.readdirSync(sourceDir)) {
    if (!fileName.endsWith('.json')) continue;
    const unit = readJson(path.join(sourceDir, fileName));
    if (!unit.id || !unit.sourcePages) continue;

    for (const pages of Object.values(unit.sourcePages)) {
      if (!Array.isArray(pages)) continue;
      for (const pdfPage of pages) {
        if (!Number.isInteger(pdfPage)) continue;
        const unitIds = byPage.get(pdfPage) || new Set();
        unitIds.add(unit.id);
        byPage.set(pdfPage, unitIds);
      }
    }
  }
  return byPage;
}

function groupByPart(unitIds) {
  return [...new Set([...unitIds].map(unitId => unitId.split('-')[0]))].sort().join('/');
}

function updateLedgerFromGrammar({ root, write = false }) {
  const ledgerPath = path.join(root, LEDGER_RELATIVE_PATH);
  const ledger = readJson(ledgerPath);
  const mappings = collectGrammarPageMappings(path.join(root, SOURCE_RELATIVE_PATH));

  for (const page of ledger.pages) {
    const unitIds = mappings.get(page.pdfPage);
    if (!unitIds) continue;
    page.status = 'mapped';
    page.module = 'grammar';
    page.unit = groupByPart(unitIds);
    page.sourceUnits = [...unitIds].sort();
  }

  if (write) fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  return { ledger, mappedPages: [...mappings.keys()].sort((a, b) => a - b) };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const result = updateLedgerFromGrammar({ root, write: true });
  process.stdout.write(`Mapped ${result.mappedPages.length} grammar source pages.\n`);
}

module.exports = { collectGrammarPageMappings, updateLedgerFromGrammar };
