/* Restore Reader source prose from full-book MinerU Markdown.
 *
 * This tool deliberately changes only `original` and `translated`: exercises,
 * answers, and AI analysis remain untouched. Run without --apply to create
 * review drafts. Applying a chapter creates an on-disk backup first.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const draftRoot = path.join(root, 'docs', 'reader-ai-reading', 'source-recovery-drafts');
const backupRoot = path.join(root, 'docs', 'reader-ai-reading', 'source-recovery-backups');
const defaultSource = String.raw`D:\下载\MinerU\文件转换\В мире людей 阅读口语.pdf-4d908977-e819-4950-8fce-f552d6171ca4\MinerU_markdown_202608191105372_6e8347d7.md`;

function chapterId(title) {
  const match = String(title || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : '';
}

function sectionFor(markdown, id) {
  const marker = new RegExp(`^#{1,3}\\s+TEKCT\\s+${id.replace(/\./g, '\\.')}\\s*$`, 'mi');
  const match = marker.exec(markdown);
  if (!match) return '';
  const after = match.index + match[0].length;
  const next = /^#{1,3}\s+TEKCT\s+\d+\.\d+\.\d+\s*$/gmi;
  next.lastIndex = after;
  const following = next.exec(markdown);
  return markdown.slice(after, following ? following.index : markdown.length);
}

function isArticleTitle(line) {
  const plain = line.replace(/^#+\s*/, '').trim();
  const letters = plain.match(/[А-ЯЁ]/g) || [];
  return plain.length >= 4 && letters.length >= 3 && !/^(объём|время выполнения|задание)(?:\s|$)/i.test(plain);
}

function joinOcrLines(lines) {
  const paragraphs = [];
  let current = '';
  const push = () => {
    const clean = current.replace(/\s+/g, ' ').trim();
    if (clean) paragraphs.push(clean);
    current = '';
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^!\[.*\]\([^)]*\)$/.test(line)) {
      push();
      continue;
    }
    if (!current) {
      current = line;
    } else if (/-$/.test(current)) {
      current = `${current.slice(0, -1)}${line}`;
    } else {
      current += ` ${line}`;
    }
  }
  push();
  return paragraphs;
}

function isQuestionOrOption(line) {
  return /^\s*\d+\.\s+/.test(line) || /^\s*[а-яa-z]\)\s+/i.test(line);
}

function extractInterleavedArticle(section, titleIndex, firstQuestionIndex) {
  const lines = section.split(/\r?\n/);
  let secondQuestionIndex = -1;
  for (let index = firstQuestionIndex + 1; index < lines.length; index += 1) {
    if (/^\s*8\.\s+/.test(lines[index])) {
      secondQuestionIndex = index;
      break;
    }
  }
  const firstPart = lines.slice(titleIndex, firstQuestionIndex);
  const continuation = secondQuestionIndex > firstQuestionIndex
    ? lines.slice(firstQuestionIndex, secondQuestionIndex).filter((line) => !isQuestionOrOption(line))
    : [];
  return joinOcrLines(firstPart.concat(continuation));
}

function extractFormalLetters(section) {
  const lines = section.split(/\r?\n/);
  const testIndex = lines.findIndex((line) => /^\s*##\s+ТЕСТ(?:\s|\.)/i.test(line));
  const body = (testIndex >= 0 ? lines.slice(0, testIndex) : lines)
    .filter((line) => !/[\u3400-\u9fff]/u.test(line));
  return joinOcrLines(body);
}

function extractArticle(section, id) {
  const lines = section.split(/\r?\n/);
  const instruction = lines.findIndex((line) => /^\s*Задание\b/i.test(line));
  const startSearch = instruction >= 0 ? instruction + 1 : 0;
  const titleIndex = lines.findIndex((line, index) => index >= startSearch && isArticleTitle(line));
  if (titleIndex < 0) throw new Error('Article title not found');
  let questionIndex = -1;
  for (let index = titleIndex + 1; index < lines.length; index += 1) {
    if (/^\s*1\.\s+/.test(lines[index])) {
      questionIndex = index;
      break;
    }
  }
  if (questionIndex < 0) throw new Error('Question boundary not found');
  if (id === '2.4.2') return extractFormalLetters(section);
  if (id === '3.2.1' || id === '3.4.2') return extractInterleavedArticle(section, titleIndex, questionIndex);
  const paragraphs = joinOcrLines(lines.slice(titleIndex, questionIndex));
  if (paragraphs.length < 3) throw new Error(`Too few source paragraphs: ${paragraphs.length}`);
  return paragraphs;
}

function safeName(value) { return value.replace(/[^0-9.]/g, '_'); }

function writeDraft(id, chapter, paragraphs) {
  fs.mkdirSync(draftRoot, { recursive: true });
  const draft = {
    chapter: id,
    title: chapter.title,
    extractedAt: new Date().toISOString(),
    source: defaultSource,
    oldOriginal: chapter.original || [],
    proposedOriginal: paragraphs,
    translationDecision: 'clear-translated-until-a-new-aligned-Chinese-translation-is-reviewed'
  };
  fs.writeFileSync(path.join(draftRoot, `${safeName(id)}.json`), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  return draft;
}

function applyChapter(file, chapter, paragraphs) {
  fs.mkdirSync(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(backupRoot, `${file.replace(/\.json$/, '')}-${stamp}.json`), `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  chapter.original = paragraphs;
  // Old translations use a different paragraph map. Keeping them would show
  // a false translation next to the restored OCR source.
  chapter.translated = [];
  for (const exercise of chapter.exercises || []) {
    // Paragraph indexes belong to the old excerpt. They must be rebuilt
    // against the restored source instead of being carried over by accident.
    delete exercise.evidenceAnchors;
    delete exercise.sourceAnchor;
  }
  chapter.sourceRecovery = {
    status: 'mineru-restored-needs-ocr-review',
    source: defaultSource,
    restoredAt: new Date().toISOString(),
    translationStatus: 'not-aligned-to-restored-source'
  };
  fs.writeFileSync(path.join(dataRoot, file), `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
}

function main() {
  const source = process.argv.find((item) => item.endsWith('.md')) || defaultSource;
  const apply = process.argv.includes('--apply');
  const requested = process.argv.find((item) => item.startsWith('--chapters='));
  const selected = requested ? new Set(requested.slice('--chapters='.length).split(',').map((item) => item.trim())) : null;
  const markdown = fs.readFileSync(source, 'utf8');
  const results = [];
  for (const file of fs.readdirSync(dataRoot).filter((item) => /^ch\d+\.json$/.test(item)).sort()) {
    const fullPath = path.join(dataRoot, file);
    const chapter = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const id = chapterId(chapter.title);
    if (selected && !selected.has(id)) continue;
    try {
      const paragraphs = extractArticle(sectionFor(markdown, id), id);
      writeDraft(id, chapter, paragraphs);
      if (apply) applyChapter(file, chapter, paragraphs);
      results.push({ file, chapter: id, paragraphs: paragraphs.length, status: apply ? 'applied' : 'drafted' });
    } catch (error) {
      results.push({ file, chapter: id, status: 'review', reason: error.message });
    }
  }
  console.log(JSON.stringify({ apply, results }, null, 2));
}

if (require.main === module) main();

module.exports = { chapterId, sectionFor, extractArticle, joinOcrLines };
