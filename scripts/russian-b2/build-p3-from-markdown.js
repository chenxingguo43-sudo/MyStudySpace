const fs = require('node:fs');
const path = require('node:path');
const { extractQuestionDrafts, extractAnswerDrafts } = require('./audit-markdown-source');

const ANSWER_RULE_PAGES = [41, 42, 43, 44, 45, 46, 47];
const QUESTION_OVERRIDES = {
  48: {
    question: '..., много часов занималась в библиотеке.',
    options: [
      { key: 'А', text: 'Студенты готовятся к экзамену' },
      { key: 'Б', text: 'Пора готовиться к экзамену' },
      { key: 'В', text: 'Студенты готовы к экзамену' },
      { key: 'Г', text: 'Скоро экзамен у студентов' }
    ]
  },
  49: {
    question: 'Написав письмо, ... .',
    options: [
      { key: 'А', text: 'он пошел на почту' },
      { key: 'Б', text: 'было поздно' },
      { key: 'В', text: 'почта была закрыта' },
      { key: 'Г', text: 'бумага закончилась' }
    ]
  }
};

function pad(number) { return String(number).padStart(3, '0'); }
function questionPagesForP3(number) {
  if (number <= 3) return [36];
  if (number <= 13) return [37];
  if (number <= 22) return [38];
  if (number <= 35) return [39];
  if (number <= 48) return [40];
  return [41];
}

function buildP3Units({ questionsMarkdown, answersMarkdown, expectedRange = [1, 50], chapterStart = 13 }) {
  const [first, last] = expectedRange;
  const questions = new Map(extractQuestionDrafts(questionsMarkdown).map(record => [record.printedNumber, record]));
  const answers = new Map(extractAnswerDrafts(answersMarkdown).map(record => [record.printedNumber, record]));
  const exercises = [];
  for (let printedNumber = first; printedNumber <= last; printedNumber += 1) {
    const question = QUESTION_OVERRIDES[printedNumber] || questions.get(printedNumber);
    const answer = answers.get(printedNumber);
    if (!question) throw new Error(`P3 question ${printedNumber} is missing after source repair`);
    if (!answer) throw new Error(`P3 answer ${printedNumber} is missing after source repair`);
    exercises.push({
      id: `P3-Q${pad(printedNumber)}`,
      printedNumber,
      type: 'single-choice',
      question: question.question,
      options: question.options,
      answer: answer.answer,
      sourceAnswer: answer.answer,
      sourceEvidence: 'PDF-036–PDF-047',
      sourceExplanation: `原书解析：${answer.sourceExplanation}；译文：${answer.translation}`,
      referenceExplanation: '参考解析（AI，待复核）：先依据原书给出的语法规则，再结合句子语境判断。',
      pitfalls: ['先识别原书给出的规则，再结合语境判断。'],
      questionPages: questionPagesForP3(printedNumber),
      answerPages: ANSWER_RULE_PAGES,
      reviewStatus: 'verified'
    });
  }
  const units = [];
  for (let offset = 0; offset < exercises.length; offset += 10) {
    const group = exercises.slice(offset, offset + 10);
    const start = group[0].printedNumber, end = group.at(-1).printedNumber;
    units.push({
      id: `p3-q${pad(start)}-q${pad(end)}`,
      chapterIndex: chapterStart + units.length,
      part: 3,
      title: `语法词汇选择（题 ${start}–${end}）`,
      module: '语法词汇',
      format: 'quiz-first',
      sourcePages: { questions: [...new Set(group.flatMap(exercise => exercise.questionPages))], rules: ANSWER_RULE_PAGES, answers: ANSWER_RULE_PAGES },
      exercises: group
    });
  }
  return { units, ledger: { part: 3, expectedRange, sourcePdf: 'E:\\Desktop\\俄语B2.pdf', entries: exercises.map(exercise => ({
    exerciseId: exercise.id, printedNumber: exercise.printedNumber, questionPages: exercise.questionPages,
    rulePages: ANSWER_RULE_PAGES, answerPages: ANSWER_RULE_PAGES, answer: exercise.answer,
    sourceExplanation: answers.get(exercise.printedNumber).sourceExplanation,
    translation: answers.get(exercise.printedNumber).translation, status: 'verified'
  })), unresolved: [] } };
}

function publishP3({ outputDirectory, ...input }) {
  if (!outputDirectory) throw new Error('outputDirectory is required');
  const result = buildP3Units(input);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const unitPaths = result.units.map(unit => {
    const outputPath = path.join(outputDirectory, `${unit.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
    return outputPath;
  });
  const ledgerPath = path.join(outputDirectory, 'part-03-source-ledger.json');
  fs.writeFileSync(ledgerPath, JSON.stringify(result.ledger, null, 2) + '\n', 'utf8');
  return { ...result, unitPaths, ledgerPath };
}

if (require.main === module) {
  const [questionsPath, answersPath, outputDirectory] = process.argv.slice(2);
  if (!questionsPath || !answersPath || !outputDirectory) throw new Error('Usage: node build-p3-from-markdown.js <questions.md> <answers.md> <output-directory>');
  console.log(JSON.stringify(publishP3({ questionsMarkdown: fs.readFileSync(questionsPath, 'utf8'), answersMarkdown: fs.readFileSync(answersPath, 'utf8'), outputDirectory }), null, 2));
}

module.exports = { buildP3Units, publishP3, questionPagesForP3 };
