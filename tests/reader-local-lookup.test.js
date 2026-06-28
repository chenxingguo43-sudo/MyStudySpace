const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readerPage = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  !readerPage.includes('wiktionary.org/api/rest_v1/page/definition'),
  'reader lookup must not call Wiktionary definitions'
);

assert(
  /function loadLocalLookupData\(/.test(readerPage),
  'reader.html must load local lookup data'
);

assert(
  /function lookupLocalChineseMeaning\(/.test(readerPage),
  'reader.html must lookup Chinese meanings locally'
);

assert(
  /sourceSentenceRu:\s*selContext/.test(readerPage) &&
    /sourceSentenceZh:\s*selTranslationContext/.test(readerPage),
  'saved novel vocabulary must include source sentence context'
);

assert(
  readerPage.includes('meaning: meaning.trim()'),
  'localStorage review records must keep the Chinese meaning'
);

console.log('reader local lookup wiring ok');
