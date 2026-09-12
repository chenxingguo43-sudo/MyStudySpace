const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateB2Dashboard } = require('../../scripts/russian-b2/lib/listening-writing-contracts');

const root = path.resolve(__dirname, '..', '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

test('the shelf exposes one B2 book whose modules live in its dashboard', () => {
  const catalogue = readJson(path.join('data', 'textbook', 'index.json'));
  const book = readJson(path.join('data', 'textbook', 'russian_b2', 'book.json'));
  const b2Books = catalogue.books.filter(item => item.id === 'russian_b2' || item.id.startsWith('russian_b2_'));

  assert.equal(b2Books.length, 1);
  assert.equal(b2Books[0].id, 'russian_b2');
  assert.equal(b2Books[0].format, 'b2-full');
  assert.deepEqual(book.modules.map(module => module.id), [
    'grammar', 'reading', 'writing', 'listening', 'speaking', 'exam', 'review'
  ]);
  assert.deepEqual(validateB2Dashboard(book, catalogue), []);
});

test('reader provides a unified B2 dashboard and module navigation', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /function renderB2Dashboard\(/);
  assert.match(reader, /function openB2Module\(/);
});

test('B2 dashboard exposes a local tutor review package without automatic model calls', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /function showTutorReview\(\)/);
  assert.match(reader, /ReaderAnswerEvidence\.latestSubmissions\(records, 10\)/);
  assert.match(reader, /function copyTutorReview\(openTutor\)/);
  assert.match(reader, /http:\/\/localhost:3782/);
  assert.doesNotMatch(reader, /fetch\(['"]http:\/\/127\.0\.0\.1:8001/);
});

test('B2 dashboard and module list use floating navigation instead of the dark toolbar', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const dashboardStart = reader.indexOf('function renderB2Dashboard(book)');
  const dashboardEnd = reader.indexOf('function showB2Dashboard()', dashboardStart);
  const moduleStart = reader.indexOf('function renderB2ModuleChapters()');
  const moduleEnd = reader.indexOf('function openB2Module(moduleId)', moduleStart);
  const dashboard = reader.slice(dashboardStart, dashboardEnd);
  const moduleList = reader.slice(moduleStart, moduleEnd);

  assert.match(reader, /function b2FloatingNavigation\(options\)/);
  assert.match(dashboard, /b2FloatingNavigation/);
  assert.doesNotMatch(dashboard, /toolbar\(/);
  assert.match(moduleList, /b2FloatingNavigation/);
  assert.doesNotMatch(moduleList, /toolbar\(/);
});

test('B2 module exercises return to the module directory before the book dashboard', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const chapterStart = reader.indexOf('function goChapter(idx, restoreState)');
  const chapterEnd = reader.indexOf('var B2_PROGRESS_KEY', chapterStart);
  const quizStart = reader.indexOf('function renderQuizChapter(data, scrollPosition)');
  const quizEnd = reader.indexOf('var READING_PROGRESS_KEY', quizStart);
  const chapter = reader.slice(chapterStart, chapterEnd);
  const quiz = reader.slice(quizStart, quizEnd);

  assert.ok(chapter.includes("backAction: 'showChapters(\\'russian_b2\\')'"));
  assert.ok(quiz.includes("var quizBackAction = isB2Quiz ? 'showChapters(\\'russian_b2\\')'"));
  assert.ok(quiz.includes("var quizBackTitle = '目录'"));
});

test('B2 module workbenches return to the module directory', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const ranges = [
    ['function renderWritingWorkbench(', 'var SPEAKING_DRAFTS_KEY'],
    ['function renderSpeakingPractice(', 'var LISTENING_PROGRESS_KEY'],
    ['function renderExamPracticeChapter(', 'function renderReadingPracticeQuestion('],
    ['function renderReadingPracticeChapter(', 'function refreshQuizQuestion(']
  ];
  ranges.forEach(([startMarker, endMarker]) => {
    const start = reader.indexOf(startMarker);
    const end = reader.indexOf(endMarker, start);
    assert.ok(start >= 0 && end > start, `missing function slice: ${startMarker}`);
    const source = reader.slice(start, end);
    assert.ok(source.includes("backAction: 'showChapters(\\'russian_b2\\')'"));
    assert.ok(source.includes("backTitle: '目录'"));
  });
  const listeningStart = reader.indexOf('function renderListeningPractice(');
  const listeningEnd = reader.indexOf('function getExamProgress()', listeningStart);
  const listening = reader.slice(listeningStart, listeningEnd);
  assert.ok(listening.includes("curBook && curBook.isB2Module ? 'showChapters(\\'russian_b2\\')'"));
});

test('B2 dashboard renders progress from the pure dashboard aggregator and keeps review non-percentual', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  const start = reader.indexOf('function renderB2Dashboard(book)');
  const end = reader.indexOf('function showB2Dashboard()', start);
  const dashboard = reader.slice(start, end);
  assert.match(dashboard, /RussianB2Dashboard\.buildDashboardProgress/);
  assert.match(dashboard, /继续上次学习/);
  assert.match(dashboard, /已完成/);
  assert.match(dashboard, /class="progress-bar"><div class="progress-fill"/);
  assert.doesNotMatch(dashboard, /b2-module-progress/);
  assert.match(dashboard, /<article class="b2-module-card"/);
  assert.match(dashboard, /上次学习：/);
  // 统一复习卡不显示百分比：把断言限定在卡片构建段（推导兜底块在前，含 review 字样但无百分比语义）
  const cardsSection = dashboard.match(/var cards = \(book\.modules \|\| \[\]\)\.map\([\s\S]*?\.join\(''\);/);
  assert.ok(cardsSection);
  assert.doesNotMatch(cardsSection[0], /review[^]*?%/);
});

test('B2 shelf card reads the cached dashboard aggregate instead of mismatched readStats', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /function getB2ProgressCache\(\)/);
  assert.match(reader, /function saveB2ProgressCache\(model\)/);
  const dashboardStart = reader.indexOf('function renderB2Dashboard(book)');
  const dashboardEnd = reader.indexOf('function showB2Dashboard()', dashboardStart);
  assert.match(reader.slice(dashboardStart, dashboardEnd), /saveB2ProgressCache\(model\)/);
  const shelfStart = reader.indexOf('function renderB2ShelfCard(book)');
  const shelfEnd = reader.indexOf('function renderShelf()', shelfStart);
  const shelfCard = reader.slice(shelfStart, shelfEnd);
  assert.match(shelfCard, /getB2ProgressCache\(\)/);
  assert.doesNotMatch(shelfCard, /getBookProgress\(book\.id\)/);
  assert.match(shelfCard, /getB2ResumeLocation/);
  assert.match(shelfCard, /总进度待统计/);
});
