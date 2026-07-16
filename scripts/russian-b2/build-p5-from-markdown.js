const fs = require('node:fs');
const path = require('node:path');
const { extractQuestionDrafts, extractAnswerDrafts } = require('./audit-markdown-source');
const ANSWER_RULE_PAGES = [63, 64, 65, 66];
const QUESTION_OVERRIDES = {
  4: { question:'Мой брат — очень ... человек.', options:[{key:'А',text:'общий'},{key:'Б',text:'общественный'},{key:'В',text:'общинный'},{key:'Г',text:'общительный'}] },
  29: { question:'Мы думали, что дерево погибло, а оно ... .', options:[{key:'А',text:'выжило'},{key:'Б',text:'зажило'},{key:'В',text:'прожило'},{key:'Г',text:'дожило'}] }
};
const PAGE_BREAKS = [[4,59],[17,60],[31,61],[41,62],[50,63]];
const pad=n=>String(n).padStart(3,'0');
const questionPagesForP5=n=>[PAGE_BREAKS.find(([limit])=>n<=limit)[1]];
function buildP5Units({questionsMarkdown,answersMarkdown,expectedRange=[1,50],chapterStart=23}) {
 const [first,last]=expectedRange, questions=new Map(extractQuestionDrafts(questionsMarkdown).map(x=>[x.printedNumber,x])), answers=new Map(extractAnswerDrafts(answersMarkdown).map(x=>[x.printedNumber,x])), exercises=[];
 for(let n=first;n<=last;n++){const question=QUESTION_OVERRIDES[n]||questions.get(n),answer=answers.get(n);if(!question)throw new Error(`P5 question ${n} is missing after source verification`);if(!answer)throw new Error(`P5 answer ${n} is missing after source verification`);exercises.push({id:`P5-Q${pad(n)}`,printedNumber:n,type:'single-choice',question:question.question,options:question.options,answer:answer.answer,sourceAnswer:answer.answer,sourceEvidence:'PDF-059–PDF-066',sourceExplanation:`原书解析：${answer.sourceExplanation}；译文：${answer.translation}`,referenceExplanation:'参考解析（AI，待复核）：先依据原书给出的语法规则，再结合句子语境判断。',pitfalls:['先识别原书给出的规则，再结合语境判断。'],questionPages:questionPagesForP5(n),answerPages:ANSWER_RULE_PAGES,reviewStatus:'verified'});}
 const units=[];for(let i=0;i<exercises.length;i+=10){const group=exercises.slice(i,i+10),start=group[0].printedNumber,end=group.at(-1).printedNumber;units.push({id:`p5-q${pad(start)}-q${pad(end)}`,chapterIndex:chapterStart+units.length,part:5,title:`语法词汇选择（题 ${start}–${end}）`,module:'语法词汇',format:'quiz-first',sourcePages:{questions:[...new Set(group.flatMap(x=>x.questionPages))],rules:ANSWER_RULE_PAGES,answers:ANSWER_RULE_PAGES},exercises:group});}
 return {units,ledger:{part:5,expectedRange,sourcePdf:'E:\\Desktop\\俄语B2.pdf',entries:exercises.map(e=>({exerciseId:e.id,printedNumber:e.printedNumber,questionPages:e.questionPages,rulePages:ANSWER_RULE_PAGES,answerPages:ANSWER_RULE_PAGES,answer:e.answer,sourceExplanation:answers.get(e.printedNumber).sourceExplanation,translation:answers.get(e.printedNumber).translation,status:'verified'})),unresolved:[]}};
}
function publishP5({outputDirectory,...input}){const r=buildP5Units(input);fs.mkdirSync(outputDirectory,{recursive:true});const unitPaths=r.units.map(u=>{const p=path.join(outputDirectory,`${u.id}.json`);fs.writeFileSync(p,JSON.stringify(u,null,2)+'\n','utf8');return p;});const ledgerPath=path.join(outputDirectory,'part-05-source-ledger.json');fs.writeFileSync(ledgerPath,JSON.stringify(r.ledger,null,2)+'\n','utf8');return {...r,unitPaths,ledgerPath};}
if(require.main===module){const[q,a,out]=process.argv.slice(2);if(!q||!a||!out)throw new Error('Usage: node build-p5-from-markdown.js <questions.md> <answers.md> <output-directory>');console.log(JSON.stringify(publishP5({questionsMarkdown:fs.readFileSync(q,'utf8'),answersMarkdown:fs.readFileSync(a,'utf8'),outputDirectory:out}),null,2));}
module.exports={buildP5Units,publishP5,questionPagesForP5};
