'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const shell = require('../js/app-shell');
const readerNavigation = require('../js/reader-navigation');

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('shell exposes exactly the four V1 entrances in their fixed order', () => {
  assert.deepEqual(Object.keys(shell.PAGES), ['home', 'reader', 'vocabulary', 'my']);
  assert.deepEqual(Object.values(shell.PAGES).map(item => item.href), ['index.html', 'reader.html', 'vocabulary.html', 'profile.html']);
  assert.equal(shell.resolvePage('unknown'), 'home');
});

test('page state is namespaced, serializable, and keeps its scroll position', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const saved = shell.writeState(storage, 'reader', { href: 'https://localhost/reader.html?book=b2' }, 218);
  assert.equal(saved.scrollY, 218);
  assert.deepEqual(shell.readState(storage, 'reader').scrollY, 218);
  assert.equal(values.has('v1_app_page_state:reader'), true);
});

test('Android detection requires the explicit build marker', () => {
  const matching = { querySelector: () => ({ getAttribute: () => 'android' }) };
  const missing = { querySelector: () => null };
  assert.equal(shell.isAndroidDocument(matching), true);
  assert.equal(shell.isAndroidDocument(missing), false);
});

test('Reader content returns to its current textbook directory', () => {
  const calls = [];
  const handled = readerNavigation.handleBack({
    curView: 'reading', curBook: { id: 'reading_speaking' },
    showChapters: id => calls.push(['chapters', id]), showShelf: () => calls.push(['shelf'])
  });
  assert.equal(handled, true);
  assert.deepEqual(calls, [['chapters', 'reading_speaking']]);
});

test('Reader directory returns to its dashboard or shelf using existing page routes', () => {
  const calls = [];
  const actions = {
    showChapters() {}, showB2Dashboard: () => calls.push('b2'),
    showWorldPeopleDashboard: () => calls.push('world'), showShelf: () => calls.push('shelf')
  };
  readerNavigation.handleBack({ ...actions, curView: 'chapters', curBook: { id: 'reading_speaking' }, isWorldPeopleBook: () => true });
  readerNavigation.handleBack({ ...actions, curView: 'chapters', curBook: { id: 'russian_b2', isB2Module: true }, isWorldPeopleBook: () => false });
  readerNavigation.handleBack({ ...actions, curView: 'chapters', curBook: { id: 'plain_textbook' }, isWorldPeopleBook: () => false });
  assert.deepEqual(calls, ['world', 'b2', 'shelf']);
});

test('Reader marks an opened B2 module as the chapter-directory state', () => {
  const reader = fs.readFileSync(path.join(__dirname, '..', 'reader.html'), 'utf8');
  const renderer = reader.match(/function renderB2ModuleChapters\(\) \{([\s\S]*?)\n\}/);
  assert.ok(renderer, 'B2 module directory renderer should exist');
  assert.match(renderer[1], /curView = 'chapters';/);
  assert.match(renderer[1], /curCh = -1;/);
});

test('Reader closes a temporary dictionary layer before changing page state', () => {
  const calls = [];
  const handled = readerNavigation.handleBack({
    curView: 'reading', curBook: { id: 'reading_speaking' },
    closeTemporaryLayer: () => { calls.push('close'); return true; },
    showChapters: () => calls.push('chapters')
  });
  assert.equal(handled, true);
  assert.deepEqual(calls, ['close']);
});

test('page back handler stops AppShell history fallback', () => {
  let historyCalls = 0;
  const windowRef = { location: { href: 'https://localhost/reader.html' }, scrollY: 0, appShellHandleBack: () => true, history: { length: 2, back: () => historyCalls++ } };
  assert.equal(shell.handleAndroidBack(windowRef, 'reader', memoryStorage(), {}), 'page');
  assert.equal(historyCalls, 0);
});

test('home root exits only through Capacitor and never assigns index.html', () => {
  let exits = 0, assigns = 0;
  const windowRef = { location: { href: 'https://localhost/index.html', assign: () => assigns++ }, scrollY: 0, history: { length: 1, back() {} } };
  assert.equal(shell.handleAndroidBack(windowRef, 'home', memoryStorage(), { exitApp: () => exits++ }), 'exit');
  assert.equal(exits, 1);
  assert.equal(assigns, 0);
});

test('web documents never bind the native back listener', () => {
  let listeners = 0;
  const windowRef = {
    document: { querySelector: () => null },
    Capacitor: { Plugins: { App: { addListener: () => listeners++ } } }
  };
  assert.equal(shell.bindAndroidBack(windowRef, 'home', memoryStorage()), false);
  assert.equal(listeners, 0);
});
