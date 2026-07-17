const fs = require('node:fs');
const path = require('node:path');
const { extractQuestionDrafts, extractAnswerDrafts } = require('./audit-markdown-source');

const ANSWER_RULE_PAGES = [52, 53, 54, 55, 56, 57, 58, 59];
const ANSWER_OVERRIDES = {
  47: { answer: 'А', sourceExplanation: '前置词 из 表示原因。', translation: '维克托出于对交谈者的尊重保持沉默。' }
};
const QUESTION_PAGE_BREAKS = [[9, 47], [18, 48], [28, 49], [38, 50], [45, 51], [50, 52]];
const pad = number => String(number).padStart(3, '0');
const questionPagesForP4 = number => [QUESTION_PAGE_BREAKS.find(([limit]) => number <= limit)[1]];

function buildP4Units({ questionsMarkdown, answersMarkdown, expectedRange = [1, 50], chapterStart = 18 }) {
  const [first, last] = expectedRange;
  const questions = new Map(extractQuestionDrafts(questionsMarkdown).map(record => [record.printedNumber, record]));
  const extractedAnswers = new Map(extractAnswerDrafts(answersMarkdown).map(record => [record.printedNumber, record]));
  const answers = new Map([
    ...extractedAnswers,
    ...Object.entries(ANSWER_OVERRIDES).map(([number, record]) => [Number(number), { printedNumber: Number(number), ...record }])
  ]);
  const exercises = [];
  for (let number = first; number <= last; number += 1) {
    const question = questions.get(number), answer = answers.get(number);
    if (!question) throw new Error(`P4 question ${number} is missing after source verification`);
    if (!answer) throw new Error(`P4 answer ${number} is missing after source verification`);
    exercises.push({ id:`P4-Q${pad(number)}`, printedNumber:number, type:'single-choice', question:question.question, options:question.options,
      answer:answer.answer, sourceAnswer:answer.answer, sourceEvidence:'PDF-047–PDF-059',
      sourceExplanation:`原书解析：${answer.sourceExplanation}；译文：${answer.translation}`,
      referenceExplanation:'参考解析（AI，待复核）：先依据原书给出的语法规则，再结合句子语境判断。',
      pitfalls:['先识别原书给出的规则，再结合语境判断。'], questionPages:questionPagesForP4(number), answerPages:ANSWER_RULE_PAGES, reviewStatus:'verified' });
  }
  const units = [];
  for (let offset=0; offset<exercises.length; offset+=10) {
    const group=exercises.slice(offset, offset+10), start=group[0].printedNumber, end=group.at(-1).printedNumber;
    units.push({ id:`p4-q${pad(start)}-q${pad(end)}`, chapterIndex:chapterStart+units.length, part:4, title:`语法词汇选择（题 ${start}–${end}）`, module:'语法词汇', format:'quiz-first', sourcePages:{questions:[...new Set(group.flatMap(x=>x.questionPages))],rules:ANSWER_RULE_PAGES,answers:ANSWER_RULE_PAGES},exercises:group });
  }
  return { units, ledger:{part:4,expectedRange,sourcePdf:'E:\\Desktop\\俄语B2.pdf',entries:exercises.map(exercise=>({exerciseId:exercise.id,printedNumber:exercise.printedNumber,questionPages:exercise.questionPages,rulePages:ANSWER_RULE_PAGES,answerPages:ANSWER_RULE_PAGES,answer:exercise.answer,sourceExplanation:answers.get(exercise.printedNumber).sourceExplanation,translation:answers.get(exercise.printedNumber).translation,status:'verified'})),unresolved:[]} };
}
function publishP4({outputDirectory,...input}) { const result=buildP4Units(input); fs.mkdirSync(outputDirectory,{recursive:true}); const unitPaths=result.units.map(unit=>{const p=path.join(outputDirectory,`${unit.id}.json`);fs.writeFileSync(p,JSON.stringify(unit,null,2)+'\n','utf8');return p;});const ledgerPath=path.join(outputDirectory,'part-04-source-ledger.json');fs.writeFileSync(ledgerPath,JSON.stringify(result.ledger,null,2)+'\n','utf8');return {...result,unitPaths,ledgerPath}; }
if (require.main === module) { const [q,a,out]=process.argv.slice(2); if(!q||!a||!out) throw new Error('Usage: node build-p4-from-markdown.js <questions.md> <answers.md> <output-directory>'); console.log(JSON.stringify(publishP4({questionsMarkdown:fs.readFileSync(q,'utf8'),answersMarkdown:fs.readFileSync(a,'utf8'),outputDirectory:out}),null,2)); }
module.exports={buildP4Units,publishP4,questionPagesForP4};
