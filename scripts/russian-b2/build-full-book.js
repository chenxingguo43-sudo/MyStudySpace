const fs = require('node:fs');
const path = require('node:path');
const {
  validateFullBookManifest,
  validatePageLedger
} = require('./lib/full-book-contracts');

const DATA_ROOT = [
  '俄语资料库',
  '俄语B2·原书复刻与学习版',
  '规范数据',
  '全书覆盖'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildFullBook({ root, write = false, strict = false } = {}) {
  if (!root) throw new Error('root is required');
  const dataRoot = path.join(root, ...DATA_ROOT);
  const manifest = readJson(path.join(dataRoot, 'full-book-manifest.json'));
  const ledger = readJson(path.join(dataRoot, 'pdf-page-ledger.json'));
  const errors = [
    ...validateFullBookManifest(manifest),
    ...validatePageLedger(ledger, { strict })
  ];

  if (errors.length) throw new Error(errors.join('\n'));
  return { manifest, ledger, modules: [], write };
}

if (require.main === module) {
  const strict = process.argv.includes('--strict');
  const result = buildFullBook({ root: path.resolve(__dirname, '..', '..'), strict });
  console.log(`B2 full-book contracts valid: ${result.ledger.pages.length}/190 pages`);
}

module.exports = { DATA_ROOT, buildFullBook };
