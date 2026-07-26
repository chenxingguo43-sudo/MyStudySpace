#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const resultPath = process.argv[2];
const supplementPath = process.argv[3];
const outputDir = path.resolve('data/textbook/zlatoust_grammar');
const answerPages = [125, 126, 127, 128, 129];
const sourceDir = 'E:/Desktop/zlatoust_batches/BATCH_01_ANSWER_p125-p129';
const RUSSIAN = {
  number: '\u041d\u043e\u043c\u0435\u0440', type: '\u0422\u0438\u043f', question: '\u0412\u043e\u043f\u0440\u043e\u0441',
  options: ['\u0410', '\u0411', '\u0412', '\u0413']
};

if (!resultPath) throw new Error('Usage: node scripts/import-zlatoust-missing-pages.js <RESULT.txt>');

function read(filePath) { return fs.readFileSync(filePath, 'utf8'); }
function chapter(index) {
  const filePath = path.join(outputDir, `ch${String(index).padStart(4, '0')}.json`);
  return { filePath, data: JSON.parse(read(filePath)) };
}
function write(item) { fs.writeFileSync(item.filePath, `${JSON.stringify(item.data, null, 2)}\n`, 'utf8'); }
function compact(text) { return text.replace(/\s+/g, ' ').trim(); }

function parseResult(text) {
  const exercises = [];
  const pageParts = text.split(/(?:^|\n)--- PAGE\s+(\d+)\s+---\s*/g);
  for (let index = 1; index < pageParts.length; index += 2) {
    const page = Number(pageParts[index]);
    const blocks = (pageParts[index + 1] || '').split(new RegExp(`(?=^${RUSSIAN.number}:\\s*\\d+)`, 'm'));
    for (const block of blocks) {
      const number = block.match(new RegExp(`^${RUSSIAN.number}:\\s*(\\d+)`, 'm'));
      if (!number) continue;
      const type = block.match(new RegExp(`^${RUSSIAN.type}:\\s*(.+)$`, 'm'));
      const question = block.match(new RegExp(`^${RUSSIAN.question}:\\s*([\\s\\S]*?)(?=^${RUSSIAN.options[0]}\\)|$)`, 'm'));
      const options = [];
      const optionPattern = new RegExp(`^([${RUSSIAN.options.join('')}])\\)\\s*([\\s\\S]*?)(?=^[${RUSSIAN.options.join('')}]\\)|$)`, 'gm');
      let match;
      while ((match = optionPattern.exec(block))) options.push({ key: match[1], text: compact(match[2]) });
      exercises.push({
        page,
        printedNumber: Number(number[1]),
        type: compact(type && type[1] || ''),
        question: compact(question && question[1] || ''),
        options
      });
    }
  }
  return exercises;
}

function parseAnswerKeys() {
  const file = fs.readdirSync(sourceDir).find(name => name.endsWith('.txt') && name !== 'PROMPT.txt' && name !== 'RESULT.txt');
  if (!file) throw new Error('Answer-key source text was not found');
  const text = read(path.join(sourceDir, file));
  const headings = ['\u043f\u0435\u0440\u0432\u043e\u0439', '\u0432\u0442\u043e\u0440\u043e\u0439', '\u0442\u0440\u0435\u0442\u044c\u0435\u0439', '\u0447\u0435\u0442\u0432\u0451\u0440\u0442\u043e\u0439', '\u043f\u044f\u0442\u043e\u0439'];
  const keyHeader = '\u041a\u043b\u044e\u0447\u0438 \u043a(?:\u043e)? ';
  const result = new Map();
  headings.forEach((heading, chapterNumber) => {
    const header = new RegExp(`^### ${keyHeader}${heading} \u0433\u043b\u0430\u0432\u0435\\r?$`, 'm');
    const start = header.exec(text);
    if (!start) throw new Error(`Missing answer key for chapter ${chapterNumber + 1}`);
    const tail = text.slice(start.index + start[0].length);
    const next = /^### \u041a\u043b\u044e\u0447\u0438 \u043a(?:\u043e)? .+ \u0433\u043b\u0430\u0432\u0435\r?$/m.exec(tail);
    const cells = tail.slice(0, next ? next.index : undefined).split(/\r?\n/).flatMap(line => line.split('|').map(cell => cell.trim()));
    const answers = new Map();
    for (let index = 0; index + 1 < cells.length; index += 1) {
      if (/^\d+$/.test(cells[index]) && RUSSIAN.options.includes(cells[index + 1])) answers.set(Number(cells[index]), cells[index + 1]);
    }
    result.set(chapterNumber + 1, answers);
  });
  return result;
}

function range(items, start, end, label) {
  const selected = items.filter(item => item.printedNumber >= start && item.printedNumber <= end);
  const numbers = selected.map(item => item.printedNumber).sort((a, b) => a - b);
  const expected = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  if (numbers.length !== expected.length || numbers.some((number, index) => number !== expected[index])) throw new Error(`${label}: expected ${start}-${end}, received ${numbers.join(',')}`);
  return selected;
}

function choice(item, prefix, answers) {
  const answer = answers.get(item.printedNumber);
  if (!item.question || item.options.length < 2 || item.options.length > 4) throw new Error(`${prefix}-Q${item.printedNumber}: invalid transcription`);
  if (!answer || !item.options.some(option => option.key === answer)) throw new Error(`${prefix}-Q${item.printedNumber}: source answer is not among options`);
  return {
    id: `${prefix}-Q${String(item.printedNumber).padStart(3, '0')}`,
    printedNumber: item.printedNumber, type: 'single-choice', question: item.question, options: item.options,
    answer, sourceAnswer: answer, sourceEvidence: `PDF-${String(item.page).padStart(3, '0')}；原书答案键 PDF-125–129`,
    sourceExplanation: '', referenceExplanation: '', pitfalls: [], questionPages: [item.page], answerPages, reviewStatus: 'answer-mapped'
  };
}

function openResponse(item, prefix) {
  if (!item.question || item.options.length) throw new Error(`${prefix}-Q${item.printedNumber}: invalid open-response transcription`);
  return {
    id: `${prefix}-Q${String(item.printedNumber).padStart(3, '0')}`,
    printedNumber: item.printedNumber, type: 'open-response', question: item.question, options: [], answer: '', sourceAnswer: '',
    sourceEvidence: `PDF-${String(item.page).padStart(3, '0')}`, sourceExplanation: '将直引语改写为间接引语。',
    referenceExplanation: '', pitfalls: [], questionPages: [item.page], answerPages: [], reviewStatus: 'source-transcribed'
  };
}

function merge(existing, additions) {
  const byNumber = new Map(existing.map(item => [item.printedNumber, item]));
  additions.forEach(item => byNumber.set(item.printedNumber, item));
  return [...byNumber.values()].sort((left, right) => left.printedNumber - right.printedNumber);
}

const parsed = parseResult(read(resultPath)).concat(supplementPath ? parseResult(read(supplementPath)) : []);
const answers = parseAnswerKeys();
const ch3 = chapter(2), ch4 = chapter(3), ch5 = chapter(4);
ch3.data.exercises = merge(ch3.data.exercises, range(parsed, 37, 43, 'Chapter 3').map(item => choice(item, 'GL3', answers.get(3))));
ch4.data.exercises = merge(ch4.data.exercises, range(parsed.filter(item => item.page === 67), 81, 86, 'Chapter 4').map(item => openResponse(item, 'GL4')));
ch5.data.exercises = merge(ch5.data.exercises, range(parsed.filter(item => item.page >= 77 && item.page <= 86), 53, 125, 'Chapter 5').map(item => choice(item, 'GL5', answers.get(5))));
for (const item of [ch3, ch4, ch5]) { delete item.data._status; delete item.data._note; item.data.sourcePages.answers = answerPages; write(item); }
console.log(JSON.stringify({ imported: { ch3: 7, ch4: 6, ch5: 73 }, totals: { ch3: ch3.data.exercises.length, ch4: ch4.data.exercises.length, ch5: ch5.data.exercises.length } }, null, 2));
