'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'reader.html'), 'utf8');

test('Reader loads one shared browser ledger and sync client', () => {
  [
    'js/learning-event-schema.js',
    'js/learning-event-store.js',
    'js/learning-sync-client.js',
    'js/vocabulary-learning-events.js',
    'js/reader-learning-events.js'
  ].forEach(script => assert.match(html, new RegExp(`<script src="${script.replace(/[.]/g, '\\.')}"`)));
  assert.match(html, /createLearningEventStore\(\{\}\)/);
  assert.match(html, /createRecorder\(\{[\s\S]*?store: learningEventStore,[\s\S]*?syncClient: learningSyncClient/);
});

test('Reader records final lookup outcomes and does not record incomplete loading as missing', () => {
  const block = html.slice(html.indexOf('function autoLookup(word)'), html.indexOf('function updateSaveButton'));
  assert.match(block, /if \(result \|\| !loadIncomplete\)/);
  assert.match(block, /recordReaderLookup\(readerLookupEventInput/);
  assert.ok(block.indexOf('renderDetailPanel') < block.indexOf('recordReaderLookup'));
});

test('Reader writes the addition event before changing the legacy vocabulary record', () => {
  const block = html.slice(html.indexOf('async function doSaveWord()'), html.indexOf('function _syncWordToServer'));
  const eventWrite = block.indexOf('await readerLearningEvents.recordVocabularyAddition');
  assert.ok(eventWrite >= 0);
  assert.ok(eventWrite < block.indexOf('dictionaryStorage.mergeSavedWord'));
  assert.ok(eventWrite < block.indexOf('appRuntime.saveVocabulary'));
  assert.match(block, /saved\.learningIdentity = learningAddition\.identity/);
});

test('legacy Markdown sync remains a separate operation after local saving', () => {
  const block = html.slice(html.indexOf('async function doSaveWord()'), html.indexOf('function _syncWordToServer'));
  assert.ok(block.indexOf('appRuntime.saveVocabulary') < block.indexOf('_syncWordToServer'));
});
