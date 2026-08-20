'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { importAnalysis } = require('../scripts/import-reading-ai-analysis');

const root = path.resolve(__dirname, '..');

function chapterFixture() {
  return {
    original: [
      '**标题**',
      '第一条证据。中间内容。第二条证据。'
    ],
    exercises: [{
      num: 1,
      question: '测试题',
      options: ['а) 错误项', 'б) 正确项'],
      answer: 'б',
      sourceAnchor: { paragraphIndex: 1, quote: '旧定位' },
      detailed_explanation: '旧解析'
    }]
  };
}

function markdownFixture(evidence = '第 2 段：第一条证据。\n第 2 段：第二条证据。') {
  return `# 已复核结果

> run_id: fixed-test-run

## 第 1 题

### 原文证据
${evidence}

### 为什么正确答案是 б
正确项与原文一致。

### 其他选项为什么错
- а：错误项改变了原文事实。

### 易错提醒
不要只看相同词。

### 一句话复盘
核对原文动作状态。
`;
}

test('imports multiple reviewed evidence fragments without changing answer or legacy fields', () => {
  const chapter = chapterFixture();
  const result = importAnalysis(markdownFixture(), chapter);
  const exercise = result.exercises[0];

  assert.equal(exercise.answer, 'б');
  assert.equal(exercise.sourceAnchor.quote, '旧定位');
  assert.equal(exercise.detailed_explanation, '旧解析');
  assert.equal(exercise.answerAnalysis.version, 'reading-evidence-v2');
  assert.equal(exercise.answerAnalysis.provenance.kind, 'ai-generated');
  assert.equal(exercise.answerAnalysis.provenance.runId, 'fixed-test-run');
  assert.equal(exercise.answerAnalysis.nextCheck, '');
  assert.equal(exercise.answerAnalysis.review, '核对原文动作状态。');
  assert.equal(exercise.evidenceAnchors.length, 2);
  assert.deepEqual(exercise.evidenceAnchors.map((item) => item.paragraphIndex), [1, 1]);
});

test('rejects an evidence quote that is not present in the selected source paragraph', () => {
  assert.throws(
    () => importAnalysis(markdownFixture('第 2 段：原文里不存在的句子。'), chapterFixture()),
    /evidence quote not found/
  );
});

test('rejects incomplete or mismatched question blocks before writing a chapter', () => {
  assert.throws(() => importAnalysis('# 没有题目', chapterFixture()), /Question count mismatch/);
});

test('chapter 1.3.1 keeps all reviewed analyses and exact multi-fragment source anchors', () => {
  const chapter = JSON.parse(fs.readFileSync(
    path.join(root, 'data', 'textbook', 'reading_speaking', 'ch0004.json'),
    'utf8'
  ));

  assert.equal(chapter.exercises.length, 8);
  assert.deepEqual(chapter.exercises.map((item) => item.answer), ['б', 'б', 'б', 'а', 'а', 'а', 'б', 'в']);
  assert.deepEqual(chapter.exercises.map((item) => item.evidenceAnchors.length), [1, 1, 1, 2, 1, 1, 1, 1]);

  for (const exercise of chapter.exercises) {
    assert.equal(exercise.answerAnalysis.version, 'reading-evidence-v2');
    assert.equal(exercise.answerAnalysis.provenance.kind, 'ai-generated');
    assert.ok(exercise.answerAnalysis.correctReason);
    assert.equal(exercise.answerAnalysis.options.filter((item) => item.status === 'wrong').length, 2);
    assert.ok(exercise.sourceAnchor && exercise.sourceAnchor.quote, 'legacy source anchor remains available');
    assert.ok(exercise.detailed_explanation, 'legacy explanation remains available');
    for (const anchor of exercise.evidenceAnchors) {
      assert.ok(chapter.original[anchor.paragraphIndex].includes(anchor.quote));
    }
  }
});
