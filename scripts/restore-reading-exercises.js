/* Restore reading questions that exist in the study-unit Markdown but were not
 * copied into the Reader chapter JSON files. This script is intentionally
 * limited to the six affected chapters. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const unitRoot = path.join(root, '俄语资料库', 'В мире людей 阅读口语 Markdown版', '学习单元');

function clean(value) {
  return String(value || '').replace(/\*\*/g, '').trim();
}

function readUnit(title) {
  return fs.readFileSync(path.join(unitRoot, title), 'utf8').split(/\r?\n/);
}

function parseChoices(lines, start, end) {
  const exercises = [];
  let current = null;
  for (let i = start; i < Math.min(end, lines.length); i += 1) {
    const line = lines[i];
    const question = line.match(/^(\d+)\.\s+(.+)$/);
    if (question) {
      if (current) exercises.push(current);
      current = {
        type: 'choice',
        num: Number(question[1]),
        question: clean(question[2]),
        options: [],
        answer: '',
        answerStatus: 'unverified',
        answerSource: 'study-unit-question-only'
      };
      continue;
    }
    const option = line.match(/^\s*-\s+(?:\*\*)?([а-яА-Яa-zA-Z])\)\s+(.+?)(?:\*\*)?\s*$/);
    if (current && option) current.options.push(`${option[1].toLowerCase()}) ${clean(option[2])}`);
  }
  if (current) exercises.push(current);
  return exercises;
}

function parseJudgements(lines, start, end) {
  return parseChoices(lines, start, end).map((exercise) => ({
    ...exercise,
    type: 'judgement',
    options: ['а) соответствует информации', 'б) не соответствует информации'],
    answerSource: 'study-unit-question-only'
  }));
}

function parseLiteraryQuestions(lines, heading, end) {
  const exercises = [];
  let current = null;
  for (let i = 0; i < lines.length && i < end; i += 1) {
    const marker = lines[i].match(/^### Вопрос (\d+)$/);
    if (marker) {
      if (current) exercises.push(current);
      current = {
        type: 'choice',
        num: Number(marker[1]),
        question: '',
        options: [],
        answer: '',
        answerStatus: 'source-marked',
        answerSource: 'study-unit-answer-line'
      };
      continue;
    }
    if (!current) continue;
    if (!current.question && lines[i].trim() && !lines[i].startsWith('-') && !lines[i].startsWith('---')) {
      current.question = clean(lines[i]);
      continue;
    }
    const raw = lines[i];
    const option = raw.match(/^\s*-\s+(\*\*)?([а-яА-Яa-zA-Z])\)\s+(.+?)(\*\*)?\s*$/);
    if (option) {
      if (raw.includes('**')) current.answer = option[2].toLowerCase();
      current.options.push(`${option[2].toLowerCase()}) ${clean(option[3])}`);
    }
  }
  if (current) exercises.push(current);
  return exercises;
}

function restore(file, unitTitle, parser, answerMap, answerSource) {
  const jsonPath = path.join(dataRoot, file);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const lines = readUnit(unitTitle);
  const exercises = parser(lines);
  if (!exercises.length) throw new Error(`No questions parsed for ${file}`);
  exercises.forEach((exercise) => {
    const answer = answerMap && answerMap[exercise.num];
    if (answer) {
      exercise.answer = answer;
      exercise.answerStatus = 'source-verified';
      exercise.answerSource = answerSource;
    }
  });
  data.exercises = exercises;
  data.exerciseSource = {
    status: 'restored-from-study-unit',
    source: `俄语资料库/В мире людей 阅读口语 Markdown版/学习单元/${unitTitle}`,
    answerPolicy: 'Answers are filled only from an explicitly recorded study-unit or OCR answer key; blank answers remain unverified.'
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`${file}: restored ${exercises.length} questions`);
}

restore('ch0011.json', 'Текст 2.1.2 — Отчёт об экскурсии в музей.md', (lines) => {
  const start = lines.findIndex((line) => line.includes('**ТЕСТ. Определите')) + 1;
  return parseJudgements(lines, start, start + 12);
}, { 1: 'а', 2: 'б', 3: 'б', 4: 'б' }, 'OCR answer key page 082');
restore('ch0012.json', 'Текст 2.2.1 — Туристы поехали по цехам.md', (lines) => {
  const start = lines.findIndex((line) => line.trim() === '### 1.1 选择题') + 1;
  return parseChoices(lines, start, start + 55);
}, { 1: 'в', 2: 'б', 3: 'в', 4: 'а', 5: 'в', 6: 'а', 7: 'б' }, 'OCR answer key page 082');
restore('ch0017.json', 'Текст 2.4.2 — Информационные письма.md', (lines) => {
  const start = lines.findIndex((line) => line.includes('**ТЕСТ. Определите')) + 1;
  return parseJudgements(lines, start, start + 12);
}, { 1: 'б', 2: 'а', 3: 'а', 4: 'б' }, 'OCR answer key page 083');
restore('ch0019.json', 'Текст 2.5.2 — Письмо-благодарность, Отчёт, Положение.md', (lines) => {
  const start = lines.findIndex((line) => line.trim() === '**Ответьте на вопросы по тексту:**') + 1;
  const end = lines.findIndex((line, index) => index > start && line.trim().startsWith('### 1.2'));
  return parseChoices(lines, start, end > 0 ? end : start + 70);
}, { 1: 'б', 2: 'а', 3: 'б', 4: 'б', 5: 'б', 6: 'б' }, 'OCR answer key page 083');
restore('ch0020.json', 'Текст 3.1.1 — Алмазная колесница.md', (lines) => parseLiteraryQuestions(lines, 'Вопрос', 165),
  { 1: 'в', 2: 'б', 3: 'б', 4: 'в', 5: 'а', 6: 'в', 7: 'в', 8: 'а', 9: 'а', 10: 'б' },
  'OCR answer key page 139');
restore('ch0022.json', 'Текст 3.2.1 — Встреча.md', (lines) => {
  const start = lines.findIndex((line) => line.trim() === '**ТЕСТ**') + 1;
  const end = lines.findIndex((line, index) => index > start && line.trim().startsWith('### 1.2'));
  return parseChoices(lines, start, end > 0 ? end : start + 80);
}, { 1: 'б', 2: 'а', 3: 'б', 4: 'в', 5: 'а', 6: 'а', 7: 'в', 8: 'а', 9: 'в', 10: 'в' }, 'OCR answer key page 139');
