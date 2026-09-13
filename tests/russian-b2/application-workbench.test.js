const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');

test('application source publishes an eleven-genre workbench contract', () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, '俄语资料库/俄语B2·原书复刻与学习版/规范数据/写作/application.json'), 'utf8'));
  assert.equal(source.id, 'application');
  assert.equal(source.genres.length, 11);
  for (const genre of source.genres) {
    assert.ok(genre.id);
    assert.ok(genre.titleZh && genre.titleRu);
    assert.ok(genre.originalTextRu.length >= 80);
    assert.ok(genre.translationZh);
    assert.ok(genre.sourcePages.length);
    assert.ok(genre.requiredBlocks.length >= 2);
    assert.ok(genre.layout.variant);
    assert.ok(genre.modelAnalysis.length);
    assert.ok(genre.template);
    assert.ok(genre.transferTask.prompt);
  }
});

test('application reader uses a dedicated document renderer', () => {
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.match(reader, /function renderApplicationDocument\(genre\)/);
  assert.match(reader, /renderApplicationWorkbench\(data, scrollPosition\)/);
  assert.match(reader, /application-genre-nav/);
  assert.match(reader, /application-mobile-picker/);
  assert.match(reader, /data\.id === 'application' && data\.genres/);
  assert.match(reader, /\.application-workbench \.writing-stage-nav \{ position: static; \}/);
  assert.match(reader, /function renderApplicationTemplate\(genre\)/);
  assert.match(reader, /application-doc-address/);
  assert.match(reader, /application-doc-footer/);
  assert.match(reader, /application-doc-signature/);
  assert.match(reader, /application-doc-date/);
});
