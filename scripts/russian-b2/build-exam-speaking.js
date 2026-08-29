/* 组装真题·会话章节：3 部分 15 个任务的可读材料（任务+参考对话），不做互动判分。 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXAM_DIR = path.join(ROOT, 'data', 'textbook', 'russian_b2', 'modules', 'exam');
const DATA = require('./data/exam-speaking/exam-speaking-data.js');

function buildExamSpeakingChapter() {
  const sections = DATA.parts.map(part => ({
    id: `speaking-part-${part.part}`,
    part: part.part,
    title: part.title,
    partInstructionZh: part.partInstructionZh,
    answerPdfPage: DATA.answerPagesByPart[part.part],
    tasks: part.tasks.map(task => ({
      id: `speaking-t${String(task.printedNumber).replace(/\D/g, '').padStart(2, '0')}`,
      printedNumber: task.printedNumber,
      title: task.title,
      instructionRu: task.instructionRu,
      instructionZh: task.instructionZh,
      materialsRu: task.materialsRu,
      referenceAnswer: task.referenceAnswer,
      answerNoteZh: task.answerNoteZh
    }))
  }));
  const taskCount = sections.reduce((sum, section) => sum + section.tasks.length, 0);
  if (taskCount !== 6) throw new Error(`expected 6 task groups (1–4, 5–8, 9–12, 13, 14, 15), got ${taskCount}`);

  return {
    id: 'speaking',
    title: '会话',
    printedSubtest: 5,
    durationMinutes: 45,
    questionCount: 15,
    sourcePages: [181, 189],
    reviewStatus: 'source-verified',
    sourceMarkdown: '新扫描 full.md（第二部分真题·会话，Субтест 5）',
    importStatus: 'source-verified',
    format: 'exam-practice',
    materialsMode: true,
    readOnly: true,
    overviewRu: DATA.overviewRu,
    overviewZh: DATA.overviewZh,
    sections
  };
}

function main() {
  const chapter = buildExamSpeakingChapter();
  const target = path.join(EXAM_DIR, 'exam-speaking.json');
  fs.writeFileSync(target, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote exam speaking materials (${chapter.sections.length} parts) to ${path.relative(ROOT, target)}\n`);
}

if (require.main === module) main();

module.exports = { buildExamSpeakingChapter };
