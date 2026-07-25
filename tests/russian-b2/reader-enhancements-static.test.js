const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const reader = fs.readFileSync('reader.html', 'utf8');

test('reader records reading attempts through the shared review helper', () => {
  assert.match(reader, /js\/russian-b2\/reading-review\.js/);
  assert.match(reader, /RussianB2ReadingReview\.recordAttempt/);
  assert.match(reader, /setReadingErrorCategory/);
  assert.match(reader, /needsClassification/);
});

test('reader inline scripts are valid JavaScript', () => {
  const scripts = reader.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    assert.doesNotThrow(() => new vm.Script(match[2]));
  }
});
