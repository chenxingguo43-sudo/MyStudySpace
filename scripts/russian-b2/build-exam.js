const fs = require('node:fs');
const path = require('node:path');

const SECTION_IDS = ['grammar', 'reading', 'writing', 'listening', 'speaking', 'review'];
const EXAM_DIR = path.join('俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '真题');
const LEGACY_READING_SEGMENTS = ['俄语资料库', '俄语B2 全模块 Markdown版', '章节', '06c-真题-阅读.md'];
const PRINTED_OPTION_LABELS = ['А', 'Б', 'В'];

function readingQuestionPdfPages(printedNumber) {
  if (printedNumber <= 8) return [152];
  if (printedNumber <= 15) return [154];
  if (printedNumber <= 18) return [156];
  return [157];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveLegacyReadingPath(root) {
  let candidateRoot = path.resolve(root);
  while (true) {
    const candidate = path.join(candidateRoot, ...LEGACY_READING_SEGMENTS);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(candidateRoot);
    if (parent === candidateRoot) break;
    candidateRoot = parent;
  }
  throw new Error('Cannot locate the canonical B2 exam reading Markdown source');
}

function importReadingQuestions({ root, write = false } = {}) {
  const readingPath = path.join(root, EXAM_DIR, 'reading.json');
  const reading = readJson(readingPath);
  const lines = fs.readFileSync(resolveLegacyReadingPath(root), 'utf8').replace(/\r/g, '').split('\n');
  const rawQuestions = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const questionMatch = line.match(/^(\d{1,2})\.\s+(.+)$/);
    if (questionMatch) {
      const printedNumber = Number(questionMatch[1]);
      if (printedNumber >= 1 && printedNumber <= 25) {
        if (current) rawQuestions.push(current);
        current = { printedNumber, prompt: questionMatch[2], rawOptions: [] };
        continue;
      }
    }
    const optionMatch = line.match(/^\(\s*[AАБBВ]\s*\)\s+(.+)$/u);
    if (current && optionMatch) current.rawOptions.push(optionMatch[1]);
  }
  if (current) rawQuestions.push(current);

  if (rawQuestions.length !== 25 || rawQuestions.some(question => question.rawOptions.length !== 3)) {
    throw new Error(`reading OCR import is incomplete: ${rawQuestions.length} questions`);
  }
  const questions = rawQuestions.map((question, index) => ({
    id: `exam-reading-q${String(question.printedNumber).padStart(2, '0')}`,
    printedNumber: question.printedNumber,
    prompt: question.prompt,
    options: question.rawOptions.map((text, optionIndex) => ({ label: PRINTED_OPTION_LABELS[optionIndex], text })),
    answer: reading.answerKey[index],
    answerSource: { ...reading.answerKeySource },
    questionSource: {
      kind: 'b2-original',
      pdfPages: readingQuestionPdfPages(question.printedNumber),
      label: 'B2 原书阅读题面，已逐页视觉核验'
    }
  }));
  const result = { questions, answerKey: reading.answerKey };
  if (write) {
    reading.questions = questions;
    reading.importStatus = 'source-verified';
    reading.questionContentStatus = 'source-verified';
    fs.writeFileSync(readingPath, `${JSON.stringify(reading, null, 2)}\n`, 'utf8');
  }
  return result;
}

function buildExamModule({ root }) {
  const directory = path.join(root, EXAM_DIR);
  const index = readJson(path.join(directory, 'index.json'));
  const sections = index.sections.map(file => readJson(path.join(directory, file)));
  const expected = ['grammar-lexicon', 'reading', 'writing', 'listening', 'speaking'];
  if (JSON.stringify(sections.map(section => section.id)) !== JSON.stringify(expected)) {
    throw new Error('exam sections must follow the printed B2 order');
  }
  for (const section of sections) {
    if (section.reviewStatus !== 'source-verified' || !Array.isArray(section.sourcePages) || section.sourcePages.length !== 2) {
      throw new Error(`${section.id}: source-verified page range required`);
    }
  }
  return { index, sections, instructions: readJson(path.join(directory, index.instructions)) };
}

function publishExamReaderModule({ root, outputDir }) {
  const { index: sourceIndex, sections, instructions } = buildExamModule({ root });
  fs.mkdirSync(outputDir, { recursive: true });
  const index = {
    id: sourceIndex.id,
    title: sourceIndex.title,
    format: 'exam-practice',
    chapters: sections.length,
    chapterTitles: sections.map(section => section.title)
  };
  fs.writeFileSync(path.join(outputDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  sections.forEach((section, chapter) => {
    fs.writeFileSync(
      path.join(outputDir, `ch${String(chapter).padStart(4, '0')}.json`),
      `${JSON.stringify({ ...section, format: 'exam-practice', instructions }, null, 2)}\n`,
      'utf8'
    );
  });
  return { index, sections };
}

function createExamAttempt({ now = new Date().toISOString() } = {}) {
  return {
    id: `b2-exam:${Date.parse(now) || Date.now()}`,
    startedAt: now,
    remainingMs: null,
    interrupted: false,
    completedAt: null,
    sections: SECTION_IDS.map(id => ({ id, status: 'not-started', objectiveScore: null, selfAssessment: null, aiEstimate: null }))
  };
}

function resumeExamAttempt(attempt, { remainingMs }) {
  return { ...attempt, remainingMs, interrupted: true, resumedAt: new Date().toISOString() };
}

module.exports = { SECTION_IDS, EXAM_DIR, buildExamModule, publishExamReaderModule, createExamAttempt, resumeExamAttempt, importReadingQuestions };
