const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('published reconstructed listening media includes playable audio and WebVTT captions', () => {
  const mediaDir = path.join(__dirname, '..', '..', 'data', 'textbook', 'russian_b2', 'media', 'listening');
  for (const unit of ['dialogues', 'advertisements', 'film', 'news', 'interview']) {
    const audio = path.join(mediaDir, `${unit}.mp3`);
    const captions = path.join(mediaDir, `${unit}.vtt`);
    assert.ok(fs.statSync(audio).size > 0, `${unit} must ship a reconstructed audio file`);
    const captionText = fs.readFileSync(captions, 'utf8');
    assert.match(captionText, /^WEBVTT/u);
    assert.match(captionText, /-->/u);
  }
});
