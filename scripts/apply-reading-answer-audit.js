/* Apply only changes supported by the printed answer pages and full-book OCR. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const audit = require('./audit-reading-answers-against-full-mineru.js');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const sourcePath = String.raw`D:\下载\MinerU\文件转换\В мире людей 阅读口语.pdf-4d908977-e819-4950-8fce-f552d6171ca4\MinerU_markdown_202608191105372_6e8347d7.md`;
const backupRoot = path.join(root, 'docs', 'reader-ai-reading', 'answer-audit', 'backups-2026-08-19');

// The printed key uses Cyrillic а/б/в. MinerU reads а as a, б as 6, and в as B/b.
function decode(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'a') return 'а';
  if (value === '6') return 'б';
  if (value === 'b') return 'в';
  return '';
}

const keyMaps = {
  '1.4.2': ['а', 'а', 'в', 'в', 'б', 'в', 'б', 'в'],
  '1.5.1': ['б', 'в', 'а', 'в', 'б', 'в', 'в', 'а'],
  '1.5.2': ['а', 'б', 'б', 'в', 'б', 'а', 'б', 'в'],
  '2.5.1': ['а', 'б', 'в', 'а', 'а', 'б', 'в', 'б'],
  '3.4.2': ['б', 'в', 'а', 'в', 'б', 'а', 'в', 'а', 'а', 'б']
};

const directAnswerChapters = new Set([
  '3.1.2', '3.2.2', '3.3.1', '3.3.2', '3.4.1', '3.4.2', '3.5.1', '3.5.2'
]);

const chapterFiles = fs.readdirSync(dataRoot)
  .filter((name) => /^ch\d+\.json$/.test(name))
  .map((name) => ({ name, data: JSON.parse(fs.readFileSync(path.join(dataRoot, name), 'utf8')) }));

function chapterOf(data) {
  const match = String(data.title || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : '';
}

function optionLines(options) {
  return options.map((text, index) => `${String.fromCharCode(0x0430 + index)}) ${text}`);
}

function canonicalExercise(item, answer, old) {
  const next = {
    type: 'choice',
    num: item.num,
    question: item.question,
    options: optionLines(item.options),
    answer,
    answerStatus: 'source-verified',
    answerSource: 'printed answer key, full-book OCR cross-check'
  };
  // Preserve a translation only when its old question was exactly the same.
  if (old && audit.normalize(old.question) === audit.normalize(item.question)) {
    if (old.zhQuestion) next.zhQuestion = old.zhQuestion;
    if (Array.isArray(old.zhOptions) && old.zhOptions.length === 3) next.zhOptions = old.zhOptions;
  }
  return next;
}

function sourceQuestions(chapter, sections) {
  const parsed = audit.parseSourceQuestions(sections.get(chapter) || '');
  if (chapter !== '3.4.2') return parsed;
  // MinerU joined the continuation of question 7 into the question line.
  parsed[6] = {
    num: 7,
    question: 'Строев узнал об Александре, что она ....',
    options: ['преподаватель истории', 'увлекается археологией', 'по образованию филолог']
  };
  return parsed;
}

function applyCanonical(data, chapter, sections) {
  const questions = sourceQuestions(chapter, sections);
  const answers = keyMaps[chapter];
  if (questions.length !== answers.length) throw new Error(`${chapter}: expected ${answers.length} questions, got ${questions.length}`);
  const oldByNum = new Map((data.exercises || []).map((item) => [Number(item.num), item]));
  data.exercises = questions.map((item) => canonicalExercise(item, answers[item.num - 1], oldByNum.get(item.num)));
  data.exerciseSource = {
    status: 'answer-audit-canonical-source',
    source: 'full-book MinerU Markdown and printed answer key',
    answerPolicy: 'Answers verified against the printed key; options/questions use the full-book source.'
  };
}

function applySafeAnswers(data, chapter, markdown, sections) {
  const sourceQuestionsList = sections.get(chapter) ? audit.parseSourceQuestions(sections.get(chapter)) : [];
  const answerKey = audit.extractAnswerKey(markdown, chapter);
  const sourceByNum = new Map(sourceQuestionsList.map((item) => [item.num, item]));
  for (const exercise of data.exercises || []) {
    const source = sourceByNum.get(Number(exercise.num));
    const key = answerKey.answers.find((item) => item.num === Number(exercise.num));
    if (!source || !key) continue;
    const sameQuestion = audit.normalize(exercise.question) === audit.normalize(source.question);
    const readerOptions = (exercise.options || []).map((value) => audit.normalize(String(value).replace(/^\s*[а-яА-Яa-zA-Z]\)\s*/u, '')));
    const sourceOptions = source.options.map(audit.normalize);
    if (sameQuestion && readerOptions.length === sourceOptions.length && readerOptions.every((value, index) => value === sourceOptions[index])) {
      const answer = decode(key.raw);
      if (answer) {
        exercise.answer = answer;
        exercise.answerStatus = 'source-verified';
        exercise.answerSource = 'printed answer key, full-book OCR cross-check';
      }
    }
  }
}

function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Source Markdown not found: ${sourcePath}`);
  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const sections = audit.extractBodySections(markdown);
  fs.mkdirSync(backupRoot, { recursive: true });
  const changed = [];
  for (const entry of chapterFiles) {
    const chapter = chapterOf(entry.data);
    if (!chapter) continue;
    const target = path.join(dataRoot, entry.name);
    const shouldCanonicalize = Object.prototype.hasOwnProperty.call(keyMaps, chapter);
    if (shouldCanonicalize || directAnswerChapters.has(chapter)) {
      fs.copyFileSync(target, path.join(backupRoot, entry.name));
      if (shouldCanonicalize) applyCanonical(entry.data, chapter, sections);
      else applySafeAnswers(entry.data, chapter, markdown, sections);
      fs.writeFileSync(target, `${JSON.stringify(entry.data, null, 2)}\n`, 'utf8');
      changed.push(`${entry.name} (${chapter})${shouldCanonicalize ? ' canonicalized' : ' answers checked'}`);
    }
  }
  console.log(changed.join('\n'));
  console.log(`Backup: ${backupRoot}`);
}

main();
