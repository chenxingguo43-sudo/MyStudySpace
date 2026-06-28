const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readerPage = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  !readerPage.includes('wiktionary.org/api/rest_v1/page/definition'),
  'reader.html must not use Wiktionary definition API'
);

assert(
  /function lookupLocalChineseMeaning\(/.test(readerPage),
  'autoLookup() must use local Chinese lookup instead of Russian-English definitions'
);

console.log('reader definition source wiring ok');
