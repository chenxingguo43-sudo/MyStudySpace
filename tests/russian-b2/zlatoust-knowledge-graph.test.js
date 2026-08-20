'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const graphPath = path.resolve('data', 'textbook', 'zlatoust_grammar', 'theory', 'knowledge-graph.json');
const learningRoot = path.resolve('data', 'textbook', 'zlatoust_grammar', 'theory', 'learning-pages');

function loadGraph() {
  return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
}

function loadSectionIds() {
  const ids = [];
  for (const chapter of ['gl1', 'gl2', 'gl3', 'gl4', 'gl5']) {
    const directory = path.join(learningRoot, chapter);
    for (const name of fs.readdirSync(directory).filter((file) => /^section-.*\.json$/.test(file))) {
      const card = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
      ids.push(card.sectionId);
    }
  }
  return ids;
}

test('Zlatoust knowledge graph accounts for all 32 learning cards exactly once', () => {
  const graph = loadGraph();
  const sectionIds = loadSectionIds();
  assert.equal(sectionIds.length, 32);
  assert.equal(graph.learningOrder.length, 32);
  assert.equal(new Set(graph.learningOrder).size, 32);
  assert.deepEqual([...graph.learningOrder].sort(), [...sectionIds].sort());
});

test('every cross-card relation has valid endpoints, an allowed type, and a reason', () => {
  const graph = loadGraph();
  const sectionIds = new Set(loadSectionIds());
  const allowedTypes = new Set(['prerequisite', 'part-of', 'shared-concept', 'contrast', 'confusable']);
  const relationKeys = new Set();
  for (const relation of graph.sectionRelations) {
    assert.ok(sectionIds.has(relation.from), `missing source card ${relation.from}`);
    assert.ok(sectionIds.has(relation.to), `missing target card ${relation.to}`);
    assert.ok(allowedTypes.has(relation.type), `unsupported relation type ${relation.type}`);
    assert.ok(relation.reason && relation.reason.trim(), `${relation.from} -> ${relation.to} is missing a reason`);
    const key = `${relation.from}|${relation.to}|${relation.type}`;
    assert.ok(!relationKeys.has(key), `duplicate section relation ${key}`);
    relationKeys.add(key);
  }
});

test('core concepts connect at least two cards and every concept relation is traceable', () => {
  const graph = loadGraph();
  const sectionIds = new Set(loadSectionIds());
  const concepts = new Map(graph.concepts.map((concept) => [concept.id, concept]));
  assert.equal(concepts.size, graph.concepts.length);
  const counts = new Map([...concepts.keys()].map((conceptId) => [conceptId, 0]));
  for (const concept of graph.concepts) {
    assert.ok(concept.label && concept.label.trim());
    assert.ok(concept.summary && concept.summary.trim());
  }
  for (const relation of graph.conceptRelations) {
    assert.ok(sectionIds.has(relation.sectionId), `missing concept card ${relation.sectionId}`);
    assert.ok(concepts.has(relation.conceptId), `missing concept ${relation.conceptId}`);
    assert.ok(relation.reason && relation.reason.trim(), `${relation.sectionId} -> ${relation.conceptId} is missing a reason`);
    counts.set(relation.conceptId, counts.get(relation.conceptId) + 1);
  }
  for (const [conceptId, count] of counts) assert.ok(count >= 2, `${conceptId} connects only ${count} card`);
});

test('knowledge graph preserves the explicitly reviewed risk boundaries', () => {
  const graph = loadGraph();
  assert.ok(graph.learningOrder.includes('2.8'));
  assert.ok(graph.learningOrder.includes('3.1.2'));
  const relation = graph.sectionRelations.find((item) => item.from === '2.7' && item.to === '2.8');
  assert.equal(relation.type, 'confusable');
  assert.match(relation.reason, /原因.*目的/);
});
