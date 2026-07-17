const fs = require('node:fs');
const path = require('node:path');

const TEXT_HEADING = '\u0422\u0435\u043a\u0441\u0442';
const SOURCE_PAGES = [
  [76, 77], [77, 78], [79], [80, 81], [81, 82],
  [83, 84], [84, 85, 86], [86, 87], [88, 89], [90, 91, 92]
];
const ANSWER_KEY = [
  'В', 'В', 'В', 'В', 'В', 'А', 'А', 'В', 'В', 'В',
  'В', 'В', 'В', 'А', 'А', 'В', 'В', 'В', 'А', 'В',
  'А', 'В', 'А', 'В', 'В', 'В', 'В', 'В', 'В', 'А',
  'А', 'А', 'В', 'А', 'В', 'А', 'В', 'В', 'В', 'В',
  'В', 'А', 'В', 'В', 'В', 'В', 'В', 'В', 'А', 'В',
  'В', 'В', 'В', 'А', 'А', 'В', 'А', 'В', 'В', 'В'
];

function normalizeOptionLabel(label) {
  return { A: 'А', B: 'В' }[label] || label;
}

function parseQuestion(block) {
  const match = block.match(/^\s*(\d+)\.\s*([\s\S]*?)(?=^\s*\([AА]\)\s)/m);
  if (!match) return null;
  const optionText = block.slice(match[0].length);
  const optionCandidates = [...optionText.matchAll(/\s*\(([AАБBВ])\)\s*([\s\S]*?)(?=\s*\([AАБBВ]\)\s|$)/g)]
    .map(option => ({
      label: normalizeOptionLabel(option[1]),
      text: option[2].trim().replace(/\s+/g, ' ')
    }));
  const options = [...optionCandidates.reduce((byLabel, option) => {
    const previous = byLabel.get(option.label);
    if (!previous || option.text.length > previous.text.length) byLabel.set(option.label, option);
    return byLabel;
  }, new Map()).values()];
  const printedNumber = Number(match[1]);
  return {
    printedNumber,
    prompt: match[2].trim().replace(/\s+/g, ' '),
    options,
    answer: ANSWER_KEY[printedNumber - 1],
    answerSource: {
      kind: 'b2-original-answer-key',
      pdfPage: 93,
      printedPage: 89,
      label: 'B2 原书参考答案表'
    }
  };
}

function buildReadingUnits({ markdown }) {
  const headingPattern = new RegExp(`(?=^##\\s+${TEXT_HEADING}\\s+\\d+\\s*$)`, 'm');
  const sections = String(markdown || '').split(headingPattern).slice(1);
  const units = sections.map(section => {
    const match = section.match(new RegExp(`^##\\s+${TEXT_HEADING}\\s+(\\d+)\\s*$([\\s\\S]*)`, 'm'));
    const printedNumber = Number(match[1]);
    const rawBody = match[2].trim();
    const questionStart = rawBody.search(/^\s*\d+\.\s/m);
    const body = (questionStart === -1 ? rawBody : rawBody.slice(0, questionStart)).trim();
    const questions = (questionStart === -1 ? [] : rawBody.slice(questionStart).split(/(?=^\s*\d+\.\s|\s+\d+\.\s)/m))
      .map(parseQuestion)
      .filter(Boolean);
    return {
      id: `reading-text-${String(printedNumber).padStart(2, '0')}`,
      printedNumber,
      title: `${TEXT_HEADING} ${printedNumber}`,
      sourcePages: SOURCE_PAGES[printedNumber - 1],
      body,
      questions
    };
  });
  if (units.length !== 10) throw new Error(`Expected 10 reading texts, found ${units.length}`);
  return { units };
}

function buildReadingBook({ markdown, supportById = {} }) {
  const { units } = buildReadingUnits({ markdown });
  const publishedUnits = units.map(unit => ({
    ...unit,
    paragraphs: unit.body.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean),
    reviewStatus: 'source-verified',
    translationStatus: 'pending',
    structure: [],
    reusableExpressions: [],
    retelling: null,
    ...(supportById[unit.id] || {})
  }));
  return {
    index: {
      id: 'russian-b2-reading',
      title: '阅读',
      reviewStatus: 'source-verified',
      answerKeySource: { pdfPage: 93, printedPage: 89 },
      units: publishedUnits.map(unit => ({
        id: unit.id,
        title: unit.title,
        sourcePages: unit.sourcePages,
        reviewStatus: unit.reviewStatus
      }))
    },
    units: publishedUnits
  };
}

function publishReadingBook({ markdown, outputDir, supportById = {} }) {
  const book = buildReadingBook({ markdown, supportById });
  fs.mkdirSync(outputDir, { recursive: true });
  const paths = [];
  const write = (fileName, value) => {
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
    paths.push(filePath);
  };
  write('index.json', book.index);
  for (const unit of book.units) write(`text-${String(unit.printedNumber).padStart(2, '0')}.json`, unit);
  return { ...book, paths };
}

function buildReadingReaderModule({ markdown, supportById = {} }) {
  const book = buildReadingBook({ markdown, supportById });
  const chapters = book.units.map(unit => ({
    id: unit.id,
    format: 'reading-practice',
    title: unit.title,
    original: unit.paragraphs,
    translated: [],
    sourcePages: unit.sourcePages,
    reviewStatus: unit.reviewStatus,
    translationStatus: unit.translationStatus,
    translations: unit.translations || [],
    structure: unit.structure || [],
    reusableExpressions: unit.reusableExpressions || [],
    retelling: unit.retelling || null,
    questions: unit.questions.map(question => ({
      id: `${unit.id}-q${String(question.printedNumber).padStart(2, '0')}`,
      printedNumber: question.printedNumber,
      prompt: question.prompt,
      options: question.options,
      answer: question.answer,
      answerSource: question.answerSource
    }))
  }));
  return {
    index: {
      id: 'russian-b2-reading',
      title: book.index.title,
      format: 'reading-practice',
      chapters: chapters.length,
      reviewStatus: 'source-verified',
      units: chapters.map((chapter, index) => ({
        id: chapter.id,
        chapter: index,
        title: chapter.title,
        sourcePages: chapter.sourcePages
      }))
    },
    chapters
  };
}

function publishReadingReaderModule({ markdown, outputDir, supportById = {} }) {
  const module = buildReadingReaderModule({ markdown, supportById });
  fs.mkdirSync(outputDir, { recursive: true });
  const paths = [];
  const write = (fileName, value) => {
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
    paths.push(filePath);
  };
  write('index.json', module.index);
  module.chapters.forEach((chapter, index) => write(`ch${String(index).padStart(4, '0')}.json`, chapter));
  return { ...module, paths };
}

function resolveReadingSourcePath(root) {
  const segments = ['\u4fc4\u8bed\u8d44\u6599\u5e93', '\u4fc4\u8bedB2 \u5168\u6a21\u5757 Markdown\u7248', '\u7ae0\u8282', '02-\u9605\u8bfb.md'];
  let candidateRoot = path.resolve(root);
  while (true) {
    const candidate = path.join(candidateRoot, ...segments);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(candidateRoot);
    if (parent === candidateRoot) break;
    candidateRoot = parent;
  }
  throw new Error('Cannot locate the canonical B2 reading Markdown source');
}

function resolveReadingSupportDirectory(root) {
  const segments = ['俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '阅读'];
  let candidateRoot = path.resolve(root);
  while (true) {
    const candidate = path.join(candidateRoot, ...segments);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(candidateRoot);
    if (parent === candidateRoot) break;
    candidateRoot = parent;
  }
  throw new Error('Cannot locate canonical B2 reading support directory');
}

function loadReadingSupport(root) {
  const directory = resolveReadingSupportDirectory(root);
  const supportById = {};
  for (let index = 1; index <= 10; index += 1) {
    const file = path.join(directory, `text-${String(index).padStart(2, '0')}.json`);
    if (!fs.existsSync(file)) continue;
    const source = JSON.parse(fs.readFileSync(file, 'utf8'));
    const keys = ['translationStatus', 'translations', 'structure', 'reusableExpressions', 'retelling'];
    supportById[source.id] = keys.reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
      return result;
    }, {});
  }
  return supportById;
}

module.exports = { buildReadingUnits, buildReadingBook, publishReadingBook, buildReadingReaderModule, publishReadingReaderModule, resolveReadingSourcePath, loadReadingSupport };

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const sourcePath = resolveReadingSourcePath(root);
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'reading');
  const result = publishReadingReaderModule({ markdown: fs.readFileSync(sourcePath, 'utf8'), outputDir, supportById: loadReadingSupport(root) });
  process.stdout.write(`Published ${result.chapters.length} reading chapters to ${outputDir}\n`);
}
