const fs = require('fs');
const path = require('path');

const theoryRoot = path.join(__dirname, '..', 'data', 'textbook', 'zlatoust_grammar', 'theory');
const rawRoot = path.join(theoryRoot, 'raw-ocr');
const outputRoot = path.join(theoryRoot, 'cleaned-source');

function readRaw(name) {
  return fs.readFileSync(path.join(rawRoot, name), 'utf8');
}

function splitAt(text, marker, label) {
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`Missing ${label}`);
  return [text.slice(0, index).trimEnd(), text.slice(index).trimStart()];
}

function splitAtPageHeading(text, marker, label) {
  const headingIndex = text.indexOf(marker);
  if (headingIndex < 0) throw new Error(`Missing ${label}`);
  const pageIndex = text.lastIndexOf('\n--- PDF-', headingIndex);
  if (pageIndex < 0) throw new Error(`Missing source page before ${label}`);
  return [text.slice(0, pageIndex).trimEnd(), text.slice(pageIndex + 1).trimStart()];
}

function writeChapter(filename, title, source, printedPages, body) {
  const output = [
    `# ${title}`,
    '',
    `> 原书理论资料整理稿。印刷页：${printedPages}。`,
    '> 仅按已确认章节标题切分，未改写俄文原文；表格和 OCR 不确定处仍需视觉核对。',
    '',
    body.trim(),
    ''
  ].join('\n');
  fs.writeFileSync(path.join(outputRoot, filename), output, 'utf8');
}

const batch1 = readRaw('batch-01-pdf-093-100.md');
const batch2 = readRaw('batch-02-pdf-101-108.md');
const batch3 = readRaw('batch-03-pdf-109-116.md');
const batch4 = readRaw('batch-04-pdf-117-124.md');

const chapter2Marker = '# Грамматический комментарий к главе 2';
const chapter3Marker = '# Грамматический комментарий к главе 3';
const chapter4Marker = '# Грамматический комментарий к главе 4';
const chapter5Marker = '# Грамматико-стилистический комментарий к главе 5';

const [chapter1, batch1Chapter2] = splitAt(batch1, chapter2Marker, 'chapter 2 marker');
const [batch3Chapter2, chapter3] = splitAtPageHeading(batch3, chapter3Marker, 'chapter 3 marker');
// PDF-113 contains the end of 3.1.2 before the Chapter 4 heading.  Split at
// the semantic heading, not the page boundary, so the Chapter 3 rule keeps
// its passive-construction condition and both chapters retain page traceability.
const [chapter3Only, chapter4] = splitAt(chapter3, chapter4Marker, 'chapter 4 marker');
const chapter4WithPageMarker = `--- PDF-113 / 印刷页 111 ---\n${chapter4}`;
const [batch4Chapter4, chapter5] = splitAt(batch4, chapter5Marker, 'chapter 5 marker');

// The agent OCR preserved this page's text but omitted its delimiter.
const normalizedChapter2Start = `--- PDF-100 / 印刷页 98 ---\n${batch1Chapter2}`;
const normalizedChapter5Start = `--- PDF-117 / 印刷页 115 ---\n${chapter5}`;

fs.mkdirSync(outputRoot, { recursive: true });
writeChapter('chapter-01.md', 'Глава 1. Теоретические сведения', 'PDF-093 - PDF-100', '91-98', chapter1);
writeChapter('chapter-02.md', 'Глава 2. Теоретические сведения', 'PDF-100 - PDF-109', '98-107', [normalizedChapter2Start, batch2, batch3Chapter2].join('\n\n'));
writeChapter('chapter-03.md', 'Глава 3. Теоретические сведения', 'PDF-110 - PDF-113', '108-111', chapter3Only);
writeChapter('chapter-04.md', 'Глава 4. Теоретические сведения', 'PDF-113 - PDF-117', '111-115', [chapter4WithPageMarker, batch4Chapter4].join('\n\n'));
writeChapter('chapter-05.md', 'Глава 5. Теоретические сведения', 'PDF-117 - PDF-124', '115-122', normalizedChapter5Start);

console.log(`Built five cleaned theory files in ${outputRoot}`);
