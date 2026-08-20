'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('scripts/start-white-night-reader.ps1', 'utf8');

test('desktop Reader launcher verifies the AI config API before reusing a server', () => {
  assert.match(script, /api\/reader-ai\/config/);
  assert.match(script, /Test-ReaderAiConfig/);
  assert.match(script, /Restart-StaleWhiteNightServer/);
  assert.match(script, /LocalPort.*State Listen/);
  assert.match(script, /Name -eq 'node\.exe'/);
  assert.match(script, /CommandLine -match/);
  assert.match(script, /\$env:PORT = \[string\]\$Port/);
});
