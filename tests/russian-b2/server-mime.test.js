const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('server serves WebP evidence pages with an image MIME type', () => {
  const server = fs.readFileSync('server.js', 'utf8');
  assert.match(server, /'\.webp':\s*'image\/webp'/);
});
