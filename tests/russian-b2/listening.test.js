const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const fs = require('node:fs');
const { buildListeningModule, validateListeningUnit, publishListeningReaderModule } = require('../../scripts/russian-b2/build-listening');
const { parseDialogueSegments } = require('../../scripts/russian-b2/lib/dialogue-segments');
const { prepareListeningMedia } = require('../../scripts/russian-b2/prepare-listening-media');
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

test('the restored audio task groups preserve complete Russian exam items and three choices', () => {
  const { units } = buildListeningModule({ root, write: false });
  for (const unit of units.filter(unit => ['dialogues', 'advertisements'].includes(unit.id))) {
    for (const question of unit.questions) {
      assert.match(question.promptRu || '', /[А-Яа-яЁё]/, `${question.id}: Russian prompt required`);
      assert.equal(question.options?.length, 3, `${question.id}: three original choices required`);
      assert.ok(question.options?.some(option => option.key === question.answer), `${question.id}: answer must identify an existing choice`);
      assert.ok(question.evidence?.pages?.length > 0, `${question.id}: source evidence pages required`);
    }
  }
});

test('all five listening families publish all 25 source-complete questions', () => {
  const { units } = buildListeningModule({ root });
  const questions = units.flatMap(unit => unit.questions);
  assert.equal(questions.length, 25);
  questions.forEach(question => {
    assert.match(question.promptRu, /[А-Яа-яЁё]/);
    assert.equal(question.options.length, 3);
    assert.ok(question.options.some(option => option.key === question.answer));
    assert.ok(question.evidence.pages.length > 0);
  });
});

test('dialogue segments keep display labels out of spoken text and use distinct voices', () => {
  const { units } = buildListeningModule({ root, write: false });
  const dialogues = units.find(unit => unit.id === 'dialogues');
  assert.ok(dialogues.transcriptSegments.length >= 2);
  assert.ok(dialogues.transcriptSegments.every(segment => /^[АБ]$/.test(segment.displayLabel || '')));
  assert.ok(dialogues.transcriptSegments.every(segment => segment.speechText && !/^[АAБB]\s*[:：]/.test(segment.speechText)));
  assert.ok(new Set(dialogues.transcriptSegments.map(segment => segment.voice)).size >= 2);
});

test('dialogue parser preserves visible role labels without sending them to speech', () => {
  const segments = parseDialogueSegments('А: Привет! Б: Как дела?');
  assert.deepEqual(segments.map(segment => segment.displayLabel), ['А', 'Б']);
  assert.deepEqual(segments.map(segment => segment.speechText), ['Привет!', 'Как дела?']);
  assert.equal(new Set(segments.map(segment => segment.voice)).size, 2);
});

test('media preparation preserves dialogue segment voices and speaker-safe text', () => {
  const prepared = prepareListeningMedia({ root, write: false });
  const dialogues = prepared.find(unit => unit.id === 'dialogues');
  assert.ok(dialogues);
  assert.equal(new Set(dialogues.transcriptSegments.map(segment => segment.voice)).size, 2);
  assert.ok(dialogues.transcriptSegments.every(segment => !/^[АAБB]\s*[:：]/.test(segment.speechText)));
  assert.deepEqual(dialogues.media.voices, {
    'А': 'ru-RU-DmitryNeural',
    'Б': 'ru-RU-SvetlanaNeural'
  });
});

test('listening publisher keeps reconstructed media clearly labelled in reader chapters', () => {
  const outputDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'listening');
  const { index } = publishListeningReaderModule({ root, outputDir });
  assert.equal(index.chapters, 5);
  const film = JSON.parse(fs.readFileSync(path.join(outputDir, 'ch0002.json'), 'utf8'));
  assert.equal(film.format, 'listening-practice');
  assert.equal(film.media.provenance, 'reconstructed-tts');
});

test('listening is published as a module of the unified B2 book', () => {
  const book = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'russian_b2', 'book.json'), 'utf8'));
  const listening = book.modules.find(module => module.id === 'listening');
  assert.ok(listening);
  assert.equal(listening.status, 'available');
  assert.equal(listening.dir, 'russian_b2/modules/listening');
});
