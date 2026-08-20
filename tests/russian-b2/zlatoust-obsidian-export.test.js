'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_OUTPUT_ROOT,
  buildKnowledgeBase
} = require('../../scripts/build-world-people-grammar-kb');

function listFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function fileHashes(root) {
  return Object.fromEntries(listFiles(root).map((filePath) => {
    const relative = path.relative(root, filePath).replace(/\\/g, '/');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    return [relative, hash];
  }));
}

function parseCanvas(root) {
  return JSON.parse(fs.readFileSync(path.join(root, '02-全书知识图谱.canvas'), 'utf8'));
}

function validateCanvas(root) {
  const canvas = parseCanvas(root);
  const nodeIds = new Set();
  const edgeIds = new Set();
  for (const node of canvas.nodes) {
    assert.match(node.id, /^[a-f0-9]{16}$/);
    assert.ok(!nodeIds.has(node.id), `duplicate canvas node ${node.id}`);
    nodeIds.add(node.id);
    assert.ok(['text', 'file', 'link', 'group'].includes(node.type));
    for (const field of ['x', 'y', 'width', 'height']) assert.equal(typeof node[field], 'number');
    if (node.type === 'file') assert.ok(node.file);
    if (node.type === 'text') assert.ok(node.text);
  }
  for (const edge of canvas.edges) {
    assert.match(edge.id, /^[a-f0-9]{16}$/);
    assert.ok(!edgeIds.has(edge.id), `duplicate canvas edge ${edge.id}`);
    edgeIds.add(edge.id);
    assert.ok(nodeIds.has(edge.fromNode), `missing fromNode ${edge.fromNode}`);
    assert.ok(nodeIds.has(edge.toNode), `missing toNode ${edge.toNode}`);
    assert.ok(edge.label && edge.label.trim());
  }
  return canvas;
}

test('Obsidian generator creates the complete knowledge base and is idempotent', () => {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'world-people-kb-'));
  const outputRoot = path.join(tempParent, 'knowledge-base');
  try {
    const first = buildKnowledgeBase({ outputRoot });
    assert.equal(first.report.cardCount, 32);
    assert.equal(first.report.conceptCount, 13);
    assert.equal(first.report.staleManagedFiles.length, 0);
    const firstHashes = fileHashes(outputRoot);
    const second = buildKnowledgeBase({ outputRoot });
    const secondHashes = fileHashes(outputRoot);
    assert.equal(second.report.changedFiles.length, 0);
    assert.deepEqual(secondHashes, firstHashes);
  } finally {
    const resolved = path.resolve(tempParent);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

test('formal Obsidian knowledge base contains 32 full card notes and 13 concept notes', () => {
  const cardRoot = path.join(DEFAULT_OUTPUT_ROOT, '知识点');
  const cardFiles = listFiles(cardRoot).filter((filePath) => filePath.endsWith('.md'));
  const conceptFiles = listFiles(path.join(DEFAULT_OUTPUT_ROOT, '核心概念')).filter((filePath) => filePath.endsWith('.md'));
  assert.equal(cardFiles.length, 32);
  assert.equal(conceptFiles.length, 13);
  for (const filePath of cardFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    assert.match(text, /^---\ntype: world-people-grammar-card/m);
    assert.match(text, /generated_by: "build-world-people-grammar-kb"/);
    assert.match(text, /## 卡内树形思维导图/);
    assert.match(text, /# 完整阶段讲解/);
    assert.match(text, /### 老师讲解/);
    assert.match(text, /### 判断线索与失效边界/);
    assert.match(text, /### 常见误区/);
    assert.match(text, /### 随堂题/);
    assert.match(text, /## 综合判断/);
    assert.match(text, /## 迁移任务/);
    assert.match(text, /## Reader 入口/);
    assert.doesNotMatch(text, /\[object Object\]|\bundefined\b/);
  }
});

test('Base management file scopes itself to the 32 generated card notes and exposes six views', () => {
  const base = fs.readFileSync(path.join(DEFAULT_OUTPUT_ROOT, '01-知识卡片管理.base'), 'utf8');
  assert.match(base, /file\.inFolder\("语法\/В мире людей·语法词汇知识库\/知识点"\)/);
  assert.match(base, /type == "world-people-grammar-card"/);
  for (const viewName of ['全部 32 张', '按章节', '待复核', '按核心概念', '阶段数与预计用时', '最近生成状态']) {
    assert.match(base, new RegExp(`name: "${viewName}"`));
  }
  assert.equal((base.match(/^  - type: /gm) || []).length, 6);
  assert.doesNotMatch(base, /\t/);
});

test('Canvas uses valid nodes and edges for every card and shared concept', () => {
  const canvas = validateCanvas(DEFAULT_OUTPUT_ROOT);
  const fileNodes = canvas.nodes.filter((node) => node.type === 'file');
  const cardNodes = fileNodes.filter((node) => /知识点\/第\d章\/[^/]+\.md$/.test(node.file));
  const conceptNodes = fileNodes.filter((node) => /核心概念\/[^/]+\.md$/.test(node.file));
  assert.equal(cardNodes.length, 32);
  assert.equal(conceptNodes.length, 13);
  for (const node of fileNodes) {
    const relative = node.file.replace(/^语法\/В мире людей·语法词汇知识库\//, '');
    assert.ok(fs.existsSync(path.join(DEFAULT_OUTPUT_ROOT, relative)), `missing Canvas file ${node.file}`);
  }
});

test('all generated Obsidian card and concept wikilinks resolve inside the formal knowledge base', () => {
  const notes = listFiles(DEFAULT_OUTPUT_ROOT).filter((filePath) => filePath.endsWith('.md'));
  const missing = [];
  for (const filePath of notes) {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const match of text.matchAll(/\[\[语法\/В мире людей·语法词汇知识库\/([^|#\]]+)/g)) {
      const target = path.join(DEFAULT_OUTPUT_ROOT, `${match[1]}.md`);
      if (!fs.existsSync(target)) missing.push(`${path.relative(DEFAULT_OUTPUT_ROOT, filePath)} -> ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('diagnostic answers are retained inside collapsed callouts', () => {
  for (const sectionId of ['1.1', '1.2', '1.3', '1.4.6', '1.4.7', '1.4.8']) {
    const filePath = listFiles(path.join(DEFAULT_OUTPUT_ROOT, '知识点')).find((file) => path.basename(file) === `${sectionId}.md`);
    assert.ok(filePath, `missing ${sectionId}`);
    const text = fs.readFileSync(filePath, 'utf8');
    assert.match(text, /\[!success\]- 诊断答案与反馈/);
  }
});

test('review risks remain visible in the generated 2.8 and 3.1.2 notes', () => {
  const goal = fs.readFileSync(path.join(DEFAULT_OUTPUT_ROOT, '知识点', '第2章', '2.8.md'), 'utf8');
  const gerund = fs.readFileSync(path.join(DEFAULT_OUTPUT_ROOT, '知识点', '第3章', '3.1.2.md'), 'utf8');
  assert.match(goal, /статья для реферата/);
  assert.match(goal, /ради、за、на.*待复核/s);
  assert.match(gerund, /GL3-Q039/);
  assert.match(gerund, /needs-review/);
});
