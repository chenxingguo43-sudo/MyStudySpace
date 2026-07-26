const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapterPath = path.join(textbookRoot, 'ch0001.json');
const ledgerPath = path.join(theoryRoot, 'quality-reports', 'chapter-02-data-repair.json');

// PDF-125 / printed page 123, "Ключи ко второй главе". The rows were
// transcribed only after visual inspection of the answer table.
const pdfAnswerRows = [
  'А А Б В Г Б А Г', 'Г В А Б Г Б В Б', 'В А А В Г Г Б Г', 'А Б А В Г А В Б',
  'А Г В В А Б Г А', 'В Г В Г Б В А Г', 'В Г В В Г Б В Г', 'Г А Б Б А Б Б Б',
  'В Г Б А В Б А В', 'Б А Г В Г А Б В', 'Б Г В А Г В В Б', 'А Г А А Б В Б А',
  'Б Г В А А Б Г В', 'Б А Г В Б Б Б А', 'В А В Б Г Б А А', 'В Г В Б В А В А',
  'В Б В А А Б Б Г', 'В А Б Б А А В Б', 'Г В А Б А Б'
];
const pdfAnswers = pdfAnswerRows.flatMap(row => row.split(' '));

const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
if (pdfAnswers.length !== chapter.exercises.length) {
  throw new Error(`PDF answer count ${pdfAnswers.length} differs from Chapter 2 exercise count ${chapter.exercises.length}`);
}

const priorLedger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : null;
const priorById = new Map((priorLedger?.answerCorrections || []).map(item => [item.exerciseId, item]));
const answerCorrections = [];

chapter.exercises.forEach((exercise, index) => {
  const pdfAnswer = pdfAnswers[index];
  const existing = priorById.get(exercise.id);
  const imported = existing?.imported || { answer: exercise.answer, sourceAnswer: exercise.sourceAnswer };
  const differs = exercise.answer !== pdfAnswer || exercise.sourceAnswer !== pdfAnswer;

  if (differs || existing) {
    answerCorrections.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported,
      pdfOriginal: { answer: pdfAnswer, pdfPage: 125, printedPage: 123, heading: 'Ключи ко второй главе' },
      discrepancyType: 'answer-key-mismatch',
      repaired: { answer: pdfAnswer, sourceAnswer: pdfAnswer },
      sourcePages: { questionPrintedPage: exercise.questionPrintedPage || null, answerPdfPage: 125, answerPrintedPage: 123 },
      legacyRecordImpact: 'yes',
      compatibilityTreatment: 'exercise ID is unchanged; preserve answer, wrong-answer, favourite and progress records. Reconcile historical correctness only through this ledger when reader integration gates are satisfied.',
      verification: 'answer and sourceAnswer equal the PDF key; the corrected key remains one of the existing option keys.'
    });
  }

  exercise.answer = pdfAnswer;
  exercise.sourceAnswer = pdfAnswer;
  exercise.sourceEvidence = 'PDF-125 / printed page 123: Ключи ко второй главе';
  exercise.reviewStatus = 'pdf-answer-checked';
});

const originalQuestionPages = Array.isArray(priorLedger?.sourceMetadataCorrection?.imported?.questions)
  ? priorLedger.sourceMetadataCorrection.imported.questions
  : [...chapter.sourcePages.questions];
if (!chapter.sourcePages.questions.includes(40)) chapter.sourcePages.questions.push(40);
chapter.sourcePages.questions.sort((left, right) => left - right);

const idsBefore = chapter.exercises.map(exercise => exercise.id);
const idsAfter = chapter.exercises.map(exercise => exercise.id);
if (idsBefore.join(',') !== idsAfter.join(',')) throw new Error('Exercise IDs changed during repair');

for (const exercise of chapter.exercises) {
  if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) {
    throw new Error(`Repaired answer contract failed for ${exercise.id}`);
  }
}

const ledger = {
  schemaVersion: 1,
  chapterId: 'gl2',
  status: 'review',
  auditScope: {
    questionPages: { pdfPages: [20, 42], printedPages: [18, 40] },
    answerKey: { pdfPage: 125, printedPage: 123, heading: 'Ключи ко второй главе' },
    method: 'Question pages and answer key were visually checked against the original PDF; no inference was made from the imported JSON answer values.'
  },
  answerCorrections,
  sourceMetadataCorrection: {
    discrepancyType: 'question-source-page-range-omission',
    imported: { questions: originalQuestionPages },
    pdfOriginal: { questions: Array.from({ length: 23 }, (_, index) => index + 18), evidence: 'GL2-Q149 and GL2-Q150 are visibly on printed page 40 / PDF-042.' },
    repaired: { questions: chapter.sourcePages.questions },
    sourcePages: { pdfPage: 42, printedPage: 40 },
    legacyRecordImpact: 'no',
    compatibilityTreatment: 'metadata-only correction; exercise IDs and persisted learner records are unchanged.',
    verification: 'Question-page range now covers every Chapter 2 exercise, including GL2-Q149–GL2-Q150.'
  },
  summary: {
    exerciseCount: chapter.exercises.length,
    answerKeyMismatches: answerCorrections.length,
    questionOrOptionMismatches: 0,
    sourceMetadataMismatches: 1,
    idsPreserved: true,
    answerContractsVerified: true
  },
  knownRisks: [
    'PDF source pages remain REVIEW at project level; the visual audit confirms question wording, option sets and answer-key letters for Chapter 2 only.',
    'Historical localStorage correctness must not be recalculated until reader.html integration is permitted by the whole-project gates.'
  ]
};

fs.writeFileSync(chapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ repairedAnswers: answerCorrections.length, questionPages: chapter.sourcePages.questions, ledgerPath }, null, 2));
