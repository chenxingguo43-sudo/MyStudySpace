const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('server serves WebP evidence pages with an image MIME type', () => {
  const server = fs.readFileSync('server.js', 'utf8');
  assert.match(server, /'\.webp':\s*'image\/webp'/);
});

test('server declares UTF-8 for text resources used by the reader', () => {
  const server = fs.readFileSync('server.js', 'utf8');
  assert.match(server, /'\.html':\s*'text\/html; charset=utf-8'/);
  assert.match(server, /'\.js':\s*'text\/javascript; charset=utf-8'/);
  assert.match(server, /'\.css':\s*'text\/css; charset=utf-8'/);
  assert.match(server, /'\.json':\s*'application\/json; charset=utf-8'/);
});

test('server supports byte ranges for MP4 playback and seeking', () => {
  const server = fs.readFileSync('server.js', 'utf8');
  assert.match(server, /'\.mp4':\s*'video\/mp4'/);
  assert.match(server, /req\.headers\.range/);
  assert.match(server, /Content-Range/);
  assert.match(server, /createReadStream/);
});
