const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');

const OPENRUSSIAN_COMMIT = '50e210c4803237779cb562bc1abcea529066031c';
const OPENRUSSIAN_BASE = `https://raw.githubusercontent.com/Badestrand/russian-dictionary/${OPENRUSSIAN_COMMIT}`;
const FILES = ['nouns.csv', 'verbs.csv', 'adjectives.csv', 'others.csv'];
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'data', 'dictionary');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'openrussian-en.json');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC').replace(/[']/g, '').replace(/ё/g, 'е').replace(/Ё/g, 'е').toLowerCase().trim();
}

function parseOpenRussianTsv(text, sourceFile) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return {};
  const header = lines[0].split('\t');
  const bareAt = header.indexOf('bare');
  const meaningAt = header.indexOf('translations_en');
  if (bareAt < 0 || meaningAt < 0) throw new Error(`Unexpected OpenRussian columns in ${sourceFile}`);
  const output = {};
  for (const line of lines.slice(1)) {
    const columns = line.split('\t');
    const word = normalize(columns[bareAt]);
    const meanings = String(columns[meaningAt] || '').split(';').map(item => item.trim()).filter(Boolean);
    if (!word || !meanings.length) continue;
    if (!output[word]) output[word] = { meaningsEn: [], source: 'OpenRussian CC BY-SA 4.0', sourceFile };
    meanings.forEach(meaning => { if (!output[word].meaningsEn.includes(meaning)) output[word].meaningsEn.push(meaning); });
  }
  return output;
}

function downloadText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume(); downloadText(new URL(response.headers.location, url).toString()).then(resolve, reject); return;
      }
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`OpenRussian download failed (${response.statusCode})`)); return; }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

async function buildOpenRussian() {
  const output = {};
  const sourceHashes = {};
  for (const file of FILES) {
    const text = await downloadText(`${OPENRUSSIAN_BASE}/${file}`);
    sourceHashes[file] = crypto.createHash('sha256').update(text).digest('hex');
    const parsed = parseOpenRussianTsv(text, file);
    for (const [word, entry] of Object.entries(parsed)) {
      if (!output[word]) output[word] = entry;
      else entry.meaningsEn.forEach(meaning => { if (!output[word].meaningsEn.includes(meaning)) output[word].meaningsEn.push(meaning); });
    }
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b, 'ru'))))}\n`, 'utf8');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (_error) {}
  manifest.openRussian = {
    commit: OPENRUSSIAN_COMMIT, license: 'CC-BY-SA-4.0', entryCount: Object.keys(output).length,
    sourceHashes, output: 'data/dictionary/openrussian-en.json',
    sha256: crypto.createHash('sha256').update(fs.readFileSync(OUTPUT_PATH)).digest('hex')
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return output;
}

if (require.main === module) buildOpenRussian().then(output => console.log(`Built OpenRussian supplement with ${Object.keys(output).length} entries.`)).catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { OPENRUSSIAN_COMMIT, parseOpenRussianTsv, buildOpenRussian };
