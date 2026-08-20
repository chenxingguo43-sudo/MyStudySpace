'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'docs', 'reader-ai-reading', 'reocr-batches');

test('seven incomplete reading sources have page-image PDF re-OCR batches', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(outputRoot, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.map((item) => item.chapter), ['2.4.2', '3.1.1', '3.1.2', '3.3.1', '3.3.2', '3.4.1', '3.5.1']);
  assert.deepEqual(manifest.map((item) => item.pageCount), [2, 4, 4, 3, 3, 4, 4]);

  for (const item of manifest) {
    assert.equal(item.kind, 'derived-page-image-pdf-for-reocr');
    assert.ok(fs.existsSync(item.pdf), item.pdf);
    assert.equal(fs.statSync(item.pdf).size > 1000, true, item.pdf);
    assert.equal(item.sourceImages.length, item.pageCount);
    assert.ok(fs.existsSync(path.join(outputRoot, item.id, 'README.md')));
    assert.match(fs.readFileSync(path.join(outputRoot, item.id, 'README.md'), 'utf8'), /不是新的教材内容/);
  }
});
