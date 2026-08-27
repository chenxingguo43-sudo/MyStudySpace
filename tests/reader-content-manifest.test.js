const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'data', 'reader-content-manifest.json');
const {
  CONTENT_VERSION,
  buildContentManifest,
  checkContentManifest,
  computeFilesHash,
  stableManifest,
  walkJsonFiles,
  writeContentManifest
} = require('../scripts/build-reader-content-manifest');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function comparePaths(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function textbookSnapshot() {
  return walkJsonFiles(path.join(root, 'data', 'textbook')).map(file => {
    const content = fs.readFileSync(file);
    return [path.relative(root, file).split(path.sep).join('/'), content.length, sha256(content)];
  });
}

test('checked-in Reader content manifest matches the current controlled content', () => {
  const actual = checkContentManifest({ root, outputPath: manifestPath });
  const expected = buildContentManifest({ root, generatedAt: actual.generatedAt });

  assert.deepEqual(stableManifest(actual), stableManifest(expected));
  assert.equal(actual.schema, 'mystudyspace-reader-content-v1');
  assert.equal(actual.version, CONTENT_VERSION);
  assert.equal(actual.grammarAnalysisStatus, 'complete');
  assert.deepEqual(actual.grammarAnalysis, {
    chapters: 5,
    exercises: 597,
    objectiveAnswersValidated: 591,
    openResponseExercises: 6,
    sourceEvidenceValidated: 597
  });
  assert.equal(actual.books.filter(book => book.kind === 'textbook').length, 6);
  assert.equal(actual.books.some(book => book.kind === 'novel'), false);
});

test('manifest lists normalized, unique controlled files with valid hashes', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const paths = manifest.files.map(file => file.path);

  assert.deepEqual(paths, [...paths].sort(comparePaths));
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(manifest.controlledContent.fileCount, paths.length);
  assert.equal(
    manifest.controlledContent.totalBytes,
    manifest.files.reduce((total, file) => total + file.bytes, 0)
  );

  for (const file of manifest.files) {
    assert.equal(file.path.includes('\\'), false, file.path);
    assert.equal(file.path.includes('/media/'), false, file.path);
    assert.equal(file.path.includes('/_automation/'), false, file.path);
    assert.equal(file.path.includes('/rebuild/'), false, file.path);
    assert.equal(file.path.startsWith('data/novel/'), false, file.path);
    assert.equal(file.path.endsWith('.backup.json'), false, file.path);
    const content = fs.readFileSync(path.join(root, file.path));
    assert.equal(file.bytes, content.length, file.path);
    assert.equal(file.sha256, sha256(content), file.path);
  }
});

test('manifest excludes listening rebuild staging data until it passes its release gate', () => {
  const manifest = buildContentManifest({ root, generatedAt: '2026-07-27T00:00:00.000Z' });
  assert.equal(manifest.files.some(file => file.path.includes('/rebuild/')), false);
});

test('manifest controls every critical offline content family', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const paths = new Set(manifest.files.map(file => file.path));
  const required = [
    'data/textbook/index.json',
    'data/textbook/zlatoust_grammar/ch0000.json',
    'data/textbook/zlatoust_grammar/theory/mappings/exercise-to-rules.json',
    'data/vocabulary.json',
    'data/sentences.json',
    'data/lexeme_index.json',
    'data/sources.json',
    'data/source_labels.json',
    'data/morphology-map.json',
    'data/external-vocab.json',
    'data/dictionary/manifest.json',
    'data/dictionary/freedict-rus-zh.json',
    'data/dictionary/openrussian-en.json'
  ];

  for (const requiredPath of required) {
    assert.equal(paths.has(requiredPath), true, `missing controlled file ${requiredPath}`);
  }
});

test('filesHash is deterministic and does not include generatedAt', () => {
  const first = buildContentManifest({ root, generatedAt: '2026-07-27T00:00:00.000Z' });
  const second = buildContentManifest({ root, generatedAt: '2026-07-28T00:00:00.000Z' });

  assert.notEqual(first.generatedAt, second.generatedAt);
  assert.equal(first.filesHash, second.filesHash);
  assert.equal(first.filesHash, computeFilesHash(first.files));
  assert.deepEqual(stableManifest(first), stableManifest(second));
});

test('writing the manifest does not rewrite any textbook JSON', () => {
  const before = textbookSnapshot();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mystudyspace-content-manifest-'));
  const outputPath = path.join(temporaryDirectory, 'reader-content-manifest.json');

  try {
    writeContentManifest({
      root,
      outputPath,
      generatedAt: '2026-07-27T00:00:00.000Z'
    });
    assert.equal(fs.existsSync(outputPath), true);
    assert.deepEqual(textbookSnapshot(), before);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
