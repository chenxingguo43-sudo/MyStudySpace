'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const reader = fs.readFileSync('reader.html', 'utf8');
const server = fs.readFileSync('server.js', 'utf8');

test('Reader keeps prompt copy while adding direct grammar analysis with visible states', () => {
  assert.match(reader, /AI 直接解析/);
  assert.match(reader, /复制提示词/);
  assert.match(reader, /function requestExerciseAiAnalysis/);
  assert.match(reader, /function cancelReaderAiRequest/);
  assert.match(reader, /function retryReaderAiRequest/);
  assert.match(reader, /AI 正在整理解析/);
  assert.match(reader, /请求已取消/);
  assert.match(reader, /AI 生成 · 不改动原始答案/);
  assert.match(reader, /迁移题（暂不公布答案）/);
});

test('Reader dictionary keeps local content first and labels provisional AI explanations', () => {
  const detailStart = reader.indexOf('function renderDetailPanel(word, result)');
  const detailEnd = reader.indexOf('function autoLookup(word)', detailStart);
  const detail = reader.slice(detailStart, detailEnd);
  assert.ok(detail.indexOf('dict-meaning') < detail.indexOf('renderDictionaryActionBar'));
  assert.ok(detail.indexOf('dp-meaning') < detail.lastIndexOf('renderDictionaryActionBar'));
  assert.match(reader, /function requestDictionaryAiAnalysis/);
  assert.match(reader, /ReaderAiClient\.dictionaryRequest/);
  assert.match(reader, /临时解释，尚未核实/);
  assert.match(reader, /不能自动变成正式词典事实/);
  assert.match(reader, /function doSaveWord/);
});

test('prompt copies are recorded separately without blocking clipboard use', () => {
  const copyStart = reader.indexOf('function copyTextAndRecordReaderAiPrompt');
  const copyEnd = reader.indexOf('function copyPhraseAnalysisPrompt', copyStart);
  const copy = reader.slice(copyStart, copyEnd);
  assert.match(copy, /navigator\.clipboard\.writeText/);
  assert.match(copy, /recordPromptCopy/);
  assert.match(copy, /\.catch\(function\(\) \{\}\)/);
});

test('server mounts AI on the public learningStore database path through independent modules', () => {
  assert.match(server, /createReaderAiStore\(\{ databasePath: learningStore\.databasePath \}\)/);
  assert.match(server, /createReaderAiRoutingProvider/);
  assert.match(server, /createReaderAiConfigApi/);
  assert.match(server, /handleReaderAiApi\(req, res, urlPath\)/);
  assert.ok(server.indexOf('handleLearningEventApi(req, res, urlPath)') < server.indexOf('handleReaderAiApi(req, res, urlPath)'));
});

test('bookshelf exposes secure task-specific AI provider settings', () => {
  assert.match(reader, /ReaderAiSettings\.open\(\)/);
  assert.match(reader, /js\/reader-ai-settings\.js/);
  const settings = fs.readFileSync('js/reader-ai-settings.js', 'utf8');
  assert.match(settings, /查词与语境分析/);
  assert.match(settings, /语法题解析/);
  assert.match(settings, /type="password"/);
  assert.doesNotMatch(settings, /localStorage/);
});
