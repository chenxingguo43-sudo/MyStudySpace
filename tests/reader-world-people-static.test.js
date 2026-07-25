const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
const index = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'index.json'), 'utf8'));

test('World People has a unified dashboard and stable grammar id', () => {
  assert.match(reader, /function showWorldPeopleDashboard\(\)/);
  assert.match(reader, /WORLD_PEOPLE_BOOK_IDS/);
  assert.match(reader, /b2FloatingNavigation\(/);
  const grammar = index.books.find((book) => book.id === 'zlatoust_grammar');
  assert.equal(grammar.title, 'В мире людей — 语法词汇');
  assert.equal(grammar.chapters, 5);
});

test('textbook knowledge cards fall back to a source-labelled overview', () => {
  assert.match(reader, /function getTextbookKnowledgePoints\(chapter\)/);
  assert.match(reader, /原书规则待补/);
  assert.match(reader, /来源与核对状态/);
});

test('stress rendering preserves source stress before applying automatic stress', () => {
  assert.match(reader, /data-original-word/);
  assert.match(reader, /data-stress-source/);
  assert.match(reader, /hasStressMark\(original\)/);
});

test('World People is a single bookshelf entry with cached chapter titles', () => {
  assert.match(reader, /booksData\.filter\(function\(book\) \{ return !isWorldPeopleBook\(book\); \}\)/);
  assert.match(reader, /showWorldPeopleDashboard\(\)/);
  assert.match(reader, /function ensureWorldChapterTitles\(book\)/);
  assert.match(reader, /world-chapter-item/);
});

test('World People keeps independent module resume states and exposes tree navigation', () => {
  assert.match(reader, /WORLD_PEOPLE_RESUME_KEY = 'rr_world_people_resume_v1'/);
  assert.match(reader, /function resumeWorldPeopleModule\(bookId\)/);
  assert.match(reader, /function renderWorldBreadcrumbTree\(\)/);
  assert.match(reader, /function toggleWorldBreadcrumbModule\(bookId\)/);
  assert.match(reader, /function toggleWorldBreadcrumbGroup\(bookId, groupIndex\)/);
  assert.match(reader, /function openWorldBreadcrumbModule\(bookId\)/);
  assert.match(reader, /function openWorldBreadcrumbChapter\(bookId, chapterIndex\)/);
  assert.match(reader, /if \(bookId === 'zlatoust_grammar'\)/);
  assert.match(reader, /style="--tree-level:2"/);
  assert.match(reader, /worldBreadcrumbNeedsAutoExpand = false/);
  assert.match(reader, /curView = 'chapters'; curCh = -1/);
  assert.doesNotMatch(reader, /world-module-switcher/);
  assert.match(reader, /record\.chapterTitle = getCurrentWorldChapterTitle\(\)/);
  assert.match(reader, /record\.viewMode === 'intensive'/);
});

test('World People shelf card provides direct module entry without duplicating books', () => {
  assert.match(reader, /world-shelf-card/);
  assert.match(reader, /world-shelf-modules/);
  assert.match(reader, /showWorldPeopleDashboard\(\)/);
  assert.match(reader, /function renderShelfBookCard\(b\)/);
});

test('World People listening returns to its own directory instead of the B2 dashboard', () => {
  const start = reader.indexOf('function renderListeningPractice(data, scrollPosition)');
  const end = reader.indexOf('var EXAM_PROGRESS_KEY', start);
  const body = reader.slice(start, end);
  assert.match(body, /listeningBackAction = isWorldPeopleBook\(curBook\) \? 'showChapters/);
  assert.match(body, /listeningBackTitle = isWorldPeopleBook\(curBook\) \? '目录' : '仪表盘'/);
});
