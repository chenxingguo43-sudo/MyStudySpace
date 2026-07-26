const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const bookDir = path.join(root, 'data', 'textbook', 'listening_speaking');

test('feature-film media exercises map one-to-one to the audited appended exercise ranges', () => {
  const audit = JSON.parse(fs.readFileSync(path.join(bookDir, 'media-structure-audit.json'), 'utf8'));
  const exercises = JSON.parse(fs.readFileSync(path.join(bookDir, 'media-exercises.json'), 'utf8')).chapters;
  const auditedTracks = Object.entries(audit.tracks);
  assert.equal(auditedTracks.length, 10);
  assert.deepEqual(Object.keys(exercises).map(Number).sort((a, b) => a - b), auditedTracks.map(([, track]) => track.chapter).sort((a, b) => a - b));

  for (const [trackNumber, track] of auditedTracks) {
    const chapterPath = path.join(bookDir, 'ch' + String(track.chapter).padStart(4, '0') + '.json');
    const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
    const exercise = chapter.mediaExercise;
    assert.ok(exercise, chapterPath);
    assert.equal(exercise.chapter, track.chapter, trackNumber);
    assert.equal(exercise.exerciseStartSeconds, track.exerciseStartSeconds, trackNumber);
    assert.ok(exercise.exerciseStartSeconds >= track.featureEndSeconds, trackNumber);
    assert.equal(exercise.sourceStatus, 'verified-cleaned-source', trackNumber);
    assert.equal(exercise.available, true, trackNumber);
    assert.ok(exercise.sourceChapterIdentifier, trackNumber);
    assert.ok(exercise.prompt, trackNumber);
    assert.ok(exercise.items.length, trackNumber);
    assert.ok(exercise.tasks.length, trackNumber);
    assert.match(exercise.sourceFile, /Тема 1\.[56]/, trackNumber);
    const sourcePath = path.join(root, exercise.sourceFile);
    assert.ok(fs.existsSync(sourcePath), sourcePath);
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(sourceText.includes('### Аудиозадание'), trackNumber);
    assert.ok(sourceText.includes(exercise.prompt), trackNumber);
    exercise.items.forEach(item => assert.ok(sourceText.includes(item.text), trackNumber + ' item ' + item.number));
    assert.ok(chapter.transcriptSegments.every(segment => !segment.endTime || segment.endTime <= track.featureEndSeconds + 0.25), trackNumber);
  }
});

test('only feature-film chapters expose appended media exercises', () => {
  const chapters = fs.readdirSync(bookDir).filter(name => /^ch\d{4}\.json$/.test(name));
  for (const name of chapters) {
    const chapter = JSON.parse(fs.readFileSync(path.join(bookDir, name), 'utf8'));
    const index = Number(name.slice(2, 6));
    assert.equal(Boolean(chapter.mediaExercise), index >= 15 && index <= 24, name);
    if (index < 15 || index > 24) assert.equal(chapter.mediaExercise, null, name);
  }
});

test('В мире людей binds only verified Выпуск 2 media and keeps ТРКИ-3 unavailable', () => {
  const chapters = fs.readdirSync(bookDir).filter(name => /^ch\d{4}\.json$/.test(name));
  assert.equal(chapters.length, 63);

  for (const name of chapters) {
    const chapter = JSON.parse(fs.readFileSync(path.join(bookDir, name), 'utf8'));
    const index = Number(name.slice(2, 6));
    if (index <= 34) {
      assert.equal(chapter.media.status, 'verified', name);
      const isFilm = index >= 15 && index <= 24;
      assert.equal(chapter.media.kind, isFilm ? 'video' : 'audio', name);
      assert.equal(chapter.media.provenance, isFilm ? 'verified-original-video' : 'verified-original-audio', name);
      assert.match(chapter.media.file, /^media\/world-people-v2\/\d{2}\.mp4$/, name);
      if (index >= 30) assert.equal(chapter.media.playlist.length, 5, name);
    } else {
      assert.equal(chapter.media.status, 'source-mismatch', name);
      assert.equal(chapter.media.provenance, 'unavailable', name);
      assert.equal(chapter.media.file, undefined, name);
      assert.match(chapter.media.rejectedFile, /^media\/\d{2}\.mp3$/, name);
    }
    const transcript = chapter.transcriptSegments || [];
    const timed = transcript.filter(segment => segment.endTime > 0);
    if (!timed.length) {
      assert.ok(transcript.every(segment => segment.startTime === 0 && segment.endTime === 0), name);
    } else {
      assert.ok(transcript.every(segment =>
        (segment.startTime === 0 && segment.endTime === 0) ||
        (segment.startTime >= 0 && segment.endTime > segment.startTime)
      ), name);
      const lastEndByPlaylist = new Map();
      timed.forEach(segment => {
        const playlistIndex = Number(segment.playlistIndex) || 0;
        const lastEnd = lastEndByPlaylist.get(playlistIndex);
        assert.ok(lastEnd === undefined || segment.startTime >= lastEnd - 0.25, name);
        lastEndByPlaylist.set(playlistIndex, segment.endTime);
      });
    }
  }
});

test('ТРКИ-2 mock exam remains a separate five-part audio-only playlist', () => {
  const mock = JSON.parse(fs.readFileSync(path.join(root, 'data', 'textbook', 'listening_speaking_mock', 'ch0000.json'), 'utf8'));
  assert.equal(mock.media.status, 'verified');
  assert.equal(mock.media.kind, 'audio');
  assert.equal(mock.media.playlist.length, 5);
  assert.deepEqual(mock.media.playlist.map(item => item.file), ['media/56.mp4', 'media/57.mp4', 'media/58.mp4', 'media/59.mp4', 'media/60.mp4']);
});

test('Patriarch Ponds chapter uses the scanned task and verified audio transcript', () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'listening_speaking_segments.json'), 'utf8'))[7];
  const timeline = JSON.parse(fs.readFileSync(path.join(bookDir, 'timelines', 'ch0007.json'), 'utf8'));

  assert.deepEqual(source.sourcePages, [22, 23]);
  assert.equal(source.questions[0].prompt, 'День рождения Патриарших прудов отмечается ...');
  assert.deepEqual(source.questions.map(question => question.answer), ['А', 'В', 'Б', 'В', 'Б']);
  assert.match(source.audioTranscript, /190-й день рождения/);
  assert.match(source.audioTranscript, /в третью субботу февраля/);
  assert.equal(timeline.status, 'verified');
  assert.equal(timeline.segments.length, 6);
  assert.ok(timeline.segments.every(segment => segment.timingStatus === 'aligned'));
});

test('media audit records the expected and actual source collections', () => {
  const audit = JSON.parse(fs.readFileSync(path.join(bookDir, 'media-audit.json'), 'utf8'));
  assert.equal(audit.status, 'rejected');
  assert.match(audit.expectedCollection, /В мире людей/);
  assert.match(audit.actualCollection, /Выпуск 4/);
});
