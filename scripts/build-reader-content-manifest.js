const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(REPOSITORY_ROOT, 'data', 'reader-content-manifest.json');
const CONTENT_VERSION = '2026.07.27.1';

const ROOT_CONTENT_FILES = [
  'data/external-vocab.json',
  'data/lexeme_index.json',
  'data/morphology-map.json',
  'data/morphology-version.json',
  'data/sentences.json',
  'data/source_labels.json',
  'data/sources.json',
  'data/vocabulary.json'
];

const DICTIONARY_CONTENT_FILES = [
  'data/dictionary/manifest.json',
  'data/dictionary/corpus-morphology.json',
  'data/dictionary/freedict-rus-zh.json',
  'data/dictionary/function-word-forms.json',
  'data/dictionary/markdown-glossary.json',
  'data/dictionary/openrussian-en.json',
  'data/dictionary/reviewed-function-entries.json',
  'data/dictionary/salad-vocab.json',
  'data/dictionary/stress-map.json',
  'data/dictionary/wiktionary-ru.json'
];

const EXCLUDED_DIRECTORY_NAMES = new Set(['media', '_automation', 'rebuild']);

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function comparePaths(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function assertSafeContentDirectory(root, relativeDirectory) {
  const resolvedRoot = path.resolve(root);
  const resolvedDirectory = path.resolve(root, relativeDirectory);
  const relative = path.relative(resolvedRoot, resolvedDirectory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Content directory escapes repository root: ${relativeDirectory}`);
  }
  return resolvedDirectory;
}

function walkJsonFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Missing controlled content directory: ${directory}`);
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => comparePaths(normalizePath(left), normalizePath(right)));
}

function createFileRecord(root, relativePath) {
  const normalizedPath = normalizePath(relativePath);
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing controlled content file: ${normalizedPath}`);
  }
  const content = fs.readFileSync(absolutePath);
  return {
    path: normalizedPath,
    bytes: content.length,
    sha256: sha256(content)
  };
}

function computeFilesHash(fileRecords) {
  const tuples = [...fileRecords]
    .sort((left, right) => comparePaths(left.path, right.path))
    .map(file => [file.path, file.bytes, file.sha256]);

  // generatedAt and every other manifest field are deliberately outside this input.
  return sha256(Buffer.from(JSON.stringify(tuples), 'utf8'));
}

function summarizeRecords(fileRecords) {
  return {
    fileCount: fileRecords.length,
    totalBytes: fileRecords.reduce((total, file) => total + file.bytes, 0),
    contentHash: computeFilesHash(fileRecords)
  };
}

function collectIndexedBooks(root, indexRelativePath, kind) {
  const index = readJson(path.join(root, indexRelativePath));
  if (!Array.isArray(index.books) || index.books.length === 0) {
    throw new Error(`${normalizePath(indexRelativePath)} must declare at least one book`);
  }

  const baseDirectory = path.dirname(indexRelativePath);
  const books = [];
  const relativeFiles = [indexRelativePath];

  for (const book of index.books) {
    if (!book || typeof book.id !== 'string' || typeof book.dir !== 'string') {
      throw new Error(`${normalizePath(indexRelativePath)} contains a book without id or dir`);
    }
    const bookRelativeDirectory = path.join(baseDirectory, book.dir);
    const bookDirectory = assertSafeContentDirectory(root, bookRelativeDirectory);
    const bookFiles = walkJsonFiles(bookDirectory).map(file => path.relative(root, file));
    const records = bookFiles.map(file => createFileRecord(root, file));
    const directChapterPattern = /^ch\d{4}\.json$/i;

    books.push({
      id: book.id,
      kind,
      title: book.title,
      dir: normalizePath(bookRelativeDirectory),
      declaredChapters: book.chapters,
      chapterFiles: bookFiles.filter(file => directChapterPattern.test(path.basename(file))).length,
      ...summarizeRecords(records)
    });
    relativeFiles.push(...bookFiles);
  }

  return { books, relativeFiles };
}

function validateGrammarAnalysis(root) {
  const grammarDirectory = path.join(root, 'data', 'textbook', 'zlatoust_grammar');
  const chapterFiles = fs.readdirSync(grammarDirectory)
    .filter(name => /^ch\d{4}\.json$/i.test(name))
    .sort();
  if (chapterFiles.length !== 5) {
    throw new Error(`Expected 5 Zlatoust grammar chapters, found ${chapterFiles.length}`);
  }

  let exercises = 0;
  let objectiveAnswersValidated = 0;
  let openResponseExercises = 0;
  for (const chapterFile of chapterFiles) {
    const chapter = readJson(path.join(grammarDirectory, chapterFile));
    if (!Array.isArray(chapter.exercises)) {
      throw new Error(`${chapterFile} has no exercises array`);
    }
    for (const exercise of chapter.exercises) {
      exercises += 1;
      if (typeof exercise.sourceEvidence !== 'string' || exercise.sourceEvidence.trim() === '') {
        throw new Error(`${exercise.id || chapterFile} has no source evidence`);
      }
      if (Array.isArray(exercise.options) && exercise.options.length > 0) {
        if (typeof exercise.answer !== 'string' || exercise.answer.trim() === '') {
          throw new Error(`${exercise.id || chapterFile} has options but no fixed answer`);
        }
        const optionKeys = new Set(exercise.options.map(option => option.key));
        if (!optionKeys.has(exercise.answer)) {
          throw new Error(`${exercise.id || chapterFile} answer is absent from its options`);
        }
        objectiveAnswersValidated += 1;
      } else if (exercise.type === 'open-response') {
        openResponseExercises += 1;
      }
    }
  }
  if (exercises !== 597) {
    throw new Error(`Expected 597 Zlatoust grammar exercises, found ${exercises}`);
  }

  return {
    chapters: chapterFiles.length,
    exercises,
    objectiveAnswersValidated,
    openResponseExercises,
    sourceEvidenceValidated: exercises
  };
}

function buildContentManifest({ root = REPOSITORY_ROOT, generatedAt = new Date().toISOString() } = {}) {
  const textbook = collectIndexedBooks(root, path.join('data', 'textbook', 'index.json'), 'textbook');
  const allRelativeFiles = [
    ...textbook.relativeFiles,
    ...ROOT_CONTENT_FILES,
    ...DICTIONARY_CONTENT_FILES
  ].map(normalizePath);
  const uniqueRelativeFiles = [...new Set(allRelativeFiles)].sort(comparePaths);
  const files = uniqueRelativeFiles.map(file => createFileRecord(root, file));
  const dictionaryRecords = DICTIONARY_CONTENT_FILES.map(file => createFileRecord(root, file));
  const vocabularyRecords = ROOT_CONTENT_FILES.map(file => createFileRecord(root, file));
  const grammarAnalysis = validateGrammarAnalysis(root);

  return {
    schema: 'mystudyspace-reader-content-v1',
    version: CONTENT_VERSION,
    generatedAt,
    grammarAnalysisStatus: 'complete',
    grammarAnalysis,
    books: textbook.books,
    dictionaryVersion: `sha256:${computeFilesHash(dictionaryRecords)}`,
    vocabularyVersion: `sha256:${computeFilesHash(vocabularyRecords)}`,
    controlledContent: {
      pathEncoding: 'repository-relative-posix',
      hashAlgorithm: 'sha256',
      filesHashInput: 'sorted [path, bytes, sha256] tuples; generatedAt excluded',
      fileCount: files.length,
      totalBytes: files.reduce((total, file) => total + file.bytes, 0)
    },
    files,
    filesHash: computeFilesHash(files)
  };
}

function stableManifest(manifest) {
  const { generatedAt, ...stable } = manifest;
  return stable;
}

function writeContentManifest({ root = REPOSITORY_ROOT, outputPath = DEFAULT_OUTPUT, generatedAt } = {}) {
  const manifest = buildContentManifest({ root, generatedAt });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function checkContentManifest({ root = REPOSITORY_ROOT, outputPath = DEFAULT_OUTPUT } = {}) {
  if (!fs.existsSync(outputPath)) throw new Error(`Missing content manifest: ${outputPath}`);
  const actual = readJson(outputPath);
  const expected = buildContentManifest({ root, generatedAt: actual.generatedAt });
  if (JSON.stringify(stableManifest(actual)) !== JSON.stringify(stableManifest(expected))) {
    throw new Error('Content manifest is stale; run node scripts/build-reader-content-manifest.js');
  }
  return actual;
}

if (require.main === module) {
  const checkOnly = process.argv.includes('--check');
  const manifest = checkOnly ? checkContentManifest() : writeContentManifest();
  const action = checkOnly ? 'verified' : 'written';
  console.log(
    `Reader content manifest ${action}: ${manifest.controlledContent.fileCount} files, ` +
    `${manifest.controlledContent.totalBytes} bytes, ${manifest.filesHash}`
  );
}

module.exports = {
  CONTENT_VERSION,
  DEFAULT_OUTPUT,
  DICTIONARY_CONTENT_FILES,
  ROOT_CONTENT_FILES,
  buildContentManifest,
  checkContentManifest,
  computeFilesHash,
  stableManifest,
  walkJsonFiles,
  writeContentManifest
};
