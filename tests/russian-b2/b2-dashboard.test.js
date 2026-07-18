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
