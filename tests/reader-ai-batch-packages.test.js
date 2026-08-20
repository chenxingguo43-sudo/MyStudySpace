'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'docs', 'reader-ai-reading', 'packages');

test('each reading article has a self-contained input, prompt, and output folder', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.length, 30);
  assert.equal(new Set(manifest.map((entry) => entry.chapter)).size, 30);

  for (const entry of manifest) {
    const directory = path.join(root, 'docs', 'reader-ai-reading', entry.directory);
    assert.ok(fs.existsSync(path.join(directory, 'README.md')), entry.directory);
    assert.ok(fs.existsSync(path.join(directory, entry.inputFile)), entry.directory);
    assert.ok(fs.existsSync(path.join(directory, entry.promptFile)), entry.directory);
    assert.ok(fs.existsSync(path.join(directory, entry.outputFile.replace(/\/analysis\.md$/, '/README.md'))), entry.directory);
    assert.match(fs.readFileSync(path.join(directory, entry.promptFile), 'utf8'), /原文证据/);
    assert.match(fs.readFileSync(path.join(directory, entry.promptFile), 'utf8'), /已确认正确答案/);
  }
});

test('source-incomplete articles remain visibly blocked in their package README', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'));
  const blocked = manifest.filter((entry) => entry.sourceCoverage === 'needs-source-recovery');
  assert.deepEqual(blocked.map((entry) => entry.chapter), [
    '2.4.2', '3.1.1', '3.1.2', '3.3.1', '3.3.2', '3.4.1', '3.5.1'
  ]);
  for (const entry of blocked) {
    const readme = fs.readFileSync(path.join(root, 'docs', 'reader-ai-reading', entry.directory, 'README.md'), 'utf8');
    assert.match(readme, /暂缓最终解析/);
  }
});
