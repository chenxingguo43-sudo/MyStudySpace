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

function buildReadingBook({ markdown }) {
  const { units } = buildReadingUnits({ markdown });
  const publishedUnits = units.map(unit => ({
    ...unit,
    paragraphs: unit.body.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean),
    reviewStatus: 'source-verified',
    translationStatus: 'pending',
    structure: [],
    reusableExpressions: [],
    retelling: null
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

function publishReadingBook({ markdown, outputDir }) {
  const book = buildReadingBook({ markdown });
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

module.exports = { buildReadingUnits, buildReadingBook, publishReadingBook };
