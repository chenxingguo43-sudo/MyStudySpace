const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const vocabulary = fs.readFileSync(path.join(root, 'vocabulary.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  server.includes('source_sentence_ru') && server.includes('source_sentence_zh'),
  'server must persist novel source sentence fields'
);

assert(
  server.includes('sourceSentenceRu') && server.includes('sourceSentenceZh'),
  'server must return novel source sentence fields'
);

assert(
  /examples:\s*\(item\.sourceSentenceRu \|\| item\.sourceSentenceZh\)/.test(vocabulary),
  'vocabulary.html must turn novel source sentences into card examples'
);

console.log('novel context fields wiring ok');
