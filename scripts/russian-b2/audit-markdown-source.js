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

function normalizeOptionKey(key) {
  return ({ A: 'А', B: 'Б', C: 'В', D: 'Г', Γ: 'Г' })[key] || key;
}

function cleanDraftText(text) {
  return String(text || '')
    .replace(/◎.*?◎/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuestionDrafts(markdown) {
  return String(markdown || '').split(/(?=^\s*\d+\.\s)/m).flatMap(block => {
    const numberMatch = block.match(/^\s*(\d+)\.\s*([\s\S]*)$/);
    if (!numberMatch) return [];
    const printedNumber = Number(numberMatch[1]);
    const body = numberMatch[2];
    const matches = [...body.matchAll(/(?:\(([АБВГΓABCD])\)|([АБВГΓABCD])\))\s*/g)];
    if (matches.length < 2 || matches.length > 4) return [];
    const question = cleanDraftText(body.slice(0, matches[0].index));
    const options = matches.map((match, index) => ({
      // The OCR occasionally reads Cyrillic В as Latin B.  The original
      // multiple-choice layout is always ordered А, Б, В, Г, so position is
      // the reliable identifier while the extracted text remains unchanged.
      key: ['А', 'Б', 'В', 'Г'][index],
      text: cleanDraftText(body.slice(match.index + match[0].length, index + 1 < matches.length ? matches[index + 1].index : body.length))
    }));
    if (!question || options.some(option => !option.text)) return [];
    return [{ printedNumber, question, options }];
  });
}

function extractAnswerDrafts(markdown) {
  const pattern = /^\s*(\d+)\.\s*答案[:：]\s*([АБВГΓABCD])\s*[。.]?\s*解析[:：]\s*([\s\S]*?)\s*译文[:：]\s*([^\r\n]+)/gm;
  return [...String(markdown || '').matchAll(pattern)].map(match => ({
    printedNumber: Number(match[1]),
    answer: normalizeOptionKey(match[2]),
    sourceExplanation: cleanDraftText(match[3]),
    translation: cleanDraftText(match[4])
  }));
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

module.exports = { auditMarkdownSource, auditPart, extractQuestionDrafts, extractAnswerDrafts };
