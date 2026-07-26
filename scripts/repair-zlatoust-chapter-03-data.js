const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapterPath = path.join(textbookRoot, 'ch0002.json');
const ledgerPath = path.join(theoryRoot, 'quality-reports', 'chapter-03-data-repair.json');

// PDF-126 / printed page 124, "Ключи к третьей главе". These rows were
// transcribed from the rendered original page, never inferred from JSON data.
const pdfAnswerRows = [
  'А Г Б В Г Б В Г', 'Б А В Б А В А Г', 'В Б А А Г В А А',
  'Б А Г В А В А Б', 'А В Г Б В Г А Б', 'Г Б А В Б Б Б В',
  'В Г Б Б Б В Б Г', 'В Б Б В А Г А А', 'А Б Г А А Б А Б',
  'А Б Б А Б Б Б А', 'Б А Б Б Б В А Б', 'Г Б А А Б В Г В', 'Б А В'
];
const pdfAnswers = pdfAnswerRows.flatMap(row => row.split(' '));

const questionPageRanges = [
  [1, 3, 42, 40], [4, 10, 43, 41], [11, 16, 44, 42],
  [17, 24, 45, 43], [25, 31, 46, 44], [32, 36, 47, 45],
  [37, 43, 48, 46], [44, 49, 49, 47], [50, 56, 50, 48],
  [57, 63, 51, 49], [64, 69, 52, 50], [70, 77, 53, 51],
  [78, 85, 54, 52], [86, 91, 55, 53], [92, 98, 56, 54], [99, 99, 57, 55]
];

function sourcePageFor(number) {
  const range = questionPageRanges.find(([first, last]) => number >= first && number <= last);
  if (!range) throw new Error(`No source-page range for Chapter 3 exercise ${number}`);
  return { pdfPage: range[2], printedPage: range[3] };
}

const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
if (pdfAnswers.length !== chapter.exercises.length) {
  throw new Error(`PDF answer count ${pdfAnswers.length} differs from Chapter 3 exercise count ${chapter.exercises.length}`);
}

const priorLedger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : null;
const priorById = new Map((priorLedger?.answerCorrections || []).map(item => [item.exerciseId, item]));
const answerCorrections = [];
const questionPageCorrections = [];
const idsBefore = chapter.exercises.map(exercise => exercise.id);

chapter.exercises.forEach((exercise, index) => {
  const pdfAnswer = pdfAnswers[index];
  const page = sourcePageFor(exercise.printedNumber);
  const priorAnswer = priorById.get(exercise.id);
  const imported = priorAnswer?.imported || { answer: exercise.answer, sourceAnswer: exercise.sourceAnswer };
  const priorQuestionPages = Array.isArray(exercise.questionPages) ? [...exercise.questionPages] : [];
  const priorEvidence = exercise.sourceEvidence || '';
  const differs = exercise.answer !== pdfAnswer || exercise.sourceAnswer !== pdfAnswer;
  const pageDiffers = priorQuestionPages.length !== 1 || priorQuestionPages[0] !== page.pdfPage;

  if (differs || priorAnswer) {
    answerCorrections.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported,
      pdfOriginal: { answer: pdfAnswer, pdfPage: 126, printedPage: 124, heading: 'Ключи к третьей главе' },
      discrepancyType: 'answer-key-mismatch',
      repaired: { answer: pdfAnswer, sourceAnswer: pdfAnswer },
      sourcePages: { questionPdfPage: page.pdfPage, questionPrintedPage: page.printedPage, answerPdfPage: 126, answerPrintedPage: 124 },
      legacyRecordImpact: 'yes',
      compatibilityTreatment: 'Exercise ID is unchanged; preserve answer, wrong-answer, favourite and progress records. Reconcile historical correctness only through this ledger when reader integration gates are satisfied.',
      verification: 'answer and sourceAnswer equal the PDF key; the corrected answer remains one of the existing option keys.'
    });
  }

  if (pageDiffers || !priorEvidence.includes(`PDF-${String(page.pdfPage).padStart(3, '0')}`)) {
    questionPageCorrections.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported: { questionPages: priorQuestionPages, sourceEvidence: priorEvidence },
      pdfOriginal: { questionPdfPage: page.pdfPage, questionPrintedPage: page.printedPage },
      discrepancyType: 'question-source-page-metadata',
      repaired: { questionPages: [page.pdfPage], sourceEvidence: `PDF-${String(page.pdfPage).padStart(3, '0')} / printed page ${page.printedPage}; answer key PDF-126 / printed page 124` },
      legacyRecordImpact: 'no',
      compatibilityTreatment: 'Metadata-only correction; exercise IDs and persisted learner records are unchanged.',
      verification: 'Rendered page visually matches the stored question text and option set.'
    });
  }

  exercise.answer = pdfAnswer;
  exercise.sourceAnswer = pdfAnswer;
  exercise.questionPages = [page.pdfPage];
  exercise.sourceEvidence = `PDF-${String(page.pdfPage).padStart(3, '0')} / printed page ${page.printedPage}; answer key PDF-126 / printed page 124`;
  exercise.answerPages = [126];
  exercise.reviewStatus = 'pdf-question-and-answer-checked';
});

const originalQuestionPages = Array.isArray(priorLedger?.sourceMetadataCorrection?.imported?.questions)
  ? priorLedger.sourceMetadataCorrection.imported.questions
  : [...chapter.sourcePages.questions];
chapter.sourcePages.questions = Array.from({ length: 16 }, (_, index) => index + 40);

if (idsBefore.join(',') !== chapter.exercises.map(exercise => exercise.id).join(',')) {
  throw new Error('Exercise IDs changed during Chapter 3 repair');
}
for (const exercise of chapter.exercises) {
  if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) {
    throw new Error(`Repaired answer contract failed for ${exercise.id}`);
  }
}

const ledger = {
  schemaVersion: 1,
  chapterId: 'gl3',
  status: 'review',
  auditScope: {
    questionPages: { pdfPages: [42, 57], printedPages: [40, 55] },
    answerKey: { pdfPage: 126, printedPage: 124, heading: 'Ключи к третьей главе' },
    method: 'PDF-042–057 question pages and the PDF-126 answer table were visually checked against the original PDF; answer values were not inferred from imported JSON.'
  },
  answerCorrections,
  questionPageCorrections,
  sourceMetadataCorrection: {
    discrepancyType: 'chapter-question-page-range-omission',
    imported: { questions: originalQuestionPages },
    pdfOriginal: { questions: Array.from({ length: 16 }, (_, index) => index + 40), evidence: 'GL3-Q099 appears on printed page 55 / PDF-057 before Chapter 4 begins.' },
    repaired: { questions: chapter.sourcePages.questions },
    sourcePages: { pdfPage: 57, printedPage: 55 },
    legacyRecordImpact: 'no',
    compatibilityTreatment: 'Metadata-only correction; exercise IDs and persisted learner records are unchanged.',
    verification: 'The question-page range covers every Chapter 3 exercise, including GL3-Q099.'
  },
  summary: {
    exerciseCount: chapter.exercises.length,
    answerKeyMismatches: answerCorrections.length,
    questionOrOptionMismatches: 0,
    questionPageMetadataCorrections: questionPageCorrections.length,
    sourceMetadataMismatches: 1,
    idsPreserved: true,
    answerContractsVerified: true
  },
  knownRisks: [
    'PDF source pages remain REVIEW at project level; this audit confirms Chapter 3 question wording, option sets, answer-key letters and page metadata only.',
    'Historical localStorage correctness must not be recalculated until reader.html integration is permitted by the whole-project gates.'
  ]
};

fs.writeFileSync(chapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ repairedAnswers: answerCorrections.length, questionPageCorrections: questionPageCorrections.length, questionPages: chapter.sourcePages.questions, ledgerPath }, null, 2));
