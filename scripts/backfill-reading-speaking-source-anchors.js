const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chapterDir = path.join(root, 'data', 'textbook', 'reading_speaking');
const writeChanges = process.argv.includes('--write') || process.argv.includes('--write-exact-only');

function russianTokens(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\u0451/g, '\u0435')
    .match(/[\u0430-\u044f-]+/g) || [];
}

function containsTokenSequence(haystack, needle) {
  outer: for (let start = 0; start <= haystack.length - needle.length; start++) {
    for (let offset = 0; offset < needle.length; offset++) {
      if (haystack[start + offset] !== needle[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function locateQuotedSource(explanation, originalParagraphs) {
  const quotes = [...String(explanation || '').matchAll(/\u00ab([^\u00bb]+)\u00bb/g)]
    .map((match) => match[1].trim())
    .filter((quote) => russianTokens(quote).length >= 2);
  const candidates = [];

  for (const quote of quotes) {
    const quoteTokens = russianTokens(quote);
    originalParagraphs.forEach((paragraphTokens, paragraphIndex) => {
      if (containsTokenSequence(paragraphTokens, quoteTokens)) {
        candidates.push({ paragraphIndex, quote, tokenCount: quoteTokens.length });
      }
    });
  }

  candidates.sort((left, right) => right.tokenCount - left.tokenCount);
  return candidates[0] || null;
}

const report = {
  chapters: 0,
  exercises: 0,
  existing: 0,
  generated: 0,
  unresolved: [],
  changedFiles: [],
  byChapter: {},
  misplacedMatches: {}
};

const chapterFiles = fs.readdirSync(chapterDir)
  .filter((file) => /^ch\d+\.json$/.test(file))
  .sort();

const corpus = chapterFiles.map((file) => {
  const chapter = JSON.parse(fs.readFileSync(path.join(chapterDir, file), 'utf8'));
  return {
    file,
    paragraphs: (chapter.original || []).map(russianTokens)
  };
});

for (const file of chapterFiles) {
  const filePath = path.join(chapterDir, file);
  const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const paragraphTokens = (chapter.original || []).map(russianTokens);
  let changed = false;
  const chapterReport = { exercises: 0, existing: 0, generated: 0, unresolved: 0 };
  report.chapters++;

  for (const exercise of chapter.exercises || []) {
    report.exercises++;
    chapterReport.exercises++;
    if (exercise.sourceAnchor && exercise.sourceAnchor.quote) {
      report.existing++;
      chapterReport.existing++;
      continue;
    }

    const match = locateQuotedSource(exercise.detailed_explanation, paragraphTokens);
    if (!match) {
      report.unresolved.push(`${file}#${exercise.num}`);
      chapterReport.unresolved++;
      const elsewhere = corpus
        .filter((candidate) => candidate.file !== file)
        .map((candidate) => ({
          file: candidate.file,
          match: locateQuotedSource(exercise.detailed_explanation, candidate.paragraphs)
        }))
        .filter((candidate) => candidate.match)
        .sort((left, right) => right.match.tokenCount - left.match.tokenCount)[0];
      if (elsewhere) {
        const key = `${file} -> ${elsewhere.file}`;
        report.misplacedMatches[key] = (report.misplacedMatches[key] || 0) + 1;
      }
      continue;
    }

    exercise.sourceAnchor = {
      paragraphIndex: match.paragraphIndex,
      quote: match.quote
    };
    report.generated++;
    chapterReport.generated++;
    changed = true;
  }

  report.byChapter[file] = chapterReport;

  if (changed) {
    report.changedFiles.push(file);
    if (writeChanges) fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  }
}

console.log(JSON.stringify({ mode: writeChanges ? 'write-exact-only' : 'dry-run', ...report }, null, 2));
if (report.unresolved.length && !writeChanges) process.exitCode = 1;
