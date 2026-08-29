/* 组装真题·听力章节（25 题 + TTS 录音稿 + 媒体清单）。
 * 数据：data/exam-listening/exam-listening-data.js；媒体由 generate-exam-tts.py 生成到
 * data/textbook/russian_b2/modules/exam/media/exam-listening/。 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXAM_DIR = path.join(ROOT, 'data', 'textbook', 'russian_b2', 'modules', 'exam');
const DATA = require('./data/exam-listening/exam-listening-data.js');

function buildExamListeningChapter() {
  const questions = [];
  DATA.parts.forEach(part => {
    const from = part.part === 1 ? 1 : (part.part - 2) * 5 + 11;
    const to = part.part === 1 ? 10 : from + 4;
    part.questions.forEach(question => {
      if (question.printedNumber < from || question.printedNumber > to) {
        throw new Error(`part ${part.part} question ${question.printedNumber} outside ${from}-${to}`);
      }
      const labels = question.options.map(option => option.label);
      if (!labels.includes(question.answer)) {
        throw new Error(`listening question ${question.printedNumber}: answer ${question.answer} not among options`);
      }
      questions.push({
        id: `exam-listening-q${String(question.printedNumber).padStart(2, '0')}`,
        printedNumber: question.printedNumber,
        part: part.part,
        audioPiece: part.part === 1 ? (question.printedNumber <= 5 ? 'exam-dialogue' : 'exam-announcement') : part.part === 2 ? 'exam-film' : part.part === 3 ? 'exam-news' : 'exam-interview',
        prompt: question.prompt,
        promptZh: question.promptZh,
        options: question.options,
        answer: question.answer,
        answerSource: {
          kind: 'b2-original-answer-key',
          pdfPage: DATA.answerPagesByPart[part.part],
          label: 'B2 原书听力参考答案（新扫描原书 PDF 页）'
        }
      });
    });
  });
  if (questions.length !== 25) throw new Error(`expected 25 listening questions, got ${questions.length}`);

  const transcriptSegments = [];
  DATA.transcripts.forEach(transcript => {
    transcript.segments.forEach((segment, index) => {
      transcriptSegments.push({
        id: `${transcript.pieceId}-s${String(index + 1).padStart(2, '0')}`,
        pieceId: transcript.pieceId,
        speaker: segment.speaker,
        displayLabel: segment.displayLabel,
        text: segment.text,
        speechText: segment.text
      });
    });
  });

  return {
    id: 'listening',
    title: '听力',
    printedSubtest: 4,
    durationMinutes: 35,
    questionCount: 25,
    sourcePages: [170, 180],
    reviewStatus: 'source-verified',
    sourceMarkdown: '新扫描 full.md（第二部分真题·听力，Субтест 4）',
    importStatus: 'source-verified',
    format: 'exam-practice',
    audio: {
      provenance: DATA.audio.provenance,
      noteZh: DATA.audio.noteZh,
      base: 'modules/exam/media/exam-listening/',
      pieces: DATA.audio.pieces.map(piece => ({
        id: piece.id,
        label: piece.label,
        file: `modules/exam/media/exam-listening/${piece.id}.mp3`,
        captions: `modules/exam/media/exam-listening/${piece.id}.vtt`
      }))
    },
    parts: DATA.parts.map(part => ({
      part: part.part,
      title: part.title,
      instructionRu: part.instructionRu,
      instructionZh: part.instructionZh,
      answers: DATA.answersByPart[part.part]
    })),
    examInstructions: {
      overviewZh: DATA.overallInstructionZh,
      answerCardZh: DATA.answerCardZh
    },
    transcriptSegments,
    questions
  };
}

function main() {
  const chapter = buildExamListeningChapter();
  const target = path.join(EXAM_DIR, 'exam-listening.json');
  fs.writeFileSync(target, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${chapter.questions.length} exam listening questions to ${path.relative(ROOT, target)}\n`);
}

if (require.main === module) main();

module.exports = { buildExamListeningChapter };
