const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const cheerio = require('cheerio');

const FREEDICT_VERSION = '2025.11.23';
const FREEDICT_BASE = `https://download.freedict.org/dictionaries/zho-rus/${FREEDICT_VERSION}`;
const FREEDICT_ARCHIVE = `freedict-zho-rus-${FREEDICT_VERSION}.src.tar.xz`;
const FREEDICT_SHA512 = `${FREEDICT_ARCHIVE}.sha512`;
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'data', 'dictionary');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'freedict-rus-zh.json');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

function normalizeRussian(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC').replace(/ё/g, 'е').replace(/Ё/g, 'е').toLowerCase().trim();
}

function invertFreeDictXml(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const output = {};
  $('entry').each((_index, entry) => {
    const chinese = $(entry).children('form').find('orth').first().text().trim();
    if (!chinese) return;
    $(entry).find('cit[type="trans"] quote').each((_quoteIndex, quote) => {
      const russian = normalizeRussian($(quote).text());
      if (!russian || !/[а-яё]/i.test(russian)) return;
      if (!output[russian]) output[russian] = { meanings: [], source: `FreeDict zho-rus ${FREEDICT_VERSION}` };
      if (!output[russian].meanings.includes(chinese)) output[russian].meanings.push(chinese);
    });
  });
  return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b, 'ru')));
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    function request(current) {
      https.get(current, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume(); request(new URL(response.headers.location, current).toString()); return;
        }
        if (response.statusCode !== 200) { response.resume(); reject(new Error(`Download failed (${response.statusCode}): ${current}`)); return; }
        const stream = fs.createWriteStream(target);
        response.pipe(stream);
        stream.on('finish', () => stream.close(resolve));
        stream.on('error', reject);
      }).on('error', reject);
    }
    request(url);
  });
}

function findFile(directory, predicate) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) { const found = findFile(full, predicate); if (found) return found; }
    else if (predicate(full)) return full;
  }
  return null;
}

function hash(file, algorithm) {
  return crypto.createHash(algorithm).update(fs.readFileSync(file)).digest('hex');
}

async function buildFreeDict(options = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'russian-freedict-'));
  try {
    const archive = path.join(temporary, FREEDICT_ARCHIVE);
    const checksum = path.join(temporary, FREEDICT_SHA512);
    await download(options.archiveUrl || `${FREEDICT_BASE}/${FREEDICT_ARCHIVE}`, archive);
    await download(options.checksumUrl || `${FREEDICT_BASE}/${FREEDICT_SHA512}`, checksum);
    const expected = fs.readFileSync(checksum, 'utf8').trim().split(/\s+/)[0].toLowerCase();
    const actual = hash(archive, 'sha512');
    if (!expected || expected !== actual) throw new Error(`FreeDict SHA-512 mismatch: expected ${expected}, got ${actual}`);
    const extracted = path.join(temporary, 'extracted');
    fs.mkdirSync(extracted);
    const tar = spawnSync('tar', ['-xf', archive, '-C', extracted], { encoding: 'utf8' });
    if (tar.status !== 0) throw new Error(`FreeDict extraction failed: ${tar.stderr || tar.stdout}`);
    const tei = findFile(extracted, file => /zho-rus.*\.tei$/i.test(path.basename(file))) || findFile(extracted, file => file.endsWith('.tei'));
    if (!tei) throw new Error('FreeDict TEI file not found after extraction');
    const entries = invertFreeDictXml(fs.readFileSync(tei, 'utf8'));
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(entries)}\n`, 'utf8');
    let manifest = {};
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (_error) {}
    manifest.freedict = {
      dictionary: 'zho-rus', version: FREEDICT_VERSION, license: 'GPL-3.0-or-later',
      archiveSha512: actual, entryCount: Object.keys(entries).length,
      output: 'data/dictionary/freedict-rus-zh.json', sha256: hash(OUTPUT_PATH, 'sha256')
    };
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return entries;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (require.main === module) buildFreeDict().then(result => console.log(`Built FreeDict supplement with ${Object.keys(result).length} entries.`)).catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { FREEDICT_VERSION, FREEDICT_BASE, FREEDICT_ARCHIVE, FREEDICT_SHA512, invertFreeDictXml, buildFreeDict };
