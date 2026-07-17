const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SOURCE = path.resolve(ROOT, '..', '..', '俄语资料库');
const OUTPUT_DIR = path.join(ROOT, 'data', 'dictionary');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'markdown-glossary.json');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC').replace(/ё/g, 'е').replace(/Ё/g, 'е').toLowerCase().trim();
}

function cleanMeaning(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function extractGlossaryEntries(markdown, sourceFile) {
  const found = [];
  function add(word, meaning) {
    word = normalize(String(word || '').replace(/[*_`]/g, ''));
    meaning = cleanMeaning(meaning);
    if (!/^[а-я]+(?:-[а-я]+)*$/u.test(word) || !/[\u4e00-\u9fff]/u.test(meaning)) return;
    found.push({ word, meaning, sourceFile });
  }
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
      if (cells.length >= 3) add(cells[0], cells.slice(1).find(cell => /[\u4e00-\u9fff]/u.test(cell)) || '');
    }
    const bullet = line.match(/^\s*[-*]\s+\*\*([А-Яа-яЁё\u0300-\u036f-]+)\*\*\s*[—–-]\s*(.+)$/u);
    if (bullet) add(bullet[1], bullet[2]);
  }
  return found;
}

function buildMarkdownGlossary(options = {}) {
  const sourceRoot = options.sourceRoot || DEFAULT_SOURCE;
  const entries = {};
  for (const file of markdownFiles(sourceRoot)) {
    const relative = path.relative(sourceRoot, file).replace(/\\/g, '/');
    for (const item of extractGlossaryEntries(fs.readFileSync(file, 'utf8'), relative)) {
      if (!entries[item.word]) entries[item.word] = { meanings: [], sourceFiles: [], source: '项目 Markdown 已核对词汇表' };
      if (!entries[item.word].meanings.includes(item.meaning)) entries[item.word].meanings.push(item.meaning);
      if (!entries[item.word].sourceFiles.includes(item.sourceFile)) entries[item.word].sourceFiles.push(item.sourceFile);
    }
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, 'ru'))))}\n`, 'utf8');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (_error) {}
  manifest.markdownGlossary = {
    sourceRoot: path.relative(path.resolve(ROOT, '..', '..'), sourceRoot).replace(/\\/g, '/'),
    entryCount: Object.keys(entries).length,
    output: 'data/dictionary/markdown-glossary.json',
    sha256: crypto.createHash('sha256').update(fs.readFileSync(OUTPUT_PATH)).digest('hex')
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return entries;
}

if (require.main === module) console.log(`Built Markdown glossary with ${Object.keys(buildMarkdownGlossary()).length} entries.`);

module.exports = { extractGlossaryEntries, buildMarkdownGlossary };
