const fs = require('node:fs');
const path = require('node:path');

function extractNumberedLines(markdown) {
  return [...String(markdown || '').matchAll(/^\s*(\d+)\./gm)].map(match => Number(match[1]));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function auditMarkdownSource({ questions, answers }) {
  const questionNumbers = uniqueSorted(extractNumberedLines(questions));
  const answerNumbers = uniqueSorted(extractNumberedLines(answers));
  const questionSet = new Set(questionNumbers);
  const answerSet = new Set(answerNumbers);
  return {
    questionNumbers,
    answerNumbers,
    missingQuestions: answerNumbers.filter(number => !questionSet.has(number)),
    answerOnlyNumbers: answerNumbers.filter(number => !questionSet.has(number)),
    questionOnlyNumbers: questionNumbers.filter(number => !answerSet.has(number))
  };
}

function auditPart({ sourceRoot, part }) {
  const prefix = 'P' + part;
  const questions = fs.readFileSync(path.join(sourceRoot, prefix + '_questions.md'), 'utf8');
  const answers = fs.readFileSync(path.join(sourceRoot, prefix + '_answers.md'), 'utf8');
  return Object.assign({ part }, auditMarkdownSource({ questions, answers }));
}

if (require.main === module) {
  const sourceRoot = process.argv[2] || 'D:\\MyStudySpace\\俄语资料库\\俄语B2 全模块 Markdown版\\_data\\grammar_clean';
  const part = Number(process.argv[3] || 1);
  console.log(JSON.stringify(auditPart({ sourceRoot, part }), null, 2));
}

module.exports = { auditMarkdownSource, auditPart };
