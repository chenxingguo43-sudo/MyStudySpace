const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'data', 'dictionary');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'corpus-morphology.json');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const CONTENT_MANIFEST_PATH = path.join(ROOT, 'data', 'reader-content-manifest.json');

function normalizeRussian(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC').replace(/ё/g, 'е').replace(/Ё/g, 'е').toLowerCase();
}

function extractRussianForms(value) {
  const forms = new Set();
  function visit(item) {
    if (typeof item === 'string') {
      const matches = item.match(/[А-Яа-яЁё][А-Яа-яЁё\u0300-\u036f]*(?:-[А-Яа-яЁё][А-Яа-яЁё\u0300-\u036f]*)*/gu) || [];
      matches.forEach(word => forms.add(normalizeRussian(word)));
      return;
    }
    if (Array.isArray(item)) return item.forEach(visit);
    if (item && typeof item === 'object') Object.values(item).forEach(visit);
  }
  visit(value);
  return [...forms].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));
}

const PYTHON_ANALYZER = String.raw`
import json, sys
import pymorphy3
forms = json.load(sys.stdin)
morph = pymorphy3.MorphAnalyzer()
out = {}
function_pos = {'PREP','CONJ','PRCL','INTJ','NPRO','PRED'}
proper_markers = {'Name','Surn','Patr','Geox'}
for form in forms:
    parses = morph.parse(form)[:3]
    lemmas = []
    tags = []
    pos = set()
    for parsed in parses:
        lemma = parsed.normal_form.replace('ё', 'е')
        if lemma not in lemmas: lemmas.append(lemma)
        grammemes = sorted(str(item) for item in parsed.tag.grammemes)
        for item in grammemes:
            if item not in tags: tags.append(item)
        if parsed.tag.POS: pos.add(str(parsed.tag.POS))
    parse_grammemes = [set(str(item) for item in parsed.tag.grammemes) for parsed in parses]
    all_proper = bool(parse_grammemes) and all(bool(items & proper_markers) for items in parse_grammemes)
    classification = 'proper-name' if all_proper else ('function-word' if pos and pos.issubset(function_pos) else ('lexical' if parses else 'unknown'))
    out[form] = {'lemmas': lemmas, 'tags': tags, 'classification': classification}
json.dump(out, sys.stdout, ensure_ascii=False, sort_keys=True)
`;

function analyzeWithPymorphy(forms, options = {}) {
  const python = options.python || process.env.PYTHON || 'python';
  const result = spawnSync(python, ['-X', 'utf8', '-c', PYTHON_ANALYZER], {
    input: JSON.stringify([...new Set(forms)].sort()),
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    maxBuffer: 128 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`pymorphy3 analysis failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout || '{}');
}

function walkJson(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkJson(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
  }
  return files.sort();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function productionContentFiles(contentManifestPath = CONTENT_MANIFEST_PATH) {
  const manifest = JSON.parse(fs.readFileSync(contentManifestPath, 'utf8'));
  return (manifest.files || [])
    .map(item => String(item && item.path || ''))
    .filter(relative => /^(?:data\/textbook|data\/novel)\/.*\.json$/i.test(relative))
    .map(relative => path.join(ROOT, ...relative.split('/')))
    .filter(file => fs.existsSync(file))
    .sort();
}

function sourceFingerprint(files) {
  const hash = crypto.createHash('sha256');
  files.forEach(file => {
    hash.update(path.relative(ROOT, file).replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(sha256(file));
    hash.update('\n');
  });
  return hash.digest('hex');
}

function verifyCorpusMorphologyFresh(options = {}) {
  const files = options.files || productionContentFiles(options.contentManifestPath);
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(options.manifestPath || MANIFEST_PATH, 'utf8')); } catch (_error) {}
  const expected = manifest.morphology && manifest.morphology.sourceFingerprint || '';
  const actual = sourceFingerprint(files);
  return { fresh: Boolean(expected) && expected === actual, expected, actual, sourceFiles: files.length };
}

function updateManifest(patch) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let current = {};
  try { current = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (_error) {}
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify({ ...current, ...patch }, null, 2)}\n`, 'utf8');
}

function buildCorpusMorphology(options = {}) {
  const localNovel = path.join(ROOT, 'data', 'novel');
  const canonicalNovel = path.resolve(ROOT, '..', '..', 'data', 'novel');
  const roots = options.roots || null;
  const files = options.files || (roots
    ? roots.flatMap(walkJson)
    : productionContentFiles(options.contentManifestPath));
  const forms = new Set();
  files.forEach(file => extractRussianForms(JSON.parse(fs.readFileSync(file, 'utf8'))).forEach(form => forms.add(form)));
  const result = analyzeWithPymorphy([...forms], options);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result)}\n`, 'utf8');
  updateManifest({
    morphology: {
      engine: 'pymorphy3',
      sourceFiles: files.length,
      sourceFingerprint: sourceFingerprint(files),
      sourceScope: 'data/reader-content-manifest.json production JSON',
      formCount: Object.keys(result).length,
      output: path.relative(ROOT, OUTPUT_PATH).replace(/\\/g, '/'),
      sha256: sha256(OUTPUT_PATH)
    }
  });
  return result;
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const status = verifyCorpusMorphologyFresh();
    if (!status.fresh) {
      console.error(`Corpus morphology is stale: expected ${status.expected || '(missing)'}, actual ${status.actual}.`);
      process.exitCode = 1;
    } else {
      console.log(`Corpus morphology is current for ${status.sourceFiles} production files.`);
    }
    return;
  }
  const result = buildCorpusMorphology();
  console.log(`Built corpus morphology for ${Object.keys(result).length} forms.`);
}

module.exports = { extractRussianForms, analyzeWithPymorphy, productionContentFiles, sourceFingerprint, verifyCorpusMorphologyFresh, buildCorpusMorphology };
