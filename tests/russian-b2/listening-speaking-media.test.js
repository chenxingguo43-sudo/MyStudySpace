const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const bookDir = path.join(root, 'data', 'textbook', 'listening_speaking');

test('В мире людей chapters never expose the rejected audio collection', () => {
  const chapters = fs.readdirSync(bookDir).filter(name => /^ch\d{4}\.json$/.test(name));
  assert.equal(chapters.length, 63);

  for (const name of chapters) {
    const chapter = JSON.parse(fs.readFileSync(path.join(bookDir, name), 'utf8'));
    assert.equal(chapter.media.status, 'source-mismatch', name);
    assert.equal(chapter.media.provenance, 'unavailable', name);
    assert.equal(chapter.media.file, undefined, name);
    assert.match(chapter.media.rejectedFile, /^media\/\d{2}\.mp3$/, name);
    assert.ok((chapter.transcriptSegments || []).every(segment => segment.startTime === 0 && segment.endTime === 0), name);
  }
});

test('media audit records the expected and actual source collections', () => {
  const audit = JSON.parse(fs.readFileSync(path.join(bookDir, 'media-audit.json'), 'utf8'));
  assert.equal(audit.status, 'rejected');
  assert.match(audit.expectedCollection, /В мире людей/);
  assert.match(audit.actualCollection, /Выпуск 4/);
});
