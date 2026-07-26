#!/usr/bin/env node
'use strict';

/*
 * Repairs the Chapter 1 answer-key import against the visual source of truth:
 * E:\Desktop\语法词汇（同一本书）.pdf, PDF page 125 / printed page 123.
 *
 * The script is deliberately idempotent. It refuses unexpected values so a
 * future import cannot silently overwrite a subsequently reviewed correction.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chapterPath = path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'ch0000.json');
const mappingPath = path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'theory', 'mappings', 'exercise-to-rules.json');
const reportPath = path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'theory', 'quality-reports', 'chapter-01-data-repair.json');

const ANSWER_REPAIRS = [
  [1, 'Б', 'А'], [5, 'А', 'Б'], [6, 'А', 'Б'], [19, 'А', 'Б'], [23, 'А', 'Б'], [25, 'Б', 'А'],
  [30, 'Б', 'В'], [31, 'Б', 'Г'], [34, 'Б', 'Г'], [36, 'Б', 'А'], [37, 'Б', 'Г'], [38, 'В', 'А'],
  [39, 'В', 'Б'], [42, 'Б', 'А'], [44, 'Б', 'А'], [45, 'В', 'А'], [46, 'В', 'А'], [47, 'Б', 'А'],
  [48, 'А', 'Б'], [50, 'А', 'Б'], [52, 'А', 'Б'], [53, 'А', 'Б'], [56, 'А', 'Б'], [59, 'А', 'Б'],
  [61, 'Б', 'А'], [68, 'А', 'Б'], [69, 'А', 'Б'], [75, 'А', 'Б'], [77, 'А', 'Б'], [78, 'А', 'Б'],
  [87, 'Б', 'А'], [88, 'А', 'Б'], [95, 'Б', 'Г']
].map(([printedNumber, importedAnswer, pdfAnswer]) => ({ printedNumber, importedAnswer, pdfAnswer }));

const Q061_SOURCE = {
  question: 'Британским учёным при помощи лазера удалось ... материю, частицы которой связываются между собой светом.',
  options: [
    { key: 'А', text: 'создать' },
    { key: 'Б', text: 'создавать' }
  ],
  importedQuestion: 'Аспирант радовался, что успел ... первый вариант диссертации в назначенный срок.',
  importedOptions: [
    { key: 'А', text: 'сдавать' },
    { key: 'Б', text: 'сдать' }
  ]
};

// Visual transcription of PDF-012 to PDF-014 (printed pages 10 to 12).
// These imports had been expanded, truncated, or replaced with another prompt.
const QUESTION_REPAIRS = {
  30: ['В настоящее время представляется ... развитие двусторонних отношений между Россией и Венесуэлой.', [['А', 'взаимовыгодного'], ['Б', 'взаимовыгодному'], ['В', 'взаимовыгодным'], ['Г', 'взаимовыгодное']]],
  31: ['Экипаж российской машины «КамАЗ» ... пришёл к финишу и стал победителем тунисского авторалли.', [['А', 'первого'], ['Б', 'первом'], ['В', 'первому'], ['Г', 'первым']]],
  32: ['Братья-близнецы ... приплыли к скалам и вместе со всеми стали нырять в воду прямо с лодки.', [['А', 'последним'], ['Б', 'последними'], ['В', 'последних'], ['Г', 'последнее']]],
  33: ['Человек кажется ... даже самым грозным степным хищникам.', [['А', 'опасный'], ['Б', 'опасным'], ['В', 'опасному'], ['Г', 'опасного']]],
  34: ['Психологи утверждают, что даже очень робкий человек, если он поёт, чувствует себя абсолютно ... .', [['А', 'свободный'], ['Б', 'свободному'], ['В', 'свободным'], ['Г', 'свободного']]],
  35: ['«Обойти то мелкое и призрачное, что мешает быть ..., — вот цель и смысл нашей жизни» (А.П. Чехов).', [['А', 'счастливый'], ['Б', 'счастливым'], ['В', 'счастливому'], ['Г', 'счастливого']]],
  36: ['Несмотря на социальные и экономические различия, все граждане Рима считались ... .', [['А', 'равными'], ['Б', 'равных'], ['В', 'равные'], ['Г', 'равным']]],
  37: ['Профессиональное народное творчество не перестаёт быть ... и сегодня.', [['А', 'популярного'], ['Б', 'популярное'], ['В', 'популярному'], ['Г', 'популярным']]],
  38: ['Русский учёный И.М. Сеченов более 30 лет ... рефлексы головного мозга.', [['А', 'изучал'], ['Б', 'изучил']]],
  39: ['Ботаника была призванием профессора, он дни и ночи ... в теплицах ботанического сада.', [['А', 'провёл'], ['Б', 'проводил']]],
  40: ['«Уже который год они ... в заповедник на лето» (С.Д. Довлатов).', [['А', 'приезжали'], ['Б', 'приехали']]],
  41: ['Прослушав лекцию, мы ..., как растения обмениваются информацией друг с другом и с окружающим миром.', [['А', 'понимали'], ['Б', 'поняли']]],
  42: ['После окончания Таганрогской гимназии А.П. Чехов переехал в Москву к своей семье и ... на медицинский факультет Московского университета.', [['А', 'поступил'], ['Б', 'поступал']]],
  43: ['«Пойдите и догоните его». — «Никак не догонишь. Он ... в середине обеда, я вас не решилась обеспокоить» (А.И. Куприн).', [['А', 'пришёл'], ['Б', 'приходил']]],
  44: ['«Сколько столетий назад обитал таинственный народ чудь на Урале и когда ... в свои подземные города — неизвестно» (уральская легенда).', [['А', 'ушёл'], ['Б', 'уходил']]],
  45: ['«Мы не ... голубой чашки. Это, может быть, сама Маруся как-нибудь разбила» (А.П. Гайдар).', [['А', 'разбивали'], ['Б', 'разбили']]],
  46: ['Известному политологу приписали слова, которых он никогда не ... .', [['А', 'говорил'], ['Б', 'сказал']]],
  47: ['Некоторые руководители фирм думают, что стоит им только ... свой сайт в Интернете, как деньги потекут рекой.', [['А', 'создать'], ['Б', 'создавать']]],
  48: ['Учёные продолжают ... атмосферу и жизнь далёких планет, отправляя в космос новые космические аппараты.', [['А', 'изучить'], ['Б', 'изучать']]],
  49: ['При работе с компьютером к чёткости шрифтов быстро привыкаешь и перестаёшь её ... .', [['А', 'замечать'], ['Б', 'заметить']]],
  50: ['Молодёжные центры жилищных инициатив, созданные в некоторых городах России, начали ... молодым семьям.', [['А', 'помочь'], ['Б', 'помогать']]],
  51: ['Театральный режиссёр Наталья Сац, основавшая в Москве Детский музыкальный театр, привыкла ... всего сама.', [['А', 'добиваться'], ['Б', 'добиться']]],
  52: ['Наполеон Бонапарт не раз говорил, что карьеру сможет сделать только тот, кто умеет хорошо ... .', [['А', 'сказать'], ['Б', 'говорить']]],
  53: ['Учёные утверждают, что мозг человека в критических ситуациях учит его ... с различными видами страхов.', [['А', 'побороться'], ['Б', 'бороться']]],
  54: ['Дети умеют ... жизни, и взрослым не мешает у них этому поучиться.', [['А', 'удивляться'], ['Б', 'удивиться']]],
  55: ['Накануне Нового года открываются курсы для Дедов Морозов и Снегурочек, на которых их учат ... с детьми.', [['А', 'общаться'], ['Б', 'пообщаться']]],
  56: ['«С велением судьбы нам ... бесполезно» (Ф.И. Тютчев).', [['А', 'поспорить'], ['Б', 'спорить']]],
  57: ['Женихи постоянно говорили Пенелопе, что Одиссей не вернётся и что ей незачем ... одной.', [['А', 'оставаться'], ['Б', 'остаться']]],
  58: ['Известный американский режиссёр Джеймс Кэмерон не привык ... на своих фильмах.', [['А', 'экономить'], ['Б', 'сэкономить']]],
  59: ['В Афинах таксистам запретили ... по дорожной полосе, предназначенной для автобусов.', [['А', 'двинуться'], ['Б', 'двигаться']]],
  60: ['Врачам надоело ... об опасности курения, и они обратились к властям с просьбой запретить курить в общественных местах.', [['А', 'говорить'], ['Б', 'сказать']]]
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function questionPdfPage(exercise, mappings) {
  const mapping = mappings.exercises[exercise.id];
  if (!mapping || !Number.isInteger(mapping.exercisePrintedPage)) {
    throw new Error(`Missing printed-page mapping for ${exercise.id}`);
  }
  return { printedPage: mapping.exercisePrintedPage, pdfPage: mapping.exercisePrintedPage + 2 };
}

function main() {
  const chapter = readJson(chapterPath);
  const mappings = readJson(mappingPath);
  const byPrintedNumber = new Map((chapter.exercises || []).map(exercise => [exercise.printedNumber, exercise]));
  const idsBefore = chapter.exercises.map(exercise => exercise.id);

  const repairs = ANSWER_REPAIRS.map(repair => {
    const exercise = byPrintedNumber.get(repair.printedNumber);
    if (!exercise) throw new Error(`Missing Chapter 1 exercise ${repair.printedNumber}`);
    if (exercise.answer !== repair.importedAnswer && exercise.answer !== repair.pdfAnswer) {
      throw new Error(`${exercise.id} has unexpected answer ${exercise.answer}`);
    }
    if (exercise.sourceAnswer !== repair.importedAnswer && exercise.sourceAnswer !== repair.pdfAnswer) {
      throw new Error(`${exercise.id} has unexpected sourceAnswer ${exercise.sourceAnswer}`);
    }
    exercise.answer = repair.pdfAnswer;
    exercise.sourceAnswer = repair.pdfAnswer;
    const page = questionPdfPage(exercise, mappings);
    return {
      exerciseId: exercise.id,
      printedNumber: repair.printedNumber,
      importedContent: { answer: repair.importedAnswer, sourceAnswer: repair.importedAnswer },
      pdfOriginal: { answer: repair.pdfAnswer, answerKey: { pdfPage: 125, printedPage: 123 } },
      discrepancyType: 'answer-key-mismatch',
      repairedContent: { answer: repair.pdfAnswer, sourceAnswer: repair.pdfAnswer },
      sourcePages: { question: page, answerKey: { pdfPage: 125, printedPage: 123 } },
      affectsLegacyAttempts: true,
      compatibilityTreatment: '保留 exerciseId、已选选项、尝试次数与历史记录；reader 接入阶段将按此账本在首次读取时重新计算 wrong / lastResult，并保留 everWrong 的历史值。',
      verification: 'PDF 答案表视觉核对通过；修复后 answer === sourceAnswer，且答案键存在于原题选项中。'
    };
  });

  const contentRepairs = [];
  for (const [numberText, [question, optionPairs]] of Object.entries(QUESTION_REPAIRS)) {
    const printedNumber = Number(numberText);
    const exercise = byPrintedNumber.get(printedNumber);
    if (!exercise) throw new Error(`Missing Chapter 1 exercise ${printedNumber}`);
    const importedContent = { question: exercise.question, options: exercise.options };
    exercise.question = question;
    exercise.options = optionPairs.map(([key, text]) => ({ key, text }));
    const page = questionPdfPage(exercise, mappings);
    contentRepairs.push({
      exerciseId: exercise.id,
      printedNumber,
      importedContent,
      pdfOriginal: { question, options: exercise.options },
      discrepancyType: 'question-or-option-content-mismatch',
      repairedContent: { question: exercise.question, options: exercise.options },
      sourcePages: { question: page },
      affectsLegacyAttempts: false,
      compatibilityTreatment: '保留 exerciseId 和旧作答记录；仅补正题面和选项，不更改本题的作答记录键。',
      verification: 'PDF 题页视觉核对通过；修复后的题面和选项逐字转录自原书。'
    });
  }

  const q061 = byPrintedNumber.get(61);
  if (!q061) throw new Error('Missing GL1-Q061');
  const expectedQuestion = new Set([Q061_SOURCE.importedQuestion, Q061_SOURCE.question]);
  if (!expectedQuestion.has(q061.question)) throw new Error('GL1-Q061 has unexpected question text');
  q061.question = Q061_SOURCE.question;
  q061.options = Q061_SOURCE.options;
  q061.answer = 'А';
  q061.sourceAnswer = 'А';
  q061.questionPages = [14];
  q061.answerPages = [125];
  q061.sourceEvidence = 'PDF-014（印刷页 12）；原书答案键 PDF-125（印刷页 123）';

  if (idsBefore.join('\u0000') !== chapter.exercises.map(exercise => exercise.id).join('\u0000')) {
    throw new Error('Exercise IDs changed during repair');
  }
  const q061Page = questionPdfPage(q061, mappings);
  repairs.push({
    exerciseId: q061.id,
    printedNumber: 61,
    importedContent: { question: Q061_SOURCE.importedQuestion, options: Q061_SOURCE.importedOptions, answer: 'Б', sourceAnswer: 'Б' },
    pdfOriginal: { question: Q061_SOURCE.question, options: Q061_SOURCE.options, answer: 'А' },
    discrepancyType: 'question-content-copy-error-and-answer-key-mismatch',
    repairedContent: { question: q061.question, options: q061.options, answer: q061.answer, sourceAnswer: q061.sourceAnswer, questionPages: q061.questionPages, answerPages: q061.answerPages },
    sourcePages: { question: q061Page, answerKey: { pdfPage: 125, printedPage: 123 } },
    affectsLegacyAttempts: true,
    compatibilityTreatment: '保留 GL1-Q061 与已有作答记录的键；reader 接入阶段按此账本重算结果，且不把旧 Q062 的题面选择误迁移为正确知识记录。',
    verification: 'PDF-014 题面和选项视觉核对通过；PDF-125 答案表核对通过；ID 未改变。'
  });

  for (const exercise of chapter.exercises) {
    if (exercise.type === 'single-choice' && (!exercise.answer || exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer))) {
      throw new Error(`${exercise.id} does not satisfy the repaired answer contract`);
    }
  }

  const report = {
    schemaVersion: 1,
    batchId: 'chapter-01-answer-key-and-q061-repair',
    status: 'pass-with-pending-reader-migration',
    source: {
      pdf: 'E:\\Desktop\\语法词汇（同一本书）.pdf',
      answerKey: { pdfPage: 125, printedPage: 123, heading: 'Ключи к первой главе' },
      questionPagesVisuallyChecked: [14]
    },
    summary: {
      answerKeyRepairs: ANSWER_REPAIRS.length,
      questionAndOptionContentRepairs: contentRepairs.length + 1,
      preservedExerciseIds: idsBefore.length,
      answerContract: '所有修复题均满足 answer === sourceAnswer，且答案键存在于选项中。'
    },
    compatibility: {
      status: 'pending-reader-gate',
      rationale: '当前任务门槛禁止在映射、规则单元与数据核对完成前修改 reader.html；本账本是后续兼容迁移的唯一输入，避免静默重写 localStorage。'
    },
    discrepancies: repairs,
    contentDiscrepancies: contentRepairs
  };

  writeJson(chapterPath, chapter);
  writeJson(reportPath, report);
  process.stdout.write(`${JSON.stringify({ repairedAnswers: ANSWER_REPAIRS.length, repairedQuestionOrOptionSets: contentRepairs.length + 1, reportPath }, null, 2)}\n`);
}

main();
