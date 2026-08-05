'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app-home.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'app-home.js'), 'utf8');
const dashboard = require('../js/russian-b2/dashboard');

test('home is a real HTML entry with the fixed four-way app shell', () => {
  assert.match(html, /<main class="home"/);
  assert.match(html, /js\/app-shell\.js/);
  assert.match(html, /AppShell\.mount\(\{ current: 'home' \}\)/);
  assert.doesNotMatch(html, /01-home\.png|02-reader-shelf\.png/);
});

test('home reads existing progress keys and does not create a second progress store', () => {
  assert.match(script, /rr_lastread_/);
  assert.match(script, /vocabulary-review-records/);
  assert.match(script, /rr_b2_progress_v1/);
  assert.doesNotMatch(script, /localStorage\.setItem/);
  assert.doesNotMatch(script, /localStorage\.setItem/);
});

test('home counts pending B2 exercises from the nested progress structure', () => {
  const inventories = [{ id: 'p1', questionIds: ['P1-Q001', 'P1-Q002'] }, { id: 'p2', questionIds: ['P2-Q001'] }];
  const progress = { 'russian_b2:p1': { 'P1-Q001': { submitted: true } }, 'russian_b2:p2': { 'P2-Q001': { submitted: true } }, __completed: {} };
  assert.equal(require('../js/app-home').pendingB2Exercises(progress, inventories, dashboard), 1);
  progress.__completed['russian_b2:p1'] = { completed: true };
  assert.equal(require('../js/app-home').pendingB2Exercises(progress, inventories, dashboard), 0);
  assert.equal(require('../js/app-home').pendingB2Exercises({}, inventories, dashboard), 3);
  assert.equal(require('../js/app-home').pendingB2Exercises({ '{bad': 1 }, inventories, dashboard), 3);
});
