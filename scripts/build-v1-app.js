'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  checkContentManifest,
  computeFilesHash
} = require('./build-v1-content-manifest');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CONFIG = path.join(REPOSITORY_ROOT, 'config', 'v1-app-assets.json');
const DEFAULT_OUTPUT = path.join(REPOSITORY_ROOT, 'app-dist');
const POSIX = path.posix;

function normalizeRelativePath(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Asset path must be a non-empty string');
  const normalized = value.replace(/\\/g, '/');
  if (path.isAbsolute(value) || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Asset path must be repository-relative: ${value}`);
  }
  const clean = POSIX.normalize(normalized);
  if (clean === '..' || clean.startsWith('../') || clean.includes('/../')) {
    throw new Error(`Asset path escapes repository: ${value}`);
  }
  return clean;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function fileRecord(root, relativePath) {
  const file = path.join(root, ...relativePath.split('/'));
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error(`Expected file: ${relativePath}`);
  return { path: relativePath, bytes: stat.size, sha256: sha256File(file) };
}

function assertSafeOutput(root, output) {
  const expected = path.resolve(root, 'app-dist');
  if (path.resolve(output) !== expected || expected === path.resolve(root)) {
    throw new Error(`Refusing to clean unexpected output directory: ${output}`);
  }
}

function loadAssetContract(configPath = DEFAULT_CONFIG) {
  const config = readJson(configPath);
  if (config.schema !== 'mystudyspace-v1-app-assets' || config.version !== 1) {
    throw new Error('Unsupported V1 app asset contract');
  }
  const exactGroups = ['pages', 'styles', 'scripts', 'backgrounds'];
  const exact = exactGroups.flatMap(group => {
    if (!Array.isArray(config[group])) throw new Error(`Asset group must be an array: ${group}`);
    return config[group].map(normalizeRelativePath);
  });
  if (new Set(exact).size !== exact.length) throw new Error('Duplicate exact path in V1 app asset contract');
  return { config, exact };
}

function collectSourceAssets({ root = REPOSITORY_ROOT, configPath = DEFAULT_CONFIG } = {}) {
  const { config, exact } = loadAssetContract(configPath);
  const contentManifestPath = path.join(root, ...normalizeRelativePath(config.contentManifest).split('/'));
  const contentManifest = checkContentManifest({ root, outputPath: contentManifestPath });
  const paths = [...new Set([normalizeRelativePath(config.contentManifest), ...exact, ...contentManifest.files.map(record => normalizeRelativePath(record.path))])]
    .sort((a, b) => a.localeCompare(b, 'en'));
  for (const relativePath of paths) {
    const source = path.join(root, ...relativePath.split('/'));
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`Missing whitelisted asset: ${relativePath}`);
  }
  return { config, contentManifest, paths };
}

function injectAndroidRuntime(html) {
  const marker = '<meta name="app-runtime" content="android">';
  if (html.includes(marker)) return html;
  if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('Cannot inject Android runtime marker: missing <head>');
  return html.replace(/<head(?:\s[^>]*)?>/i, match => `${match}\n${marker}`);
}

function bootstrapHtml(contentVersion) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="app-runtime" content="android">
  <meta name="app-entry-mode" content="phase2-bootstrap">
  <title>白夜俄语</title>
  <style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07101f;color:#f8fafc;font-family:system-ui,sans-serif}.shell{width:min(88vw,440px)}h1{font-size:2rem;margin:.2rem 0}p{color:#a8b3c7;line-height:1.6}.links{display:grid;gap:14px;margin-top:30px}a{display:block;padding:18px 20px;border:1px solid #334155;border-radius:16px;color:inherit;text-decoration:none;background:#111c2e}small{display:block;margin-top:28px;color:#6f7d93}</style>
</head>
<body><main class="shell"><p>БЕЛЫЕ НОЧИ</p><h1>白夜俄语</h1><p>Phase 2 资源验证入口。正式首页与“我的”将在 Phase 4 实现。</p><nav class="links" aria-label="学习入口"><a href="reader.html">Reader</a><a href="vocabulary.html">Vocabulary</a></nav><small>内容版本 ${contentVersion}</small></main></body>
</html>
`;
}

function copyAsset(root, output, relativePath) {
  const source = path.join(root, ...relativePath.split('/'));
  const destination = path.join(output, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (/\.html$/i.test(relativePath)) {
    fs.writeFileSync(destination, injectAndroidRuntime(fs.readFileSync(source, 'utf8')), 'utf8');
  } else {
    fs.copyFileSync(source, destination);
  }
}

function assertTextbookContract(root, output, contentManifest) {
  const catalogue = readJson(path.join(root, 'data', 'textbook', 'index.json'));
  const controlled = new Set(contentManifest.files.map(file => file.path));
  for (const book of catalogue.books) {
    if (book.kind !== 'textbook') throw new Error(`Non-textbook catalogue entry is not allowed: ${book.id}`);
    const expectedChapters = Array.isArray(book.unitIds) ? book.unitIds.length : book.chapters;
    for (let index = 0; index < expectedChapters; index += 1) {
      const chapter = `data/textbook/${book.dir}/ch${String(index).padStart(4, '0')}.json`;
      if (!controlled.has(chapter) || !fs.existsSync(path.join(output, ...chapter.split('/')))) {
        throw new Error(`Missing declared textbook chapter: ${chapter}`);
      }
    }
    if (book.manifest) {
      const manifestPath = `data/textbook/${book.manifest}`;
      if (!controlled.has(manifestPath) || !fs.existsSync(path.join(output, ...manifestPath.split('/')))) {
        throw new Error(`Missing declared textbook manifest: ${manifestPath}`);
      }
    }
  }
}

function isForbiddenOutputPath(relativePath) {
  const lower = relativePath.toLowerCase();
  return lower === 'cloudsync-config.js' ||
    lower.startsWith('data/novel/') ||
    /^data\/audio\/.*\.mp3$/i.test(relativePath) ||
    /^data\/textbook\/.*\/media\//i.test(relativePath) ||
    /^data\/dictionary\/.*\.backup\.json$/i.test(relativePath) ||
    /(^|\/)(tmp|tests|scripts|docs|node_modules)(\/|$)/i.test(relativePath) ||
    /(^|\/)_zlatoust_/i.test(relativePath) ||
    /(^|\/)\.env(?:\.|$)/i.test(relativePath);
}

function scanSensitiveText(output, records) {
  const patterns = [
    /github_pat_[A-Za-z0-9_]{20,}/,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /\bsk-[A-Za-z0-9_-]{20,}/,
    /https?:\/\/[^\s/:@]+:[^\s/@]+@/,
    /authorization\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._-]{12,}/i,
    /\b[A-Za-z]:\\(?:Users|Documents and Settings)\\/i
  ];
  const textExtensions = new Set(['.html', '.css', '.js', '.json', '.txt', '.svg']);
  const flagged = [];
  for (const record of records) {
    if (!textExtensions.has(path.extname(record.path).toLowerCase())) continue;
    const text = fs.readFileSync(path.join(output, ...record.path.split('/')), 'utf8');
    if (patterns.some(pattern => pattern.test(text))) flagged.push(record.path);
  }
  if (flagged.length) throw new Error(`Sensitive pattern found in ${flagged.length} output file(s); values suppressed`);
}

function scanLiteralReferences(output, pages, availablePaths) {
  const available = new Set(availablePaths);
  const missing = [];
  const external = new Set();
  const legacyApi = new Set();
  for (const page of pages) {
    const text = fs.readFileSync(path.join(output, ...page.split('/')), 'utf8');
    const expressions = [/(?:src|href)\s*=\s*["']([^"']+)["']/gi, /fetch\(\s*["']([^"']+)["']/gi];
    for (const expression of expressions) {
      for (const match of text.matchAll(expression)) {
        const reference = match[1];
        if (/^https?:\/\//i.test(reference)) { external.add(reference); continue; }
        if (reference.startsWith('/api/')) { legacyApi.add(reference.split('?')[0]); continue; }
        if (!reference || reference.startsWith('#') || /^(?:data|blob|javascript|mailto):/i.test(reference)) continue;
        const clean = normalizeRelativePath(reference.split(/[?#]/)[0]);
        if (clean.endsWith('/') && [...available].some(relativePath => relativePath.startsWith(clean))) continue;
        if (!available.has(clean)) missing.push(`${page} -> ${clean}`);
      }
    }
  }
  if (missing.length) throw new Error(`Missing literal resource reference(s): ${missing.join(', ')}`);
  return { external: [...external].sort(), legacyApi: [...legacyApi].sort() };
}

function categorize(relativePath, config) {
  if (config.backgrounds.includes(relativePath)) return 'backgrounds';
  if (/\.(?:html|css|js)$/i.test(relativePath)) return 'code';
  if (relativePath.startsWith('data/textbook/')) return 'textbook-text';
  if (relativePath.startsWith('data/dictionary/')) return 'dictionary';
  if (relativePath === 'data/vocabulary.json') return 'vocabulary';
  if (relativePath === 'data/sentences.json') return 'sentences';
  if (relativePath === 'data/lexeme_index.json') return 'lexeme-index';
  if (['data/sources.json', 'data/source_labels.json', 'data/external-vocab.json'].includes(relativePath)) return 'vocabulary-sources';
  if (relativePath === 'data/audio-manifest.json') return 'audio-manifest';
  return 'other-data';
}

function summarize(records, config) {
  const categories = {};
  for (const record of records) {
    const category = categorize(record.path, config);
    categories[category] ||= { files: 0, bytes: 0 };
    categories[category].files += 1;
    categories[category].bytes += record.bytes;
  }
  return categories;
}

function buildV1App({ root = REPOSITORY_ROOT, output = DEFAULT_OUTPUT, configPath = DEFAULT_CONFIG, generatedAt = new Date().toISOString() } = {}) {
  assertSafeOutput(root, output);
  const { config, contentManifest, paths } = collectSourceAssets({ root, configPath });
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const relativePath of paths) copyAsset(root, output, relativePath);
  const entrySource = normalizeRelativePath(config.generatedEntry.source || '');
  if (!entrySource || !paths.includes(entrySource)) throw new Error('Generated entry source must be an explicitly whitelisted page');
  copyAsset(root, output, entrySource);
  fs.copyFileSync(path.join(output, ...entrySource.split('/')), path.join(output, 'index.html'));

  const outputPaths = [...paths, 'index.html'].sort((a, b) => a.localeCompare(b, 'en'));
  if (outputPaths.some(isForbiddenOutputPath)) throw new Error('Forbidden path entered app-dist');
  assertTextbookContract(root, output, contentManifest);
  const references = scanLiteralReferences(output, config.pages, outputPaths);
  const records = outputPaths.map(relativePath => fileRecord(output, relativePath));
  scanSensitiveText(output, records);

  const coreManifest = {
    schema: 'mystudyspace-v1-core-assets',
    version: 1,
    generatedAt,
    runtime: 'android',
    entryMode: config.generatedEntry.mode,
    contentVersion: contentManifest.version,
    contentFilesHash: contentManifest.filesHash,
    hashAlgorithm: 'sha256',
    filesHashInput: 'sorted [path, bytes, sha256] tuples; generatedAt excluded',
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    files: records,
    filesHash: computeFilesHash(records)
  };
  fs.writeFileSync(path.join(output, 'core-assets-manifest.json'), `${JSON.stringify(coreManifest, null, 2)}\n`, 'utf8');

  const report = {
    schema: 'mystudyspace-v1-app-build-report',
    generatedAt,
    runtime: 'android',
    entryMode: config.generatedEntry.mode,
    sourceContent: {
      version: contentManifest.version,
      files: contentManifest.controlledContent.fileCount,
      bytes: contentManifest.controlledContent.totalBytes,
      filesHash: contentManifest.filesHash
    },
    coreAssets: {
      files: coreManifest.fileCount,
      bytes: coreManifest.totalBytes,
      filesHash: coreManifest.filesHash
    },
    categories: summarize(records, config),
    largestFiles: [...records].sort((a, b) => b.bytes - a.bytes).slice(0, 15),
    resourceScan: {
      literalReferencesVerified: true,
      externalUrls: references.external,
      legacyApiPaths: references.legacyApi,
      forbiddenOutputPaths: 0,
      sensitiveFiles: 0,
      novelFiles: 0,
      mediaFiles: 0
    },
    deferredRuntimeBlockers: config.deferredRuntimeBlockers
  };
  fs.writeFileSync(path.join(output, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { config, contentManifest, coreManifest, report, output };
}

if (require.main === module) {
  const result = buildV1App();
  console.log(`V1 app-dist built: ${result.coreManifest.fileCount} core files, ${result.coreManifest.totalBytes} bytes, ${result.coreManifest.filesHash}`);
  if (result.report.resourceScan.legacyApiPaths.length) {
    console.log(`Phase 3 blocker recorded: ${result.report.resourceScan.legacyApiPaths.length} legacy API path(s)`);
  }
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_OUTPUT,
  REPOSITORY_ROOT,
  assertSafeOutput,
  buildV1App,
  collectSourceAssets,
  injectAndroidRuntime,
  isForbiddenOutputPath,
  loadAssetContract,
  normalizeRelativePath
};
