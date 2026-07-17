const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const fs = require('node:fs');
const { buildListeningModule, validateListeningUnit, publishListeningReaderModule } = require('../../scripts/russian-b2/build-listening');
const root = path.resolve(__dirname, '..', '..');

test('listening module keeps five source-verified task families and declares reconstructed media', () => {
  const { units } = buildListeningModule({ root, write: false });
  assert.deepEqual(units.map(unit => unit.id), ['dialogues', 'advertisements', 'film', 'news', 'interview']);
  assert.deepEqual(units.map(unit => unit.sourcePages), [
    [104, 105],
    [105, 106],
    [106, 107, 108],
    [108, 109],
    [109, 110, 111, 112]
  ]);
  for (const unit of units) {
    assert.deepEqual(validateListeningUnit(unit), []);
    assert.equal(unit.reviewStatus, 'source-verified');
    assert.equal(unit.media.provenance, 'reconstructed-tts');
    assert.match(unit.media.file || '', /^media\/listening\/.+\.mp3$/);
    assert.match(unit.media.captions || '', /^media\/listening\/.+\.vtt$/);
    assert.equal(unit.questions.length, 5);
    assert.ok(unit.transcriptSegments.length > 0);
    const transcript = unit.transcriptSegments.map(segment => segment.text).join(' ');
    const minimumTranscriptLengths = {
      dialogues: 250,
      advertisements: 400,
      film: 1_400,
      news: 1_100,
      interview: 3_000
    };
    assert.ok(
      transcript.length >= minimumTranscriptLengths[unit.id],
      `${unit.id} must publish the complete source transcript rather than a short summary`
    );
  }
});

test('listening publisher keeps reconstructed media clearly labelled in reader chapters', () => {
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'listening');
  const { index } = publishListeningReaderModule({ root, outputDir });
  assert.equal(index.chapters, 5);
  const film = JSON.parse(fs.readFileSync(path.join(outputDir, 'ch0002.json'), 'utf8'));
  assert.equal(film.format, 'listening-practice');
  assert.equal(film.media.provenance, 'reconstructed-tts');
});

test('listening shelf metadata states that source transcripts and page references are verified', () => {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'index.json'), 'utf8'));
  const listeningBook = catalogue.books.find(book => book.id === 'russian_b2_listening');
  assert.ok(listeningBook);
  assert.match(listeningBook.description, /文字稿与页码已核对/);
  assert.doesNotMatch(listeningBook.description, /仍在逐句核对/);
});
