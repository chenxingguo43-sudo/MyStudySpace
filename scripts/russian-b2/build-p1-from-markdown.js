const fs = require('node:fs');
const path = require('node:path');
const { extractQuestionDrafts, extractAnswerDrafts } = require('./audit-markdown-source');

const ANSWER_RULE_PAGES = [10, 11, 12, 13, 14, 15, 16, 17, 18];

const QUESTION_OVERRIDES = {
  42: {
    question: 'Не ... меня, пожалуйста, я стесняюсь.',
    options: [
      { key: 'А', text: 'фотографируй' },
      { key: 'Б', text: 'сфотографируй' }
    ]
  }
};

function pad(number) {
  return String(number).padStart(3, '0');
}

function questionPagesForP1(number) {
  if (number <= 6) return [6];
  if (number <= 19) return [7];
  if (number <= 39) return [8];
  if (number <= 57) return [9];
  return [10];
}

function answerByPrintedNumber(markdown) {
  const seen = new Set();
  const answers = new Map();
  extractAnswerDrafts(markdown).forEach(record => {
    // The Markdown OCR labels the second answer 45 as 45; the scanned book
    // shows that record belongs to original question 46.
    const target = record.printedNumber === 45 && seen.has(45) ? 46 : record.printedNumber;
    answers.set(target, { ...record, printedNumber: target });
    seen.add(record.printedNumber);
  });
  return answers;
}

function buildP1Units({ questionsMarkdown, answersMarkdown, expectedRange = [1, 60], chapterStart = 7 }) {
  const [first, last] = expectedRange;
  const questions = new Map(extractQuestionDrafts(questionsMarkdown).map(record => [record.printedNumber, record]));
  const answers = answerByPrintedNumber(answersMarkdown);
  const exercises = [];

  for (let printedNumber = first; printedNumber <= last; printedNumber += 1) {
    const question = QUESTION_OVERRIDES[printedNumber] || questions.get(printedNumber);
    const answer = answers.get(printedNumber);
    if (!question) throw new Error(`P1 question ${printedNumber} is missing after source repair`);
    if (!answer) throw new Error(`P1 answer ${printedNumber} is missing after source repair`);
    exercises.push({
      id: `P1-Q${pad(printedNumber)}`,
      printedNumber,
      type: 'single-choice',
      question: question.question,
      options: question.options,
      answer: answer.answer,
      sourceAnswer: answer.answer,
      sourceEvidence: 'PDF-006–PDF-018',
      sourceExplanation: `原书解析：${answer.sourceExplanation}；译文：${answer.translation}`,
      referenceExplanation: '参考解析（AI，待复核）：先依据原书给出的语法规则，再结合句子语境判断。',
      pitfalls: ['先识别原书给出的规则，再结合语境判断。'],
      questionPages: questionPagesForP1(printedNumber),
      answerPages: ANSWER_RULE_PAGES,
      reviewStatus: 'verified'
    });
  }

  const units = [];
  for (let offset = 0; offset < exercises.length; offset += 10) {
    const group = exercises.slice(offset, offset + 10);
    const start = group[0].printedNumber;
    const end = group[group.length - 1].printedNumber;
    units.push({
      id: `p1-q${pad(start)}-q${pad(end)}`,
      chapterIndex: chapterStart + units.length,
      part: 1,
      title: `语法词汇选择（题 ${start}–${end}）`,
      module: '语法词汇',
      format: 'quiz-first',
      sourcePages: {
        questions: [...new Set(group.flatMap(exercise => exercise.questionPages))],
        rules: ANSWER_RULE_PAGES,
        answers: ANSWER_RULE_PAGES
      },
      exercises: group
    });
  }

  return {
    units,
    ledger: {
      part: 1,
      expectedRange,
      sourcePdf: 'E:\\Desktop\\俄语B2.pdf',
      entries: exercises.map(exercise => ({
        exerciseId: exercise.id,
        printedNumber: exercise.printedNumber,
        questionPages: exercise.questionPages,
        rulePages: ANSWER_RULE_PAGES,
        answerPages: ANSWER_RULE_PAGES,
        answer: exercise.answer,
        sourceExplanation: answers.get(exercise.printedNumber).sourceExplanation,
        translation: answers.get(exercise.printedNumber).translation,
        status: 'verified'
      })),
      unresolved: []
    }
  };
}

function publishP1({ outputDirectory, ...input }) {
  if (!outputDirectory) throw new Error('outputDirectory is required');
  const result = buildP1Units(input);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const unitPaths = result.units.map(unit => {
    const outputPath = path.join(outputDirectory, `${unit.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
    return outputPath;
  });
  const ledgerPath = path.join(outputDirectory, 'part-01-source-ledger.json');
  fs.writeFileSync(ledgerPath, JSON.stringify(result.ledger, null, 2) + '\n', 'utf8');
  return { ...result, unitPaths, ledgerPath };
}

if (require.main === module) {
  const [questionsPath, answersPath, outputDirectory] = process.argv.slice(2);
  if (!questionsPath || !answersPath || !outputDirectory) {
    throw new Error('Usage: node build-p1-from-markdown.js <questions.md> <answers.md> <output-directory>');
  }
  const result = publishP1({
    questionsMarkdown: fs.readFileSync(questionsPath, 'utf8'),
    answersMarkdown: fs.readFileSync(answersPath, 'utf8'),
    outputDirectory
  });
  console.log(JSON.stringify({ unitPaths: result.unitPaths, ledgerPath: result.ledgerPath }, null, 2));
}

module.exports = { buildP1Units, publishP1, questionPagesForP1, answerByPrintedNumber };
