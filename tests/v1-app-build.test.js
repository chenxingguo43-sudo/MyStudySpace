'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  DEFAULT_OUTPUT,
  REPOSITORY_ROOT,
  buildV1App,
  collectSourceAssets,
  isForbiddenOutputPath,
  loadAssetContract,
  normalizeRelativePath
} = require('../scripts/build-v1-app');
const { computeFilesHash } = require('../scripts/build-v1-content-manifest');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function textbookJsonHashes() {
  const manifest = require('../data/app-content-manifest.json');
  return new Map(manifest.files
    .filter(record => record.path.startsWith('data/textbook/') && record.path.endsWith('.json'))
    .map(record => [record.path, sha256(path.join(REPOSITORY_ROOT, ...record.path.split('/')))]));
}

test('asset contract is explicit, unique, normalized, and points to files', () => {
  const { config, exact } = loadAssetContract();
  assert.equal(new Set(exact).size, exact.length);
  assert.equal(config.contentFiles, 'manifest.files');
  assert.equal(config.generatedEntry.mode, 'phase4-home');
  assert.equal(config.generatedEntry.source, 'app-home.html');
  for (const relativePath of exact) {
    assert.equal(normalizeRelativePath(relativePath), relativePath);
    assert.equal(fs.statSync(path.join(REPOSITORY_ROOT, ...relativePath.split('/'))).isFile(), true);
  }
});

test('the whitelist includes exactly the six approved backgrounds', () => {
  const { config } = loadAssetContract();
  assert.deepEqual(config.backgrounds, [
    'assets/IMG_20260405_015648.jpg',
    'assets/IMG_20260405_015834.jpg',
    'assets/IMG_20260405_015918.jpg',
    'assets/IMG_20260405_020008.jpg',
    'assets/IMG_20260405_020048.jpg',
    'assets/mmexport1775325437154.jpg'
  ]);
});

test('build copies every controlled content file with the frozen hash', () => {
  const before = textbookJsonHashes();
  const sourceManifest = JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, 'data', 'app-content-manifest.json'), 'utf8'));
  const result = buildV1App();
  assert.equal(result.contentManifest.files.length, sourceManifest.files.length);
  for (const record of result.contentManifest.files) {
    const outputFile = path.join(DEFAULT_OUTPUT, ...record.path.split('/'));
    assert.equal(fs.existsSync(outputFile), true, record.path);
    assert.equal(sha256(outputFile), record.sha256, record.path);
  }
  assert.deepEqual(textbookJsonHashes(), before, 'build must not rewrite textbook JSON');
});

test('app-dist is Android-marked and contains no forbidden, novel, or media path', () => {
  const result = buildV1App();
  const manifest = JSON.parse(fs.readFileSync(path.join(DEFAULT_OUTPUT, 'core-assets-manifest.json'), 'utf8'));
  const report = JSON.parse(fs.readFileSync(path.join(DEFAULT_OUTPUT, 'build-report.json'), 'utf8'));
  assert.equal(manifest.runtime, 'android');
  assert.equal(manifest.entryMode, 'phase4-home');
  assert.match(fs.readFileSync(path.join(DEFAULT_OUTPUT, 'index.html'), 'utf8'), /app-runtime" content="android/);
  assert.match(fs.readFileSync(path.join(DEFAULT_OUTPUT, 'reader.html'), 'utf8'), /app-runtime" content="android/);
  assert.match(fs.readFileSync(path.join(DEFAULT_OUTPUT, 'vocabulary.html'), 'utf8'), /app-runtime" content="android/);
  assert.equal(manifest.files.some(record => isForbiddenOutputPath(record.path)), false);
  assert.equal(manifest.files.some(record => /novel|\/media\/|\.mp3$/i.test(record.path)), false);
  assert.equal(report.resourceScan.novelFiles, 0);
  assert.equal(report.resourceScan.mediaFiles, 0);
  assert.equal(result.coreManifest.filesHash, manifest.filesHash);
});

test('core filesHash is independent of generatedAt', () => {
  const result = buildV1App({ generatedAt: '2026-01-01T00:00:00.000Z' });
  const first = result.coreManifest;
  const changedTime = { ...first, generatedAt: '2030-12-31T23:59:59.999Z' };
  assert.equal(computeFilesHash(first.files), computeFilesHash(changedTime.files));
  assert.equal(first.filesHash, computeFilesHash(first.files));
});

test('missing whitelisted source fails before app-dist is cleaned', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v1-contract-'));
  try {
    const sourceConfig = JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, 'config', 'v1-app-assets.json'), 'utf8'));
    sourceConfig.pages = ['missing-reader.html'];
    const configPath = path.join(temporaryRoot, 'assets.json');
    fs.writeFileSync(configPath, JSON.stringify(sourceConfig), 'utf8');
    assert.throws(() => collectSourceAssets({ root: REPOSITORY_ROOT, configPath }), /Missing whitelisted asset/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
