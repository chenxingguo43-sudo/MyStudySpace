#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const sourceDir = process.argv[2];
const outputDir = path.resolve('data/textbook/zlatoust_grammar');
const answerPages = [125, 126, 127, 128, 129];

if (!sourceDir) {
  throw new Error('Usage: node scripts/import-zlatoust-batches.js <zlatoust_batches directory>');
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadChapter(index) {
  const filePath = path.join(outputDir, `ch${String(index).padStart(4, '0')}.json`);
  return { filePath, data: JSON.parse(readUtf8(filePath)) };
}

function saveChapter(chapter) {
  fs.writeFileSync(chapter.filePath, `${JSON.stringify(chapter.data, null, 2)}\n`, 'utf8');
}

function getAuxiliaryText(folder) {
  return fs.readdirSync(folder)
    .find(name => name.endsWith('.txt') && name !== 'PROMPT.txt' && name !== 'RESULT.txt');
}

function parseAnswerKeys(text) {
  const names = ['первой', 'второй', 'третьей', 'четвёртой', 'пятой'];
  const byChapter = new Map();

  names.forEach((name, index) => {
    const heading = new RegExp(`^### Ключи к(?:о)? ${name} главе\\r?$`, 'm');
    const startMatch = heading.exec(text);
    if (!startMatch) throw new Error(`Missing answer section for chapter ${index + 1}`);
    const startIndex = startMatch.index;
    const nextMatch = /^### Ключи к(?:о)? .+ главе\r?$/gm;
    nextMatch.lastIndex = startIndex + startMatch[0].length;
    const next = nextMatch.exec(text);
    const nextIndex = next ? next.index : -1;
    const section = text.slice(startIndex, nextIndex < 0 ? undefined : nextIndex);
    const answers = new Map();
    for (const line of section.split(/\r?\n/)) {
      const cells = line.split('|').map(cell => cell.trim());
      for (let cellIndex = 0; cellIndex + 1 < cells.length; cellIndex += 1) {
        if (/^\d+$/.test(cells[cellIndex]) && /^[А-Г]$/.test(cells[cellIndex + 1])) {
          answers.set(Number(cells[cellIndex]), cells[cellIndex + 1]);
        }
      }
    }
    if (!answers.size) throw new Error(`No answer keys parsed for chapter ${index + 1}`);
    byChapter.set(index + 1, answers);
  });

  return byChapter;
}

function parsePage(page, text) {
  const numberLabel = 'Номер';
  const typeLabel = 'Тип';
  const questionLabel = 'Вопрос';
  const header = `(?:(?:${numberLabel}):\\s*)?(\\d+):?\\s*(?:N\\s*)?\\/\\s*${typeLabel}:\\s*([^/]+)\\s*\\/\\s*${questionLabel}:\\s*`;
  const chunks = text.split(new RegExp(`(?=^${header})`, 'gm'));
  const exercises = [];

  for (const chunk of chunks) {
    const match = chunk.match(new RegExp(`^${header}([\\s\\S]*?)(?=\\s*\\/\\s*[А-Г]\\)|$)`));
    if (!match) continue;
    const options = [...chunk.matchAll(/\/\s*([А-Г])\)\s*([\s\S]*?)(?=\s*\/\s*[А-Г]\)|$)/g)]
      .map(option => ({ key: option[1], text: option[2].replace(/\s+/g, ' ').trim() }));
    if (options.length < 2 || options.length > 4) {
      throw new Error(`Page ${page}, question ${match[1]} has ${options.length} options`);
    }
    exercises.push({
      page,
      printedNumber: Number(match[1]),
      type: match[2].trim(),
      question: match[3].replace(/\s+/g, ' ').trim(),
      options
    });
  }

  return exercises;
}

function parseBatch(filePath) {
  const parts = readUtf8(filePath).split(/(?:^|\n)\s*--- PAGE\s+(\d+)\s*---\s*/g);
  const exercises = [];
  for (let index = 1; index < parts.length; index += 2) {
    exercises.push(...parsePage(Number(parts[index]), parts[index + 1] || ''));
  }
  if (!exercises.length) throw new Error(`No exercises parsed from ${filePath}`);
  return exercises;
}

function selectRange(exercises, start, end, label) {
  const selected = exercises.filter(exercise => exercise.printedNumber >= start && exercise.printedNumber <= end);
  const expected = end - start + 1;
  if (selected.length !== expected || new Set(selected.map(item => item.printedNumber)).size !== expected) {
    throw new Error(`${label}: expected unique questions ${start}-${end}, found ${selected.length}`);
  }
  return selected;
}

function createExercise(exercise, chapterPrefix, answers) {
  const answer = answers.get(exercise.printedNumber);
  if (!answer) throw new Error(`${chapterPrefix} question ${exercise.printedNumber} has no source answer`);
  if (!exercise.options.some(option => option.key === answer)) {
    throw new Error(`${chapterPrefix} question ${exercise.printedNumber} has answer ${answer} outside its options`);
  }
  return {
    id: `${chapterPrefix}-Q${String(exercise.printedNumber).padStart(3, '0')}`,
    printedNumber: exercise.printedNumber,
    type: exercise.type,
    question: exercise.question,
    options: exercise.options,
    answer,
    sourceAnswer: answer,
    sourceEvidence: `PDF-${String(exercise.page).padStart(3, '0')}；原书答案键 PDF-125–PDF-129`,
    sourceExplanation: '',
    referenceExplanation: '',
    pitfalls: [],
    questionPages: [exercise.page],
    answerPages,
    reviewStatus: 'answer-mapped'
  };
}

function mapExistingAnswers(chapter, answers) {
  let mapped = 0;
  for (const exercise of chapter.data.exercises || []) {
    const answer = answers.get(exercise.printedNumber);
    if (!answer) throw new Error(`${chapter.data.id} question ${exercise.printedNumber} has no source answer`);
    if (!exercise.options.some(option => option.key === answer)) {
      throw new Error(`${chapter.data.id} question ${exercise.printedNumber} has answer ${answer} outside its options`);
    }
    exercise.answer = answer;
    exercise.sourceAnswer = answer;
    exercise.answerPages = answerPages;
    exercise.reviewStatus = 'answer-mapped';
    mapped += 1;
  }
  chapter.data.sourcePages.answers = answerPages;
  return mapped;
}

function replaceExercises(chapter, exercises, prefix, answers, note) {
  chapter.data.exercises = exercises
    .map(exercise => createExercise(exercise, prefix, answers))
    .sort((left, right) => left.printedNumber - right.printedNumber);
  chapter.data.sourcePages.answers = answerPages;
  chapter.data._status = 'partially-transcribed';
  chapter.data._note = note;
}

function assertQuestionIds(chapter) {
  const ids = new Set();
  const numbers = new Set();
  for (const exercise of chapter.data.exercises || []) {
    if (ids.has(exercise.id) || numbers.has(exercise.printedNumber)) {
      throw new Error(`${chapter.data.id} contains a duplicate exercise: ${exercise.id}`);
    }
    if (!exercise.answer || !exercise.options.some(option => option.key === exercise.answer)) {
      throw new Error(`${exercise.id} is missing a valid answer`);
    }
    ids.add(exercise.id);
    numbers.add(exercise.printedNumber);
  }
}

function main() {
  const answerFolder = path.join(sourceDir, 'BATCH_01_ANSWER_p125-p129');
  const answerTextName = getAuxiliaryText(answerFolder);
  if (!answerTextName) throw new Error('The answer-key text file was not found in BATCH_01_ANSWER_p125-p129');
  const answerKeys = parseAnswerKeys(readUtf8(path.join(answerFolder, answerTextName)));

  const batch = name => parseBatch(path.join(sourceDir, name, 'RESULT.txt'));
  const batch03 = batch('BATCH_03_Q_p049-p058');
  const batch04 = batch('BATCH_04_Q_p059-p068');
  const batch05 = batch('BATCH_05_Q_p069-p078');
  const batch06Path = path.join(sourceDir, 'BATCH_06_Q_p079-p088', 'RESULT.txt');
  const batch05Path = path.join(sourceDir, 'BATCH_05_Q_p069-p078', 'RESULT.txt');
  const batch07 = batch('BATCH_07_Q_p089-p090');
  const duplicateBatch06 = sha256(batch05Path) === sha256(batch06Path);

  if (!duplicateBatch06) throw new Error('BATCH_06 no longer matches BATCH_05; update the import ranges before running this script.');

  const chapter2 = loadChapter(1);
  const chapter3 = loadChapter(2);
  const chapter4 = loadChapter(3);
  const chapter5 = loadChapter(4);

  const mappedChapter2 = mapExistingAnswers(chapter2, answerKeys.get(2));
  const mappedChapter3 = mapExistingAnswers(chapter3, answerKeys.get(3));

  const importedChapter3 = selectRange(batch03, 44, 99, 'Chapter 3').map(item => createExercise(item, 'GL3', answerKeys.get(3)));
  const existingChapter3 = chapter3.data.exercises.filter(item => item.printedNumber <= 36);
  chapter3.data.exercises = existingChapter3.concat(importedChapter3).sort((left, right) => left.printedNumber - right.printedNumber);
  chapter3.data.sourcePages.answers = answerPages;
  chapter3.data._status = 'partially-transcribed';
  chapter3.data._note = '题 37–43 的原始 OCR 页未提供；其余题目已由批次 03 和原书答案键导入。';

  replaceExercises(
    chapter4,
    selectRange(batch03, 1, 12, 'Chapter 4').concat(selectRange(batch04, 13, 80, 'Chapter 4')).concat(selectRange(batch05, 87, 102, 'Chapter 4')),
    'GL4',
    answerKeys.get(4),
    '题 81–86 为原书文本任务，当前未提供题页 OCR；其余选择题已由批次 03–05 和原书答案键导入。'
  );

  replaceExercises(
    chapter5,
    selectRange(batch05, 1, 52, 'Chapter 5').concat(selectRange(batch07, 126, 139, 'Chapter 5')),
    'GL5',
    answerKeys.get(5),
    '批次 06 的 OCR 与批次 05 完全重复，因此题 53–125 暂不导入；已导入题 1–52 和 126–139。'
  );

  [chapter2, chapter3, chapter4, chapter5].forEach(assertQuestionIds);
  [chapter2, chapter3, chapter4, chapter5].forEach(saveChapter);

  console.log(JSON.stringify({
    mappedExistingAnswers: { chapter2: mappedChapter2, chapter3: mappedChapter3 },
    imported: { chapter3: importedChapter3.length, chapter4: chapter4.data.exercises.length, chapter5: chapter5.data.exercises.length },
    skipped: { batch06: 'duplicate of BATCH_05', chapter3: 'questions 37-43', chapter4: 'text tasks 81-86', chapter5: 'questions 53-125' }
  }, null, 2));
}

main();
