const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapterPath = path.join(textbookRoot, 'ch0003.json');
const ledgerPath = path.join(theoryRoot, 'quality-reports', 'chapter-04-data-repair.json');

// PDF-126 / printed p.124, "Ключи к четвёртой главе". These values were
// transcribed from the rendered source page, not inferred from the import.
const keyRows = [
  'А Б А Г Б В А Б', 'А А В Б А В Б Б', 'А В Б Б В Б А В',
  'Б В Б Б Г Г А В', 'А Б В А Г В Б А', 'В В Б А Б Б А А',
  'Б Б В В А Г В В', 'Б В Б Г А Б В В', 'А А Б Г В Г А В',
  'Б Г Б В В А Б Г'
];
const closedAnswerKey = new Map();
keyRows.flatMap(row => row.split(' ')).forEach((answer, index) => closedAnswerKey.set(index + 1, answer));
['Г', 'Б', 'А', 'А', 'Б', 'Г', 'Б', 'В', 'Г', 'Б', 'Г', 'А', 'В', 'В', 'А', 'Г']
  .forEach((answer, index) => closedAnswerKey.set(index + 87, answer));

const questionPageRanges = [
  [1, 4, 57, 55], [5, 12, 58, 56], [13, 18, 59, 57],
  [19, 24, 60, 58], [25, 30, 61, 59], [31, 37, 62, 60],
  [38, 46, 63, 61], [47, 55, 64, 62], [56, 61, 65, 63],
  [62, 68, 66, 64], [69, 75, 67, 65], [76, 80, 68, 66],
  [81, 89, 69, 67], [90, 96, 70, 68], [97, 102, 71, 69]
];

const transformedAnswerKeys = {
  81: 'Эксперты ООН во «Всемирном докладе по проблемам молодёжи» утверждают, что нынешнее молодое поколение является самым образованным в истории человечества.',
  82: 'Французский писатель Александр Дюма в книге «От Парижа до Астрахани» писал, что Россия имеет Волгу — самую большую реку в Европе, царицу рек.',
  83: 'Русский художник И.К. Айвазовский, рисовавший море всю свою жизнь, говорил, что проживи он ещё триста лет, всегда бы нашёл в море нечто новое.',
  84: 'Руководитель фольклорной практики сказал студентам, чтобы они записали текст казачьей свадебной песни.',
  85: 'Я поинтересовался у своего друга-путешественника, видел ли он водопад Виктория, когда был в Африке.',
  86: 'В новогоднюю ночь он сказал ей, как замечательно то, что она есть и что всё у них ещё впереди.'
};

function pageFor(number) {
  const range = questionPageRanges.find(([first, last]) => number >= first && number <= last);
  if (!range) throw new Error(`No PDF source-page range for Chapter 4 exercise ${number}`);
  return { pdfPage: range[2], printedPage: range[3] };
}

function evidence(page, openResponse) {
  const key = 'PDF-126 / printed page 124';
  return `PDF-${String(page.pdfPage).padStart(3, '0')} / printed page ${page.printedPage}; ${openResponse ? 'transformed response in answer key' : 'answer key'} ${key}`;
}

const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
if (chapter.exercises.length !== 102) throw new Error(`Expected 102 Chapter 4 exercises, found ${chapter.exercises.length}`);

const priorLedger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : null;
const priorAnswerById = new Map((priorLedger?.answerCorrections || []).map(item => [item.exerciseId, item]));
const idsBefore = chapter.exercises.map(exercise => exercise.id);
const answerCorrections = [];
const questionPageCorrections = [];
const transformedKeyVerifications = [];

for (const exercise of chapter.exercises) {
  const page = pageFor(exercise.printedNumber);
  const isOpenResponse = exercise.type === 'open-response';
  const priorQuestionPages = Array.isArray(exercise.questionPages) ? [...exercise.questionPages] : [];
  const priorEvidence = exercise.sourceEvidence || '';
  const nextEvidence = evidence(page, isOpenResponse);

  if (isOpenResponse) {
    if (!transformedAnswerKeys[exercise.printedNumber]) throw new Error(`Missing transformed key for ${exercise.id}`);
    if (exercise.answer !== '' || exercise.sourceAnswer !== '' || (exercise.options || []).length !== 0) {
      throw new Error(`${exercise.id} must retain its existing open-response answer contract`);
    }
    transformedKeyVerifications.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported: { answer: exercise.answer, sourceAnswer: exercise.sourceAnswer, type: exercise.type },
      pdfOriginal: { transformedAnswer: transformedAnswerKeys[exercise.printedNumber], pdfPage: 126, printedPage: 124, heading: 'Ключи к четвёртой главе' },
      compatibilityTreatment: 'Retain the empty open-response answer/sourceAnswer contract: the reader does not automatically grade a free transformation. The original-book model answer is recorded only in this audit ledger.',
      verification: 'Rendered exercise PDF-069 and PDF-126 model transformation were visually checked.'
    });
  } else {
    const pdfAnswer = closedAnswerKey.get(exercise.printedNumber);
    if (!pdfAnswer) throw new Error(`Missing closed-answer PDF key for ${exercise.id}`);
    const prior = priorAnswerById.get(exercise.id);
    const imported = prior?.imported || { answer: exercise.answer, sourceAnswer: exercise.sourceAnswer };
    if (exercise.answer !== pdfAnswer || exercise.sourceAnswer !== pdfAnswer || prior) {
      answerCorrections.push({
        exerciseId: exercise.id,
        printedNumber: exercise.printedNumber,
        imported,
        pdfOriginal: { answer: pdfAnswer, pdfPage: 126, printedPage: 124, heading: 'Ключи к четвёртой главе' },
        discrepancyType: 'answer-key-mismatch',
        repaired: { answer: pdfAnswer, sourceAnswer: pdfAnswer },
        sourcePages: { questionPdfPage: page.pdfPage, questionPrintedPage: page.printedPage, answerPdfPage: 126, answerPrintedPage: 124 },
        legacyRecordImpact: 'yes',
        compatibilityTreatment: 'Exercise ID is unchanged; preserve answer, wrong-answer, favourite and progress records. Reconcile historical correctness only from this ledger after every reader integration gate is passed.',
        verification: 'answer and sourceAnswer equal the rendered PDF key, and the corrected answer remains an existing option key.'
      });
    }
    exercise.answer = pdfAnswer;
    exercise.sourceAnswer = pdfAnswer;
  }

  if (priorQuestionPages.length !== 1 || priorQuestionPages[0] !== page.pdfPage || priorEvidence !== nextEvidence) {
    questionPageCorrections.push({
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      imported: { questionPages: priorQuestionPages, sourceEvidence: priorEvidence, answerPages: Array.isArray(exercise.answerPages) ? [...exercise.answerPages] : [] },
      pdfOriginal: { questionPdfPage: page.pdfPage, questionPrintedPage: page.printedPage, answerPdfPage: 126, answerPrintedPage: 124 },
      discrepancyType: 'question-source-page-metadata',
      repaired: { questionPages: [page.pdfPage], sourceEvidence: nextEvidence, answerPages: [126] },
      legacyRecordImpact: 'no',
      compatibilityTreatment: 'Metadata-only correction; exercise IDs, free-response contract and persisted learner records are unchanged.',
      verification: 'Rendered question page visually matches the stored question text and option set; PDF-126 provides the applicable key or model transformation.'
    });
  }

  exercise.questionPages = [page.pdfPage];
  exercise.answerPages = [126];
  exercise.sourceEvidence = nextEvidence;
  exercise.reviewStatus = 'pdf-question-and-answer-checked';
}

const importedSourceQuestions = Array.isArray(priorLedger?.sourceMetadataCorrection?.imported?.questions)
  ? priorLedger.sourceMetadataCorrection.imported.questions
  : [...chapter.sourcePages.questions];
chapter.sourcePages.questions = Array.from({ length: 15 }, (_, index) => index + 55);

if (idsBefore.join(',') !== chapter.exercises.map(exercise => exercise.id).join(',')) {
  throw new Error('Exercise IDs changed during Chapter 4 repair');
}
for (const exercise of chapter.exercises) {
  if (exercise.type === 'open-response') {
    if (exercise.answer !== '' || exercise.sourceAnswer !== '') throw new Error(`Open-response contract failed for ${exercise.id}`);
  } else if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) {
    throw new Error(`Repaired answer contract failed for ${exercise.id}`);
  }
}

const ledger = {
  schemaVersion: 1,
  chapterId: 'gl4',
  status: 'review',
  auditScope: {
    questionPages: { pdfPages: [57, 71], printedPages: [55, 69] },
    answerKey: { pdfPage: 126, printedPage: 124, heading: 'Ключи к четвёртой главе' },
    method: 'PDF-057–071 question pages and PDF-126 were rendered and visually checked against the original book. Imported JSON was never used to infer a missing source answer.'
  },
  answerCorrections,
  questionPageCorrections,
  transformedKeyVerifications,
  questionAndOptionAudit: {
    checkedExerciseIds: chapter.exercises.map(exercise => exercise.id),
    questionOrOptionMismatches: [],
    verification: 'All 102 question stems and option sets were compared with rendered PDF-057–071; no question-text or option-set repair was required.'
  },
  sourceMetadataCorrection: {
    discrepancyType: 'chapter-question-page-range-incomplete-and-shifted',
    imported: { questions: importedSourceQuestions },
    pdfOriginal: { questions: Array.from({ length: 15 }, (_, index) => index + 55), evidence: 'The Chapter 4 exercises begin at PDF-057 / printed p.55 and end at PDF-071 / printed p.69.' },
    repaired: { questions: chapter.sourcePages.questions },
    sourcePages: { pdfPages: [57, 71], printedPages: [55, 69] },
    legacyRecordImpact: 'no',
    compatibilityTreatment: 'Metadata-only correction; exercise IDs and persisted learner records are unchanged.',
    verification: 'Every GL4 question receives the exact rendered PDF page; GL4-Q097–Q102 retain PDF-071 / printed p.69.'
  },
  summary: {
    exerciseCount: chapter.exercises.length,
    answerKeyMismatches: answerCorrections.length,
    transformedOpenResponsesVerified: transformedKeyVerifications.length,
    questionOrOptionMismatches: 0,
    questionPageMetadataCorrections: questionPageCorrections.length,
    sourceMetadataMismatches: 1,
    idsPreserved: true,
    answerContractsVerified: true
  },
  knownRisks: [
    'PDF source pages remain REVIEW at project level; this audit verifies Chapter 4 question wording, option sets, answer-key values, model transformations and page metadata only.',
    'GL4-Q081–Q086 are open-response transformations. Their original-book model answers are retained in this ledger while the existing empty answer contract remains intact.',
    'Historical localStorage correctness must not be recalculated until reader.html integration is permitted by the full-project gates.'
  ]
};

fs.writeFileSync(chapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ repairedAnswers: answerCorrections.length, transformedOpenResponsesVerified: transformedKeyVerifications.length, questionPageCorrections: questionPageCorrections.length, questionPages: chapter.sourcePages.questions, ledgerPath }, null, 2));
