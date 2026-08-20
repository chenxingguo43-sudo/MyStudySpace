'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'vocabulary.html'), 'utf8');

test('Vocabulary loads the shared ledger and one shared sync client', () => {
  const scripts = [
    'node_modules/ts-fsrs/dist/index.umd.js',
    'js/learning-event-schema.js',
    'js/learning-event-store.js',
    'js/vocabulary-fsrs-projection.js',
    'js/vocabulary-fsrs-transition.js',
    'js/vocabulary-scheduling-control.js',
    'js/learning-projection-client.js',
    'js/learning-sync-client.js',
    'js/vocabulary-learning-events.js'
  ];
  scripts.forEach(script => assert.match(html, new RegExp(`<script src="${script.replace(/[.]/g, '\\.')}"`)));
  assert.match(html, /createLearningEventStore\(\{\}\)/);
  assert.match(html, /createSyncClient\(\{[\s\S]*?store: learningEventStore,[\s\S]*?projectionClient: learningProjectionClient/);
  assert.match(html, /learningProjectionClient\.compareServer\(\)/);
  assert.match(html, /window\.__belyeNochiFsrsComparison/);
  assert.match(html, /BelyeNochiVocabularySchedulingControl\.createControl\(/);
  assert.match(html, /function handleSchedulingAction\(\)/);
  assert.match(html, /createRecorder\(\{[\s\S]*?store: learningEventStore,[\s\S]*?syncClient: learningSyncClient/);
});

test('legacy takeover is snapshotted while the production scheduling channel remains reversible', () => {
  assert.match(html, /BelyeNochiVocabularyFsrsTransition\.ensurePlan\(localStorage, getRecords\(\)/);
  assert.match(html, /\/api\/learning-migrations\/vocabulary-legacy-snapshot/);
  assert.match(html, /__belyeNochiVocabularySchedulingChannel/);
  assert.match(html, /function getActiveRecord\(word\)[\s\S]*?BelyeNochiVocabularyFsrsTransition\.activeRecord/);
  assert.match(html, /var rec = getActiveRecord\(w\)/);
  assert.match(html, /legacy_pending_calibration/);
  const saveRecordBlock = html.slice(html.indexOf('function saveRecord(wordId'), html.indexOf('async function recordVocabularyShadowReview'));
  assert.match(saveRecordBlock, /VocabularySessionScheduler\.scheduleLongTerm/);
  assert.doesNotMatch(saveRecordBlock, /BelyeNochiVocabularyFsrsProjection/);
});

test('normal ratings save the event before changing the old progress', () => {
  const block = html.slice(html.indexOf('async function rate(score)'), html.indexOf('// 当前展示的 sessionCard'));
  const eventWrite = block.indexOf('await recordVocabularyShadowReview');
  assert.ok(eventWrite >= 0);
  assert.ok(eventWrite < block.indexOf('sc.failCount++'));
  assert.ok(eventWrite < block.indexOf('saveRecord(w.id'));
  assert.match(block, /answerRevealedBeforeResponse: true/);
});

test('brush ratings preserve the pre-reveal decision and save it before old records', () => {
  const block = html.slice(html.indexOf('async function rateBrush(score)'), html.indexOf('var _brushToastTimer'));
  const eventWrite = block.indexOf('await recordVocabularyShadowReview');
  assert.ok(eventWrite >= 0);
  assert.ok(eventWrite < block.indexOf('recordBrushSkillAttempt'));
  assert.ok(eventWrite < block.indexOf('saveRecord(w.id'));
  assert.match(block, /answerWasRevealedBeforeResponse = !brushDecision/);
});

test('undo writes an exclusion before restoring localStorage', () => {
  const block = html.slice(html.indexOf('async function undoLastRate()'), html.indexOf('// ─── 🚀 刷词模式：撤销'));
  assert.ok(block.indexOf('await recordVocabularyShadowUndo') < block.indexOf('saveRecords(records)'));
});
