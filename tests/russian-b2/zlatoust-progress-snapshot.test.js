'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const snapshotApi = require('../../js/zlatoust-progress-snapshot');
const { buildKnowledgeBase } = require('../../scripts/build-world-people-grammar-kb');

const graph = require('../../data/textbook/zlatoust_grammar/theory/knowledge-graph.json');
const learningRoot = path.resolve('data', 'textbook', 'zlatoust_grammar', 'theory', 'learning-pages');

function loadPages() {
  const pages = new Map();
  for (const chapterId of ['gl1', 'gl2', 'gl3', 'gl4', 'gl5']) {
    const directory = path.join(learningRoot, chapterId);
    for (const name of fs.readdirSync(directory).filter((file) => /^section-.*\.json$/.test(file))) {
      const page = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
      pages.set(page.sectionId, page);
    }
  }
  return graph.learningOrder.map((sectionId) => pages.get(sectionId));
}

function samplePage(sectionId) {
  return {
    sectionId,
    chapterId: 'gl1',
    titleZh: `测试卡 ${sectionId}`,
    stages: [{
      id: `stage-${sectionId}`,
      number: 1,
      title: `判断 ${sectionId}`,
      checks: [{ id: `check-${sectionId}` }],
      exerciseIds: [`Q-${sectionId}`]
    }],
    finalCheck: { id: `final-${sectionId}` },
    transferTasks: [{ id: `transfer-${sectionId}` }]
  };
}

test('snapshot input follows the canonical learning order and includes exactly 32 cards', () => {
  const pages = loadPages();
  assert.equal(pages.length, 32);
  assert.ok(pages.every(Boolean));
  const snapshot = snapshotApi.buildSnapshot({
    pages,
    learningProgress: { units: {} },
    officialProgress: {},
    generatedAt: new Date('2026-08-16T08:00:00.000Z')
  });
  assert.equal(snapshot.cardCount, 32);
  assert.deepEqual(snapshot.cards.map((card) => card.sectionId), graph.learningOrder);
  assert.equal(snapshot.counts.unstarted, 32);
});

test('snapshot derives all five card statuses from existing Reader records', () => {
  const pages = ['1.1', '1.2', '1.3', '1.4.1', '1.4.2'].map(samplePage);
  const learningProgress = { units: {
    '1.2': { openedAt: '2026-08-16T01:00:00.000Z' },
    '1.3': { checks: { 'check-1.3': { submitted: true, correct: true } } },
    '1.4.1': {
      checks: { 'check-1.4.1': { submitted: true, correct: true } },
      transfer: { 'transfer-1.4.1': { submitted: true, text: '完成' } }
    },
    '1.4.2': { reviewStages: { 'stage-1.4.2': true } }
  } };
  const snapshot = snapshotApi.buildSnapshot({ pages, learningProgress, officialProgress: {} });
  assert.deepEqual(snapshot.cards.map((card) => card.status), ['unstarted', 'learning', 'learned', 'mastered', 'weak']);
  assert.equal(snapshot.cards[3].completedStageCount, 1);
  assert.deepEqual(snapshot.cards[4].manualReviewStages.map((stage) => stage.id), ['stage-1.4.2']);
});

test('current official errors mark their stage weak while corrected historical errors stay visible as history', () => {
  const page = samplePage('1.1');
  const current = snapshotApi.cardSnapshot(page, { units: {} }, {
    'zlatoust_grammar:gl1': { 'Q-1.1': { submitted: true, lastResult: 'wrong', everWrong: true } }
  });
  assert.equal(current.status, 'weak');
  assert.equal(current.weakStages[0].id, 'stage-1.1');
  const corrected = snapshotApi.cardSnapshot(page, { units: {} }, {
    'zlatoust_grammar:gl1': { 'Q-1.1': { submitted: true, lastResult: 'correct', everWrong: true } }
  });
  assert.equal(corrected.status, 'mastered');
  assert.equal(corrected.weakStages.length, 0);
  assert.equal(corrected.historyStages[0].id, 'stage-1.1');
});

test('rendered Markdown is Obsidian-ready and excludes unrelated input data', () => {
  const snapshot = snapshotApi.buildSnapshot({
    pages: [samplePage('1.1')],
    learningProgress: { units: {}, apiKey: 'DO_NOT_EXPORT' },
    officialProgress: { unrelatedCache: 'DO_NOT_EXPORT_EITHER' },
    generatedAt: new Date('2026-08-16T08:30:00.000Z')
  });
  const markdown = snapshotApi.renderMarkdown(snapshot);
  assert.match(markdown, /^---\ndate: 2026-08-16/m);
  assert.match(markdown, /ai-first: true/);
  assert.match(markdown, /## For future Claude/);
  assert.match(markdown, /source_of_truth: Reader/);
  assert.match(markdown, /\[\[语法\/В мире людей·语法词汇知识库\/知识点\/第1章\/1\.1\|1\.1 测试卡 1\.1\]\]/);
  assert.match(markdown, /不包含录音、密钥、缓存或其他学习模块数据/);
  assert.doesNotMatch(markdown, /DO_NOT_EXPORT/);
  assert.doesNotMatch(markdown, /build-world-people-grammar-kb/);
});

test('save uses the browser file picker first and treats user cancellation as cancellation', async () => {
  let written = '';
  const saved = await snapshotApi.saveMarkdown({
    markdown: '# 快照',
    showSaveFilePicker: async () => ({
      createWritable: async () => ({
        write: async (value) => { written = value; },
        close: async () => {}
      })
    })
  });
  assert.equal(saved.method, 'picker');
  assert.equal(written, '# 快照');

  const cancelled = await snapshotApi.saveMarkdown({
    markdown: '# 快照',
    showSaveFilePicker: async () => { const error = new Error('cancelled'); error.name = 'AbortError'; throw error; }
  });
  assert.equal(cancelled.cancelled, true);
});

test('save falls back to a Markdown download when the picker is unavailable', async () => {
  let clicked = false;
  let revoked = '';
  const result = await snapshotApi.saveMarkdown({
    markdown: '# 快照',
    document: { createElement: () => ({ click: () => { clicked = true; } }) },
    urlApi: { createObjectURL: () => 'blob:test', revokeObjectURL: (url) => { revoked = url; } },
    Blob
  });
  assert.equal(result.method, 'download');
  assert.equal(clicked, true);
  assert.equal(revoked, 'blob:test');
});

test('knowledge-base rebuild preserves a real Reader snapshot that replaced the placeholder', () => {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'world-people-progress-'));
  const outputRoot = path.join(tempParent, 'knowledge-base');
  try {
    buildKnowledgeBase({ outputRoot });
    const snapshotPath = path.join(outputRoot, '进度', '学习进度快照.md');
    const realSnapshot = '---\nsource_of_truth: Reader\n---\n\n# 我的真实学习进度\n';
    fs.writeFileSync(snapshotPath, realSnapshot, 'utf8');
    buildKnowledgeBase({ outputRoot });
    assert.equal(fs.readFileSync(snapshotPath, 'utf8'), realSnapshot);
  } finally {
    const resolved = path.resolve(tempParent);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

test('Reader exposes the snapshot component and command only on the grammar module', () => {
  const reader = fs.readFileSync('reader.html', 'utf8');
  assert.match(reader, /js\/zlatoust-progress-snapshot\.js/);
  assert.match(reader, /async function exportZlatoustObsidianProgressSnapshot\(button\)/);
  assert.match(reader, /bookId === 'zlatoust_grammar'.*world-module-export/);
  assert.match(reader, /fileName: '学习进度快照\.md'/);
  assert.match(reader, /showSaveFilePicker/);
  assert.match(reader, /flex-wrap: wrap; gap: 8px/);
});
