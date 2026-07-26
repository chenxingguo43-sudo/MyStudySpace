const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapterPath = path.join(textbookRoot, 'ch0004.json');
const ledgerPath = path.join(theoryRoot, 'quality-reports', 'chapter-05-data-repair.json');

// PDF-127 / printed p.125, "Ключи к пятой главе". The values were copied
// from the rendered answer-key page, never inferred from the imported JSON.
const keyRows = [
  'Б Б Г Б В А Б А', 'В Г Б В Б В А Б', 'В В А А Г А Б Г',
  'Г В В Г В Г В Б', 'А В А В Б В В Г', 'Г А А А Б Б А Б',
  'Г А А Г В Б В А', 'Б А В В Г А Г В', 'Г Г В А Г Б А В',
  'Б А В Б Б В В Г', 'А Б Б А Г В Б В', 'А Г Б В А Б Б В',
  'А Б В Б Б Г Б А', 'А А Г Б Б А Б А', 'А Б А Б А А Б А',
  'Г В Г А В А Г А', 'Г Б В Б В Г А Б', 'Г А Г'
];
const answerKey = keyRows.flatMap(row => row.split(' '));

const questionPageRanges = [
  [1, 7, 72, 70], [8, 16, 73, 71], [17, 23, 74, 72],
  [24, 31, 75, 73], [32, 39, 76, 74], [40, 46, 77, 75],
  [47, 52, 78, 76], [53, 59, 79, 77], [60, 65, 80, 78],
  [66, 72, 81, 79], [73, 79, 82, 80], [80, 86, 83, 81],
  [87, 93, 84, 82], [94, 100, 85, 83], [101, 107, 86, 84],
  [108, 118, 87, 85], [119, 125, 88, 86], [126, 132, 89, 87],
  [133, 139, 90, 88]
];

function pageFor(number) {
  const range = questionPageRanges.find(([first, last]) => number >= first && number <= last);
  if (!range) throw new Error(`No source-page range for Chapter 5 exercise ${number}`);
  return { pdfPage: range[2], printedPage: range[3] };
}

function sourceEvidence(page) {
  return `PDF-${String(page.pdfPage).padStart(3, '0')} / printed page ${page.printedPage}; answer key PDF-127 / printed page 125`;
}

const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
if (chapter.exercises.length !== 139) throw new Error(`Expected 139 Chapter 5 exercises, found ${chapter.exercises.length}`);
if (answerKey.length !== chapter.exercises.length) throw new Error(`Expected 139 PDF answer-key values, found ${answerKey.length}`);

const priorLedger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : null;
const priorAnswerById = new Map((priorLedger?.answerCorrections || []).map(item => [item.exerciseId, item]));
const idsBefore = chapter.exercises.map(exercise => exercise.id);
const answerCorrections = [];
const questionPageCorrections = [];

for (const exercise of chapter.exercises) {
  const page = pageFor(exercise.printedNumber);
  const pdfAnswer = answerKey[exercise.printedNumber - 1];
  const previous = priorAnswerById.get(exercise.id);
  const imported = previous?.imported || { answer: exercise.answer, sourceAnswer: exercise.sourceAnswer };
  const priorQuestionPages = Array.isArray(exercise.questionPages) ? [...exercise.questionPages] : [];
  const priorAnswerPages = Array.isArray(exercise.answerPages) ? [...exercise.answerPages] : [];
  const priorEvidence = exercise.sourceEvidence || '';
  const repairedEvidence = sourceEvidence(page);

  if (exercise.answer !== pdfAnswer || exercise.sourceAnswer !== pdfAnswer || previous) {
    answerCorrections.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported,
      pdfOriginal: { answer: pdfAnswer, pdfPage: 127, printedPage: 125, heading: 'Ключи к пятой главе' },
      discrepancyType: 'answer-key-mismatch',
      repaired: { answer: pdfAnswer, sourceAnswer: pdfAnswer },
      sourcePages: { questionPdfPage: page.pdfPage, questionPrintedPage: page.printedPage, answerPdfPage: 127, answerPrintedPage: 125 },
      legacyRecordImpact: 'yes',
      compatibilityTreatment: 'Exercise ID is unchanged; retain answer, wrong-answer, favourite and progress records. Reconcile historical correctness only from this explicit ledger after the reader-integration gate is passed.',
      verification: 'answer and sourceAnswer equal the visually rendered PDF key, and the repaired answer is an existing option key.'
    });
  }

  if (priorQuestionPages.length !== 1 || priorQuestionPages[0] !== page.pdfPage || priorAnswerPages.length !== 1 || priorAnswerPages[0] !== 127 || priorEvidence !== repairedEvidence) {
    questionPageCorrections.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported: { questionPages: priorQuestionPages, answerPages: priorAnswerPages, sourceEvidence: priorEvidence },
      pdfOriginal: { questionPdfPage: page.pdfPage, questionPrintedPage: page.printedPage, answerPdfPage: 127, answerPrintedPage: 125 },
      discrepancyType: 'question-and-answer-source-page-metadata',
      repaired: { questionPages: [page.pdfPage], answerPages: [127], sourceEvidence: repairedEvidence },
      legacyRecordImpact: 'no',
      compatibilityTreatment: 'Metadata-only correction; exercise IDs and persisted learner records are unchanged.',
      verification: 'Rendered exercise page visually matches the stored stem and option set; PDF-127 supplies the answer key.'
    });
  }

  exercise.answer = pdfAnswer;
  exercise.sourceAnswer = pdfAnswer;
  exercise.questionPages = [page.pdfPage];
  exercise.answerPages = [127];
  exercise.sourceEvidence = repairedEvidence;
  exercise.reviewStatus = 'pdf-question-and-answer-checked';
}

const importedSourceQuestions = Array.isArray(priorLedger?.sourceMetadataCorrection?.imported?.questions)
  ? priorLedger.sourceMetadataCorrection.imported.questions
  : [...(chapter.sourcePages?.questions || [])];
chapter.sourcePages.questions = Array.from({ length: 19 }, (_, index) => index + 70);

if (idsBefore.join(',') !== chapter.exercises.map(exercise => exercise.id).join(',')) {
  throw new Error('Exercise IDs changed during Chapter 5 repair');
}
for (const exercise of chapter.exercises) {
  if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) {
    throw new Error(`Repaired answer contract failed for ${exercise.id}`);
  }
}

const ledger = {
  schemaVersion: 1,
  chapterId: 'gl5',
  status: 'review',
  auditScope: {
    questionPages: { pdfPages: [72, 90], printedPages: [70, 88] },
    answerKey: { pdfPage: 127, printedPage: 125, heading: 'Ключи к пятой главе' },
    method: 'PDF-072–090 question pages and PDF-127 were rendered and visually checked against the original book. Imported JSON was not used to infer any source answer.'
  },
  answerCorrections,
  questionPageCorrections,
  questionAndOptionAudit: {
    checkedExerciseIds: chapter.exercises.map(exercise => exercise.id),
    questionOrOptionMismatches: [],
    verification: 'All 139 question stems and option sets were compared with rendered PDF-072–090; no question-text or option-set repair was required.'
  },
  sourceMetadataCorrection: {
    discrepancyType: 'chapter-question-page-range-and-answer-page-metadata',
    imported: { questions: importedSourceQuestions },
    pdfOriginal: { questions: Array.from({ length: 19 }, (_, index) => index + 70), evidence: 'Chapter 5 exercises run from PDF-072 / printed p.70 through PDF-090 / printed p.88.' },
    repaired: { questions: chapter.sourcePages.questions },
    sourcePages: { pdfPages: [72, 90], printedPages: [70, 88] },
    legacyRecordImpact: 'no',
    compatibilityTreatment: 'Metadata-only correction; exercise IDs and persisted learner records are unchanged.',
    verification: 'Every GL5 question now has its exact rendered PDF page and PDF-127 as its sole answer-key page.'
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
    'PDF source pages remain REVIEW at project level; this audit verifies Chapter 5 question wording, option sets, answer-key values and source-page metadata only.',
    'Historical localStorage correctness must not be recalculated until reader.html integration is permitted by the full-project gates.'
  ]
};

fs.writeFileSync(chapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ repairedAnswers: answerCorrections.length, questionPageCorrections: questionPageCorrections.length, questionPages: chapter.sourcePages.questions, ledgerPath }, null, 2));
